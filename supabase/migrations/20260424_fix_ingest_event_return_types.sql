-- Fix: ingest_event declared RETURNS TABLE (id BIGINT, created_at TIMESTAMPTZ)
-- but the events table columns are actually different precision/timezone.
-- Cast the RETURNING values so the function result always matches the declared shape.

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
  v_event_id BIGINT;
  v_event_created TIMESTAMPTZ;
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

  -- Cast to the declared return types so the row shape always matches,
  -- regardless of whether events.id is int4/int8 or created_at is
  -- timestamp/timestamptz.
  INSERT INTO public.events (project_id, schema_id, value)
  VALUES (v_project_id, v_schema_id, p_value)
  RETURNING events.id::BIGINT, events.created_at::TIMESTAMPTZ
  INTO v_event_id, v_event_created;

  UPDATE public.api_keys SET last_used_at = now() WHERE api_keys.id = v_key_id;

  id := v_event_id;
  created_at := v_event_created;
  RETURN NEXT;
END;
$$;
