import { Pool } from "pg";
import dotenv from "dotenv";

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
  created_at: Date;
  updated_at: Date;
}

// In-memory fallback in case Postgres is disconnected
const inMemoryUsers: Map<string, UserRecord> = new Map();
let inMemoryIdCounter = 1;

export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL database in Docker (port 5433)!");

    // Initialize users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
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

    client.release();
    isDbConnected = true;
    return true;
  } catch (err: any) {
    console.warn(
      `⚠️ PostgreSQL connection failed: ${err.message}. (Make sure Docker container is running via 'npm run db:up'). Server will run with in-memory storage fallback.`
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
        "SELECT id, username, display_name, password_hash, created_at, updated_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
        [cleanUsername]
      );
      return res.rows[0] || null;
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
        "SELECT id, username, display_name, password_hash, created_at, updated_at FROM users WHERE id = $1 LIMIT 1",
        [id]
      );
      return res.rows[0] || null;
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
 * Create a new user record.
 */
export async function createUser(
  username: string,
  passwordHash: string,
  displayName?: string | null
): Promise<UserRecord> {
  const cleanUsername = username.trim();
  const cleanDisplayName = displayName && displayName.trim() ? displayName.trim().slice(0, 30) : null;

  if (isDbConnected) {
    const res = await pool.query(
      `INSERT INTO users (username, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, display_name, password_hash, created_at, updated_at`,
      [cleanUsername, cleanDisplayName, passwordHash]
    );
    return res.rows[0];
  }

  // Fallback in-memory
  const record: UserRecord = {
    id: inMemoryIdCounter++,
    username: cleanUsername,
    display_name: cleanDisplayName,
    password_hash: passwordHash,
    created_at: new Date(),
    updated_at: new Date(),
  };
  inMemoryUsers.set(cleanUsername.toLowerCase(), record);
  return record;
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
         RETURNING id, username, display_name, password_hash, created_at, updated_at`,
        [id, cleanDisplayName]
      );
      return res.rows[0] || null;
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
