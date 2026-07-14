-- Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    period SMALLINT NOT NULL,
    created_time TIMESTAMPTZ DEFAULT now()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms ON DELETE SET NULL,
    student_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_time TIMESTAMPTZ DEFAULT now()
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    seat_count SMALLINT NOT NULL,
    x_pos INTEGER NOT NULL,
    y_pos INTEGER NOT NULL,
    created_time TIMESTAMPTZ DEFAULT now()
);

-- Seats
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES tables ON DELETE CASCADE,
    student_id UUID UNIQUE REFERENCES students ON DELETE SET NULL,
    position SMALLINT NOT NULL,
    created_time TIMESTAMPTZ DEFAULT now()
);