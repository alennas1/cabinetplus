-- UUIDv7 generator function for Postgres (RFC 9562 compatible bit layout).
-- Kept in its own file because Liquibase statement-splitting breaks $$ blocks.

CREATE OR REPLACE FUNCTION cabinetplus_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    ts_ms bigint;
    rand_a int;
    rand_hex text;
    b bytea;
    v int;
    hex text;
BEGIN
    ts_ms := floor(extract(epoch from clock_timestamp()) * 1000);
    rand_a := floor(random() * 4096); -- 12 bits

    -- 16 bytes from md5() (built-in) as entropy source for rand_b
    rand_hex := md5(random()::text || clock_timestamp()::text || txid_current()::text);

    -- Initialize 16-byte array (all zeros)
    b := decode('00000000000000000000000000000000', 'hex');

    -- Timestamp (48 bits, big-endian)
    b := set_byte(b, 0, ((ts_ms >> 40) & 255)::int);
    b := set_byte(b, 1, ((ts_ms >> 32) & 255)::int);
    b := set_byte(b, 2, ((ts_ms >> 24) & 255)::int);
    b := set_byte(b, 3, ((ts_ms >> 16) & 255)::int);
    b := set_byte(b, 4, ((ts_ms >> 8) & 255)::int);
    b := set_byte(b, 5, (ts_ms & 255)::int);

    -- Version (7) + rand_a (12 bits)
    v := (7 << 12) | (rand_a & 4095);
    b := set_byte(b, 6, ((v >> 8) & 255)::int);
    b := set_byte(b, 7, (v & 255)::int);

    -- rand_b (64 bits) from md5 entropy; set RFC 4122 variant (10xxxxxx) in byte 8
    b := set_byte(b, 8, ((get_byte(decode(rand_hex, 'hex'), 8) & 63) | 128)::int);
    b := set_byte(b, 9, get_byte(decode(rand_hex, 'hex'), 9));
    b := set_byte(b, 10, get_byte(decode(rand_hex, 'hex'), 10));
    b := set_byte(b, 11, get_byte(decode(rand_hex, 'hex'), 11));
    b := set_byte(b, 12, get_byte(decode(rand_hex, 'hex'), 12));
    b := set_byte(b, 13, get_byte(decode(rand_hex, 'hex'), 13));
    b := set_byte(b, 14, get_byte(decode(rand_hex, 'hex'), 14));
    b := set_byte(b, 15, get_byte(decode(rand_hex, 'hex'), 15));

    hex := encode(b, 'hex');
    RETURN (
        substring(hex from 1 for 8) || '-' ||
        substring(hex from 9 for 4) || '-' ||
        substring(hex from 13 for 4) || '-' ||
        substring(hex from 17 for 4) || '-' ||
        substring(hex from 21 for 12)
    )::uuid;
END;
$$;
