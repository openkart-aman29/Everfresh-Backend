-- Service enquiries raised from the public website.
--
-- Deliberately independent of users/customers: an enquirer has no account, and
-- users.password_hash is NOT NULL, so an anonymous lead cannot be represented
-- there. Contact details are captured inline instead. An admin converts a
-- promising enquiry into a real booking, at which point booking_id is set.

CREATE TABLE IF NOT EXISTS service_enquiries (
    enquiry_id      CHARACTER(26) PRIMARY KEY,
    company_id      CHARACTER(26) NOT NULL,

    -- Contact details supplied by the visitor (no account required)
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(30)  NOT NULL,

    -- What they are asking about. service_id is nullable because a visitor may
    -- describe a need that maps to no catalogue row; service_name keeps a
    -- human-readable snapshot either way.
    service_id      CHARACTER(26),
    service_name    VARCHAR(255),
    message         TEXT,
    preferred_date  DATE,

    -- Triage workflow
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    booking_id      CHARACTER(26),
    handled_by      CHARACTER(26),
    admin_notes     TEXT,

    -- Provenance / abuse forensics
    source          VARCHAR(50) NOT NULL DEFAULT 'website',
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(500),

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP WITH TIME ZONE,

    CONSTRAINT service_enquiries_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE RESTRICT,
    CONSTRAINT service_enquiries_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL,
    CONSTRAINT service_enquiries_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
    CONSTRAINT service_enquiries_handled_by_fkey
        FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT service_enquiries_status_check
        CHECK (status IN ('new', 'contacted', 'converted', 'closed'))
);

-- Admin list view: newest first, scoped to a tenant, excluding soft-deleted rows.
CREATE INDEX IF NOT EXISTS idx_enquiries_company_created
    ON service_enquiries (company_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Triage filter by status.
CREATE INDEX IF NOT EXISTS idx_enquiries_status
    ON service_enquiries (status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Look up prior enquiries from the same person.
CREATE INDEX IF NOT EXISTS idx_enquiries_email
    ON service_enquiries (email)
    WHERE deleted_at IS NULL;

-- Reuse the existing timestamp trigger function used by the other tables.
DROP TRIGGER IF EXISTS trg_service_enquiries_timestamp ON service_enquiries;
CREATE TRIGGER trg_service_enquiries_timestamp
    BEFORE UPDATE ON service_enquiries
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
