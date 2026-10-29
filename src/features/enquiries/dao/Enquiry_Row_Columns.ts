// The column list every enquiry query returns.
//
// Three separate DAOs hand an `EnquiryRecord` back to their service (create,
// read-all, update-status). Each used to spell the list out, so a new column
// had to be added in three places and an omission showed up as a field that is
// silently null for one operation only. They share this constant instead.
//
// `latitude` and `longitude` are NUMERIC, which `pg` returns as strings to
// avoid precision loss, so they are cast to float8 here: the interface declares
// them as numbers and the admin UI does arithmetic on them.

export const ENQUIRY_ROW_COLUMNS = `enquiry_id, company_id, full_name, email, phone,
            service_id, service_name, message,
            TO_CHAR(preferred_date, 'YYYY-MM-DD') AS preferred_date,
            preferred_time,
            latitude::float8 AS latitude,
            longitude::float8 AS longitude,
            location_accuracy,
            resolved_address,
            geocoded_at,
            status, booking_id, handled_by, admin_notes, source,
            created_at, updated_at`;
