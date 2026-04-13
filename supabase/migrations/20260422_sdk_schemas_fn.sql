-- Public SDK introspection: return all active schemas + active fields for the
-- project that owns the given API key. Used by SDK CLIs to generate types
-- (e.g. types.py) without needing dashboard auth.

CREATE OR REPLACE FUNCTION public.get_project_schemas_for_sdk(
  p_api_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_key_id BIGINT;
  v_result JSONB;
BEGIN
  SELECT ak.id, ak.project_id INTO v_key_id, v_project_id
  FROM public.api_keys ak
  WHERE ak.key_hash = encode(extensions.digest(p_api_key, 'sha256'), 'hex')
    AND ak.revoked_at IS NULL
  LIMIT 1;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'invalid_api_key' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'project', jsonb_build_object(
      'id', p.id,
      'name', p.name
    ),
    'schemas', COALESCE((
      SELECT jsonb_agg(schema_obj ORDER BY schema_obj->>'key')
      FROM (
        SELECT jsonb_build_object(
          'key', s.key,
          'name', s.name,
          'displayName', s.display_name,
          'fields', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'key', f.key,
                'name', f.name,
                'displayName', f.display_name,
                'type', f.type,
                'required', f.required,
                'metadata', COALESCE(f.metadata, '{}'::jsonb)
              )
              ORDER BY f.key
            )
            FROM public.fields f
            WHERE f.schema_id = s.id
              AND f.status = 'active'
          ), '[]'::jsonb)
        ) AS schema_obj
        FROM public.schemas s
        WHERE s.project_id = v_project_id
          AND s.status = 'active'
      ) sub
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.projects p
  WHERE p.id = v_project_id;

  -- Touch last_used_at so the dashboard can show recent SDK activity.
  UPDATE public.api_keys SET last_used_at = now() WHERE id = v_key_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_schemas_for_sdk(TEXT) TO anon, authenticated;
