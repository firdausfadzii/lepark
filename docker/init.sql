-- Database initialization for multiplayer game
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
    category VARCHAR(50) DEFAULT 'General',
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_superadmin_space BOOLEAN DEFAULT FALSE,
    whitelist JSONB DEFAULT '[]'::jsonb,
    tiles JSONB DEFAULT '{}'::jsonb,
    private_zones JSONB DEFAULT '[]'::jsonb,
    jukeboxes JSONB DEFAULT '[]'::jsonb,
    typewriters JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spaces_superadmin ON spaces (is_superadmin_space, category);

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
