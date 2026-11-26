import crypto from "crypto";
import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";
import { hashPassword } from "../auth";
import { buildRestaurantBistroTiles } from "../services/RestaurantMapBuilder";
import {
  PrivateZone,
  JukeboxState,
  TypewriterState,
  AshtrayState,
  ChessBoardState,
  AquariumState,
  SellerNpcState,
  ChatMessage,
  ChatRoomType,
  Organisation,
  OrganisationMember,
  ORGANISATION_CREATION_COST,
  NoteType,
  NoteDto,
  AccessibleNoteSpace,
  CalendarType,
  CalendarRepeatUnit,
  CalendarAssigneeDto,
  CalendarEventDto,
  CalendarMealDto,
  FocusTheme,
  FocusStats,
  FocusRewardBreakdown,
  isValidFocusTheme,
  calculateFocusPointsReward,
  FOCUS_MIN_MINUTES,
  InventoryItemDto,
  InventoryCategory,
  FashionGearSlot,
  OutfitMode,
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
let lastDbError: string | null = null;
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
  email: string | null;
  display_name: string | null;
  password_hash: string;
  role: "user" | "superadmin";
  focus_points: number;
  focus_streak_days?: number;
  last_focus_date?: string | null;
  focus_freeze_shields?: number;
  focus_shield_week?: string | null;
  daily_focus_date?: string | null;
  daily_focus_minutes?: number;
  last_public_space_id?: string | null;
  unlocked_skins?: string[];
  unlocked_assets?: string[];
  last_space_id?: string | null;
  last_x?: number | null;
  last_y?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SpaceRecord {
  id: string;
  name: string;
  owner_id: number;
  owner_username?: string;
  is_public: boolean;
  is_superadmin_space: boolean;
  focus_theme?: FocusTheme;
  whitelist: string[]; // usernames allowed if private
  shared_owners: string[]; // usernames of co-owners / housemates
  tiles?: Record<string, string>;
  private_zones?: PrivateZone[];
  jukeboxes?: JukeboxState[];
  typewriters?: TypewriterState[];
  ashtrays?: AshtrayState[];
  chess_boards?: ChessBoardState[];
  aquariums?: AquariumState[];
  seller_npc?: SellerNpcState | null;
  created_at: Date;
  updated_at: Date;
}

// In-memory fallback (used only if database is offline or temporarily reconnecting)
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemorySpaces: Map<string, SpaceRecord> = new Map();
const inMemoryChats: ChatMessage[] = [];
const inMemoryFriendships: Array<{
  id: number;
  requester_id: number;
  addressee_id: number;
  status: "pending" | "accepted";
  created_at: Date;
  updated_at: Date;
}> = [];
const inMemoryOrganisations: Array<{
  id: number;
  name: string;
  logo: string | null;
  creator_id: number;
  created_at: Date;
  updated_at: Date;
}> = [];
const inMemoryOrganisationMembers: Array<{
  id: number;
  organisation_id: number;
  user_id: number;
  role: "leader" | "member";
  joined_at: Date;
}> = [];
const inMemoryNotes: Array<{
  id: number;
  type: NoteType;
  title: string;
  content: string;
  author_id: number;
  space_id: string | null;
  organisation_id: number | null;
  images: string[];
  created_at: Date;
  updated_at: Date;
}> = [];
const inMemorySpaceInventories: Array<{
  id: number;
  space_id: string;
  name: string;
  bought: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}> = [];
let nextInMemorySpaceInventoryId = 1;
const inMemoryCalendarEvents: Array<{
  id: number;
  type: CalendarType;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  repeat_interval: number | null;
  repeat_unit: CalendarRepeatUnit | null;
  assignee_ids: number[];
  rotate_assignees: boolean;
  images: string[];
  author_id: number;
  space_id: string | null;
  organisation_id: number | null;
  created_at: Date;
  updated_at: Date;
}> = [];
const inMemoryCalendarMeals = new Map<
  string,
  {
    space_id: string;
    day_of_week: number;
    meal_name: string;
    updated_at: Date;
  }
>();
let inMemoryIdCounter = 1;

/**
 * Seed initial superadmin accounts and default spaces
 */
async function seedDefaultData(isPostgres: boolean, client?: PoolClient) {
  const defaultSuperadmins = [
    { username: "superadmin", password: "JomLepark123!", displayName: "Super Administrator" },
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
          email: null,
          display_name: adminData.displayName,
          password_hash: passwordHash,
          role: "superadmin",
          focus_points: 0,
          focus_streak_days: 0,
          last_focus_date: null,
          focus_freeze_shields: 2,
          focus_shield_week: null,
          daily_focus_date: null,
          daily_focus_minutes: 0,
          last_public_space_id: null,
          unlocked_skins: [],
          unlocked_assets: [],
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
      "SELECT id FROM users WHERE LOWER(username) = 'superadmin' LIMIT 1"
    );
    if (adminUser.rows.length > 0) {
      adminId = adminUser.rows[0].id;
    }
  } else {
    const adminUser = inMemoryUsers.get("superadmin");
    if (adminUser) adminId = adminUser.id;
  }

  // Default spaces for fresh database setup
  const restaurantTiles = buildRestaurantBistroTiles();
  const defaultSpaces = [
    {
      id: "space_central_plaza",
      name: "CO3",
      is_public: true,
      is_superadmin_space: true,
      whitelist: [] as string[],
      tiles: {} as Record<string, string>,
    },
    {
      id: "space_restaurant_bistro",
      name: "Saffron & Hearth Bistro",
      is_public: true,
      is_superadmin_space: true,
      focus_theme: "auto" as FocusTheme,
      whitelist: [] as string[],
      tiles: restaurantTiles,
    },
    {
      id: "space_adventure_guild",
      name: "Adventure Guild",
      is_public: true,
      is_superadmin_space: true,
      focus_theme: "guild" as FocusTheme,
      whitelist: [] as string[],
      tiles: {} as Record<string, string>,
    },
  ];

  if (isPostgres && client) {
    const countRes = await client.query("SELECT COUNT(*) FROM spaces");
    const totalSpaces = parseInt(countRes.rows[0].count, 10);
    if (totalSpaces === 0) {
      for (const s of defaultSpaces) {
        await client.query(
          `INSERT INTO spaces (id, name, owner_id, is_public, is_superadmin_space, focus_theme, whitelist, tiles)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            s.id,
            s.name,
            adminId,
            s.is_public,
            s.is_superadmin_space,
            s.focus_theme || "auto",
            JSON.stringify(s.whitelist),
            JSON.stringify(s.tiles),
          ]
        );
      }
    } else {
      const existingRestRes = await client.query(
        `SELECT id FROM spaces WHERE id = 'space_restaurant_bistro' OR tiles::text LIKE '%restaurant/%' LIMIT 1`
      );
      if (existingRestRes.rows.length === 0) {
        const bistro = defaultSpaces[1];
        await client.query(
          `INSERT INTO spaces (id, name, owner_id, is_public, is_superadmin_space, whitelist, tiles)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            bistro.id,
            bistro.name,
            adminId,
            bistro.is_public,
            bistro.is_superadmin_space,
            JSON.stringify(bistro.whitelist),
            JSON.stringify(bistro.tiles),
          ]
        );
      }
      const existingGuildRes = await client.query(
        `SELECT id FROM spaces WHERE id = 'space_adventure_guild' OR focus_theme = 'guild' OR LOWER(name) LIKE '%adventure%' OR LOWER(name) LIKE '%guild%' LIMIT 1`
      );
      if (existingGuildRes.rows.length === 0) {
        const guild = defaultSpaces[2];
        await client.query(
          `INSERT INTO spaces (id, name, owner_id, is_public, is_superadmin_space, focus_theme, whitelist, tiles)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            guild.id,
            guild.name,
            adminId,
            guild.is_public,
            guild.is_superadmin_space,
            guild.focus_theme,
            JSON.stringify(guild.whitelist),
            JSON.stringify(guild.tiles),
          ]
        );
      }
    }
  } else {
    if (inMemorySpaces.size === 0) {
      for (const s of defaultSpaces) {
        inMemorySpaces.set(s.id, {
          id: s.id,
          name: s.name,
          owner_id: adminId,
          owner_username: "superadmin",
          is_public: s.is_public,
          is_superadmin_space: s.is_superadmin_space,
          focus_theme: s.focus_theme || "auto",
          whitelist: s.whitelist,
          shared_owners: [],
          tiles: s.tiles,
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
      email VARCHAR(255),
      display_name VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE email IS NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'focus_points'
      ) THEN
        ALTER TABLE users ADD COLUMN focus_points INT DEFAULT 0 NOT NULL;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'parking_points'
        ) THEN
          UPDATE users SET focus_points = COALESCE(parking_points, 0);
        END IF;
      END IF;
    END $$;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_streak_days INT DEFAULT 0 NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_focus_date VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_freeze_shields INT DEFAULT 2 NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_shield_week VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_focus_date VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_focus_minutes INT DEFAULT 0 NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_public_space_id VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_skins JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS unlocked_assets JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_space_id VARCHAR(64);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_x DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_y DOUBLE PRECISION;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS casual_outfit JSONB DEFAULT '{"chestKey":"white_shirt","outerwearKey":"white_shirt","pantsKey":"jean_pant","helmetKey":"","hatKey":"","bootsKey":"","glovesKey":""}'::jsonb;
    UPDATE users
    SET casual_outfit = COALESCE(casual_outfit, '{}'::jsonb) || '{"chestKey":"white_shirt","outerwearKey":"white_shirt","pantsKey":"jean_pant"}'::jsonb
    WHERE casual_outfit IS NULL
       OR (
         COALESCE(casual_outfit->>'chestKey', '') = ''
         AND COALESCE(casual_outfit->>'outerwearKey', '') = ''
         AND COALESCE(casual_outfit->>'pantsKey', '') = ''
         AND COALESCE(casual_outfit->>'helmetKey', '') = ''
         AND COALESCE(casual_outfit->>'hatKey', '') = ''
         AND COALESCE(casual_outfit->>'bootsKey', '') = ''
         AND COALESCE(casual_outfit->>'glovesKey', '') = ''
       );
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
      owner_id INT REFERENCES users(id) ON DELETE SET NULL,
      is_public BOOLEAN DEFAULT TRUE,
      is_superadmin_space BOOLEAN DEFAULT FALSE,
      focus_theme VARCHAR(32) DEFAULT 'auto' NOT NULL,
      whitelist JSONB DEFAULT '[]'::jsonb,
      shared_owners JSONB DEFAULT '[]'::jsonb,
      tiles JSONB DEFAULT '{}'::jsonb,
      private_zones JSONB DEFAULT '[]'::jsonb,
      jukeboxes JSONB DEFAULT '[]'::jsonb,
      typewriters JSONB DEFAULT '[]'::jsonb,
      ashtrays JSONB DEFAULT '[]'::jsonb,
      chess_boards JSONB DEFAULT '[]'::jsonb,
      aquariums JSONB DEFAULT '[]'::jsonb,
      seller_npc JSONB DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS focus_theme VARCHAR(32) DEFAULT 'auto' NOT NULL;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS shared_owners JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS tiles JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS private_zones JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS jukeboxes JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS typewriters JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS ashtrays JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS chess_boards JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS aquariums JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE spaces ADD COLUMN IF NOT EXISTS seller_npc JSONB DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_spaces_superadmin_name ON spaces (is_superadmin_space, name);

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

  // 5. Friendships table
  await client.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (requester_id, addressee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);
  `);

  // 6. Organisations & Organisation Members tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS organisations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      logo TEXT,
      creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organisations_name_lower ON organisations (LOWER(name));

    CREATE TABLE IF NOT EXISTS organisation_members (
      id SERIAL PRIMARY KEY,
      organisation_id INT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (organisation_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_org_members_user ON organisation_members (user_id);
  `);

  // 7. Notes table
  await client.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id VARCHAR(64) REFERENCES spaces(id) ON DELETE CASCADE,
      organisation_id INT REFERENCES organisations(id) ON DELETE CASCADE,
      images JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
    CREATE INDEX IF NOT EXISTS idx_notes_type_author ON notes (type, author_id);
    CREATE INDEX IF NOT EXISTS idx_notes_space ON notes (space_id);
    CREATE INDEX IF NOT EXISTS idx_notes_org ON notes (organisation_id);
  `);

  // 7b. Space Inventories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS space_inventories (
      id SERIAL PRIMARY KEY,
      space_id VARCHAR(64) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      bought BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_space_inventories_space ON space_inventories (space_id, bought, updated_at DESC);
  `);

  // 8. Calendar events table
  await client.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_date VARCHAR(10) NOT NULL,
      end_date VARCHAR(10) NOT NULL,
      is_all_day BOOLEAN NOT NULL DEFAULT TRUE,
      start_time VARCHAR(5),
      end_time VARCHAR(5),
      repeat_interval INT,
      repeat_unit VARCHAR(10),
      assignee_ids JSONB NOT NULL DEFAULT '[]',
      rotate_assignees BOOLEAN NOT NULL DEFAULT FALSE,
      images JSONB NOT NULL DEFAULT '[]',
      author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id VARCHAR(64) REFERENCES spaces(id) ON DELETE CASCADE,
      organisation_id INT REFERENCES organisations(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_interval INT;
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_unit VARCHAR(10);
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assignee_ids JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rotate_assignees BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
    CREATE INDEX IF NOT EXISTS idx_cal_events_type_author ON calendar_events (type, author_id);
    CREATE INDEX IF NOT EXISTS idx_cal_events_space ON calendar_events (space_id);
    CREATE INDEX IF NOT EXISTS idx_cal_events_org ON calendar_events (organisation_id);
    CREATE INDEX IF NOT EXISTS idx_cal_events_dates ON calendar_events (start_date, end_date);
  `);

  // 9. Calendar weekly meals rotation table (per space)
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'calendar_meals' AND column_name = 'user_id'
      ) THEN
        DROP TABLE calendar_meals;
      END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS calendar_meals (
      space_id VARCHAR(64) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      meal_name VARCHAR(200) NOT NULL DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (space_id, day_of_week)
    );
  `);

  // 10. Netherworld Focus RPG tables (profiles, squad barter offers, weekly global raid boss)
  await client.query(`
    CREATE TABLE IF NOT EXISTS rpg_profiles (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile_json JSONB NOT NULL,
      power_score TEXT NOT NULL DEFAULT '0',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rpg_trade_offers (
      offer_id VARCHAR(64) PRIMARY KEY,
      squad_id VARCHAR(64) NOT NULL,
      sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offer_json JSONB NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rpg_trade_squad ON rpg_trade_offers (squad_id, expires_at);

    CREATE TABLE IF NOT EXISTS rpg_raid_state (
      week_key VARCHAR(16) PRIMARY KEY,
      raid_json JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Normalized Player Inventory table
  await client.query(`
    CREATE TABLE IF NOT EXISTS player_inventory_items (
      id UUID PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(24) NOT NULL,
      template_id VARCHAR(64) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      equipped_mode VARCHAR(16) DEFAULT NULL,
      equipped_slot VARCHAR(24) DEFAULT NULL,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      instance_data JSONB DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_inv_user_cat
      ON player_inventory_items (user_id, category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique_equipped
      ON player_inventory_items (user_id, equipped_mode, equipped_slot)
      WHERE equipped_slot IS NOT NULL AND equipped_mode IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique_stack
      ON player_inventory_items (user_id, template_id)
      WHERE instance_data IS NULL AND equipped_slot IS NULL;
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
          `INSERT INTO users (username, display_name, password_hash, role, focus_points, unlocked_skins, unlocked_assets)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (username) DO NOTHING`,
          [user.username, user.display_name, user.password_hash, user.role, user.focus_points || 0, JSON.stringify(user.unlocked_skins || []), JSON.stringify(user.unlocked_assets || [])]
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
        owner_id: row.owner_id,
        is_public: row.is_public,
        is_superadmin_space: row.is_superadmin_space,
        focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
        whitelist: parseWhitelist(row.whitelist),
        shared_owners: parseWhitelist(row.shared_owners),
        tiles: typeof row.tiles === "string" ? JSON.parse(row.tiles) : (row.tiles || {}),
        private_zones: parsePrivateZones(row.private_zones),
        jukeboxes: parseJukeboxes(row.jukeboxes),
        typewriters: parseTypewriters(row.typewriters),
        ashtrays: parseAshtrays(row.ashtrays),
        chess_boards: parseChessBoards(row.chess_boards),
        aquariums: parseAquariums(row.aquariums),
        seller_npc: parseSellerNpc(row.seller_npc),
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
  lastDbError = `${context}: ${err?.message || err}`;
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

export function getLastDbError(): string | null {
  return lastDbError;
}

// ==========================================
// User Database Operations
// ==========================================

const USER_SELECT_COLUMNS = `id, username, email, display_name, password_hash, role,
  COALESCE(focus_points, 0) as focus_points,
  COALESCE(focus_streak_days, 0) as focus_streak_days,
  last_focus_date,
  COALESCE(focus_freeze_shields, 2) as focus_freeze_shields,
  focus_shield_week,
  daily_focus_date,
  COALESCE(daily_focus_minutes, 0) as daily_focus_minutes,
  last_public_space_id,
  COALESCE(unlocked_skins, '[]'::jsonb) as unlocked_skins,
  COALESCE(unlocked_assets, '[]'::jsonb) as unlocked_assets,
  last_space_id, last_x, last_y, created_at, updated_at`;

export function formatLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMondayWeekKey(date: Date = new Date()): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return formatLocalDateKey(copy);
}

function diffCalendarDays(isoA: string, isoB: string): number {
  const [ya, ma, da] = isoA.split("-").map(Number);
  const [yb, mb, db] = isoB.split("-").map(Number);
  if (!ya || !ma || !da || !yb || !mb || !db) return 0;
  const utcA = Date.UTC(ya, ma - 1, da);
  const utcB = Date.UTC(yb, mb - 1, db);
  return Math.round((utcB - utcA) / 86_400_000);
}

export function computeUserFocusStats(user: UserRecord, now: Date = new Date()): FocusStats {
  const today = formatLocalDateKey(now);
  const mondayWeek = getMondayWeekKey(now);

  // Weekly 2 Freeze Shields replenish every Monday (max stock of 2)
  const shields =
    user.focus_shield_week === mondayWeek
      ? Math.max(0, Math.min(2, Number(user.focus_freeze_shields ?? 2)))
      : 2;

  let effectiveStreak = 0;
  if (user.last_focus_date) {
    if (user.last_focus_date === today) {
      effectiveStreak = Math.max(1, Number(user.focus_streak_days || 1));
    } else {
      const gap = diffCalendarDays(user.last_focus_date, today);
      const missedDays = Math.max(0, gap - 1);
      if (gap >= 1 && missedDays <= shields) {
        effectiveStreak = Math.max(0, Number(user.focus_streak_days || 0));
      } else {
        effectiveStreak = 0;
      }
    }
  }

  const dailyFocusMinutes =
    user.daily_focus_date === today ? Math.max(0, Number(user.daily_focus_minutes || 0)) : 0;

  return {
    focusPoints: Number(user.focus_points) || 0,
    streakDays: effectiveStreak,
    freezeShields: shields,
    dailyFocusMinutes,
    isFirstSessionToday: user.last_focus_date !== today,
    lastPublicSpaceId: user.last_public_space_id || null,
  };
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const cleanUsername = username.trim();
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
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

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [cleanEmail]
      );
      if (res.rows[0]) {
        return {
          ...res.rows[0],
          role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
        };
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error finding user by email", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.email && user.email.toLowerCase() === cleanEmail) {
      return user;
    }
  }
  return null;
}

export async function findUserById(id: number): Promise<UserRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
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

export async function updateUserLastLocation(
  userId: number,
  spaceId: string,
  x: number,
  y: number
): Promise<void> {
  if (!userId || userId <= 0) return;

  if (isDbConnected) {
    try {
      await pool.query(
        "UPDATE users SET last_space_id = $1, last_x = $2, last_y = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
        [spaceId, x, y, userId]
      );
      return;
    } catch (err) {
      handleDbQueryError("Error updating user last location", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === userId) {
      user.last_space_id = spaceId;
      user.last_x = x;
      user.last_y = y;
      break;
    }
  }
}

export async function updateUserLastPublicSpace(
  userId: number,
  spaceId: string
): Promise<void> {
  if (!userId || userId <= 0 || !spaceId) return;

  if (isDbConnected) {
    try {
      await pool.query(
        "UPDATE users SET last_public_space_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [spaceId, userId]
      );
    } catch (err) {
      handleDbQueryError("Error updating user last public space", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === userId) {
      user.last_public_space_id = spaceId;
      break;
    }
  }
}

export async function createUser(
  username: string,
  passwordHash: string,
  displayName?: string | null,
  role: "user" | "superadmin" = "user",
  email?: string | null
): Promise<UserRecord> {
  const cleanUsername = username.trim();
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
  const cleanDisplayName = displayName && displayName.trim() ? displayName.trim().slice(0, 30) : null;

  let createdUser: UserRecord;

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO users (username, email, display_name, password_hash, role, focus_points, unlocked_skins, unlocked_assets)
         VALUES ($1, $2, $3, $4, $5, 0, '[]'::jsonb, '[]'::jsonb)
         RETURNING ${USER_SELECT_COLUMNS}`,
        [cleanUsername, cleanEmail, cleanDisplayName, passwordHash, role]
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
        email: cleanEmail,
        display_name: cleanDisplayName,
        password_hash: passwordHash,
        role,
        focus_points: 0,
        focus_streak_days: 0,
        last_focus_date: null,
        focus_freeze_shields: 2,
        focus_shield_week: null,
        daily_focus_date: null,
        daily_focus_minutes: 0,
        last_public_space_id: null,
        unlocked_skins: [],
        unlocked_assets: [],
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
      email: cleanEmail,
      display_name: cleanDisplayName,
      password_hash: passwordHash,
      role,
      focus_points: 0,
      focus_streak_days: 0,
      last_focus_date: null,
      focus_freeze_shields: 2,
      focus_shield_week: null,
      daily_focus_date: null,
      daily_focus_minutes: 0,
      last_public_space_id: null,
      unlocked_skins: [],
      unlocked_assets: [],
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
         RETURNING ${USER_SELECT_COLUMNS}`,
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

export async function changeUserDisplayNameWithCost(
  id: number,
  displayName: string | null,
  cost: number
): Promise<{ success: boolean; user?: UserRecord; newPoints?: number; error?: string }> {
  const cleanDisplayName = displayName && displayName.trim() ? displayName.trim().slice(0, 30) : null;
  const user = await findUserById(id);
  if (!user) {
    return { success: false, error: "User not found." };
  }

  const currentClean = user.display_name && user.display_name.trim() ? user.display_name.trim() : null;
  if (currentClean === cleanDisplayName) {
    return {
      success: false,
      newPoints: user.focus_points || 0,
      error: "New display name is the same as your current name.",
    };
  }

  const currentPoints = user.focus_points || 0;
  if (currentPoints < cost) {
    return {
      success: false,
      newPoints: currentPoints,
      error: `Insufficient Focus Points. You need ${cost.toLocaleString()} FP (you have ${currentPoints.toLocaleString()} FP).`,
    };
  }

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET display_name = $2,
             focus_points = focus_points - $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND focus_points >= $3
         RETURNING ${USER_SELECT_COLUMNS}`,
        [id, cleanDisplayName, cost]
      );
      if (!res.rows[0]) {
        const refreshed = await findUserById(id);
        return {
          success: false,
          newPoints: refreshed?.focus_points || 0,
          error: `Insufficient Focus Points. You need ${cost.toLocaleString()} FP.`,
        };
      }
      const updated: UserRecord = {
        ...res.rows[0],
        role: res.rows[0].role === "superadmin" ? "superadmin" : "user",
      };
      inMemoryUsers.set(updated.username.toLowerCase(), updated);
      return {
        success: true,
        user: updated,
        newPoints: updated.focus_points || 0,
      };
    } catch (err) {
      handleDbQueryError("Error updating user display name with cost", err);
      return { success: false, error: "Database error while changing display name." };
    }
  }

  // In-memory fallback
  const nextPoints = currentPoints - cost;
  for (const u of inMemoryUsers.values()) {
    if (u.id === id) {
      u.display_name = cleanDisplayName;
      u.focus_points = nextPoints;
      u.updated_at = new Date();
      return {
        success: true,
        user: u,
        newPoints: nextPoints,
      };
    }
  }

  return { success: false, error: "User not found." };
}

export async function updateUserEmail(id: number, email: string): Promise<UserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET email = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING ${USER_SELECT_COLUMNS}`,
        [id, cleanEmail]
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
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new Error("Email is already linked to another account.");
      }
      handleDbQueryError("Error updating user email", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      user.email = cleanEmail;
      user.updated_at = new Date();
      return user;
    }
  }
  return null;
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, passwordHash]
      );
      if ((res.rowCount ?? 0) > 0) {
        for (const user of inMemoryUsers.values()) {
          if (user.id === id) {
            user.password_hash = passwordHash;
            user.updated_at = new Date();
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      handleDbQueryError("Error updating user password", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === id) {
      user.password_hash = passwordHash;
      user.updated_at = new Date();
      return true;
    }
  }
  return false;
}

export async function getUserFocusPoints(userId: number): Promise<number> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT COALESCE(focus_points, 0) as focus_points FROM users WHERE id = $1 LIMIT 1",
        [userId]
      );
      if (res.rows[0]) {
        return Number(res.rows[0].focus_points) || 0;
      }
    } catch (err) {
      handleDbQueryError("Error getting user focus points", err);
    }
  }
  for (const user of inMemoryUsers.values()) {
    if (user.id === userId) {
      return user.focus_points || 0;
    }
  }
  return 0;
}


async function unlockUserFeatureItem(
  userId: number,
  column: "unlocked_skins" | "unlocked_assets",
  itemId: string,
  cost: number,
  freeForSuperadmin = false
): Promise<{ success: boolean; newPoints: number; items: string[]; error?: string }> {
  const user = await findUserById(userId);
  if (!user) {
    return { success: false, newPoints: 0, items: [], error: "User not found." };
  }

  const currentItems: string[] = Array.isArray(user[column]) ? user[column]! : [];

  if (freeForSuperadmin && user.role === "superadmin") {
    return {
      success: true,
      newPoints: user.focus_points || 0,
      items: currentItems,
    };
  }

  if (currentItems.includes(itemId)) {
    return {
      success: true,
      newPoints: user.focus_points || 0,
      items: currentItems,
    };
  }

  const currentPoints = user.focus_points || 0;
  if (currentPoints < cost) {
    return {
      success: false,
      newPoints: currentPoints,
      items: currentItems,
      error: `Requires ${cost} FP (you have ${currentPoints} FP).`,
    };
  }

  const newItems = [...currentItems, itemId];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET focus_points = focus_points - $2,
             ${column} = $3::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND focus_points >= $2
         RETURNING COALESCE(focus_points, 0) as focus_points, COALESCE(${column}, '[]'::jsonb) as items`,
        [userId, cost, JSON.stringify(newItems)]
      );

      if (res.rows.length === 0) {
        return {
          success: false,
          newPoints: currentPoints,
          items: currentItems,
          error: "Insufficient Focus Points (FP).",
        };
      }

      const updatedPoints = Number(res.rows[0].focus_points) || 0;
      const updatedItems = Array.isArray(res.rows[0].items) ? res.rows[0].items : newItems;

      for (const u of inMemoryUsers.values()) {
        if (u.id === userId) {
          u.focus_points = updatedPoints;
          u[column] = updatedItems;
        }
      }

      return {
        success: true,
        newPoints: updatedPoints,
        items: updatedItems,
      };
    } catch (err) {
      handleDbQueryError(`Error unlocking ${column} item`, err);
    }
  }

  // In-memory fallback
  user.focus_points = (user.focus_points || 0) - cost;
  user[column] = newItems;
  for (const u of inMemoryUsers.values()) {
    if (u.id === userId) {
      u.focus_points = user.focus_points;
      u[column] = newItems;
    }
  }

  return {
    success: true,
    newPoints: user.focus_points,
    items: newItems,
  };
}

export async function unlockSkinForUser(
  userId: number,
  skinId: string,
  cost: number
): Promise<{ success: boolean; newPoints: number; unlockedSkins: string[]; error?: string }> {
  const result = await unlockUserFeatureItem(userId, "unlocked_skins", skinId, cost, false);
  return {
    success: result.success,
    newPoints: result.newPoints,
    unlockedSkins: result.items,
    error: result.error,
  };
}

export async function unlockAssetForUser(
  userId: number,
  assetId: string,
  cost: number
): Promise<{ success: boolean; newPoints: number; unlockedAssets: string[]; error?: string }> {
  const result = await unlockUserFeatureItem(userId, "unlocked_assets", assetId, cost, true);
  return {
    success: result.success,
    newPoints: result.newPoints,
    unlockedAssets: result.items,
    error: result.error,
  };
}

export async function addFocusPoints(userId: number, amount: number = 1): Promise<number> {
  let newPoints = 0;
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET focus_points = COALESCE(focus_points, 0) + $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING COALESCE(focus_points, 0) as focus_points`,
        [userId, amount]
      );
      if (res.rows[0]) {
        newPoints = Number(res.rows[0].focus_points) || 0;
      }
    } catch (err) {
      handleDbQueryError("Error adding focus points", err);
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (user.id === userId) {
      user.focus_points = (user.focus_points || 0) + amount;
      if (!isDbConnected || newPoints === 0) {
        newPoints = user.focus_points;
      }
      break;
    }
  }
  return newPoints;
}

export async function recordCompletedFocusSessionInDb(params: {
  userId: number;
  elapsedMinutes: number;
  targetMinutes: number;
  isCompleted: boolean;
  isStrictMode: boolean;
  strictViolated: boolean;
  hasSquadSynergy: boolean;
  focusUpgradeRank?: number;
}): Promise<{ breakdown: FocusRewardBreakdown; stats: FocusStats } | null> {
  const user = await findUserById(params.userId);
  if (!user) return null;

  const now = new Date();
  const today = formatLocalDateKey(now);
  const mondayWeek = getMondayWeekKey(now);
  const preStats = computeUserFocusStats(user, now);

  const rewardCore = calculateFocusPointsReward({
    elapsedMinutes: params.elapsedMinutes,
    targetMinutes: params.targetMinutes,
    isCompleted: params.isCompleted,
    isStrictMode: params.isStrictMode,
    strictViolated: params.strictViolated,
    streakDays: preStats.streakDays,
    hasSquadSynergy: params.hasSquadSynergy,
    isFirstSessionToday: preStats.isFirstSessionToday,
    priorDailyFocusMinutes: preStats.dailyFocusMinutes,
    focusUpgradeRank: params.focusUpgradeRank,
  });

  if (rewardCore.forfeitedUnderMinimum || params.elapsedMinutes < FOCUS_MIN_MINUTES) {
    return {
      breakdown: {
        ...rewardCore,
        newTotalFp: preStats.focusPoints,
        streakDays: preStats.streakDays,
        freezeShields: preStats.freezeShields,
        dailyFocusMinutes: preStats.dailyFocusMinutes,
      },
      stats: preStats,
    };
  }

  let nextStreak = preStats.streakDays;
  let nextShields = preStats.freezeShields;
  let nextLastFocusDate = user.last_focus_date || null;

  if (params.isCompleted) {
    if (!user.last_focus_date) {
      nextStreak = 1;
    } else if (user.last_focus_date === today) {
      nextStreak = Math.max(1, Number(user.focus_streak_days || 1));
    } else {
      const gap = diffCalendarDays(user.last_focus_date, today);
      const missedDays = Math.max(0, gap - 1);
      if (gap >= 1 && missedDays === 0) {
        nextStreak = Math.max(0, Number(user.focus_streak_days || 0)) + 1;
      } else if (gap > 1 && nextShields >= missedDays) {
        nextShields -= missedDays;
        nextStreak = Math.max(0, Number(user.focus_streak_days || 0)) + 1;
      } else {
        nextStreak = 1;
      }
    }
    nextLastFocusDate = today;
  }

  const nextDailyMinutes = preStats.dailyFocusMinutes + Math.round(rewardCore.elapsedMinutes);
  let nextPoints = preStats.focusPoints + rewardCore.totalFpEarned;

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET focus_points = COALESCE(focus_points, 0) + $2,
             focus_streak_days = $3,
             last_focus_date = $4,
             focus_freeze_shields = $5,
             focus_shield_week = $6,
             daily_focus_date = $7,
             daily_focus_minutes = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING COALESCE(focus_points, 0) as focus_points`,
        [
          params.userId,
          rewardCore.totalFpEarned,
          nextStreak,
          nextLastFocusDate,
          nextShields,
          mondayWeek,
          today,
          nextDailyMinutes,
        ]
      );
      if (res.rows[0]) {
        nextPoints = Number(res.rows[0].focus_points) || nextPoints;
      }
    } catch (err) {
      handleDbQueryError("Error recording completed focus session", err);
    }
  }

  for (const u of inMemoryUsers.values()) {
    if (u.id === params.userId) {
      u.focus_points = nextPoints;
      u.focus_streak_days = nextStreak;
      u.last_focus_date = nextLastFocusDate;
      u.focus_freeze_shields = nextShields;
      u.focus_shield_week = mondayWeek;
      u.daily_focus_date = today;
      u.daily_focus_minutes = nextDailyMinutes;
    }
  }

  const nextStats: FocusStats = {
    focusPoints: nextPoints,
    streakDays: nextStreak,
    freezeShields: nextShields,
    dailyFocusMinutes: nextDailyMinutes,
    isFirstSessionToday: nextLastFocusDate !== today,
    lastPublicSpaceId: user.last_public_space_id || null,
  };

  return {
    breakdown: {
      ...rewardCore,
      newTotalFp: nextPoints,
      streakDays: nextStreak,
      freezeShields: nextShields,
      dailyFocusMinutes: nextDailyMinutes,
    },
    stats: nextStats,
  };
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

export function parseChessBoards(raw: any): ChessBoardState[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parseAquariums(raw: any): AquariumState[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function parseSellerNpc(raw: any): SellerNpcState | null {
  let obj: any = raw;
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  if (typeof obj.x !== "number" || typeof obj.y !== "number" || Number.isNaN(obj.x) || Number.isNaN(obj.y)) {
    return null;
  }
  return obj as SellerNpcState;
}

export async function getSuperadminSpaces(): Promise<SpaceRecord[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(`
        SELECT s.id, s.name, s.owner_id, s.is_public, s.is_superadmin_space, COALESCE(s.focus_theme, 'auto') as focus_theme, s.whitelist, s.shared_owners, s.created_at, s.updated_at,
               u.username as owner_username
        FROM spaces s
        LEFT JOIN users u ON s.owner_id = u.id
        WHERE s.is_superadmin_space = true
        ORDER BY s.name ASC
      `);
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        owner_username: row.owner_username || "superadmin",
        is_public: row.is_public,
        is_superadmin_space: true,
        focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
        whitelist: parseWhitelist(row.whitelist),
        shared_owners: parseWhitelist(row.shared_owners),
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
      results.push({ ...space, whitelist: [...space.whitelist], shared_owners: [...(space.shared_owners || [])] });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSpaceById(id: string): Promise<SpaceRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.owner_id, s.is_public, s.is_superadmin_space, COALESCE(s.focus_theme, 'auto') as focus_theme, s.whitelist, s.shared_owners, s.private_zones, s.jukeboxes, s.typewriters, s.ashtrays, s.chess_boards, s.aquariums, s.seller_npc, s.created_at, s.updated_at,
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
          owner_id: row.owner_id,
          owner_username: row.owner_username || "User",
          is_public: row.is_public,
          is_superadmin_space: row.is_superadmin_space,
          focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
          whitelist: parseWhitelist(row.whitelist),
          shared_owners: parseWhitelist(row.shared_owners),
          private_zones: parsePrivateZones(row.private_zones),
          jukeboxes: parseJukeboxes(row.jukeboxes),
          typewriters: parseTypewriters(row.typewriters),
          ashtrays: parseAshtrays(row.ashtrays),
          chess_boards: parseChessBoards(row.chess_boards),
          aquariums: parseAquariums(row.aquariums),
          seller_npc: parseSellerNpc(row.seller_npc),
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
        shared_owners: [...(space.shared_owners || [])],
        private_zones: space.private_zones ? [...space.private_zones] : [],
        jukeboxes: space.jukeboxes ? [...space.jukeboxes] : [],
        typewriters: space.typewriters ? [...space.typewriters] : [],
        ashtrays: space.ashtrays ? [...space.ashtrays] : [],
        chess_boards: space.chess_boards ? [...space.chess_boards] : [],
        aquariums: space.aquariums ? [...space.aquariums] : [],
        seller_npc: space.seller_npc ? { ...space.seller_npc } : null,
      }
    : null;
}

export async function getUserPersonalSpace(userId: number): Promise<SpaceRecord | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.owner_id, s.is_public, s.is_superadmin_space, COALESCE(s.focus_theme, 'auto') as focus_theme, s.whitelist, s.shared_owners, s.created_at, s.updated_at,
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
          owner_id: row.owner_id,
          owner_username: row.owner_username || "User",
          is_public: row.is_public,
          is_superadmin_space: false,
          focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
          whitelist: parseWhitelist(row.whitelist),
          shared_owners: parseWhitelist(row.shared_owners),
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
      return { ...space, whitelist: [...space.whitelist], shared_owners: [...(space.shared_owners || [])] };
    }
  }
  return null;
}

export async function getSharedSpacesForUser(userId: number, username: string): Promise<SpaceRecord[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT s.id, s.name, s.owner_id, s.is_public, s.is_superadmin_space, COALESCE(s.focus_theme, 'auto') as focus_theme, s.whitelist, s.shared_owners, s.created_at, s.updated_at,
                u.username as owner_username
         FROM spaces s
         LEFT JOIN users u ON s.owner_id = u.id
         WHERE s.owner_id != $1
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements_text(COALESCE(s.shared_owners, '[]'::jsonb)) AS elem
             WHERE LOWER(elem) = LOWER($2)
           )
         ORDER BY s.name ASC`,
        [userId, username]
      );
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        owner_username: row.owner_username || "User",
        is_public: row.is_public,
        is_superadmin_space: row.is_superadmin_space,
        focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
        whitelist: parseWhitelist(row.whitelist),
        shared_owners: parseWhitelist(row.shared_owners),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      handleDbQueryError("Error getting shared spaces for user", err);
    }
  }

  const results: SpaceRecord[] = [];
  const lower = username.toLowerCase();
  for (const space of inMemorySpaces.values()) {
    if (
      space.owner_id !== userId &&
      Array.isArray(space.shared_owners) &&
      space.shared_owners.some((u) => u.toLowerCase() === lower)
    ) {
      results.push({
        ...space,
        whitelist: [...space.whitelist],
        shared_owners: [...space.shared_owners],
      });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
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
        `INSERT INTO spaces (id, name, owner_id, is_public, is_superadmin_space, focus_theme, whitelist, shared_owners)
         VALUES ($1, $2, $3, $4, false, 'auto', $5, '[]'::jsonb)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id
         RETURNING id, name, owner_id, is_public, is_superadmin_space, COALESCE(focus_theme, 'auto') as focus_theme, whitelist, shared_owners, created_at, updated_at`,
        [spaceId, spaceName, userId, isPublic, JSON.stringify(whitelist)]
      );
      const row = res.rows[0];
      const record: SpaceRecord = {
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        owner_username: username,
        is_public: row.is_public,
        is_superadmin_space: false,
        focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
        whitelist,
        shared_owners: parseWhitelist(row.shared_owners),
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
      owner_id: userId,
      owner_username: username,
      is_public: isPublic,
      is_superadmin_space: false,
      focus_theme: "auto",
      whitelist,
      shared_owners: [],
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
  isPublic: boolean;
  ownerId: number;
  focusTheme?: FocusTheme;
  whitelist?: string[];
  sharedOwners?: string[];
}): Promise<SpaceRecord> {
  const id = `space_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = params.name.trim().slice(0, 50);
  const focusTheme: FocusTheme = isValidFocusTheme(params.focusTheme) ? params.focusTheme : "auto";
  const whitelist = params.whitelist || [];
  const sharedOwners = params.sharedOwners || [];

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `INSERT INTO spaces (id, name, owner_id, is_public, is_superadmin_space, focus_theme, whitelist, shared_owners)
         VALUES ($1, $2, $3, $4, true, $5, $6, $7)
         RETURNING id, name, owner_id, is_public, is_superadmin_space, COALESCE(focus_theme, 'auto') as focus_theme, whitelist, shared_owners, created_at, updated_at`,
        [id, cleanName, params.ownerId, params.isPublic, focusTheme, JSON.stringify(whitelist), JSON.stringify(sharedOwners)]
      );
      const row = res.rows[0];
      const record: SpaceRecord = {
        id: row.id,
        name: row.name,
        owner_id: row.owner_id,
        is_public: row.is_public,
        is_superadmin_space: true,
        focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
        whitelist: parseWhitelist(row.whitelist),
        shared_owners: parseWhitelist(row.shared_owners),
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
    owner_id: params.ownerId,
    is_public: params.isPublic,
    is_superadmin_space: true,
    focus_theme: focusTheme,
    whitelist,
    shared_owners: sharedOwners,
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
    isPublic?: boolean;
    focusTheme?: FocusTheme;
    whitelist?: string[];
    sharedOwners?: string[];
  }
): Promise<SpaceRecord | null> {
  const existing = await getSpaceById(spaceId);
  if (!existing) return null;

  const newName = updates.name !== undefined ? updates.name.trim().slice(0, 50) : existing.name;
  const newIsPublic = updates.isPublic !== undefined ? !!updates.isPublic : existing.is_public;
  const newFocusTheme: FocusTheme = isValidFocusTheme(updates.focusTheme)
    ? updates.focusTheme
    : existing.focus_theme || "auto";
  const newWhitelist = updates.whitelist !== undefined ? updates.whitelist : existing.whitelist;
  const newSharedOwners = updates.sharedOwners !== undefined ? updates.sharedOwners : (existing.shared_owners || []);

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE spaces
         SET name = $2, is_public = $3, focus_theme = $4, whitelist = $5, shared_owners = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, owner_id, is_public, is_superadmin_space, COALESCE(focus_theme, 'auto') as focus_theme, whitelist, shared_owners, created_at, updated_at`,
        [spaceId, newName, newIsPublic, newFocusTheme, JSON.stringify(newWhitelist), JSON.stringify(newSharedOwners)]
      );
      if (res.rows[0]) {
        const row = res.rows[0];
        const updatedRecord: SpaceRecord = {
          id: row.id,
          name: row.name,
          owner_id: row.owner_id,
          owner_username: existing.owner_username,
          is_public: row.is_public,
          is_superadmin_space: row.is_superadmin_space,
          focus_theme: isValidFocusTheme(row.focus_theme) ? row.focus_theme : "auto",
          whitelist: parseWhitelist(row.whitelist),
          shared_owners: parseWhitelist(row.shared_owners),
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
    inMem.is_public = newIsPublic;
    inMem.focus_theme = newFocusTheme;
    inMem.whitelist = newWhitelist;
    inMem.shared_owners = newSharedOwners;
    inMem.updated_at = new Date();
    return { ...inMem, whitelist: [...inMem.whitelist], shared_owners: [...inMem.shared_owners] };
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
          `INSERT INTO spaces (id, name, is_public, tiles)
           VALUES ($1, $2, true, $3)
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
      owner_id: 1,
      is_public: true,
      is_superadmin_space: false,
      whitelist: [],
      shared_owners: [],
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
  let dbSaved = false;
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET private_zones = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(zones, (_k, v) => (typeof v === "bigint" ? Number(v) : v))]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, is_public, private_zones)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (id) DO UPDATE SET private_zones = EXCLUDED.private_zones, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(zones, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
          ]
        );
      }
      lastDbError = null;
      dbSaved = true;
    } catch (err) {
      handleDbQueryError("Error updating space private zones in DB", err);
    }
  } else {
    lastDbError = `Database is disconnected (isDbConnected=false)`;
    console.warn(
      `[DB] Cannot persist private zones for space ${spaceId}: database is disconnected.`
    );
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (!inMem) {
    inMem = {
      id: spaceId,
      name: spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
      owner_id: 1,
      is_public: true,
      is_superadmin_space: false,
      whitelist: [],
      shared_owners: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemorySpaces.set(spaceId, inMem);
  }
  inMem.private_zones = [...zones];
  inMem.updated_at = new Date();
  return dbSaved;
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
          `INSERT INTO spaces (id, name, is_public, jukeboxes)
           VALUES ($1, $2, true, $3)
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
          `INSERT INTO spaces (id, name, is_public, typewriters)
           VALUES ($1, $2, true, $3)
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
          `INSERT INTO spaces (id, name, is_public, ashtrays)
           VALUES ($1, $2, true, $3)
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

/**
 * Get chess boards for a space
 */
export async function getSpaceChessBoards(spaceId: string): Promise<ChessBoardState[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT chess_boards FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.chess_boards) {
        return parseChessBoards(res.rows[0].chess_boards);
      }
    } catch (err) {
      handleDbQueryError("Error fetching space chess boards from DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.chess_boards ? [...inMem.chess_boards] : [];
}

/**
 * Update and persist chess boards for a space
 */
export async function updateSpaceChessBoards(
  spaceId: string,
  chessBoards: ChessBoardState[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET chess_boards = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(chessBoards)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, is_public, chess_boards)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (id) DO UPDATE SET chess_boards = EXCLUDED.chess_boards, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(chessBoards),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space chess boards in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.chess_boards = [...chessBoards];
    inMem.updated_at = new Date();
  }
  return true;
}

// ==========================================
/**
 * Get aquariums for a space
 */
export async function getSpaceAquariums(spaceId: string): Promise<AquariumState[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT aquariums FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]?.aquariums) {
        return parseAquariums(res.rows[0].aquariums);
      }
      return [];
    } catch (err) {
      handleDbQueryError("Error fetching space aquariums from DB", err);
    }
  }
  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.aquariums ? [...inMem.aquariums] : [];
}

/**
 * Update and persist aquariums for a space
 */
export async function updateSpaceAquariums(
  spaceId: string,
  aquariums: AquariumState[]
): Promise<boolean> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET aquariums = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, JSON.stringify(aquariums)]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, is_public, aquariums)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (id) DO UPDATE SET aquariums = EXCLUDED.aquariums, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            JSON.stringify(aquariums),
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space aquariums in DB", err);
    }
  }

  let inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.aquariums = [...aquariums];
    inMem.updated_at = new Date();
  }
  return true;
}

/**
 * Get the single Seller NPC configuration for a space
 */
export async function getSpaceSellerNpc(spaceId: string): Promise<SellerNpcState | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query("SELECT seller_npc FROM spaces WHERE id = $1", [spaceId]);
      if (res.rows[0]) {
        return parseSellerNpc(res.rows[0].seller_npc);
      }
      return null;
    } catch (err) {
      handleDbQueryError("Error fetching space seller NPC from DB", err);
    }
  }
  const inMem = inMemorySpaces.get(spaceId);
  return inMem?.seller_npc ? { ...inMem.seller_npc } : null;
}

/**
 * Update and persist the single Seller NPC for a space
 */
export async function updateSpaceSellerNpc(
  spaceId: string,
  sellerNpc: SellerNpcState | null
): Promise<boolean> {
  const serialized = sellerNpc ? JSON.stringify(sellerNpc) : null;
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "UPDATE spaces SET seller_npc = $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [spaceId, serialized]
      );
      if (res.rowCount === 0) {
        await pool.query(
          `INSERT INTO spaces (id, name, is_public, seller_npc)
           VALUES ($1, $2, true, $3::jsonb)
           ON CONFLICT (id) DO UPDATE SET seller_npc = EXCLUDED.seller_npc, updated_at = CURRENT_TIMESTAMP`,
          [
            spaceId,
            spaceId.startsWith("user_space_") ? "Personal Space" : spaceId,
            serialized,
          ]
        );
      }
    } catch (err) {
      handleDbQueryError("Error updating space seller NPC in DB", err);
    }
  }

  const inMem = inMemorySpaces.get(spaceId);
  if (inMem) {
    inMem.seller_npc = sellerNpc ? { ...sellerNpc } : null;
    inMem.updated_at = new Date();
  }
  return true;
}

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

export interface FriendshipWithUserRow {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: "pending" | "accepted";
  created_at: Date;
  other_user_id: number;
  other_username: string;
  other_display_name: string | null;
}

export async function sendFriendRequest(
  requesterId: number,
  addresseeId: number
): Promise<{ success: boolean; status?: "pending" | "accepted"; friendshipId?: number; error?: string }> {
  if (requesterId === addresseeId) {
    return { success: false, error: "You cannot add yourself as a friend." };
  }

  if (!isDbConnected) {
    const existing = inMemoryFriendships.find(
      (f) =>
        (f.requester_id === requesterId && f.addressee_id === addresseeId) ||
        (f.requester_id === addresseeId && f.addressee_id === requesterId)
    );
    if (existing) {
      if (existing.status === "accepted") {
        return { success: false, error: "You are already friends." };
      }
      if (existing.requester_id === requesterId) {
        return { success: false, error: "Friend request already sent." };
      }
      existing.status = "accepted";
      existing.updated_at = new Date();
      return { success: true, status: "accepted", friendshipId: existing.id };
    }
    const newRow = {
      id: inMemoryIdCounter++,
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: "pending" as const,
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemoryFriendships.push(newRow);
    return { success: true, status: "pending", friendshipId: newRow.id };
  }

  try {
    const existingRes = await pool.query(
      `SELECT id, requester_id, addressee_id, status
       FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );

    if (existingRes.rows.length > 0) {
      const row = existingRes.rows[0];
      if (row.status === "accepted") {
        return { success: false, error: "You are already friends." };
      }
      if (row.requester_id === requesterId) {
        return { success: false, error: "Friend request already sent." };
      }
      await pool.query(
        `UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.id]
      );
      return { success: true, status: "accepted", friendshipId: row.id };
    }

    const insertRes = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [requesterId, addresseeId]
    );
    return { success: true, status: "pending", friendshipId: insertRes.rows[0].id };
  } catch (err) {
    console.error("Error sending friend request:", err);
    return { success: false, error: "Failed to send friend request." };
  }
}

export async function acceptFriendRequest(
  userId: number,
  friendshipId: number
): Promise<{ success: boolean; requesterId?: number; error?: string }> {
  if (!isDbConnected) {
    const row = inMemoryFriendships.find(
      (f) => f.id === friendshipId && f.addressee_id === userId && f.status === "pending"
    );
    if (!row) {
      return { success: false, error: "Friend request not found." };
    }
    row.status = "accepted";
    row.updated_at = new Date();
    return { success: true, requesterId: row.requester_id };
  }

  try {
    const res = await pool.query(
      `UPDATE friendships
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING requester_id`,
      [friendshipId, userId]
    );
    if (res.rows.length === 0) {
      return { success: false, error: "Friend request not found." };
    }
    return { success: true, requesterId: res.rows[0].requester_id };
  } catch (err) {
    console.error("Error accepting friend request:", err);
    return { success: false, error: "Failed to accept friend request." };
  }
}

export async function rejectOrCancelFriendRequest(
  userId: number,
  friendshipId: number
): Promise<{ success: boolean; otherUserId?: number; error?: string }> {
  if (!isDbConnected) {
    const idx = inMemoryFriendships.findIndex(
      (f) =>
        f.id === friendshipId &&
        f.status === "pending" &&
        (f.addressee_id === userId || f.requester_id === userId)
    );
    if (idx === -1) {
      return { success: false, error: "Friend request not found." };
    }
    const row = inMemoryFriendships[idx];
    const otherUserId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    inMemoryFriendships.splice(idx, 1);
    return { success: true, otherUserId };
  }

  try {
    const res = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1 AND status = 'pending' AND (addressee_id = $2 OR requester_id = $2)
       RETURNING requester_id, addressee_id`,
      [friendshipId, userId]
    );
    if (res.rows.length === 0) {
      return { success: false, error: "Friend request not found." };
    }
    const row = res.rows[0];
    const otherUserId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    return { success: true, otherUserId };
  } catch (err) {
    console.error("Error rejecting/canceling friend request:", err);
    return { success: false, error: "Failed to update friend request." };
  }
}

export async function removeFriend(
  userId: number,
  friendUserId: number
): Promise<boolean> {
  if (!isDbConnected) {
    const idx = inMemoryFriendships.findIndex(
      (f) =>
        f.status === "accepted" &&
        ((f.requester_id === userId && f.addressee_id === friendUserId) ||
          (f.requester_id === friendUserId && f.addressee_id === userId))
    );
    if (idx !== -1) {
      inMemoryFriendships.splice(idx, 1);
      return true;
    }
    return false;
  }

  try {
    const res = await pool.query(
      `DELETE FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1))`,
      [userId, friendUserId]
    );
    return (res.rowCount || 0) > 0;
  } catch (err) {
    console.error("Error removing friend:", err);
    return false;
  }
}

export async function getFriendshipsForUser(
  userId: number
): Promise<FriendshipWithUserRow[]> {
  if (!isDbConnected) {
    const result: FriendshipWithUserRow[] = [];
    for (const f of inMemoryFriendships) {
      if (f.requester_id !== userId && f.addressee_id !== userId) continue;
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      let otherUser: UserRecord | undefined;
      for (const u of inMemoryUsers.values()) {
        if (u.id === otherId) {
          otherUser = u;
          break;
        }
      }
      if (!otherUser) continue;
      result.push({
        id: f.id,
        requester_id: f.requester_id,
        addressee_id: f.addressee_id,
        status: f.status,
        created_at: f.created_at,
        other_user_id: otherUser.id,
        other_username: otherUser.username,
        other_display_name: otherUser.display_name,
      });
    }
    return result;
  }

  try {
    const res = await pool.query(
      `SELECT f.id,
              f.requester_id,
              f.addressee_id,
              f.status,
              f.created_at,
              u.id AS other_user_id,
              u.username AS other_username,
              u.display_name AS other_display_name
       FROM friendships f
       JOIN users u
         ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.requester_id = $1 OR f.addressee_id = $1
       ORDER BY f.updated_at DESC`,
      [userId]
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching friendships:", err);
    return [];
  }
}

// ==========================================
// Organisation Database Operations
// ==========================================

export async function areUsersFriends(userA: number, userB: number): Promise<boolean> {
  if (userA === userB) return false;
  if (!isDbConnected) {
    return inMemoryFriendships.some(
      (f) =>
        f.status === "accepted" &&
        ((f.requester_id === userA && f.addressee_id === userB) ||
          (f.requester_id === userB && f.addressee_id === userA))
    );
  }

  try {
    const res = await pool.query(
      `SELECT 1 FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1))
       LIMIT 1`,
      [userA, userB]
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error("Error checking friendship:", err);
    return false;
  }
}

function findInMemoryUserById(userId: number): UserRecord | undefined {
  for (const u of inMemoryUsers.values()) {
    if (u.id === userId) return u;
  }
  return undefined;
}

export async function createOrganisation(
  creatorId: number,
  name: string,
  memberUserIds: number[],
  logo: string | null,
  cost: number = ORGANISATION_CREATION_COST
): Promise<{
  success: boolean;
  organisation?: Organisation;
  newPoints?: number;
  error?: string;
}> {
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    return { success: false, error: "Organisation name must be between 2 and 60 characters." };
  }

  const creator = await findUserById(creatorId);
  if (!creator) {
    return { success: false, error: "User not found." };
  }

  const isSuperadmin = creator.role === "superadmin";
  const effectiveCost = isSuperadmin ? 0 : cost;

  // Deduplicate and exclude creator from invited member IDs
  const uniqueFriendIds = Array.from(
    new Set(memberUserIds.filter((id) => Number.isInteger(id) && id > 0 && id !== creatorId))
  );

  // Regular players can only add accepted friends; superadmin can add any existing player
  if (!isSuperadmin) {
    for (const friendId of uniqueFriendIds) {
      const isFriend = await areUsersFriends(creatorId, friendId);
      if (!isFriend) {
        return {
          success: false,
          error: "You can only add players who are in your friend list.",
        };
      }
    }
  } else {
    for (const targetId of uniqueFriendIds) {
      const targetUser = await findUserById(targetId);
      if (!targetUser) {
        return {
          success: false,
          error: `Player #${targetId} not found.`,
        };
      }
    }
  }

  if (isDbConnected) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check duplicate organisation name (case-insensitive)
      const dupRes = await client.query(
        "SELECT id FROM organisations WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [trimmedName]
      );
      if (dupRes.rows.length > 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "An organisation with that name already exists." };
      }

      // Atomically deduct Focus Points (skip if effectiveCost <= 0, e.g. superadmin)
      let updatedPoints = await getUserFocusPoints(creatorId);
      if (effectiveCost > 0) {
        const pointsRes = await client.query(
          `UPDATE users
           SET focus_points = focus_points - $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND COALESCE(focus_points, 0) >= $2
           RETURNING COALESCE(focus_points, 0) as focus_points`,
          [creatorId, effectiveCost]
        );
        if (pointsRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return {
            success: false,
            newPoints: updatedPoints,
            error: `Requires ${effectiveCost} FP (you have ${updatedPoints}).`,
          };
        }
        updatedPoints = Number(pointsRes.rows[0].focus_points) || 0;
      }

      // Insert organisation
      const orgRes = await client.query(
        `INSERT INTO organisations (name, logo, creator_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, logo, creator_id, created_at, updated_at`,
        [trimmedName, logo, creatorId]
      );
      const orgRow = orgRes.rows[0];

      // Insert creator as leader
      await client.query(
        `INSERT INTO organisation_members (organisation_id, user_id, role)
         VALUES ($1, $2, 'leader')`,
        [orgRow.id, creatorId]
      );

      // Insert friend members
      for (const friendId of uniqueFriendIds) {
        await client.query(
          `INSERT INTO organisation_members (organisation_id, user_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (organisation_id, user_id) DO NOTHING`,
          [orgRow.id, friendId]
        );
      }

      await client.query("COMMIT");

      // Sync in-memory user cache
      for (const u of inMemoryUsers.values()) {
        if (u.id === creatorId) {
          u.focus_points = updatedPoints;
        }
      }

      const org = await getOrganisationById(orgRow.id);
      return {
        success: true,
        organisation: org || undefined,
        newPoints: updatedPoints,
      };
    } catch (err: any) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      if (err?.code === "23505") {
        return { success: false, error: "An organisation with that name already exists." };
      }
      handleDbQueryError("Error creating organisation", err);
      return { success: false, error: "Failed to create organisation." };
    } finally {
      client.release();
    }
  }

  // In-memory fallback
  const existingOrg = inMemoryOrganisations.find(
    (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (existingOrg) {
    return { success: false, error: "An organisation with that name already exists." };
  }

  const currentPoints = creator.focus_points || 0;
  if (effectiveCost > 0 && currentPoints < effectiveCost) {
    return {
      success: false,
      newPoints: currentPoints,
      error: `Requires ${effectiveCost} FP (you have ${currentPoints}).`,
    };
  }

  if (effectiveCost > 0) {
    creator.focus_points = currentPoints - effectiveCost;
    for (const u of inMemoryUsers.values()) {
      if (u.id === creatorId) {
        u.focus_points = creator.focus_points;
      }
    }
  }

  const now = new Date();
  const orgId = inMemoryIdCounter++;
  inMemoryOrganisations.push({
    id: orgId,
    name: trimmedName,
    logo,
    creator_id: creatorId,
    created_at: now,
    updated_at: now,
  });

  inMemoryOrganisationMembers.push({
    id: inMemoryIdCounter++,
    organisation_id: orgId,
    user_id: creatorId,
    role: "leader",
    joined_at: now,
  });

  for (const friendId of uniqueFriendIds) {
    inMemoryOrganisationMembers.push({
      id: inMemoryIdCounter++,
      organisation_id: orgId,
      user_id: friendId,
      role: "member",
      joined_at: now,
    });
  }

  const org = await getOrganisationById(orgId);
  return {
    success: true,
    organisation: org || undefined,
    newPoints: creator.focus_points,
  };
}

export async function getOrganisationById(orgId: number): Promise<Organisation | null> {
  if (!isDbConnected) {
    const org = inMemoryOrganisations.find((o) => o.id === orgId);
    if (!org) return null;
    const creator = findInMemoryUserById(org.creator_id);
    const members: OrganisationMember[] = inMemoryOrganisationMembers
      .filter((m) => m.organisation_id === org.id)
      .map((m) => {
        const u = findInMemoryUserById(m.user_id);
        return {
          userId: m.user_id,
          username: u?.username || `user_${m.user_id}`,
          displayName: u?.display_name || null,
          name: u?.display_name || u?.username || `user_${m.user_id}`,
          role: m.role,
          joinedAt: m.joined_at.toISOString(),
        };
      });
    return {
      id: org.id,
      name: org.name,
      logo: org.logo,
      creatorId: org.creator_id,
      creatorUsername: creator?.username || `user_${org.creator_id}`,
      creatorDisplayName: creator?.display_name || null,
      members,
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    };
  }

  try {
    const orgRes = await pool.query(
      `SELECT o.id, o.name, o.logo, o.creator_id, o.created_at, o.updated_at,
              u.username AS creator_username, u.display_name AS creator_display_name
       FROM organisations o
       JOIN users u ON u.id = o.creator_id
       WHERE o.id = $1
       LIMIT 1`,
      [orgId]
    );
    if (orgRes.rows.length === 0) return null;
    const row = orgRes.rows[0];

    const memRes = await pool.query(
      `SELECT om.user_id, om.role, om.joined_at, u.username, u.display_name
       FROM organisation_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organisation_id = $1
       ORDER BY (om.role = 'leader') DESC, om.joined_at ASC`,
      [orgId]
    );

    const members: OrganisationMember[] = memRes.rows.map((m) => ({
      userId: m.user_id,
      username: m.username,
      displayName: m.display_name,
      name: m.display_name || m.username,
      role: m.role === "leader" ? "leader" : "member",
      joinedAt: new Date(m.joined_at).toISOString(),
    }));

    return {
      id: row.id,
      name: row.name,
      logo: row.logo || null,
      creatorId: row.creator_id,
      creatorUsername: row.creator_username,
      creatorDisplayName: row.creator_display_name,
      members,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  } catch (err) {
    console.error("Error fetching organisation by ID:", err);
    return null;
  }
}

export async function getOrganisationsForUser(userId: number): Promise<Organisation[]> {
  if (!isDbConnected) {
    const orgIds = new Set(
      inMemoryOrganisationMembers
        .filter((m) => m.user_id === userId)
        .map((m) => m.organisation_id)
    );
    const result: Organisation[] = [];
    for (const orgId of orgIds) {
      const org = await getOrganisationById(orgId);
      if (org) result.push(org);
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    const res = await pool.query(
      `SELECT DISTINCT o.id, o.created_at
       FROM organisations o
       JOIN organisation_members om ON om.organisation_id = o.id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );
    const orgs: Organisation[] = [];
    for (const row of res.rows) {
      const org = await getOrganisationById(row.id);
      if (org) orgs.push(org);
    }
    return orgs;
  } catch (err) {
    console.error("Error fetching user organisations:", err);
    return [];
  }
}

export async function addOrganisationMember(
  organisationId: number,
  requesterId: number,
  targetUserId: number
): Promise<{ success: boolean; organisation?: Organisation; error?: string }> {
  const org = await getOrganisationById(organisationId);
  if (!org) return { success: false, error: "Organisation not found." };
  if (org.creatorId !== requesterId) {
    return { success: false, error: "Only the organisation leader can add members." };
  }
  if (targetUserId === requesterId || org.members.some((m) => m.userId === targetUserId)) {
    return { success: false, error: "Player is already a member of this organisation." };
  }

  const requester = await findUserById(requesterId);
  const isSuperadmin = requester?.role === "superadmin";

  if (!isSuperadmin) {
    const isFriend = await areUsersFriends(requesterId, targetUserId);
    if (!isFriend) {
      return { success: false, error: "You can only add players who are in your friend list." };
    }
  } else {
    const targetUser = await findUserById(targetUserId);
    if (!targetUser) {
      return { success: false, error: "Player not found." };
    }
  }

  if (!isDbConnected) {
    inMemoryOrganisationMembers.push({
      id: inMemoryIdCounter++,
      organisation_id: organisationId,
      user_id: targetUserId,
      role: "member",
      joined_at: new Date(),
    });
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  }

  try {
    await pool.query(
      `INSERT INTO organisation_members (organisation_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (organisation_id, user_id) DO NOTHING`,
      [organisationId, targetUserId]
    );
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  } catch (err) {
    console.error("Error adding organisation member:", err);
    return { success: false, error: "Failed to add member." };
  }
}

export async function removeOrganisationMember(
  organisationId: number,
  requesterId: number,
  targetUserId: number
): Promise<{ success: boolean; organisation?: Organisation; error?: string }> {
  const org = await getOrganisationById(organisationId);
  if (!org) return { success: false, error: "Organisation not found." };

  const isLeader = org.creatorId === requesterId;
  const isSelf = requesterId === targetUserId;
  if (!isLeader && !isSelf) {
    return { success: false, error: "Not authorized to remove this member." };
  }
  if (targetUserId === org.creatorId) {
    return { success: false, error: "Leader cannot leave without disbanding the organisation." };
  }

  if (!isDbConnected) {
    const idx = inMemoryOrganisationMembers.findIndex(
      (m) => m.organisation_id === organisationId && m.user_id === targetUserId
    );
    if (idx === -1) return { success: false, error: "Member not found." };
    inMemoryOrganisationMembers.splice(idx, 1);
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  }

  try {
    await pool.query(
      `DELETE FROM organisation_members
       WHERE organisation_id = $1 AND user_id = $2`,
      [organisationId, targetUserId]
    );
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  } catch (err) {
    console.error("Error removing organisation member:", err);
    return { success: false, error: "Failed to remove member." };
  }
}

export async function deleteOrganisation(
  organisationId: number,
  requesterId: number
): Promise<{ success: boolean; error?: string }> {
  const org = await getOrganisationById(organisationId);
  if (!org) return { success: false, error: "Organisation not found." };
  if (org.creatorId !== requesterId) {
    return { success: false, error: "Only the organisation leader can disband it." };
  }

  if (!isDbConnected) {
    const orgIdx = inMemoryOrganisations.findIndex((o) => o.id === organisationId);
    if (orgIdx !== -1) inMemoryOrganisations.splice(orgIdx, 1);
    for (let i = inMemoryOrganisationMembers.length - 1; i >= 0; i--) {
      if (inMemoryOrganisationMembers[i].organisation_id === organisationId) {
        inMemoryOrganisationMembers.splice(i, 1);
      }
    }
    return { success: true };
  }

  try {
    await pool.query("DELETE FROM organisations WHERE id = $1 AND creator_id = $2", [
      organisationId,
      requesterId,
    ]);
    return { success: true };
  } catch (err) {
    console.error("Error deleting organisation:", err);
    return { success: false, error: "Failed to disband organisation." };
  }
}

export async function transferOrganisationLeadership(
  organisationId: number,
  requesterId: number,
  newLeaderUserId: number
): Promise<{ success: boolean; organisation?: Organisation; error?: string }> {
  const org = await getOrganisationById(organisationId);
  if (!org) return { success: false, error: "Organisation not found." };
  if (org.creatorId !== requesterId) {
    return { success: false, error: "Only the organisation leader can transfer leadership." };
  }
  if (newLeaderUserId === requesterId) {
    return { success: false, error: "You are already the leader of this organisation." };
  }
  if (!org.members.some((m) => m.userId === newLeaderUserId)) {
    return { success: false, error: "Selected player is not a member of this organisation." };
  }

  if (!isDbConnected) {
    const inMemOrg = inMemoryOrganisations.find((o) => o.id === organisationId);
    if (!inMemOrg) return { success: false, error: "Organisation not found." };
    inMemOrg.creator_id = newLeaderUserId;
    inMemOrg.updated_at = new Date();
    for (const m of inMemoryOrganisationMembers) {
      if (m.organisation_id === organisationId) {
        if (m.user_id === requesterId) m.role = "member";
        if (m.user_id === newLeaderUserId) m.role = "leader";
      }
    }
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE organisations SET creator_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND creator_id = $3`,
      [organisationId, newLeaderUserId, requesterId]
    );
    await client.query(
      `UPDATE organisation_members SET role = 'member' WHERE organisation_id = $1 AND user_id = $2`,
      [organisationId, requesterId]
    );
    await client.query(
      `UPDATE organisation_members SET role = 'leader' WHERE organisation_id = $1 AND user_id = $2`,
      [organisationId, newLeaderUserId]
    );
    await client.query("COMMIT");
    const updated = await getOrganisationById(organisationId);
    return { success: true, organisation: updated || undefined };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("Error transferring organisation leadership:", err);
    return { success: false, error: "Failed to transfer leadership." };
  } finally {
    client.release();
  }
}

export async function getAllUsersBasic(): Promise<
  Array<{ userId: number; username: string; displayName: string | null; name: string }>
> {
  if (!isDbConnected) {
    return Array.from(inMemoryUsers.values())
      .map((u) => ({
        userId: u.id,
        username: u.username,
        displayName: u.display_name,
        name: u.display_name || u.username,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  try {
    const res = await pool.query(
      `SELECT id, username, display_name
       FROM users
       ORDER BY LOWER(username) ASC`
    );
    return res.rows.map((r) => ({
      userId: r.id,
      username: r.username,
      displayName: r.display_name,
      name: r.display_name || r.username,
    }));
  } catch (err) {
    console.error("Error fetching users list:", err);
    return [];
  }
}

// ==========================================
// Notes System Helpers
// ==========================================

async function hasSpaceNoteAccess(
  spaceId: string,
  userId: number,
  username: string
): Promise<{ allowed: boolean; spaceName?: string }> {
  const space = await getSpaceById(spaceId);
  if (!space || space.is_superadmin_space) {
    return { allowed: false };
  }
  const isOwner = space.owner_id === userId;
  const isSpaceMate = (space.shared_owners || []).some(
    (u) => u.toLowerCase() === username.toLowerCase()
  );
  if (!isOwner && !isSpaceMate) {
    return { allowed: false };
  }
  return { allowed: true, spaceName: space.name };
}

async function hasOrganisationNoteAccess(
  organisationId: number,
  userId: number
): Promise<{ allowed: boolean; orgName?: string }> {
  const org = await getOrganisationById(organisationId);
  if (!org) return { allowed: false };
  const isMember = org.members.some((m) => m.userId === userId);
  return isMember ? { allowed: true, orgName: org.name } : { allowed: false };
}

export async function getAccessibleSpacesForNotes(
  userId: number,
  username: string
): Promise<AccessibleNoteSpace[]> {
  const lowerUser = username.toLowerCase();
  if (!isDbConnected) {
    return Array.from(inMemorySpaces.values())
      .filter(
        (s) =>
          !s.is_superadmin_space &&
          (s.owner_id === userId ||
            (s.shared_owners || []).some((u) => u.toLowerCase() === lowerUser))
      )
      .map((s) => ({
        id: s.id,
        name: s.name,
        isOwner: s.owner_id === userId,
      }))
      .sort((a, b) => (a.isOwner === b.isOwner ? a.name.localeCompare(b.name) : a.isOwner ? -1 : 1));
  }

  try {
    const res = await pool.query(
      `SELECT id, name, owner_id
       FROM spaces
       WHERE is_superadmin_space = FALSE
         AND (
           owner_id = $1
           OR EXISTS (
             SELECT 1
             FROM jsonb_array_elements_text(COALESCE(shared_owners, '[]'::jsonb)) AS elem
             WHERE LOWER(elem) = LOWER($2)
           )
         )
       ORDER BY (owner_id = $1) DESC, name ASC`,
      [userId, username]
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      isOwner: Number(r.owner_id) === userId,
    }));
  } catch (err) {
    console.error("Error fetching accessible spaces for notes:", err);
    return [];
  }
}

export async function getNotesForUser(
  userId: number,
  username: string,
  type: NoteType,
  spaceId?: string,
  organisationId?: number
): Promise<{ success: boolean; notes: NoteDto[]; error?: string }> {
  if (type === "space" && spaceId) {
    const access = await hasSpaceNoteAccess(spaceId, userId, username);
    if (!access.allowed) {
      return { success: false, notes: [], error: "You do not have access to notes in this space." };
    }
  }
  if (type === "organisation" && organisationId !== undefined) {
    const access = await hasOrganisationNoteAccess(organisationId, userId);
    if (!access.allowed) {
      return {
        success: false,
        notes: [],
        error: "You do not have access to notes in this organisation.",
      };
    }
  }

  if (!isDbConnected) {
    const accessibleSpaces = await getAccessibleSpacesForNotes(userId, username);
    const accessibleSpaceMap = new Map(accessibleSpaces.map((s) => [s.id, s.name]));
    const userOrgs = await getOrganisationsForUser(userId);
    const userOrgMap = new Map(userOrgs.map((o) => [o.id, o.name]));

    const filtered = inMemoryNotes.filter((n) => {
      if (n.type !== type) return false;
      if (type === "personal") return n.author_id === userId;
      if (type === "space") {
        if (!n.space_id || !accessibleSpaceMap.has(n.space_id)) return false;
        return spaceId ? n.space_id === spaceId : true;
      }
      if (type === "organisation") {
        if (!n.organisation_id || !userOrgMap.has(n.organisation_id)) return false;
        return organisationId !== undefined ? n.organisation_id === organisationId : true;
      }
      return false;
    });

    const userList = Array.from(inMemoryUsers.values());
    const userById = new Map(userList.map((u) => [u.id, u]));

    const notes: NoteDto[] = filtered
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
      .map((n) => {
        const author = userById.get(n.author_id);
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          content: n.content,
          authorId: n.author_id,
          authorUsername: author?.username || "unknown",
          authorName: author?.display_name || author?.username || "Unknown",
          spaceId: n.space_id,
          spaceName: n.space_id ? accessibleSpaceMap.get(n.space_id) || null : null,
          organisationId: n.organisation_id,
          organisationName: n.organisation_id ? userOrgMap.get(n.organisation_id) || null : null,
          images: Array.isArray(n.images) ? n.images : [],
          createdAt: n.created_at.toISOString(),
          updatedAt: n.updated_at.toISOString(),
        };
      });

    return { success: true, notes };
  }

  try {
    let query = "";
    let params: any[] = [];

    if (type === "personal") {
      query = `
        SELECT n.*, u.username AS author_username, u.display_name AS author_display_name,
               NULL::text AS space_name, NULL::text AS organisation_name
        FROM notes n
        JOIN users u ON u.id = n.author_id
        WHERE n.type = 'personal' AND n.author_id = $1
        ORDER BY n.updated_at DESC, n.id DESC
      `;
      params = [userId];
    } else if (type === "space") {
      if (spaceId) {
        query = `
          SELECT n.*, u.username AS author_username, u.display_name AS author_display_name,
                 s.name AS space_name, NULL::text AS organisation_name
          FROM notes n
          JOIN users u ON u.id = n.author_id
          JOIN spaces s ON s.id = n.space_id
          WHERE n.type = 'space' AND n.space_id = $1
          ORDER BY n.updated_at DESC, n.id DESC
        `;
        params = [spaceId];
      } else {
        query = `
          SELECT n.*, u.username AS author_username, u.display_name AS author_display_name,
                 s.name AS space_name, NULL::text AS organisation_name
          FROM notes n
          JOIN users u ON u.id = n.author_id
          JOIN spaces s ON s.id = n.space_id
          WHERE n.type = 'space'
            AND s.is_superadmin_space = FALSE
            AND (
              s.owner_id = $1
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(COALESCE(s.shared_owners, '[]'::jsonb)) AS elem
                WHERE LOWER(elem) = LOWER($2)
              )
            )
          ORDER BY n.updated_at DESC, n.id DESC
        `;
        params = [userId, username];
      }
    } else {
      if (organisationId !== undefined) {
        query = `
          SELECT n.*, u.username AS author_username, u.display_name AS author_display_name,
                 NULL::text AS space_name, o.name AS organisation_name
          FROM notes n
          JOIN users u ON u.id = n.author_id
          JOIN organisations o ON o.id = n.organisation_id
          WHERE n.type = 'organisation' AND n.organisation_id = $1
          ORDER BY n.updated_at DESC, n.id DESC
        `;
        params = [organisationId];
      } else {
        query = `
          SELECT n.*, u.username AS author_username, u.display_name AS author_display_name,
                 NULL::text AS space_name, o.name AS organisation_name
          FROM notes n
          JOIN users u ON u.id = n.author_id
          JOIN organisations o ON o.id = n.organisation_id
          JOIN organisation_members om ON om.organisation_id = o.id AND om.user_id = $1
          WHERE n.type = 'organisation'
          ORDER BY n.updated_at DESC, n.id DESC
        `;
        params = [userId];
      }
    }

    const res = await pool.query(query, params);
    const notes: NoteDto[] = res.rows.map((r) => ({
      id: r.id,
      type: r.type as NoteType,
      title: r.title,
      content: r.content,
      authorId: r.author_id,
      authorUsername: r.author_username,
      authorName: r.author_display_name || r.author_username,
      spaceId: r.space_id,
      spaceName: r.space_name,
      organisationId: r.organisation_id,
      organisationName: r.organisation_name,
      images: Array.isArray(r.images) ? r.images : [],
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
    return { success: true, notes };
  } catch (err) {
    console.error("Error fetching notes:", err);
    return { success: false, notes: [], error: "Failed to load notes." };
  }
}

export async function createNote(params: {
  userId: number;
  username: string;
  type: NoteType;
  title: string;
  content: string;
  spaceId?: string | null;
  organisationId?: number | null;
  images?: string[];
}): Promise<{ success: boolean; note?: NoteDto; error?: string }> {
  const { userId, username, type, title, content } = params;
  const images = Array.isArray(params.images) ? params.images : [];
  let spaceId: string | null = null;
  let spaceName: string | null = null;
  let organisationId: number | null = null;
  let organisationName: string | null = null;

  if (type === "space") {
    if (!params.spaceId) {
      return { success: false, error: "Space is required for a space note." };
    }
    const access = await hasSpaceNoteAccess(params.spaceId, userId, username);
    if (!access.allowed) {
      return { success: false, error: "Only the space owner or space-mates can create space notes." };
    }
    spaceId = params.spaceId;
    spaceName = access.spaceName || null;
  } else if (type === "organisation") {
    if (!params.organisationId) {
      return { success: false, error: "Organisation is required for an organisation note." };
    }
    const access = await hasOrganisationNoteAccess(params.organisationId, userId);
    if (!access.allowed) {
      return {
        success: false,
        error: "Only members of this organisation can create organisation notes.",
      };
    }
    organisationId = params.organisationId;
    organisationName = access.orgName || null;
  }

  if (!isDbConnected) {
    const now = new Date();
    const record = {
      id: inMemoryIdCounter++,
      type,
      title,
      content,
      author_id: userId,
      space_id: spaceId,
      organisation_id: organisationId,
      images,
      created_at: now,
      updated_at: now,
    };
    inMemoryNotes.push(record);
    const author = Array.from(inMemoryUsers.values()).find((u) => u.id === userId);
    return {
      success: true,
      note: {
        id: record.id,
        type,
        title,
        content,
        authorId: userId,
        authorUsername: author?.username || username,
        authorName: author?.display_name || author?.username || username,
        spaceId,
        spaceName,
        organisationId,
        organisationName,
        images,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };
  }

  try {
    const res = await pool.query(
      `INSERT INTO notes (type, title, content, author_id, space_id, organisation_id, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [type, title, content, userId, spaceId, organisationId, JSON.stringify(images)]
    );
    const r = res.rows[0];
    const author = await findUserById(userId);
    return {
      success: true,
      note: {
        id: r.id,
        type: r.type as NoteType,
        title: r.title,
        content: r.content,
        authorId: r.author_id,
        authorUsername: author?.username || username,
        authorName: author?.display_name || author?.username || username,
        spaceId: r.space_id,
        spaceName,
        organisationId: r.organisation_id,
        organisationName,
        images: Array.isArray(r.images) ? r.images : [],
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      },
    };
  } catch (err) {
    console.error("Error creating note:", err);
    return { success: false, error: "Failed to create note." };
  }
}

async function canModifyNote(
  note: { type: NoteType | CalendarType; author_id: number; space_id: string | null; organisation_id: number | null },
  userId: number,
  username: string
): Promise<boolean> {
  if (note.type === "personal") {
    return note.author_id === userId;
  }
  if (note.type === "space") {
    if (!note.space_id) return false;
    const access = await hasSpaceNoteAccess(note.space_id, userId, username);
    return access.allowed;
  }
  if (note.type === "organisation") {
    if (!note.organisation_id) return false;
    const access = await hasOrganisationNoteAccess(note.organisation_id, userId);
    return access.allowed;
  }
  return false;
}

export async function updateNote(
  noteId: number,
  userId: number,
  username: string,
  title: string,
  content: string,
  images?: string[]
): Promise<{ success: boolean; note?: NoteDto; error?: string }> {
  if (!isDbConnected) {
    const existing = inMemoryNotes.find((n) => n.id === noteId);
    if (!existing) return { success: false, error: "Note not found." };
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) return { success: false, error: "You do not have permission to edit this note." };
    existing.title = title;
    existing.content = content;
    if (Array.isArray(images)) existing.images = images;
    existing.updated_at = new Date();
    const author = Array.from(inMemoryUsers.values()).find((u) => u.id === existing.author_id);
    return {
      success: true,
      note: {
        id: existing.id,
        type: existing.type,
        title: existing.title,
        content: existing.content,
        authorId: existing.author_id,
        authorUsername: author?.username || username,
        authorName: author?.display_name || author?.username || username,
        spaceId: existing.space_id,
        organisationId: existing.organisation_id,
        images: Array.isArray(existing.images) ? existing.images : [],
        createdAt: existing.created_at.toISOString(),
        updatedAt: existing.updated_at.toISOString(),
      },
    };
  }

  try {
    const findRes = await pool.query("SELECT * FROM notes WHERE id = $1", [noteId]);
    if (findRes.rows.length === 0) {
      return { success: false, error: "Note not found." };
    }
    const existing = findRes.rows[0];
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) {
      return { success: false, error: "You do not have permission to edit this note." };
    }

    const nextImages = Array.isArray(images)
      ? images
      : Array.isArray(existing.images)
      ? existing.images
      : [];

    const updRes = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, images = $3::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, content, JSON.stringify(nextImages), noteId]
    );
    const r = updRes.rows[0];
    const author = await findUserById(r.author_id);
    return {
      success: true,
      note: {
        id: r.id,
        type: r.type as NoteType,
        title: r.title,
        content: r.content,
        authorId: r.author_id,
        authorUsername: author?.username || "unknown",
        authorName: author?.display_name || author?.username || "Unknown",
        spaceId: r.space_id,
        organisationId: r.organisation_id,
        images: Array.isArray(r.images) ? r.images : [],
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      },
    };
  } catch (err) {
    console.error("Error updating note:", err);
    return { success: false, error: "Failed to update note." };
  }
}

export async function deleteNote(
  noteId: number,
  userId: number,
  username: string
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConnected) {
    const idx = inMemoryNotes.findIndex((n) => n.id === noteId);
    if (idx === -1) return { success: false, error: "Note not found." };
    const allowed = await canModifyNote(inMemoryNotes[idx], userId, username);
    if (!allowed) return { success: false, error: "You do not have permission to delete this note." };
    inMemoryNotes.splice(idx, 1);
    return { success: true };
  }

  try {
    const findRes = await pool.query("SELECT * FROM notes WHERE id = $1", [noteId]);
    if (findRes.rows.length === 0) {
      return { success: false, error: "Note not found." };
    }
    const existing = findRes.rows[0];
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) {
      return { success: false, error: "You do not have permission to delete this note." };
    }
    await pool.query("DELETE FROM notes WHERE id = $1", [noteId]);
    return { success: true };
  } catch (err) {
    console.error("Error deleting note:", err);
    return { success: false, error: "Failed to delete note." };
  }
}

// ==========================================
// Calendar Events CRUD
// ==========================================

function normalizeEventImages(raw: unknown): string[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  }
  const result: string[] = [];
  for (const item of arr) {
    if (
      typeof item === "string" &&
      /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item) &&
      item.length <= 2_000_000
    ) {
      result.push(item);
      if (result.length >= 10) break;
    }
  }
  return result;
}

function normalizeAssigneeIds(raw: unknown): number[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  }
  const seen = new Set<number>();
  const result: number[] = [];
  for (const item of arr) {
    const id = Number(item);
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

async function fetchUserLookupMap(
  userIds: number[]
): Promise<Map<number, { username: string; display_name: string | null }>> {
  const map = new Map<number, { username: string; display_name: string | null }>();
  if (userIds.length === 0) return map;

  if (!isDbConnected) {
    for (const u of inMemoryUsers.values()) {
      if (userIds.includes(u.id)) {
        map.set(u.id, { username: u.username, display_name: u.display_name });
      }
    }
    return map;
  }

  const res = await pool.query(
    `SELECT id, username, display_name FROM users WHERE id = ANY($1::int[])`,
    [userIds]
  );
  for (const r of res.rows) {
    map.set(Number(r.id), { username: r.username, display_name: r.display_name });
  }
  return map;
}

function resolveCalendarAssigneesFromMap(
  assigneeIds: number[],
  userMap: Map<number, { username: string; display_name: string | null }>
): CalendarAssigneeDto[] {
  const result: CalendarAssigneeDto[] = [];
  for (const id of assigneeIds) {
    const u = userMap.get(id);
    if (u) {
      result.push({
        userId: id,
        username: u.username,
        name: u.display_name || u.username,
      });
    }
  }
  return result;
}

export async function getAssignableCalendarMembers(
  type: CalendarType,
  spaceId?: string | null,
  organisationId?: number | null
): Promise<CalendarAssigneeDto[]> {
  if (type === "personal") return [];

  if (type === "organisation") {
    if (!organisationId) return [];
    const org = await getOrganisationById(organisationId);
    if (!org) return [];
    return org.members.map((m) => ({
      userId: m.userId,
      username: m.username,
      name: m.name,
    }));
  }

  if (type === "space") {
    if (!spaceId) return [];
    const space = await getSpaceById(spaceId);
    if (!space || space.is_superadmin_space) return [];
    const sharedLower = (space.shared_owners || []).map((u) => u.toLowerCase());

    if (!isDbConnected) {
      const members: CalendarAssigneeDto[] = [];
      const seen = new Set<number>();
      for (const u of inMemoryUsers.values()) {
        if (u.id === space.owner_id || sharedLower.includes(u.username.toLowerCase())) {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            members.push({
              userId: u.id,
              username: u.username,
              name: u.display_name || u.username,
            });
          }
        }
      }
      members.sort((a, b) => {
        if (a.userId === space.owner_id) return -1;
        if (b.userId === space.owner_id) return 1;
        return a.name.localeCompare(b.name);
      });
      return members;
    }

    try {
      const res = await pool.query(
        `SELECT id, username, display_name
         FROM users
         WHERE id = $1 OR LOWER(username) = ANY($2::text[])
         ORDER BY (id = $1) DESC, LOWER(COALESCE(display_name, username)) ASC`,
        [space.owner_id, sharedLower]
      );
      return res.rows.map((r) => ({
        userId: Number(r.id),
        username: r.username,
        name: r.display_name || r.username,
      }));
    } catch (err) {
      console.error("Error loading space assignable members:", err);
      return [];
    }
  }

  return [];
}

export async function getCalendarEventsForUser(
  userId: number,
  username: string,
  type: CalendarType,
  spaceId?: string,
  organisationId?: number
): Promise<{ success: boolean; events: CalendarEventDto[]; error?: string }> {
  if (type === "space" && spaceId) {
    const access = await hasSpaceNoteAccess(spaceId, userId, username);
    if (!access.allowed) {
      return { success: false, events: [], error: "You do not have access to calendar in this space." };
    }
  }
  if (type === "organisation" && organisationId !== undefined) {
    const access = await hasOrganisationNoteAccess(organisationId, userId);
    if (!access.allowed) {
      return {
        success: false,
        events: [],
        error: "You do not have access to calendar in this organisation.",
      };
    }
  }

  if (!isDbConnected) {
    const accessibleSpaces = await getAccessibleSpacesForNotes(userId, username);
    const accessibleSpaceMap = new Map(accessibleSpaces.map((s) => [s.id, s.name]));
    const userOrgs = await getOrganisationsForUser(userId);
    const userOrgMap = new Map(userOrgs.map((o) => [o.id, o.name]));

    const filtered = inMemoryCalendarEvents.filter((ev) => {
      if (ev.type !== type) return false;
      if (type === "personal") return ev.author_id === userId;
      if (type === "space") {
        if (!ev.space_id || !accessibleSpaceMap.has(ev.space_id)) return false;
        return spaceId ? ev.space_id === spaceId : true;
      }
      if (type === "organisation") {
        if (!ev.organisation_id || !userOrgMap.has(ev.organisation_id)) return false;
        return organisationId !== undefined ? ev.organisation_id === organisationId : true;
      }
      return false;
    });

    const userById = new Map(Array.from(inMemoryUsers.values()).map((u) => [u.id, { username: u.username, display_name: u.display_name }]));
    const events: CalendarEventDto[] = filtered
      .sort((a, b) => a.start_date.localeCompare(b.start_date) || (a.start_time || "").localeCompare(b.start_time || ""))
      .map((ev) => {
        const author = userById.get(ev.author_id);
        const assigneeIds = normalizeAssigneeIds(ev.assignee_ids);
        return {
          id: ev.id,
          type: ev.type,
          title: ev.title,
          description: ev.description,
          startDate: ev.start_date,
          endDate: ev.end_date,
          isAllDay: ev.is_all_day,
          startTime: ev.start_time,
          endTime: ev.end_time,
          repeatInterval: ev.repeat_interval,
          repeatUnit: ev.repeat_unit,
          assigneeIds,
          assignees: resolveCalendarAssigneesFromMap(assigneeIds, userById),
          rotateAssignees: Boolean(ev.rotate_assignees),
          images: normalizeEventImages(ev.images),
          authorId: ev.author_id,
          authorUsername: author?.username || "unknown",
          authorName: author?.display_name || author?.username || "Unknown",
          spaceId: ev.space_id,
          spaceName: ev.space_id ? accessibleSpaceMap.get(ev.space_id) || null : null,
          organisationId: ev.organisation_id,
          organisationName: ev.organisation_id ? userOrgMap.get(ev.organisation_id) || null : null,
          createdAt: ev.created_at.toISOString(),
          updatedAt: ev.updated_at.toISOString(),
        };
      });

    return { success: true, events };
  }

  try {
    let query = "";
    let params: any[] = [];

    if (type === "personal") {
      query = `
        SELECT e.*, u.username AS author_username, u.display_name AS author_name,
               NULL::text AS space_name, NULL::text AS organisation_name
        FROM calendar_events e
        JOIN users u ON u.id = e.author_id
        WHERE e.type = 'personal' AND e.author_id = $1
        ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST, e.id ASC
      `;
      params = [userId];
    } else if (type === "space") {
      if (spaceId) {
        query = `
          SELECT e.*, u.username AS author_username, u.display_name AS author_name,
                 s.name AS space_name, NULL::text AS organisation_name
          FROM calendar_events e
          JOIN users u ON u.id = e.author_id
          JOIN spaces s ON s.id = e.space_id
          WHERE e.type = 'space' AND e.space_id = $1
          ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST, e.id ASC
        `;
        params = [spaceId];
      } else {
        query = `
          SELECT e.*, u.username AS author_username, u.display_name AS author_name,
                 s.name AS space_name, NULL::text AS organisation_name
          FROM calendar_events e
          JOIN users u ON u.id = e.author_id
          JOIN spaces s ON s.id = e.space_id
          WHERE e.type = 'space'
            AND s.is_superadmin_space = FALSE
            AND (
              s.owner_id = $1
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(COALESCE(s.shared_owners, '[]'::jsonb)) AS elem
                WHERE LOWER(elem) = LOWER($2)
              )
            )
          ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST, e.id ASC
        `;
        params = [userId, username];
      }
    } else {
      if (organisationId !== undefined) {
        query = `
          SELECT e.*, u.username AS author_username, u.display_name AS author_name,
                 NULL::text AS space_name, o.name AS organisation_name
          FROM calendar_events e
          JOIN users u ON u.id = e.author_id
          JOIN organisations o ON o.id = e.organisation_id
          WHERE e.type = 'organisation' AND e.organisation_id = $1
          ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST, e.id ASC
        `;
        params = [organisationId];
      } else {
        query = `
          SELECT e.*, u.username AS author_username, u.display_name AS author_name,
                 NULL::text AS space_name, o.name AS organisation_name
          FROM calendar_events e
          JOIN users u ON u.id = e.author_id
          JOIN organisations o ON o.id = e.organisation_id
          JOIN organisation_members om ON om.organisation_id = o.id
          WHERE e.type = 'organisation' AND om.user_id = $1
          ORDER BY e.start_date ASC, e.start_time ASC NULLS FIRST, e.id ASC
        `;
        params = [userId];
      }
    }

    const res = await pool.query(query, params);
    const allAssigneeIds = Array.from(
      new Set(res.rows.flatMap((r) => normalizeAssigneeIds(r.assignee_ids)))
    );
    const assigneeUserMap = await fetchUserLookupMap(allAssigneeIds);

    const events: CalendarEventDto[] = res.rows.map((r) => {
      const assigneeIds = normalizeAssigneeIds(r.assignee_ids);
      return {
        id: Number(r.id),
        type: r.type as CalendarType,
        title: r.title,
        description: r.description,
        startDate: r.start_date,
        endDate: r.end_date,
        isAllDay: Boolean(r.is_all_day),
        startTime: r.start_time || null,
        endTime: r.end_time || null,
        repeatInterval: r.repeat_interval !== null && r.repeat_interval !== undefined ? Number(r.repeat_interval) : null,
        repeatUnit: (r.repeat_unit as CalendarRepeatUnit) || null,
        assigneeIds,
        assignees: resolveCalendarAssigneesFromMap(assigneeIds, assigneeUserMap),
        rotateAssignees: Boolean(r.rotate_assignees),
        images: normalizeEventImages(r.images),
        authorId: Number(r.author_id),
        authorUsername: r.author_username,
        authorName: r.author_name || r.author_username,
        spaceId: r.space_id || null,
        spaceName: r.space_name || null,
        organisationId: r.organisation_id !== null && r.organisation_id !== undefined ? Number(r.organisation_id) : null,
        organisationName: r.organisation_name || null,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return { success: true, events };
  } catch (err) {
    console.error("Error loading calendar events:", err);
    return { success: false, events: [], error: "Failed to load calendar events." };
  }
}

export async function createCalendarEvent(params: {
  userId: number;
  username: string;
  type: CalendarType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  repeatInterval: number | null;
  repeatUnit: CalendarRepeatUnit | null;
  assigneeIds?: number[];
  rotateAssignees?: boolean;
  images?: string[];
  spaceId?: string | null;
  organisationId?: number | null;
}): Promise<{ success: boolean; event?: CalendarEventDto; error?: string }> {
  const {
    userId,
    username,
    type,
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    startTime,
    endTime,
    repeatInterval,
    repeatUnit,
    assigneeIds: rawAssigneeIds,
    rotateAssignees: rawRotateAssignees,
    images: rawImages,
    spaceId,
    organisationId,
  } = params;

  let spaceName: string | null = null;
  let organisationName: string | null = null;

  if (type === "space") {
    if (!spaceId) return { success: false, error: "Space is required for space calendar events." };
    const access = await hasSpaceNoteAccess(spaceId, userId, username);
    if (!access.allowed) {
      return { success: false, error: "You do not have permission to add events to this space." };
    }
    spaceName = access.spaceName || null;
  } else if (type === "organisation") {
    if (!organisationId) return { success: false, error: "Organisation is required for organisation calendar events." };
    const access = await hasOrganisationNoteAccess(organisationId, userId);
    if (!access.allowed) {
      return { success: false, error: "You do not have permission to add events to this organisation." };
    }
    organisationName = access.orgName || null;
  }

  const normalizedSpaceId = type === "space" ? spaceId || null : null;
  const normalizedOrgId = type === "organisation" ? organisationId || null : null;

  let finalAssigneeIds: number[] = [];
  let finalAssignees: CalendarAssigneeDto[] = [];
  if (type !== "personal") {
    const requestedIds = normalizeAssigneeIds(rawAssigneeIds);
    if (requestedIds.length > 0) {
      const assignable = await getAssignableCalendarMembers(type, normalizedSpaceId, normalizedOrgId);
      const assignableMap = new Map(assignable.map((m) => [m.userId, m]));
      for (const id of requestedIds) {
        const member = assignableMap.get(id);
        if (member) {
          finalAssigneeIds.push(id);
          finalAssignees.push(member);
        }
      }
    }
  }
  const finalRotateAssignees =
    type !== "personal" && Boolean(rawRotateAssignees) && Boolean(repeatInterval && repeatUnit);
  const finalImages = normalizeEventImages(rawImages);

  if (!isDbConnected) {
    const now = new Date();
    const author = Array.from(inMemoryUsers.values()).find((u) => u.id === userId);
    const record = {
      id: inMemoryIdCounter++,
      type,
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      is_all_day: isAllDay,
      start_time: startTime,
      end_time: endTime,
      repeat_interval: repeatInterval,
      repeat_unit: repeatUnit,
      assignee_ids: finalAssigneeIds,
      rotate_assignees: finalRotateAssignees,
      images: finalImages,
      author_id: userId,
      space_id: normalizedSpaceId,
      organisation_id: normalizedOrgId,
      created_at: now,
      updated_at: now,
    };
    inMemoryCalendarEvents.push(record);
    return {
      success: true,
      event: {
        id: record.id,
        type,
        title,
        description,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime,
        repeatInterval,
        repeatUnit,
        assigneeIds: finalAssigneeIds,
        assignees: finalAssignees,
        rotateAssignees: finalRotateAssignees,
        images: finalImages,
        authorId: userId,
        authorUsername: author?.username || username,
        authorName: author?.display_name || author?.username || username,
        spaceId: normalizedSpaceId,
        spaceName,
        organisationId: normalizedOrgId,
        organisationName,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };
  }

  try {
    const res = await pool.query(
      `INSERT INTO calendar_events
         (type, title, description, start_date, end_date, is_all_day, start_time, end_time, repeat_interval, repeat_unit, assignee_ids, rotate_assignees, images, author_id, space_id, organisation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14, $15, $16)
       RETURNING *`,
      [
        type,
        title,
        description,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime,
        repeatInterval,
        repeatUnit,
        JSON.stringify(finalAssigneeIds),
        finalRotateAssignees,
        JSON.stringify(finalImages),
        userId,
        normalizedSpaceId,
        normalizedOrgId,
      ]
    );
    const r = res.rows[0];
    const userRes = await pool.query("SELECT username, display_name FROM users WHERE id = $1", [userId]);
    const u = userRes.rows[0];

    return {
      success: true,
      event: {
        id: Number(r.id),
        type: r.type as CalendarType,
        title: r.title,
        description: r.description,
        startDate: r.start_date,
        endDate: r.end_date,
        isAllDay: Boolean(r.is_all_day),
        startTime: r.start_time || null,
        endTime: r.end_time || null,
        repeatInterval: r.repeat_interval !== null && r.repeat_interval !== undefined ? Number(r.repeat_interval) : null,
        repeatUnit: (r.repeat_unit as CalendarRepeatUnit) || null,
        assigneeIds: finalAssigneeIds,
        assignees: finalAssignees,
        rotateAssignees: Boolean(r.rotate_assignees),
        images: finalImages,
        authorId: Number(r.author_id),
        authorUsername: u?.username || username,
        authorName: u?.display_name || u?.username || username,
        spaceId: r.space_id || null,
        spaceName,
        organisationId: r.organisation_id !== null && r.organisation_id !== undefined ? Number(r.organisation_id) : null,
        organisationName,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      },
    };
  } catch (err) {
    console.error("Error creating calendar event:", err);
    return { success: false, error: "Failed to create calendar event." };
  }
}

export async function updateCalendarEvent(
  eventId: number,
  userId: number,
  username: string,
  params: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    startTime: string | null;
    endTime: string | null;
    repeatInterval: number | null;
    repeatUnit: CalendarRepeatUnit | null;
    assigneeIds?: number[];
    rotateAssignees?: boolean;
    images?: string[];
  }
): Promise<{ success: boolean; event?: CalendarEventDto; error?: string }> {
  const {
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    startTime,
    endTime,
    repeatInterval,
    repeatUnit,
    assigneeIds: rawAssigneeIds,
    rotateAssignees: rawRotateAssignees,
    images: rawImages,
  } = params;
  const finalImages = normalizeEventImages(rawImages);

  const resolveForExisting = async (
    evType: CalendarType,
    evSpaceId: string | null,
    evOrgId: number | null
  ): Promise<{ finalIds: number[]; finalAssignees: CalendarAssigneeDto[]; finalRotate: boolean }> => {
    const finalIds: number[] = [];
    const finalAssignees: CalendarAssigneeDto[] = [];
    if (evType !== "personal") {
      const requestedIds = normalizeAssigneeIds(rawAssigneeIds);
      if (requestedIds.length > 0) {
        const assignable = await getAssignableCalendarMembers(evType, evSpaceId, evOrgId);
        const assignableMap = new Map(assignable.map((m) => [m.userId, m]));
        for (const id of requestedIds) {
          const member = assignableMap.get(id);
          if (member) {
            finalIds.push(id);
            finalAssignees.push(member);
          }
        }
      }
    }
    const finalRotate =
      evType !== "personal" && Boolean(rawRotateAssignees) && Boolean(repeatInterval && repeatUnit);
    return { finalIds, finalAssignees, finalRotate };
  };

  if (!isDbConnected) {
    const existing = inMemoryCalendarEvents.find((e) => e.id === eventId);
    if (!existing) return { success: false, error: "Event not found." };
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) return { success: false, error: "You do not have permission to edit this event." };

    const { finalIds, finalAssignees, finalRotate } = await resolveForExisting(
      existing.type,
      existing.space_id,
      existing.organisation_id
    );

    existing.title = title;
    existing.description = description;
    existing.start_date = startDate;
    existing.end_date = endDate;
    existing.is_all_day = isAllDay;
    existing.start_time = startTime;
    existing.end_time = endTime;
    existing.repeat_interval = repeatInterval;
    existing.repeat_unit = repeatUnit;
    existing.assignee_ids = finalIds;
    existing.rotate_assignees = finalRotate;
    existing.images = finalImages;
    existing.updated_at = new Date();

    const author = Array.from(inMemoryUsers.values()).find((u) => u.id === existing.author_id);
    return {
      success: true,
      event: {
        id: existing.id,
        type: existing.type,
        title: existing.title,
        description: existing.description,
        startDate: existing.start_date,
        endDate: existing.end_date,
        isAllDay: existing.is_all_day,
        startTime: existing.start_time,
        endTime: existing.end_time,
        repeatInterval: existing.repeat_interval,
        repeatUnit: existing.repeat_unit,
        assigneeIds: finalIds,
        assignees: finalAssignees,
        rotateAssignees: finalRotate,
        images: finalImages,
        authorId: existing.author_id,
        authorUsername: author?.username || "unknown",
        authorName: author?.display_name || author?.username || "Unknown",
        spaceId: existing.space_id,
        organisationId: existing.organisation_id,
        createdAt: existing.created_at.toISOString(),
        updatedAt: existing.updated_at.toISOString(),
      },
    };
  }

  try {
    const findRes = await pool.query("SELECT * FROM calendar_events WHERE id = $1", [eventId]);
    if (findRes.rows.length === 0) {
      return { success: false, error: "Event not found." };
    }
    const existing = findRes.rows[0];
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) {
      return { success: false, error: "You do not have permission to edit this event." };
    }

    const { finalIds, finalAssignees, finalRotate } = await resolveForExisting(
      existing.type as CalendarType,
      existing.space_id || null,
      existing.organisation_id !== null && existing.organisation_id !== undefined ? Number(existing.organisation_id) : null
    );

    const res = await pool.query(
      `UPDATE calendar_events
       SET title = $1, description = $2, start_date = $3, end_date = $4,
           is_all_day = $5, start_time = $6, end_time = $7,
           repeat_interval = $8, repeat_unit = $9,
           assignee_ids = $10::jsonb, rotate_assignees = $11, images = $12::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        title,
        description,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime,
        repeatInterval,
        repeatUnit,
        JSON.stringify(finalIds),
        finalRotate,
        JSON.stringify(finalImages),
        eventId,
      ]
    );
    const r = res.rows[0];
    const userRes = await pool.query("SELECT username, display_name FROM users WHERE id = $1", [r.author_id]);
    const u = userRes.rows[0];

    return {
      success: true,
      event: {
        id: Number(r.id),
        type: r.type as CalendarType,
        title: r.title,
        description: r.description,
        startDate: r.start_date,
        endDate: r.end_date,
        isAllDay: Boolean(r.is_all_day),
        startTime: r.start_time || null,
        endTime: r.end_time || null,
        repeatInterval: r.repeat_interval !== null && r.repeat_interval !== undefined ? Number(r.repeat_interval) : null,
        repeatUnit: (r.repeat_unit as CalendarRepeatUnit) || null,
        assigneeIds: finalIds,
        assignees: finalAssignees,
        rotateAssignees: Boolean(r.rotate_assignees),
        images: finalImages,
        authorId: Number(r.author_id),
        authorUsername: u?.username || "unknown",
        authorName: u?.display_name || u?.username || "Unknown",
        spaceId: r.space_id || null,
        organisationId: r.organisation_id !== null && r.organisation_id !== undefined ? Number(r.organisation_id) : null,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      },
    };
  } catch (err) {
    console.error("Error updating calendar event:", err);
    return { success: false, error: "Failed to update calendar event." };
  }
}

export async function deleteCalendarEvent(
  eventId: number,
  userId: number,
  username: string
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConnected) {
    const idx = inMemoryCalendarEvents.findIndex((e) => e.id === eventId);
    if (idx === -1) return { success: false, error: "Event not found." };
    const allowed = await canModifyNote(inMemoryCalendarEvents[idx], userId, username);
    if (!allowed) return { success: false, error: "You do not have permission to delete this event." };
    inMemoryCalendarEvents.splice(idx, 1);
    return { success: true };
  }

  try {
    const findRes = await pool.query("SELECT * FROM calendar_events WHERE id = $1", [eventId]);
    if (findRes.rows.length === 0) {
      return { success: false, error: "Event not found." };
    }
    const existing = findRes.rows[0];
    const allowed = await canModifyNote(existing, userId, username);
    if (!allowed) {
      return { success: false, error: "You do not have permission to delete this event." };
    }
    await pool.query("DELETE FROM calendar_events WHERE id = $1", [eventId]);
    return { success: true };
  } catch (err) {
    console.error("Error deleting calendar event:", err);
    return { success: false, error: "Failed to delete calendar event." };
  }
}

export async function getCalendarMealsForSpace(
  userId: number,
  username: string,
  spaceId: string
): Promise<{ success: boolean; meals?: CalendarMealDto[]; error?: string }> {
  const access = await hasSpaceNoteAccess(spaceId, userId, username);
  if (!access.allowed) {
    return { success: false, error: "You do not have access to this space's meals." };
  }

  if (!isDbConnected) {
    const meals: CalendarMealDto[] = [];
    for (let day = 0; day <= 6; day++) {
      const rec = inMemoryCalendarMeals.get(`${spaceId}:${day}`);
      if (rec && rec.meal_name) {
        meals.push({
          dayOfWeek: rec.day_of_week,
          mealName: rec.meal_name,
          updatedAt: rec.updated_at.toISOString(),
        });
      }
    }
    return { success: true, meals };
  }

  try {
    const res = await pool.query(
      `SELECT day_of_week, meal_name, updated_at
       FROM calendar_meals
       WHERE space_id = $1
       ORDER BY day_of_week ASC`,
      [spaceId]
    );
    const meals: CalendarMealDto[] = res.rows.map((r) => ({
      dayOfWeek: Number(r.day_of_week),
      mealName: r.meal_name || "",
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : new Date(r.updated_at).toISOString(),
    }));
    return { success: true, meals };
  } catch (err) {
    console.error("Error fetching calendar meals:", err);
    return { success: false, error: "Failed to load meals." };
  }
}

export async function upsertCalendarMealForSpace(
  userId: number,
  username: string,
  spaceId: string,
  dayOfWeek: number,
  mealName: string
): Promise<{ success: boolean; meal?: CalendarMealDto; error?: string }> {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: "Invalid day of week." };
  }
  const access = await hasSpaceNoteAccess(spaceId, userId, username);
  if (!access.allowed) {
    return { success: false, error: "You do not have permission to edit this space's meals." };
  }

  const cleanName = mealName.trim().slice(0, 200);
  const now = new Date();

  if (!isDbConnected) {
    const key = `${spaceId}:${dayOfWeek}`;
    if (!cleanName) {
      inMemoryCalendarMeals.delete(key);
    } else {
      inMemoryCalendarMeals.set(key, {
        space_id: spaceId,
        day_of_week: dayOfWeek,
        meal_name: cleanName,
        updated_at: now,
      });
    }
    return {
      success: true,
      meal: { dayOfWeek, mealName: cleanName, updatedAt: now.toISOString() },
    };
  }

  try {
    if (!cleanName) {
      await pool.query(
        "DELETE FROM calendar_meals WHERE space_id = $1 AND day_of_week = $2",
        [spaceId, dayOfWeek]
      );
      return {
        success: true,
        meal: { dayOfWeek, mealName: "", updatedAt: now.toISOString() },
      };
    }

    const res = await pool.query(
      `INSERT INTO calendar_meals (space_id, day_of_week, meal_name, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (space_id, day_of_week)
       DO UPDATE SET meal_name = EXCLUDED.meal_name, updated_at = CURRENT_TIMESTAMP
       RETURNING day_of_week, meal_name, updated_at`,
      [spaceId, dayOfWeek, cleanName]
    );
    const r = res.rows[0];
    return {
      success: true,
      meal: {
        dayOfWeek: Number(r.day_of_week),
        mealName: r.meal_name || "",
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : new Date(r.updated_at).toISOString(),
      },
    };
  } catch (err) {
    console.error("Error saving calendar meal:", err);
    return { success: false, error: "Failed to save meal." };
  }
}

// ==========================================
// Space Inventory Helpers
// ==========================================

export interface SpaceInventoryDto {
  id: number;
  spaceId: string;
  name: string;
  bought: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapSpaceInventoryRow(row: {
  id: number;
  space_id: string;
  name: string;
  bought: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}): SpaceInventoryDto {
  return {
    id: Number(row.id),
    spaceId: row.space_id,
    name: row.name,
    bought: Boolean(row.bought),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
  };
}

export async function getSpaceInventory(
  spaceId: string,
  userId: number,
  username: string
): Promise<{ success: boolean; items: SpaceInventoryDto[]; error?: string }> {
  const access = await hasSpaceNoteAccess(spaceId, userId, username);
  if (!access.allowed) {
    return { success: false, items: [], error: "You do not have access to this space's inventory." };
  }

  if (!isDbConnected) {
    const items = inMemorySpaceInventories
      .filter((item) => item.space_id === spaceId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime() || b.id - a.id)
      .map(mapSpaceInventoryRow);
    return { success: true, items };
  }

  try {
    const res = await pool.query(
      `SELECT id, space_id, name, bought, created_at, updated_at
       FROM space_inventories
       WHERE space_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [spaceId]
    );
    return { success: true, items: res.rows.map(mapSpaceInventoryRow) };
  } catch (err) {
    console.error("Error fetching space inventory:", err);
    return { success: false, items: [], error: "Failed to load space inventory." };
  }
}

export async function createSpaceInventoryItem(params: {
  spaceId: string;
  userId: number;
  username: string;
  name: string;
  bought: boolean;
}): Promise<{ success: boolean; item?: SpaceInventoryDto; error?: string }> {
  const access = await hasSpaceNoteAccess(params.spaceId, params.userId, params.username);
  if (!access.allowed) {
    return { success: false, error: "You do not have access to this space's inventory." };
  }

  if (!isDbConnected) {
    const now = new Date();
    const record = {
      id: nextInMemorySpaceInventoryId++,
      space_id: params.spaceId,
      name: params.name,
      bought: Boolean(params.bought),
      created_by: params.userId,
      created_at: now,
      updated_at: now,
    };
    inMemorySpaceInventories.push(record);
    return { success: true, item: mapSpaceInventoryRow(record) };
  }

  try {
    const res = await pool.query(
      `INSERT INTO space_inventories (space_id, name, bought, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, space_id, name, bought, created_at, updated_at`,
      [params.spaceId, params.name, Boolean(params.bought), params.userId]
    );
    return { success: true, item: mapSpaceInventoryRow(res.rows[0]) };
  } catch (err) {
    console.error("Error creating space inventory item:", err);
    return { success: false, error: "Failed to add inventory item." };
  }
}

export async function updateSpaceInventoryItem(params: {
  id: number;
  spaceId: string;
  userId: number;
  username: string;
  name: string;
  bought: boolean;
}): Promise<{ success: boolean; item?: SpaceInventoryDto; error?: string }> {
  const access = await hasSpaceNoteAccess(params.spaceId, params.userId, params.username);
  if (!access.allowed) {
    return { success: false, error: "You do not have access to this space's inventory." };
  }

  if (!isDbConnected) {
    const existing = inMemorySpaceInventories.find(
      (item) => item.id === params.id && item.space_id === params.spaceId
    );
    if (!existing) {
      return { success: false, error: "Inventory item not found." };
    }
    existing.name = params.name;
    existing.bought = Boolean(params.bought);
    existing.updated_at = new Date();
    return { success: true, item: mapSpaceInventoryRow(existing) };
  }

  try {
    const res = await pool.query(
      `UPDATE space_inventories
       SET name = $1, bought = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND space_id = $4
       RETURNING id, space_id, name, bought, created_at, updated_at`,
      [params.name, Boolean(params.bought), params.id, params.spaceId]
    );
    if (res.rows.length === 0) {
      return { success: false, error: "Inventory item not found." };
    }
    return { success: true, item: mapSpaceInventoryRow(res.rows[0]) };
  } catch (err) {
    console.error("Error updating space inventory item:", err);
    return { success: false, error: "Failed to update inventory item." };
  }
}

export async function deleteSpaceInventoryItem(params: {
  id: number;
  spaceId: string;
  userId: number;
  username: string;
}): Promise<{ success: boolean; error?: string }> {
  const access = await hasSpaceNoteAccess(params.spaceId, params.userId, params.username);
  if (!access.allowed) {
    return { success: false, error: "You do not have access to this space's inventory." };
  }

  if (!isDbConnected) {
    const idx = inMemorySpaceInventories.findIndex(
      (item) => item.id === params.id && item.space_id === params.spaceId
    );
    if (idx === -1) {
      return { success: false, error: "Inventory item not found." };
    }
    inMemorySpaceInventories.splice(idx, 1);
    return { success: true };
  }

  try {
    const res = await pool.query(
      `DELETE FROM space_inventories
       WHERE id = $1 AND space_id = $2
       RETURNING id`,
      [params.id, params.spaceId]
    );
    if (res.rows.length === 0) {
      return { success: false, error: "Inventory item not found." };
    }
    return { success: true };
  } catch (err) {
    console.error("Error deleting space inventory item:", err);
    return { success: false, error: "Failed to delete inventory item." };
  }
}

// ==========================================
// Netherworld Focus RPG Database Operations
// ==========================================

const inMemoryRpgProfiles = new Map<number, { profileJson: any; powerScore: string }>();
const inMemoryRpgTrades = new Map<string, any>();
const inMemoryRpgRaids = new Map<string, any>();

export async function deductUserFocusPoints(
  userId: number,
  cost: number
): Promise<{ success: boolean; newPoints: number; error?: string }> {
  const cleanCost = Math.max(0, Math.ceil(cost));
  if (cleanCost === 0) {
    const current = await getUserFocusPoints(userId);
    return { success: true, newPoints: current };
  }

  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE users
         SET focus_points = COALESCE(focus_points, 0) - $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND COALESCE(focus_points, 0) >= $2
         RETURNING COALESCE(focus_points, 0) as focus_points`,
        [userId, cleanCost]
      );
      if (res.rows.length === 0) {
        const current = await getUserFocusPoints(userId);
        return { success: false, newPoints: current, error: `Insufficient Focus Points (need ${cleanCost} FP).` };
      }
      const newPoints = Number(res.rows[0].focus_points) || 0;
      for (const u of inMemoryUsers.values()) {
        if (u.id === userId) {
          u.focus_points = newPoints;
          break;
        }
      }
      return { success: true, newPoints };
    } catch (err) {
      handleDbQueryError("Error deducting user focus points", err);
    }
  }

  for (const u of inMemoryUsers.values()) {
    if (u.id === userId) {
      const curr = Number(u.focus_points) || 0;
      if (curr < cleanCost) {
        return { success: false, newPoints: curr, error: `Insufficient Focus Points (need ${cleanCost} FP).` };
      }
      u.focus_points = curr - cleanCost;
      return { success: true, newPoints: u.focus_points };
    }
  }
  return { success: false, newPoints: 0, error: "User not found." };
}

export async function getRpgProfileJson(userId: number): Promise<any | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT profile_json FROM rpg_profiles WHERE user_id = $1",
        [userId]
      );
      if (res.rows.length > 0) {
        const val = res.rows[0].profile_json;
        inMemoryRpgProfiles.set(userId, { profileJson: val, powerScore: "0" });
        return val;
      }
    } catch (err) {
      handleDbQueryError("Error loading RPG profile", err);
    }
  }
  return inMemoryRpgProfiles.get(userId)?.profileJson || null;
}

export async function saveRpgProfileJson(
  userId: number,
  profileJson: any,
  powerScore: string
): Promise<void> {
  inMemoryRpgProfiles.set(userId, { profileJson, powerScore });
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO rpg_profiles (user_id, profile_json, power_score, updated_at)
         VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
         SET profile_json = EXCLUDED.profile_json,
             power_score = EXCLUDED.power_score,
             updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(profileJson), powerScore]
      );
    } catch (err) {
      handleDbQueryError("Error saving RPG profile", err);
    }
  }
}

export async function listArenaProfileRecords(
  excludeUserId: number,
  limit = 12
): Promise<Array<{ userId: number; username: string; displayName: string | null; profileJson: any; powerScore: string }>> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT p.user_id, p.profile_json, p.power_score, u.username, u.display_name
         FROM rpg_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id != $1
         ORDER BY p.updated_at DESC
         LIMIT $2`,
        [excludeUserId, limit]
      );
      return res.rows.map((r) => ({
        userId: Number(r.user_id),
        username: r.username,
        displayName: r.display_name || null,
        profileJson: r.profile_json,
        powerScore: String(r.power_score || "0"),
      }));
    } catch (err) {
      handleDbQueryError("Error listing arena profiles", err);
    }
  }

  const out: Array<{ userId: number; username: string; displayName: string | null; profileJson: any; powerScore: string }> = [];
  for (const [uid, entry] of inMemoryRpgProfiles.entries()) {
    if (uid === excludeUserId) continue;
    const u = Array.from(inMemoryUsers.values()).find((usr) => usr.id === uid);
    out.push({
      userId: uid,
      username: u?.username || `player_${uid}`,
      displayName: u?.display_name || null,
      profileJson: entry.profileJson,
      powerScore: entry.powerScore,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getActiveTradeOffersForSquad(squadId: string, now = Date.now()): Promise<any[]> {
  if (isDbConnected) {
    try {
      await pool.query("DELETE FROM rpg_trade_offers WHERE expires_at <= $1", [now]);
      const res = await pool.query(
        "SELECT offer_json FROM rpg_trade_offers WHERE squad_id = $1 AND expires_at > $2 ORDER BY created_at DESC",
        [squadId, now]
      );
      return res.rows.map((r) => r.offer_json);
    } catch (err) {
      handleDbQueryError("Error fetching squad trade offers", err);
    }
  }
  const out: any[] = [];
  for (const [id, offer] of inMemoryRpgTrades.entries()) {
    if (offer.expiresAt <= now) {
      inMemoryRpgTrades.delete(id);
    } else if (offer.squadId === squadId) {
      out.push(offer);
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTradeOfferById(offerId: string): Promise<any | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT offer_json FROM rpg_trade_offers WHERE offer_id = $1",
        [offerId]
      );
      if (res.rows[0]) return res.rows[0].offer_json;
    } catch (err) {
      handleDbQueryError("Error loading trade offer", err);
    }
  }
  return inMemoryRpgTrades.get(offerId) || null;
}

export async function insertTradeOffer(offer: any): Promise<void> {
  inMemoryRpgTrades.set(offer.offerId, offer);
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO rpg_trade_offers (offer_id, squad_id, sender_id, offer_json, expires_at, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         ON CONFLICT (offer_id) DO NOTHING`,
        [offer.offerId, offer.squadId, offer.senderId, JSON.stringify(offer), offer.expiresAt, offer.createdAt]
      );
    } catch (err) {
      handleDbQueryError("Error inserting trade offer", err);
    }
  }
}

export async function deleteTradeOffer(offerId: string): Promise<void> {
  inMemoryRpgTrades.delete(offerId);
  if (isDbConnected) {
    try {
      await pool.query("DELETE FROM rpg_trade_offers WHERE offer_id = $1", [offerId]);
    } catch (err) {
      handleDbQueryError("Error deleting trade offer", err);
    }
  }
}

export async function getRaidBossJson(weekKey: string): Promise<any | null> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        "SELECT raid_json FROM rpg_raid_state WHERE week_key = $1",
        [weekKey]
      );
      if (res.rows[0]) {
        inMemoryRpgRaids.set(weekKey, res.rows[0].raid_json);
        return res.rows[0].raid_json;
      }
    } catch (err) {
      handleDbQueryError("Error loading raid state", err);
    }
  }
  return inMemoryRpgRaids.get(weekKey) || null;
}

export async function saveRaidBossJson(weekKey: string, raidJson: any): Promise<void> {
  inMemoryRpgRaids.set(weekKey, raidJson);
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO rpg_raid_state (week_key, raid_json, updated_at)
         VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (week_key) DO UPDATE
         SET raid_json = EXCLUDED.raid_json,
             updated_at = CURRENT_TIMESTAMP`,
        [weekKey, JSON.stringify(raidJson)]
      );
    } catch (err) {
      handleDbQueryError("Error saving raid state", err);
    }
  }
}

// ==========================================
// Player Inventory Database Operations
// ==========================================

const inMemoryPlayerInventory = new Map<number, InventoryItemDto[]>();

function mapInventoryRow(row: any): InventoryItemDto {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    category: row.category as InventoryCategory,
    quantity: Number(row.quantity) || 1,
    equippedMode: (row.equipped_mode as OutfitMode | null) || null,
    equippedSlot: (row.equipped_slot as FashionGearSlot | null) || null,
    isLocked: Boolean(row.is_locked),
    instanceData: row.instance_data ?? null,
  };
}

export async function getPlayerInventoryItems(userId: number): Promise<InventoryItemDto[]> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `SELECT id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data
         FROM player_inventory_items
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
      );
      const items = res.rows.map(mapInventoryRow);
      inMemoryPlayerInventory.set(userId, items);
      return items;
    } catch (err) {
      handleDbQueryError("Error loading player inventory", err);
    }
  }
  return (inMemoryPlayerInventory.get(userId) || []).map((item) => ({ ...item }));
}

export async function seedPlayerInventoryItems(
  userId: number,
  items: Array<Omit<InventoryItemDto, "id">>
): Promise<InventoryItemDto[]> {
  const created: InventoryItemDto[] = items.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
  }));

  if (isDbConnected && created.length > 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of created) {
        await client.query(
          `INSERT INTO player_inventory_items
             (id, user_id, category, template_id, quantity, equipped_mode, equipped_slot, is_locked, instance_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            item.id,
            userId,
            item.category,
            item.templateId,
            item.quantity,
            item.equippedMode,
            item.equippedSlot,
            item.isLocked,
            item.instanceData ? JSON.stringify(item.instanceData) : null,
          ]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      handleDbQueryError("Error seeding player inventory", err);
    } finally {
      client.release();
    }
  }

  inMemoryPlayerInventory.set(userId, created);
  return created.map((item) => ({ ...item }));
}

export async function equipPlayerInventoryItem(
  userId: number,
  itemId: string,
  mode: OutfitMode,
  slot: FashionGearSlot
): Promise<{ updated: InventoryItemDto[]; error?: string }> {
  if (isDbConnected) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updatedRows: InventoryItemDto[] = [];

      const prevRes = await client.query(
        `UPDATE player_inventory_items
         SET equipped_mode = NULL, equipped_slot = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND equipped_mode = $2 AND equipped_slot = $3 AND id <> $4
         RETURNING id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data`,
        [userId, mode, slot, itemId]
      );
      for (const r of prevRes.rows) {
        updatedRows.push(mapInventoryRow(r));
      }

      const nextRes = await client.query(
        `UPDATE player_inventory_items
         SET equipped_mode = $1, equipped_slot = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4
         RETURNING id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data`,
        [mode, slot, itemId, userId]
      );

      if (nextRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return { updated: [], error: "Item not found in inventory." };
      }

      updatedRows.push(mapInventoryRow(nextRes.rows[0]));
      await client.query("COMMIT");
      return { updated: updatedRows };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      handleDbQueryError("Error equipping inventory item", err);
      return { updated: [], error: "Failed to equip item." };
    } finally {
      client.release();
    }
  }

  const list = inMemoryPlayerInventory.get(userId) || [];
  const target = list.find((i) => i.id === itemId);
  if (!target) return { updated: [], error: "Item not found in inventory." };

  const updated: InventoryItemDto[] = [];
  for (const item of list) {
    if (item.id !== itemId && item.equippedMode === mode && item.equippedSlot === slot) {
      item.equippedMode = null;
      item.equippedSlot = null;
      updated.push({ ...item });
    }
  }
  target.equippedMode = mode;
  target.equippedSlot = slot;
  updated.push({ ...target });
  return { updated };
}

export async function unequipPlayerInventoryItem(
  userId: number,
  itemId: string
): Promise<{ updated: InventoryItemDto[]; error?: string }> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `UPDATE player_inventory_items
         SET equipped_mode = NULL, equipped_slot = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data`,
        [itemId, userId]
      );
      if (res.rows.length === 0) {
        return { updated: [], error: "Item not found in inventory." };
      }
      return { updated: [mapInventoryRow(res.rows[0])] };
    } catch (err) {
      handleDbQueryError("Error unequipping inventory item", err);
      return { updated: [], error: "Failed to unequip item." };
    }
  }

  const list = inMemoryPlayerInventory.get(userId) || [];
  const target = list.find((i) => i.id === itemId);
  if (!target) return { updated: [], error: "Item not found in inventory." };
  target.equippedMode = null;
  target.equippedSlot = null;
  return { updated: [{ ...target }] };
}

export async function addPlayerInventoryItem(
  userId: number,
  item: Omit<InventoryItemDto, "id">,
  maxSlots: number
): Promise<{ added?: InventoryItemDto; updated?: InventoryItemDto; error?: string }> {
  const canStack = !item.instanceData && !item.equippedSlot;

  if (isDbConnected) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (canStack) {
        const stackRes = await client.query(
          `UPDATE player_inventory_items
           SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND template_id = $3 AND instance_data IS NULL AND equipped_slot IS NULL
           RETURNING id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data`,
          [Math.max(1, item.quantity), userId, item.templateId]
        );
        if (stackRes.rows.length > 0) {
          await client.query("COMMIT");
          return { updated: mapInventoryRow(stackRes.rows[0]) };
        }
      }

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM player_inventory_items WHERE user_id = $1`,
        [userId]
      );
      if ((countRes.rows[0]?.cnt || 0) >= maxSlots) {
        await client.query("ROLLBACK");
        return { error: `Inventory full (${maxSlots} / ${maxSlots}).` };
      }

      const id = crypto.randomUUID();
      const insertRes = await client.query(
        `INSERT INTO player_inventory_items
           (id, user_id, category, template_id, quantity, equipped_mode, equipped_slot, is_locked, instance_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING id, template_id, category, quantity, equipped_mode, equipped_slot, is_locked, instance_data`,
        [
          id,
          userId,
          item.category,
          item.templateId,
          Math.max(1, item.quantity),
          item.equippedMode,
          item.equippedSlot,
          item.isLocked,
          item.instanceData ? JSON.stringify(item.instanceData) : null,
        ]
      );
      await client.query("COMMIT");
      return { added: mapInventoryRow(insertRes.rows[0]) };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      handleDbQueryError("Error adding inventory item", err);
      return { error: "Failed to add inventory item." };
    } finally {
      client.release();
    }
  }

  const list = inMemoryPlayerInventory.get(userId) || [];
  if (canStack) {
    const existing = list.find(
      (i) => i.templateId === item.templateId && !i.instanceData && !i.equippedSlot
    );
    if (existing) {
      existing.quantity += Math.max(1, item.quantity);
      return { updated: { ...existing } };
    }
  }
  if (list.length >= maxSlots) {
    return { error: `Inventory full (${maxSlots} / ${maxSlots}).` };
  }
  const created: InventoryItemDto = { ...item, id: crypto.randomUUID() };
  list.push(created);
  inMemoryPlayerInventory.set(userId, list);
  return { added: { ...created } };
}

export async function removePlayerInventoryItem(
  userId: number,
  itemId: string
): Promise<{ removedId?: string; error?: string }> {
  if (isDbConnected) {
    try {
      const res = await pool.query(
        `DELETE FROM player_inventory_items WHERE id = $1 AND user_id = $2 RETURNING id`,
        [itemId, userId]
      );
      if (res.rows.length === 0) {
        return { error: "Item not found in inventory." };
      }
      return { removedId: String(res.rows[0].id) };
    } catch (err) {
      handleDbQueryError("Error removing inventory item", err);
      return { error: "Failed to remove inventory item." };
    }
  }

  const list = inMemoryPlayerInventory.get(userId) || [];
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx === -1) return { error: "Item not found in inventory." };
  list.splice(idx, 1);
  return { removedId: itemId };
}
