CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    user_email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_user_email ON users(user_email);

CREATE TABLE IF NOT EXISTS users_address (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    address_id INTEGER UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_address_user_id ON users_address(user_id);

CREATE INDEX IF NOT EXISTS idx_users_address_address_id ON users_address(address_id);

CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    key_name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
