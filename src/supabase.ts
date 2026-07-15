import { createClient } from '@supabase/supabase-js';

// Environment variables with hardcoded fallbacks as provided by the user
// so that the app works out-of-the-box in the AI Studio live preview container!
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jyimhqpbitvysgvvnij.supabase.co';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aW1ocHFwYml0dnlzZ3Z2bmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjQyMTUsImV4cCI6MjA5OTYwMDIxNX0.XovHm9yjQMccyZYDCocX8o_OpW4ZHcreEY9__H7tPaI';
export const SUPABASE_SERVICE_ROLE_KEY = (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aW1ocHFwYml0dnlzZ3Z2bmlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDAyNDIxNSwiZXhwIjoyMDk5NjAwMjE1fQ.cQdmGSru2K0zWgX5l6QPlm78tXpEBv366jFPGbcecqM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SQL Setup Script for the Supabase SQL Editor
export const SUPABASE_SQL_SETUP = `-- ==========================================
-- SCHOOL EVENTS BOARD DATABASE SCHEMA
-- Execute this in your Supabase SQL Editor
-- ==========================================

-- 1. Create students table (User Login Table)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  admission_number TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- plain or hashed, for application login matching
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - optional, disabled for easier setup or configured for public access
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON students FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON students FOR UPDATE USING (true);

-- 2. Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date TEXT NOT NULL,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rejection_reason TEXT
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON events FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON events FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access" ON events FOR DELETE USING (true);

-- 3. Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON admins FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON admins FOR UPDATE USING (true);

-- 4. Insert Default Administrator Credentials
INSERT INTO admins (id, username, password)
VALUES ('admin-1', 'admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 5. Seed Initial Registered Students
INSERT INTO students (id, full_name, email, class, section, admission_number, password, created_at)
VALUES 
('1', 'Sarah Jenkins', 'sarah.j@school.edu', 'Grade 12', 'A', 'ADM-2026-001', 'password123', NOW()),
('2', 'Alex Rivera', 'alex.r@school.edu', 'Grade 11', 'C', 'ADM-2026-042', 'password123', NOW())
ON CONFLICT (email) DO NOTHING;

-- 6. Seed Initial Events
INSERT INTO events (id, student_id, student_name, title, description, category, event_date, image, status, created_at)
VALUES 
('101', '1', 'Sarah Jenkins', 'Annual Inter-School Football Championship', 'Our senior football team faces off against Maplewood High in the season finals. Come support our players! Free banners and face paint at the gate.', 'Sports', '2026-07-20', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=800', 'Approved', NOW()),
('102', '2', 'Alex Rivera', 'National AI & Robotics Coding Hackathon', 'Showcase your engineering skills! Build a smart school automation program in 24 hours. Teams of up to 3 are allowed. Prizes include premium dev kits.', 'Science & Tech', '2026-07-28', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800', 'Approved', NOW()),
('103', '1', 'Sarah Jenkins', 'Spring Fine Arts & Live Jazz Gala', 'An elegant evening featuring canvas paintings, hand-made sculptures, and live jazz performances by the senior ensemble. Open to parents and faculty.', 'Cultural', '2026-08-05', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800', 'Approved', NOW()),
('104', '2', 'Alex Rivera', 'Chemistry Olympiad Preparation Boot Camp', 'Intense crash course focusing on organic synthesis, thermodynamic calculations, and laboratory titration techniques. Directed by Dr. Raymond.', 'Academics', '2026-07-18', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800', 'Pending', NOW())
ON CONFLICT (id) DO NOTHING;
`;
