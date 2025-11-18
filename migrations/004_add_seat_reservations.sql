-- Migration: Add seat reservation table for temporary seat holds during checkout
-- This prevents seats from being sold twice without creating a sale record

CREATE TABLE IF NOT EXISTS seat_reservation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    session_id UUID NOT NULL,
    seat_map_id UUID NOT NULL,
    seat_id VARCHAR(10) NOT NULL,
    reservation_token VARCHAR(100) NOT NULL UNIQUE, -- Client-generated token to identify reservation
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP(6) NOT NULL, -- Automatically expire after 15 minutes

    -- Foreign keys
    CONSTRAINT fk_seat_reservation_company FOREIGN KEY (company_id) REFERENCES company(id),
    CONSTRAINT fk_seat_reservation_session FOREIGN KEY (session_id) REFERENCES session(id),
    CONSTRAINT fk_seat_reservation_seat FOREIGN KEY (seat_map_id, seat_id) REFERENCES seat(seat_map_id, id),

    -- Unique constraint: one reservation per seat per session
    CONSTRAINT uk_seat_reservation_seat UNIQUE (company_id, session_id, seat_map_id, seat_id)
);

-- Indexes for performance
CREATE INDEX idx_seat_reservation_company ON seat_reservation(company_id);
CREATE INDEX idx_seat_reservation_session ON seat_reservation(company_id, session_id);
CREATE INDEX idx_seat_reservation_token ON seat_reservation(reservation_token);
CREATE INDEX idx_seat_reservation_expires ON seat_reservation(expires_at);

-- Add comment
COMMENT ON TABLE seat_reservation IS 'Temporary seat reservations during checkout process (auto-expire after 15 minutes)';
