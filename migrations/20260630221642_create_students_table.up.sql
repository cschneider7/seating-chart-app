-- Add up migration script here
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    classroom_id UUID NULL,
    created_at TIMESTAMPTZ NULL DEFAULT NOW()
);