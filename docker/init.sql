-- Database initialization for multiplayer game
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    focus_points INT DEFAULT 0 NOT NULL,
    focus_streak_days INT DEFAULT 0 NOT NULL,
    last_focus_date VARCHAR(10),
    focus_freeze_shields INT DEFAULT 2 NOT NULL,
    focus_shield_week VARCHAR(10),
    daily_focus_date VARCHAR(10),
    daily_focus_minutes INT DEFAULT 0 NOT NULL,
    last_public_space_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE email IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS spaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id INT REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_spaces_superadmin_name ON spaces (is_superadmin_space, name);

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

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id VARCHAR(64) REFERENCES spaces(id) ON DELETE CASCADE,
    organisation_id INT,
    images JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_type_author ON notes (type, author_id);
CREATE INDEX IF NOT EXISTS idx_notes_space ON notes (space_id);
CREATE INDEX IF NOT EXISTS idx_notes_org ON notes (organisation_id);
