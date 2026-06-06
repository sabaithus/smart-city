-- =============================================
-- Smart City Database Schema (PostgreSQL)
-- Run this file once to create all tables:
--   psql -U postgres -d smartcity -f models/schema.sql
-- =============================================

-- Users table: stores registered accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'volunteer', 'responder', 'admin')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table: stores incident reports submitted by users
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'invalid')),
    image_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index: fast lookups for map (reports that have coordinates)
CREATE INDEX IF NOT EXISTS idx_reports_location
    ON reports (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index: fast lookups for a user's reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id
    ON reports (user_id);

-- Index: fast lookups by status (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports (status);
