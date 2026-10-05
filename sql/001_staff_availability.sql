-- =========================================
-- JANASEVA STAFF AVAILABILITY
-- =========================================

CREATE TABLE IF NOT EXISTS staff_daily_availability (
    id BIGSERIAL PRIMARY KEY,

    available_date DATE NOT NULL UNIQUE,

    day_status VARCHAR(20) NOT NULL
        CHECK (day_status IN ('available', 'partial', 'leave', 'closed')),

    reason_type VARCHAR(50),

    title VARCHAR(200),

    message TEXT,

    leave_reason TEXT,

    published BOOLEAN NOT NULL DEFAULT FALSE,

    updated_by_id VARCHAR(100),

    updated_by_name VARCHAR(150),

    updated_by_role VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================
-- TIME SLOTS
-- =========================================

CREATE TABLE IF NOT EXISTS staff_availability_slots (
    id BIGSERIAL PRIMARY KEY,

    availability_id BIGINT NOT NULL
        REFERENCES staff_daily_availability(id)
        ON DELETE CASCADE,

    client_slot_id VARCHAR(100) NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    slot_status VARCHAR(20) NOT NULL
        CHECK (slot_status IN ('available', 'break', 'unavailable')),

    max_members INTEGER NOT NULL DEFAULT 0
        CHECK (max_members >= 0),

    reason_type VARCHAR(50),

    title VARCHAR(200),

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (availability_id, client_slot_id),

    CHECK (end_time > start_time)
);


-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_staff_daily_availability_date
ON staff_daily_availability (available_date);

CREATE INDEX IF NOT EXISTS idx_staff_daily_availability_published
ON staff_daily_availability (published);

CREATE INDEX IF NOT EXISTS idx_staff_availability_slots_availability
ON staff_availability_slots (availability_id);


-- =========================================
-- VERIFY TABLES
-- =========================================

SELECT * FROM staff_daily_availability;

SELECT * FROM staff_availability_slots;