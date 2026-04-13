-- Public event ingestion: hash-based API key lookup + SECURITY DEFINER fns
-- so anonymous SDK callers can ingest events without RLS blocking them.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1a. api_keys: hash + audit columns
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_hash TEXT,
  ADD COLUMN IF NOT EXISTS key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Backfill existing rows so every key resolves via key_hash going forward.
UPDATE public.api_keys
SET
  key_hash = encode(extensions.digest(key::text, 'sha256'), 'hex'),
  key_prefix = LEFT(key::text, 8)
WHERE key_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx
  ON public.api_keys (key_hash);

-- 1b. ingest_event: SECURITY DEFINER, bypasses RLS for anon SDK callers.
CREATE OR REPLACE FUNCTION public.ingest_event(
  p_api_key TEXT,
  p_schema_key TEXT,
  p_value JSONB
)
RETURNS TABLE (id BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_key_id BIGINT;
  v_schema_id UUID;
BEGIN
  SELECT ak.id, ak.project_id INTO v_key_id, v_project_id
  FROM public.api_keys ak
  WHERE ak.key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex')
    AND ak.revoked_at IS NULL
  LIMIT 1;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'invalid_api_key' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.id INTO v_schema_id
  FROM public.schemas s
  WHERE s.project_id = v_project_id
    AND s.key = p_schema_key
    AND s.status = 'active'
  LIMIT 1;

  IF v_schema_id IS NULL THEN
    RAISE EXCEPTION 'schema_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.events (project_id, schema_id, value)
  VALUES (v_project_id, v_schema_id, p_value)
  RETURNING events.id, events.created_at INTO id, created_at;

  UPDATE public.api_keys SET last_used_at = now() WHERE id = v_key_id;

  RETURN NEXT;
END;
$$;

-- 1c. get_active_fields_for_ingest: fetch active fields under the same key check
-- so the route can run app-side validation without needing direct table access.
CREATE OR REPLACE FUNCTION public.get_active_fields_for_ingest(
  p_api_key TEXT,
  p_schema_key TEXT
)
RETURNS TABLE (key TEXT, type public."FieldTypes", required BOOLEAN, metadata JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_schema_id UUID;
BEGIN
  SELECT ak.project_id INTO v_project_id
  FROM public.api_keys ak
  WHERE ak.key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex')
    AND ak.revoked_at IS NULL
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'invalid_api_key' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.id INTO v_schema_id
  FROM public.schemas s
  WHERE s.project_id = v_project_id
    AND s.key = p_schema_key
    AND s.status = 'active'
  LIMIT 1;

  IF v_schema_id IS NULL THEN
    RAISE EXCEPTION 'schema_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT f.key, f.type, f.required, f.metadata
  FROM public.fields f
  WHERE f.schema_id = v_schema_id AND f.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_event(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_fields_for_ingest(TEXT, TEXT) TO anon, authenticated;

-- 1d. Composite index for dashboard event queries (project + schema + recency).
CREATE INDEX IF NOT EXISTS events_project_schema_created_idx
  ON public.events (project_id, schema_id, created_at DESC);
