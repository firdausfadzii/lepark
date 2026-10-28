import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";
import { hashPassword } from "../auth";
import {
  PrivateZone,
  JukeboxState,
  TypewriterState,
  AshtrayState,
  ChatMessage,
  ChatRoomType,
} from "shared";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  user: process.env.DB_USER || "gameuser",
  password: process.env.DB_PASSWORD || "gamepassword",
  database: process.env.DB_NAME || "gamedb",
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 15,
  keepAlive: true,
});

let isDbConnected = false;
let isReconnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;

// Catch unexpected background pool errors to keep process alive and trigger auto-reconnect
pool.on("error", (err) => {
  console.warn(`⚠️ PostgreSQL pool background error: ${err.message}`);
  isDbConnected = false;
  scheduleReconnect();
});

export interface UserRecord {
  id: number;
  username: string;
  display_name: string | null;
  password_hash: string;
  role: "user" | "superadmin";
  created_at: Date;
  updated_at: Date;
}

export interface SpaceRecord {
  id: string;
  name: string;
  category: string;
  owner_id: number;
  owner_username?: string;
  is_public: boolean;
  is_superadmin_space: boolean;
  whitelist: string[]; // usernames allowed if private
  tiles?: Record<string, string>;
  private_zones?: PrivateZone[];
  jukeboxes?: JukeboxState[];
  typewriters?: TypewriterState[];
  ashtrays?: AshtrayState[];
  created_at: Date;
  updated_at: Date;
}

// In-memory fallback (used only if database is offline or temporarily reconnecting)
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemorySpaces: Map<string, SpaceRecord> = new Map();
const inMemoryChats: ChatMessage[] = [];
let inMemoryIdCounter = 1;

/**
 * Seed initial superadmin accounts and default spaces
 */
async function seedDefaultData(isPostgres: boolean, client?: PoolClient) {
  const defaultSuperadmins = [
    { username: "admin", password: "adminpassword123", displayName: "Server Admin" },
    { username: "superadmin", password: "adminpassword123", displayName: "Super Administrator" },
  ];

  for (const adminData of defaultSuperadmins) {
    const passwordHash = hashPassword(adminData.password);
    if (isPostgres && client) {
      const existing = await client.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
        [adminData.username]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO users (username, display_name, password_hash, role)
           VALUES ($1, $2, $3, 'superadmin')`,
          [adminData.username, adminData.displayName, passwordHash]
        );
      } else {
        await client.query("UPDATE users SET role = 'superadmin' WHERE id = $1", [
          existing.rows[0].id,
        ]);
      }
    } else {
      const lower = adminData.username.toLowerCase();
      if (!inMemoryUsers.has(lower)) {
        const record: UserRecord = {
          id: inMemoryIdCounter++,
          username: adminData.username,
          display_name: adminData.displayName,
          password_hash: passwordHash,
          role: "superadmin",
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryUsers.set(lower, record);
      }
    }
  }

  // Get admin user ID for default spaces
  let adminId = 1;
  if (isPostgres && client) {
    const adminUser = await client.query(
      "SELECT id FROM users WHERE LOWER(username) = 'admin' LIMIT 1"
    );
    if (adminUser.rows.length > 0) {
      adminId = adminUser.rows[0].id;
    }
  } else {
    const adminUser = inMemoryUsers.get("admin");
    if (adminUser) adminId = adminUser.id;
  }

  // Default spaces for fresh database setup
  const defaultSpaces = [
    {
      id: "space_central_plaza",
      name: "CO3",
      category: "Hangout Lounges",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
  ];

  if (isPostgres && client) {
    const countRes = await client.query("SELECT COUNT(*) FROM spaces");
    const totalSpaces = parseInt(countRes.rows[0].count, 10);
    if (totalSpaces === 0) {
      for (const s of defaultSpaces) {
        await client.query(
          `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [s.id, s.name, s.category, adminId, s.is_public, s.is_superadmin_space, JSON.stringify(s.whitelist)]
        );
      }
    }
  } else {
    if (inMemorySpaces.size === 0) {
      for (const s of defaultSpaces) {
        inMemorySpaces.set(s.id, {
          id: s.id,
          name: s.name,
          category: s.category,
          owner_id: adminId,
          owner_username: "admin",
          is_public: s.is_public,
          is_superadmin_space: s.is_superadmin_space,
          whitelist: s.whitelist,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }
}

/**
 * Initialize all database tables, columns, and indexes in PostgreSQL
 */
async function setupDatabaseSchema(client: PoolClient) {
  // 1. Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
  `);

  // 2. Players table
  await client.query(`
    CREATE TABLE IF NOT EXISTS players (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      color VARCHAR(30) NOT NULL,
      x DOUBLE PRECISION DEFAULT 400,
      y DOUBLE PRECISION DEFAULT 300,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players (last_seen DESC);
  `);

  // 3. Spaces table with custom map tiles, zones, jukeboxes, typewriters
  await client.query(`
    CREATE TABLE IF NOT EXISTS spaces (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) DEFAULT 'General',
      owner_id INT REFERENCES users(id) ON DELETE SET NULL,
      is_public BOOLEAN DEFAULT TRUE,
      is_superadmin_space BOOLEAN DEFAULT FALSE,
      whitelist JSONB DEFAULT '[]'::jsonb,
      tiles JSONB DEFAULT '{}'::jsonb,
      private_zones JSONB DEFAULT '[]'::jsonb,
      jukeboxes JSONB DEFAULT '[]'::jsonb,
      typewriters JSONB DEFAULT '[]'::jsonb,
      ashtrays JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS tiles JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS private_zones JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS jukeboxes JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS typewriters JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS ashtrays JSONB DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_spaces_superadmin ON spaces (is_superadmin_space, category);

    -- Auto-migrate legacy tile assets in all spaces
    UPDATE spaces
    SET tiles = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(tiles::text, 'birch_floor_150', 'wood_5'),
            'birch_floor_100', 'wood_5'
          ),
          'carpet_grey_150', 'carpet_4'
        ),
        'grass_150', 'grass_4'
      ),
      'grass_100', 'grass_4'
    )::jsonb
    WHERE tiles IS NOT NULL AND tiles != '{}'::jsonb;
  `);

  // 4. Chat messages table for full persistence across server restarts
  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(64) PRIMARY KEY,
      sender_id VARCHAR(64) NOT NULL,
      sender_name VARCHAR(50) NOT NULL,
      sender_color VARCHAR(30) DEFAULT '#3b82f6',
      is_superadmin BOOLEAN DEFAULT FALSE,
      room_type VARCHAR(20) NOT NULL,
      room_id VARCHAR(64) NOT NULL,
      room_name VARCHAR(100),
      target_id VARCHAR(64),
      target_name VARCHAR(50),
      text TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages (room_type, room_id, timestamp ASC);
  `);
}

/**
 * If the server had to accept users/spaces/chats while in fallback mode,
 * gracefully sync them to PostgreSQL upon reconnection.
 */
async function syncInMemoryToPostgres(client: PoolClient) {
  // Sync users
  for (const user of inMemoryUsers.values()) {
    try {
      const existing = await client.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
        [user.username]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO users (username, display_name, password_hash, role)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [user.username, user.display_name, user.password_hash, user.role]
        );
      }
    } catch (err) {
      console.warn(`[DB Sync] Error syncing user ${user.username}:`, err);
    }
  }

  // Load canonical spaces from PostgreSQL into inMemorySpaces cache (PostgreSQL is source of truth)
  try {
    const res = await client.query("SELECT * FROM spaces");
    inMemorySpaces.clear();
    for (const row of res.rows) {
      inMemorySpaces.set(row.id, {
        id: row.id,
        name: row.name,
        category: row.category || "General",
        owner_id: row.owner_id,
        is_public: row.is_public,
        is_superadmin_space: row.is_superadmin_space,
        whitelist: parseWhitelist(row.whitelist),
        tiles: typeof row.tiles === "string" ? JSON.parse(row.tiles) : (row.tiles || {}),
        private_zones: parsePrivateZones(row.private_zones),
        jukeboxes: parseJukeboxes(row.jukeboxes),
        typewriters: parseTypewriters(row.typewriters),
        ashtrays: parseAshtrays(row.ashtrays),
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }
  } catch (err) {
    console.warn("[DB Sync] Error loading spaces from DB into cache:", err);
  }

  // Sync chat messages
  for (const msg of inMemoryChats) {
    try {
      await client.query(
        `INSERT INTO chat_messages (id, sender_id, sender_name, sender_color, is_superadmin, room_type, room_id, room_name, target_id, target_name, text, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          msg.id,
          msg.senderId,
          msg.senderName,
          msg.senderColor || "#3b82f6",
          !!msg.isSuperadmin,
          msg.roomType,
          msg.roomId,
          msg.roomName || null,
          msg.targetId || null,
          msg.targetName || null,
          msg.text,
          msg.timestamp || Date.now(),
        ]
      );
    } catch (err) {
      console.warn(`[DB Sync] Error syncing chat message ${msg.id}:`, err);
    }
  }
}

/**
 * Attempts connection and setup against PostgreSQL
 */
async function tryConnectDb(): Promise<boolean> {
  if (isReconnecting) return false;
  isReconnecting = true;
  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL database in Docker (port 5433)!");

    await setupDatabaseSchema(client);
    await seedDefaultData(true, client);
    await syncInMemoryToPostgres(client);

    client.release();
    isDbConnected = true;
    isReconnecting = false;
    return true;
  } catch (err: any) {
    console.error("Failed to connect to PostgreSQL:", err.message);
    isDbConnected = false;
    isReconnecting = false;
    scheduleReconnect();
    return false;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await tryConnectDb();
  }, 4000);
}

function handleDbQueryError(context: string, err: any) {
  console.error(`${context}:`, err);
  const isConnError =
    err?.code === "ECONNREFUSED" ||
    err?.code === "57P01" ||
    err?.code === "57P02" ||
    err?.code === "57P03" ||
    err?.code === "08000" ||
    err?.code === "08003" ||
    err?.code === "08006" ||
    err?.code === "08001" ||
    err?.code === "08004" ||
    (typeof err?.message === "string" && (
      err.message.includes("Connection terminated") ||
      err.message.includes("client has already been released") ||
      err.message.includes("connection closed")
    ));

  if (isConnError) {
    console.warn(`[DB] Database connection lost during "${context}". Scheduling reconnect.`);
    isDbConnected = false;
    scheduleReconnect();
  }
}

/**
 * Initializes database with automatic retry loop for Docker boot-up
 */
export async function initDb(): Promise<boolean> {
  // Pre-seed in-memory defaults so fallback is instant if needed
  await seedDefaultData(false);

  // Attempt connection with up to 5 immediate retries (useful when docker container is starting)
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await tryConnectDb();
    if (ok) return true;
    if (attempt < maxAttempts) {
      console.log(`[DB] Waiting for PostgreSQL in Docker (attempt ${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.warn(
    "⚠️ PostgreSQL connection could not be established immediately. Server running with in-memory fallback (background auto-reconnect is active)."
  );
  scheduleReconnect();
  return false;
}

export function isDatabaseHealthy(): boolean {
  return isDbConnected;
}

// ==========================================
// User Database Operations
// ==========================================

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const cleanUsername = username.trim();
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT id, username, display_name, password_hash, role, created_at, updated_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
        [cleanUsername]
      );
      if (res.rows[0]) {
        return {
          ...res.rows[0],
          role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
        };
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error finding user by username", err);
    }
  }

  // Fallback in-memory
  const lower = cleanUsername.toLowerCase();
  for (const user of inMemoryUsers.values()) {
    if (user.username.toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

export async function findUserById(id: number): Promise<UserRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT id, username, display_name, password_hash, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1",
        [id]
      );
      if (res.rows[0]) {
        return {
          ...res.rows[0],
          role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
        };
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error finding user by id", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      return user;
    }
  }
  return null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  displayName?: string | null,
  role: "user" | "superadmin" = "user"
): Promise<UserRecord> {
  const cleanUsername = username.trim();
  const cleanDisplayName = displayName && displayName.trim() ? displayName.trim().slice(0, 30) : null;

  let createdUser: UserRecord;

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO users (username, display_name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, display_name, password_hash, role, created_at, updated_at`,
        [cleanUsername, cleanDisplayName, passwordHash, role]
      );
      createdUser = {
        ...res.rows[0],
        role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
      };
      // Keep in-memory cache aligned
      inMemoryUsers.set(cleanUsername.toLowerCase(), createdUser);
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new Error("Username is already taken.");
      }
      handleDbQueryError("Error creating user in DB, falling back to in-memory", err);
      const record: UserRecord = {
        id: inMemoryIdCounter++,
        username: cleanUsername,
        display_name: cleanDisplayName,
        password_hash: passwordHash,
        role,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryUsers.set(cleanUsername.toLowerCase(), record);
      createdUser = record;
    }
  } else {
    const record: UserRecord = {
      id: inMemoryIdCounter++,
      username: cleanUsername,
      display_name: cleanDisplayName,
      password_hash: passwordHash,
      role,
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemoryUsers.set(cleanUsername.toLowerCase(), record);
    createdUser = record;
  }

  // Ensure each user has their own personal space created!
  await ensureUserPersonalSpace(createdUser.id, createdUser.username);

  return createdUser;
}

export async function updateUserDisplayName(
  id: number,
  displayName: string | null
): Promise<UserRecord | null> {
  const cleanDisplayName = displayName && displayName.trim() ? displayName.trim().slice(0, 30) : null;

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET display_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, username, display_name, password_hash, role, created_at, updated_at`,
        [id, cleanDisplayName]
      );
      if (res.rows[0]) {
        const updated = {
          ...res.rows[0],
          role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
        };
        inMemoryUsers.set(updated.username.toLowerCase(), updated);
        return updated;
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error updating user display name", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      user.display_name = cleanDisplayName;
      user.updated_at = new Date();
      return user;
    }
  }
  return null;
}

// ==========================================
// Space Database Operations
// ==========================================

function parseWhitelist(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parsePrivateZones(raw: any): PrivateZone[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parseJukeboxes(raw: any): JukeboxState[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parseTypewriters(raw: any): TypewriterState[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parseAshtrays(raw: any): AshtrayState[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export async function getSuperadminSpaces(): Promise<SpaceRecord[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(`
        SELECT s.id, s.name, s.category, s.owner_id, s.is_public, s.is_superadmin_space, s.whitelist, s.created_at, s.updated_at,
               u.username as owner_username
        FROM spaces s
        LEFT JOIN users u ON s.owner_id = u.id
        WHERE s.is_superadmin_space = true
        ORDER BY s.category ASC, s.name ASC
      `);
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category || "General",
        owner_id: row.owner_id,
        owner_username: row.owner_username || "admin",
        is_public: row.is_public,
        is_superadmin_space: true,
        whitelist: parseWhitelist(row.whitelist),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      handleDbQueryError("Error fetching superadmin spaces", err);
    }
  }

  // Fallback in-memory
  const results: SpaceRecord[] = [];
  for (const space of inMemorySpaces.values()) {
    if (space.is_superadmin_space) {
      results.push({ ...space, whitelist: [...space.whitelist] });
    }
  }
  return results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function getSpaceById(id: string): Promise<SpaceRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.category, s.owner_id, s.is_public, s.is_superadmin_space, s.whitelist, s.private_zones, s.jukeboxes, s.typewriters, s.ashtrays, s.created_at, s.updated_at,
                u.username as owner_username
         FROM spaces s
         LEFT JOIN users u ON s.owner_id = u.id
         WHERE s.id = $1 LIMIT 1`,
        [id]
      );
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          category: row.category || "General",
          owner_id: row.owner_id,
          owner_username: row.owner_username || "User",
          is_public: row.is_public,
          is_superadmin_space: row.is_superadmin_space,
          whitelist: parseWhitelist(row.whitelist),
          private_zones: parsePrivateZones(row.private_zones),
          jukeboxes: parseJukeboxes(row.jukeboxes),
          typewriters: parseTypewriters(row.typewriters),
          ashtrays: parseAshtrays(row.ashtrays),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error fetching space by id", err);
    }
  }

  const space = inMemorySpaces.get(id);
  return space
    ? {
        ...space,
        whitelist: [...space.whitelist],
        private_zones: space.private_zones ? [...space.private_zones] : [],
        jukeboxes: space.jukeboxes ? [...space.jukeboxes] : [],
        typewriters: space.typewriters ? [...space.typewriters] : [],
        ashtrays: space.ashtrays ? [...space.ashtrays] : [],
      }
    : null;
}

export async function getUserPersonalSpace(userId: number): Promise<SpaceRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.category, s.owner_id, s.is_public, s.is_superadmin_space, s.whitelist, s.created_at, s.updated_at,
                u.username as owner_username
         FROM spaces s
         LEFT JOIN users u ON s.owner_id = u.id
         WHERE s.owner_id = $1 AND s.is_superadmin_space = false
         LIMIT 1`,
        [userId]
      );
      if (res.rows[0]) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          category: "Personal",
          owner_id: row.owner_id,
          owner_username: row.owner_username || "User",
          is_public: row.is_public,
          is_superadmin_space: false,
          whitelist: parseWhitelist(row.whitelist),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }
    } catch (err) {
      handleDbQueryError("Error getting user personal space", err);
    }
  }

  for (const space of inMemorySpaces.values()) {
    if (space.owner_id === userId && !space.is_superadmin_space) {
      return { ...space, whitelist: [...space.whitelist] };
    }
  }
  return null;
}

export async function ensureUserPersonalSpace(userId: number, username: string): Promise<SpaceRecord | null> {
  // First, verify the user actually exists in the database
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  const existing = await getUserPersonalSpace(userId);
  if (existing) {
    return existing;
  }

  const spaceId = `user_space_${userId}`;
  const spaceName = `${username}'s Space`;
  const isPublic = false;
  const whitelist: string[] = [];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
         VALUES ($1, $2, 'Personal', $3, $4, false, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id
         RETURNING id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at`,
        [spaceId, spaceName, userId, isPublic, JSON.stringify(whitelist)]
      );
      const row = res.rows[0];
      const record: SpaceRecord = {
        id: row.id,
        name: row.name,
        category: "Personal",
        owner_id: row.owner_id,
        owner_username: username,
        is_public: row.is_public,
        is_superadmin_space: false,
        whitelist,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      inMemorySpaces.set(spaceId, record);
      return record;
    } catch (err: any) {
      handleDbQueryError("Error creating personal space in DB", err);
      if (err?.code === "23503") {
        return null;
      }
    }
  }

  if (!isDbConnected) {
    const record: SpaceRecord = {
      id: spaceId,
      name: spaceName,
      category: "Personal",
      owner_id: userId,
      owner_username: username,
      is_public: isPublic,
      is_superadmin_space: false,
      whitelist,
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemorySpaces.set(spaceId, record);
    return record;
  }

  return null;
}

export async function createSuperadminSpace(params: {
  name: string;
  category: string;
  isPublic: boolean;
  ownerId: number;
  whitelist?: string[];
}): Promise<SpaceRecord> {
  const id = `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = params.name.trim().slice(0, 50);
  const cleanCategory = params.category.trim().slice(0, 40) || "General";
  const whitelist = params.whitelist || [];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
         VALUES ($1, $2, $3, $4, $5, true, $6)
         RETURNING id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at`,
        [id, cleanName, cleanCategory, params.ownerId, params.isPublic, JSON.stringify(whitelist)]
      );
      const row = res.rows[0];
      const record: SpaceRecord = {
        id: row.id,
        name: row.name,
        category: row.category,
        owner_id: row.owner_id,
        is_public: row.is_public,
        is_superadmin_space: true,
        whitelist: parseWhitelist(row.whitelist),
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      inMemorySpaces.set(id, record);
      return record;
    } catch (err) {
      handleDbQueryError("Error creating superadmin space in DB", err);
    }
  }

  const record: SpaceRecord = {
    id,
    name: cleanName,
    category: cleanCategory,
    owner_id: params.ownerId,
    is_public: params.isPublic,
    is_superadmin_space: true,
    whitelist,
    created_at: new Date(),
    updated_at: new Date(),
  };
  inMemorySpaces.set(id, record);
  return record;
}

export async function updateSpace(
  spaceId: string,
  updates: {
    name?: string;
    category?: string;
    isPublic?: boolean;
    whitelist?: string[];
  }
): Promise<SpaceRecord | null> {
  const existing = await getSpaceById(spaceId);
  if (!existing) return null;

  const newName = updates.name !== undefined ? updates.name.trim().slice(0, 50) : existing.name;
  const newCategory = updates.category !== undefined ? updates.category.trim().slice(0, 40) : existing.category;
  const newIsPublic = updates.isPublic !== undefined ? !!updates.isPublic : existing.is_public;
  const newWhitelist = updates.whitelist !== undefined ? updates.whitelist : existing.whitelist;

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE spaces
         SET name = $2, category = $3, is_public = $4, whitelist = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at`,
        [spaceId, newName, newCategory, newIsPublic, JSON.stringify(newWhitelist)]
      );
      if (res.rows[0]) {
        const row = res.rows[0];
        const updatedRecord: SpaceRecord = {
          id: row.id,
          name: row.name,
          category: row.category,
          owner_id: row.owner_id,
          is_public: row.is_public,
          is_superadmin_space: row.is_superadmin_space,
          whitelist: parseWhitelist(row.whitelist),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        inMemorySpaces.set(spaceId, updatedRecord);
        return updatedRecord;
      }
    } catch (err) {
      handleDbQueryError("Error updating space in DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.name = newName;
    inMem.category = newCategory;
    inMem.is_public = newIsPublic;
    inMem.whitelist = newWhitelist;
    inMem.updated_at = new Date();
    return { ...inMem, whitelist: [...inMem.whitelist] };
  }
  return null;
}

export async function deleteSpace(spaceId: string): Promise<boolean> {
  let deleted = false;
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "DELETE FROM spaces WHERE id = $1 AND is_superadmin_space = true",
        [spaceId]
      );
      deleted = (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("Error deleting space from DB:", err);
    }
  }

  inMemorySpaces.delete(spaceId);
  return deleted;
}

/**
 * Migrate legacy floor tile identifiers:
 * - birch_floor_150 / birch_floor_100 -> wood_5 (90 degree)
 * - carpet_grey_150 -> carpet_4
 * - grass_150 / grass_100 -> grass_4
 */
export function migrateTileString(tileStr: string): string {
  if (!tileStr) return tileStr;
  return tileStr
    .replace(/\bbirch_floor_150\b/g, "wood_5")
    .replace(/\bbirch_floor_100\b/g, "wood_5")
    .replace(/\bcarpet_grey_150\b/g, "carpet_4")
    .replace(/\bgrass_150\b/g, "grass_4")
    .replace(/\bgrass_100\b/g, "grass_4");
}

export function migrateTilesMap(tiles: Record<string, string>): Record<string, string> {
  if (!tiles || typeof tiles !== "object") return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(tiles)) {
    result[k] = migrateTileString(v);
  }
  return result;
}

/**
 * Get custom map tiles for a space
 */
export async function getSpaceTiles(spaceId: string): Promise<Record<string, string>> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT tiles FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.tiles) {
        const rawTiles = typeof res.rows[0].tiles === "string"
          ? JSON.parse(res.rows[0].tiles)
          : res.rows[0].tiles;
        return migrateTilesMap(rawTiles || {});
      }
    } catch (err) {
      handleDbQueryError("Error fetching space tiles from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.tiles ? migrateTilesMap(inMem.tiles) : {};
}

/**
 * Update and persist custom map tiles for a space.
 * Guarantees that tiles are never dropped if space row is missing.
 */
export async function updateSpaceTiles(
  spaceId: string,
  tiles: Record<string, string>
): Promise<boolean> {
  const migratedTiles = migrateTilesMap(tiles);
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET tiles = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(migratedTiles)]
      );
      if (res.rowCount === 0) {
        // Space record did not exist yet; insert it so map tiles are preserved
        await pool.query(
          `INSERT INTO spaces (id, name, category, is_public, tiles)
           VALUES ($1, $2, 'General', true, $3)
           ON CONFLICT (id) DO UPDATE SET tiles = EXCLUDED.tiles, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(migratedTiles),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space tiles in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (!inMem) {
    inMem = {
      id: spaceId,
      name: spaceId,
      category: "General",
      owner_id: 1,
      is_public: true,
      is_superadmin_space: false,
      whitelist: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemorySpaces.set(spaceId, inMem);
  }
  inMem.tiles = { ...migratedTiles };
  inMem.updated_at = new Date();
  return true;
}

/**
 * Get custom private zones for a space
 */
export async function getSpacePrivateZones(spaceId: string): Promise<PrivateZone[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT private_zones FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.private_zones) {
        return parsePrivateZones(res.rows[0].private_zones);
      }
    } catch (err) {
      handleDbQueryError("Error fetching space private zones from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.private_zones ? [...inMem.private_zones] : [];
}

/**
 * Update and persist private zones for a space
 */
export async function updateSpacePrivateZones(
  spaceId: string,
  zones: PrivateZone[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET private_zones = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(zones)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, category, is_public, private_zones)
           VALUES ($1, $2, 'General', true, $3)
           ON CONFLICT (id) DO UPDATE SET private_zones = EXCLUDED.private_zones, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(zones),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space private zones in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.private_zones = [...zones];
    inMem.updated_at = new Date();
  }
  return true;
}

/**
 * Get jukeboxes for a space
 */
export async function getSpaceJukeboxes(spaceId: string): Promise<JukeboxState[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT jukeboxes FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.jukeboxes) {
        return parseJukeboxes(res.rows[0].jukeboxes);
      }
    } catch (err) {
      handleDbQueryError("Error fetching space jukeboxes from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.jukeboxes ? [...inMem.jukeboxes] : [];
}

/**
 * Update and persist jukeboxes for a space
 */
export async function updateSpaceJukeboxes(
  spaceId: string,
  jukeboxes: JukeboxState[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET jukeboxes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(jukeboxes)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, category, is_public, jukeboxes)
           VALUES ($1, $2, 'General', true, $3)
           ON CONFLICT (id) DO UPDATE SET jukeboxes = EXCLUDED.jukeboxes, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(jukeboxes),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space jukeboxes in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.jukeboxes = [...jukeboxes];
    inMem.updated_at = new Date();
  }
  return true;
}

/**
 * Get typewriters for a space
 */
export async function getSpaceTypewriters(spaceId: string): Promise<TypewriterState[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT typewriters FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.typewriters) {
        return parseTypewriters(res.rows[0].typewriters);
      }
    } catch (err) {
      handleDbQueryError("Error fetching space typewriters from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.typewriters ? [...inMem.typewriters] : [];
}

/**
 * Update and persist typewriters for a space
 */
export async function updateSpaceTypewriters(
  spaceId: string,
  typewriters: TypewriterState[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET typewriters = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(typewriters)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, category, is_public, typewriters)
           VALUES ($1, $2, 'General', true, $3)
           ON CONFLICT (id) DO UPDATE SET typewriters = EXCLUDED.typewriters, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(typewriters),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space typewriters in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.typewriters = [...typewriters];
    inMem.updated_at = new Date();
  }
  return true;
}

/**
 * Get ashtrays for a space
 */
export async function getSpaceAshtrays(spaceId: string): Promise<AshtrayState[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT ashtrays FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.ashtrays) {
        return parseAshtrays(res.rows[0].ashtrays);
      }
    } catch (err) {
      handleDbQueryError("Error fetching space ashtrays from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.ashtrays ? [...inMem.ashtrays] : [];
}

/**
 * Update and persist ashtrays for a space
 */
export async function updateSpaceAshtrays(
  spaceId: string,
  ashtrays: AshtrayState[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET ashtrays = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(ashtrays)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, category, is_public, ashtrays)
           VALUES ($1, $2, 'General', true, $3)
           ON CONFLICT (id) DO UPDATE SET ashtrays = EXCLUDED.ashtrays, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(ashtrays),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space ashtrays in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.ashtrays = [...ashtrays];
    inMem.updated_at = new Date();
  }
  return true;
}

// ==========================================
// Chat Messages Database Operations
// ==========================================

/**
 * Save chat message to PostgreSQL
 */
export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  // Always maintain recent cache
  inMemoryChats.push(msg);
  if (inMemoryChats.length > 500) {
    inMemoryChats.shift();
  }

  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO chat_messages (id, sender_id, sender_name, sender_color, is_superadmin, room_type, room_id, room_name, target_id, target_name, text, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          msg.id,
          msg.senderId,
          msg.senderName,
          msg.senderColor || "#3b82f6",
          !!msg.isSuperadmin,
          msg.roomType,
          msg.roomId,
          msg.roomName || null,
          msg.targetId || null,
          msg.targetName || null,
          msg.text,
          msg.timestamp || Date.now(),
        ]
      );
    } catch (err) {
      handleDbQueryError("Error saving chat message to DB", err);
    }
  }
}

/**
 * Get recent chat messages for a room/space (ordered chronologically)
 */
export async function getRecentChatMessages(
  roomId: string,
  roomType: ChatRoomType,
  limit: number = 50
): Promise<ChatMessage[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT id, sender_id, sender_name, sender_color, is_superadmin, room_type, room_id, room_name, target_id, target_name, text, timestamp
         FROM (
           SELECT * FROM chat_messages
           WHERE room_id = $1 AND room_type = $2
           ORDER BY timestamp DESC
           LIMIT $3
         ) sub
         ORDER BY timestamp ASC`,
        [roomId, roomType, limit]
      );
      return res.rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        senderColor: row.sender_color,
        isSuperadmin: !!row.is_superadmin,
        roomType: row.room_type as ChatRoomType,
        roomId: row.room_id,
        roomName: row.room_name || "",
        targetId: row.target_id || undefined,
        targetName: row.target_name || undefined,
        text: row.text,
        timestamp: Number(row.timestamp),
      }));
    } catch (err) {
      handleDbQueryError("Error getting recent chat messages from DB", err);
    }
  }

  // Fallback in-memory
  return inMemoryChats
    .filter((m) => m.roomId === roomId && m.roomType === roomType)
    .slice(-limit);
}

// ==========================================
// Player Positioning Operations
// ==========================================

export async function upsertPlayer(player: {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}): Promise<void> {
  if (!isDbConnected) return;

  const query = `
    INSERT INTO players (id, name, color, x, y, last_seen)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (id) 
    DO UPDATE SET 
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      last_seen = CURRENT_TIMESTAMP;
  `;

  try {
    await pool.query(query, [
      player.id,
      player.name,
      player.color,
      player.x,
      player.y,
    ]);
  } catch (err) {
    console.error("Error upserting player to DB:", err);
  }
}

export async function updatePlayerPosition(
  id: string,
  x: number,
  y: number
): Promise<void> {
  if (!isDbConnected) return;

  const query = `
    UPDATE players
    SET x = $2, y = $3, last_seen = CURRENT_TIMESTAMP
    WHERE id = $1;
  `;

  try {
    await pool.query(query, [id, x, y]);
  } catch (err) {
    console.error("Error updating player position in DB:", err);
  }
}

export async function getAllSavedPlayers() {
  if (!isDbConnected) return [];
  try {
    const res = await pool.query(
      "SELECT id, name, color, x, y, last_seen FROM players ORDER BY last_seen DESC LIMIT 50"
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching players from DB:", err);
    return [];
  }
}
