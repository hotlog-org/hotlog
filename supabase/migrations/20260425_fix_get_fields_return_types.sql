-- Fix: get_active_fields_for_ingest declared metadata JSONB but
-- fields.metadata is json (not jsonb). Cast columns to declared types
-- so the row shape always matches.

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
  SELECT
    f.key::TEXT,
    f.type,
    f.required,
    COALESCE(f.metadata::jsonb, '{}'::jsonb) AS metadata
  FROM public.fields f
  WHERE f.schema_id = v_schema_id AND f.status = 'active';
END;
$$;
