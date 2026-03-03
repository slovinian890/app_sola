-- ============================================
-- Hex Territories table for the Compete feature
-- Run this in your Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS hex_territories (
  hex_id      TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_color TEXT NOT NULL DEFAULT '#5B7EA4',
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  center_lat  DOUBLE PRECISION NOT NULL,
  center_lng  DOUBLE PRECISION NOT NULL
);

-- Fast spatial lookups when loading the visible map area
CREATE INDEX IF NOT EXISTS idx_hex_territories_lat_lng
  ON hex_territories (center_lat, center_lng);

-- Fast user-specific queries (territory count, etc.)
CREATE INDEX IF NOT EXISTS idx_hex_territories_user
  ON hex_territories (user_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE hex_territories ENABLE ROW LEVEL SECURITY;

-- Everyone can read all territories (needed to display the map)
CREATE POLICY "Anyone can view hex territories"
  ON hex_territories FOR SELECT
  USING (true);

-- Authenticated users can claim new hexes
CREATE POLICY "Authenticated users can claim hexes"
  ON hex_territories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can take over a hex by running over it
CREATE POLICY "Authenticated users can take over hexes"
  ON hex_territories FOR UPDATE
  USING (true)
  WITH CHECK (auth.uid() = user_id);
