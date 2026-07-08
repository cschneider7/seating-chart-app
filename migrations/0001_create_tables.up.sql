-- Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    period SMALLINT NOT NULL,
    created_time TIMESTAMPTZ NULL DEFAULT now()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    student_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    classroom_id UUID NULL,
    seat_id UUID NULL,
    created_time TIMESTAMPTZ NULL DEFAULT now()
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL,
    max_seats SMALLINT NOT NULL,
    created_time TIMESTAMPTZ NULL DEFAULT now()
);

-- Seats
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL,
    position SMALLINT NOT NULL,
    created_time TIMESTAMPTZ NULL DEFAULT now()
);