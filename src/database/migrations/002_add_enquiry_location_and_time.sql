-- Arrival window and shared location for website service requests.
--
-- The website booking flow now asks for a preferred arrival window and offers
-- "share my location". Both used to travel inside `message` as free text,
-- which an admin could read but nothing could query. These columns make them
-- data.
--
-- Coordinates are the source of truth; `resolved_address` is a convenience
-- label produced by reverse geocoding at ingest. A geocoder names the building
-- at best and never the apartment, so it supplements the address the visitor
-- typed rather than replacing it.
--
-- Precise location is personal data under the UAE PDPL. Decide a retention
-- window and clear `latitude`/`longitude` on enquiries past it; the resolved
-- address is far less sensitive and can outlive the coordinates.

ALTER TABLE service_enquiries
    -- Arrival window label exactly as the site offered it, e.g. "10:00 - 12:00"
    -- or "Flexible". Stored as text, not a TIME range: it is a two-hour window
    -- the visitor picked, not a commitment to a start time.
    ADD COLUMN IF NOT EXISTS preferred_time    VARCHAR(20),

    -- WGS84, six decimals (about 0.1 m), which is past what any phone resolves.
    ADD COLUMN IF NOT EXISTS latitude          NUMERIC(9, 6),
    ADD COLUMN IF NOT EXISTS longitude         NUMERIC(9, 6),

    -- Device-reported radius of uncertainty, in metres. A 2000 m accuracy is a
    -- wifi-derived guess and should not be trusted for navigation.
    ADD COLUMN IF NOT EXISTS location_accuracy INTEGER,

    -- Reverse-geocoded label. NULL means never resolved: no coordinates were
    -- shared, no API key is configured, or the provider failed.
    ADD COLUMN IF NOT EXISTS resolved_address  TEXT,
    ADD COLUMN IF NOT EXISTS geocoded_at       TIMESTAMP WITH TIME ZONE;

-- A lone latitude is meaningless, so the pair must be all-or-nothing.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'service_enquiries_location_pair_check'
    ) THEN
        ALTER TABLE service_enquiries
            ADD CONSTRAINT service_enquiries_location_pair_check
            CHECK ((latitude IS NULL) = (longitude IS NULL));
    END IF;
END
$$;

-- Lets an admin pick out the leads that came with a pin, which are the ones a
-- crew can be dispatched to without a phone call first.
CREATE INDEX IF NOT EXISTS idx_enquiries_has_location
    ON service_enquiries (company_id, created_at DESC)
    WHERE deleted_at IS NULL AND latitude IS NOT NULL;
