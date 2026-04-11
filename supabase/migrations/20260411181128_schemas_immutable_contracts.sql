-- =============================================================
-- Schemas + fields as immutable contracts
-- =============================================================
-- Adds an immutable `key` (used as the identifier in event payloads)
-- and an editable `display_name` to both schemas and fields.
-- Adds a `status` enum (active/archived) for soft delete: archived
-- rows are hidden from the UI but kept in the DB so historical
-- event payloads remain valid against their schema.
-- Adds `required` to fields. When a field is archived the server
-- forces required=false so existing payloads without that key still
-- validate.
--
-- Idempotent: safe to re-run. The backfill assigns unique keys per
-- parent (project for schemas, schema for fields) and a separate
-- dedup pass at the end heals any pre-existing duplicates from a
-- prior partial run.
-- =============================================================

-- Status enums (skip if they already exist for re-runs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schema_status') THEN
    CREATE TYPE schema_status AS ENUM ('active', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_status') THEN
    CREATE TYPE field_status AS ENUM ('active', 'archived');
  END IF;
END $$;

-- Temporary slugify helper (lives only for this session via pg_temp).
-- Lowercases, replaces non-alphanumeric runs with `_`, trims leading/
-- trailing underscores, defaults empty results, and prefixes with `k_`
-- when the result starts with a digit so it matches `^[a-z][a-z0-9_]*$`.
CREATE OR REPLACE FUNCTION pg_temp.slugify_key(input text, fallback text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  result := lower(coalesce(input, ''));
  result := regexp_replace(result, '[^a-z0-9]+', '_', 'g');
  result := regexp_replace(result, '^_+|_+$', '', 'g');
  IF result = '' THEN
    result := fallback;
  END IF;
  IF result ~ '^[0-9]' THEN
    result := 'k_' || result;
  END IF;
  RETURN substring(result FROM 1 FOR 63);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================
-- schemas: add immutable key, display_name, status
-- =============================================================
ALTER TABLE public.schemas
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS status schema_status NOT NULL DEFAULT 'active';

-- Backfill display_name from name where missing
UPDATE public.schemas
   SET display_name = coalesce(NULLIF(name, ''), 'Schema')
 WHERE display_name IS NULL;

-- Backfill key, deduplicating within each project_id by appending
-- _2, _3, ... to collisions on the slugified base.
WITH base AS (
  SELECT
    id,
    project_id,
    created_at,
    pg_temp.slugify_key(name, 'schema') AS base_key
  FROM public.schemas
  WHERE key IS NULL
),
numbered AS (
  SELECT id, base_key,
         row_number() OVER (
           PARTITION BY project_id, base_key
           ORDER BY created_at, id
         ) AS rn
    FROM base
)
UPDATE public.schemas s
   SET key = CASE WHEN n.rn = 1 THEN n.base_key ELSE n.base_key || '_' || n.rn END
  FROM numbered n
 WHERE s.id = n.id;

-- Heal any duplicate keys left over from a prior partial run.
-- Loops because a single pass could create new collisions if e.g.
-- we have ('foo', 'foo', 'foo_2') -> the second 'foo' becomes 'foo_2'
-- which collides with the existing one. Capped at 10 iterations.
DO $$
DECLARE
  attempt int := 0;
  affected int;
BEGIN
  LOOP
    attempt := attempt + 1;
    EXIT WHEN attempt > 10;

    WITH dups AS (
      SELECT id, project_id, key,
             row_number() OVER (
               PARTITION BY project_id, key
               ORDER BY created_at, id
             ) AS rn
        FROM public.schemas
    )
    UPDATE public.schemas s
       SET key = s.key || '_' || d.rn
      FROM dups d
     WHERE s.id = d.id AND d.rn > 1;

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
  END LOOP;
END $$;

ALTER TABLE public.schemas
  ALTER COLUMN key SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schemas_project_key_unique'
  ) THEN
    ALTER TABLE public.schemas
      ADD CONSTRAINT schemas_project_key_unique UNIQUE (project_id, key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS schemas_project_status_idx
  ON public.schemas (project_id, status);

-- =============================================================
-- fields: add immutable key, display_name, status, required
-- =============================================================
ALTER TABLE public.fields
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS status field_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;

UPDATE public.fields
   SET display_name = coalesce(NULLIF(name, ''), 'Field')
 WHERE display_name IS NULL;

-- Backfill key, deduplicating within each schema_id.
WITH base AS (
  SELECT
    id,
    schema_id,
    created_at,
    pg_temp.slugify_key(name, 'field') AS base_key
  FROM public.fields
  WHERE key IS NULL
),
numbered AS (
  SELECT id, base_key,
         row_number() OVER (
           PARTITION BY schema_id, base_key
           ORDER BY created_at, id
         ) AS rn
    FROM base
)
UPDATE public.fields f
   SET key = CASE WHEN n.rn = 1 THEN n.base_key ELSE n.base_key || '_' || n.rn END
  FROM numbered n
 WHERE f.id = n.id;

-- Heal duplicate field keys per schema (same loop as schemas).
DO $$
DECLARE
  attempt int := 0;
  affected int;
BEGIN
  LOOP
    attempt := attempt + 1;
    EXIT WHEN attempt > 10;

    WITH dups AS (
      SELECT id, schema_id, key,
             row_number() OVER (
               PARTITION BY schema_id, key
               ORDER BY created_at, id
             ) AS rn
        FROM public.fields
    )
    UPDATE public.fields f
       SET key = f.key || '_' || d.rn
      FROM dups d
     WHERE f.id = d.id AND d.rn > 1;

    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
  END LOOP;
END $$;

ALTER TABLE public.fields
  ALTER COLUMN key SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fields_schema_key_unique'
  ) THEN
    ALTER TABLE public.fields
      ADD CONSTRAINT fields_schema_key_unique UNIQUE (schema_id, key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fields_schema_status_idx
  ON public.fields (schema_id, status);
