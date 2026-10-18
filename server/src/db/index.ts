import { Pool } from "pg";
import dotenv from "dotenv";
import { hashPassword } from "../auth";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  user: process.env.DB_USER || "gameuser",
  password: process.env.DB_PASSWORD || "gamepassword",
  database: process.env.DB_NAME || "gamedb",
  connectionTimeoutMillis: 3000,
  max: 10,
});

let isDbConnected = false;

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
  created_at: Date;
  updated_at: Date;
}

// In-memory fallback
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemorySpaces: Map<string, SpaceRecord> = new Map();
let inMemoryIdCounter = 1;

/**
 * Seed initial superadmin accounts and default spaces
 */
async function seedDefaultData(isPostgres: boolean, client?: any) {
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
        // Ensure role is superadmin
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

  // Default superadmin spaces with rich categories
  const defaultSpaces = [
    {
      id: "space_central_plaza",
      name: "Central Plaza",
      category: "Town Square",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
    {
      id: "space_town_hall",
      name: "Town Hall",
      category: "Town Square",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
    {
      id: "space_neon_cafe",
      name: "Neon Café",
      category: "Hangout Lounges",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
    {
      id: "space_vip_lounge",
      name: "VIP Sky Lounge",
      category: "Hangout Lounges",
      is_public: false,
      is_superadmin_space: true,
      whitelist: ["admin", "superadmin"],
    },
    {
      id: "space_retro_arcade",
      name: "Retro Arcade",
      category: "Gaming Zones",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
    {
      id: "space_botanical_garden",
      name: "Botanical Garden",
      category: "Chill Parks",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [],
    },
  ];

  for (const s of defaultSpaces) {
    if (isPostgres && client) {
      const existing = await client.query("SELECT id FROM spaces WHERE id = $1", [s.id]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [s.id, s.name, s.category, adminId, s.is_public, s.is_superadmin_space, JSON.stringify(s.whitelist)]
        );
      }
    } else {
      if (!inMemorySpaces.has(s.id)) {
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

export async function initDb(): Promise<boolean> {
  // Always seed in-memory defaults first so fallback is immediately ready
  await seedDefaultData(false);

  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL database in Docker (port 5433)!");

    // Initialize users table with role column
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
    `);

    // Ensure role column exists if table was created previously without it
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `);

    // Initialize players table
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
    `);

    // Initialize spaces table
    await client.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        owner_id INT REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT TRUE,
        is_superadmin_space BOOLEAN DEFAULT FALSE,
        whitelist JSONB DEFAULT '[]'::jsonb,
        tiles JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE spaces ADD COLUMN IF NOT EXISTS tiles JSONB DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_spaces_superadmin ON spaces (is_superadmin_space, category);
    `);

    // Seed default admin and spaces into Postgres
    await seedDefaultData(true, client);

    client.release();
    isDbConnected = true;
    return true;
  } catch (err: any) {
    console.warn(
      `⚠️ PostgreSQL connection failed: ${err.message}. (Server running with in-memory storage fallback).`
    );
    isDbConnected = false;
    return false;
  }
}

export function isDatabaseHealthy(): boolean {
  return isDbConnected;
}

/**
 * Find user by case-insensitive username.
 */
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
      console.error("Error finding user by username:", err);
      return null;
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

/**
 * Find user by ID.
 */
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
      console.error("Error finding user by id:", err);
      return null;
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      return user;
    }
  }
  return null;
}

/**
 * Create a new user record and automatically initialize their personal space.
 */
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
  } else {
    // Fallback in-memory
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

/**
 * Update display name for a user.
 */
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
        return {
          ...res.rows[0],
          role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
        };
      }
      return null;
    } catch (err) {
      console.error("Error updating user display name:", err);
      return null;
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

/**
 * Get all superadmin spaces (visible in listing), grouped or filterable by category.
 */
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
      console.error("Error fetching superadmin spaces:", err);
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

/**
 * Get single space by ID.
 */
export async function getSpaceById(id: string): Promise<SpaceRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.category, s.owner_id, s.is_public, s.is_superadmin_space, s.whitelist, s.created_at, s.updated_at,
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
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error("Error fetching space by id:", err);
      return null;
    }
  }

  const space = inMemorySpaces.get(id);
  return space ? { ...space, whitelist: [...space.whitelist] } : null;
}

/**
 * Get a user's single personal space.
 */
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
      console.error("Error getting user personal space:", err);
    }
  }

  for (const space of inMemorySpaces.values()) {
    if (space.owner_id === userId && !space.is_superadmin_space) {
      return { ...space, whitelist: [...space.whitelist] };
    }
  }
  return null;
}

/**
 * Ensure each user has their 1 personal space created.
 */
export async function ensureUserPersonalSpace(userId: number, username: string): Promise<SpaceRecord> {
  const existing = await getUserPersonalSpace(userId);
  if (existing) {
    return existing;
  }

  const spaceId = `user_space_${userId}`;
  const spaceName = `${username}'s Space`;
  const isPublic = false; // default private for personal spaces
  const whitelist: string[] = [];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
         VALUES ($1, $2, 'Personal', $3, $4, false, $5)
         RETURNING id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at`,
        [spaceId, spaceName, userId, isPublic, JSON.stringify(whitelist)]
      );
      const row = res.rows[0];
      return {
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
    } catch (err) {
      console.error("Error creating personal space in DB:", err);
    }
  }

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

/**
 * Superadmin creates a new space (public or private with category).
 */
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
    const res = await pool.query(
      `INSERT INTO spaces (id, name, category, owner_id, is_public, is_superadmin_space, whitelist)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, name, category, owner_id, is_public, is_superadmin_space, whitelist, created_at, updated_at`,
      [id, cleanName, cleanCategory, params.ownerId, params.isPublic, JSON.stringify(whitelist)]
    );
    const row = res.rows[0];
    return {
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

/**
 * Update space settings (name, category, is_public, whitelist).
 */
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
        return {
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
      }
    } catch (err) {
      console.error("Error updating space in DB:", err);
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

/**
 * Delete a space (superadmin spaces only).
 */
export async function deleteSpace(spaceId: string): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "DELETE FROM spaces WHERE id = $1 AND is_superadmin_space = true",
        [spaceId]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("Error deleting space from DB:", err);
      return false;
    }
  }

  const space = inMemorySpaces.get(spaceId);
  if (space && space.is_superadmin_space) {
    return inMemorySpaces.delete(spaceId);
  }
  return false;
}

/**
 * Get custom map tiles for a space
 */
export async function getSpaceTiles(spaceId: string): Promise<Record<string, string>> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT tiles FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.tiles) {
        return typeof res.rows[0].tiles === "string"
          ? JSON.parse(res.rows[0].tiles)
          : res.rows[0].tiles;
      }
    } catch (err) {
      console.error("Error fetching space tiles from DB:", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.tiles ? { ...inMem.tiles } : {};
}

/**
 * Update and persist custom map tiles for a space
 */
export async function updateSpaceTiles(
  spaceId: string,
  tiles: Record<string, string>
): Promise<boolean> {
  if (isDbConnected) {
    try {
      await pool.query(
        "UPDATE spaces SET tiles = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(tiles)]
      );
    } catch (err) {
      console.error("Error updating space tiles in DB:", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.tiles = { ...tiles };
    inMem.updated_at = new Date();
  }
  return true;
}

/**
 * Upsert player in DB
 */
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
