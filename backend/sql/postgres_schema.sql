BEGIN;

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    salary DOUBLE PRECISION,
    revenue DOUBLE PRECISION,
    current_status TEXT NOT NULL,
    status_tag TEXT,
    status_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    hourly_rate INTEGER
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tags JSON,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Project links
CREATE TABLE IF NOT EXISTS project_links (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    link_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    hourly_rate INTEGER
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_type TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    date DATE NOT NULL,
    category TEXT,
    description TEXT,
    tags JSON,
    employee_id TEXT REFERENCES employees(id),
    project_id TEXT REFERENCES projects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date DATE,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to TEXT REFERENCES employees(id),
    project_id TEXT REFERENCES projects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    hours_spent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    billable BOOLEAN NOT NULL DEFAULT TRUE,
    hourly_rate_override INTEGER,
    applied_hourly_rate INTEGER
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    period TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    progress INTEGER NOT NULL DEFAULT 0,
    tags JSON,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Reading items
CREATE TABLE IF NOT EXISTS reading_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    item_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'to_read',
    priority TEXT NOT NULL,
    tags JSON,
    added_date DATE NOT NULL,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    tags JSON,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    position TEXT,
    company TEXT,
    website TEXT,
    telegram TEXT,
    github TEXT,
    twitter TEXT,
    timezone TEXT,
    locale TEXT
);

-- Registration codes
CREATE TABLE IF NOT EXISTS registration_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT; 