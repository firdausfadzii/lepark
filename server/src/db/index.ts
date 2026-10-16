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

export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL database in Docker (port 5433)!");

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
