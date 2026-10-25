-- Coordinated application rollout required: plaintext cannot be recovered after
-- this migration. Never replay the old plaintext-writing application afterward.
-- Lock out concurrent legacy writes while verifying every existing credential.
LOCK TABLE public.api_keys IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.api_keys
    WHERE key_hash IS NOT NULL
      AND key_hash IS DISTINCT FROM encode(extensions.digest(key::text, 'sha256'), 'hex')
  ) THEN
    -- Do not guess which of two inconsistent credentials is in use.
    RAISE EXCEPTION 'API key hash mismatch; migration aborted without changing credentials';
  END IF;
END;
$$;
UPDATE public.api_keys
SET key_hash = encode(extensions.digest(key::text, 'sha256'), 'hex'),
    key_prefix = left(key::text, 8);
ALTER TABLE public.api_keys
  ALTER COLUMN key_hash SET NOT NULL,
  ALTER COLUMN key_prefix SET NOT NULL,
  ADD CONSTRAINT api_keys_hash_valid CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT api_keys_prefix_valid CHECK (key_prefix ~ '^[0-9a-f]{8}$'),
  DROP COLUMN key;

-- All end-user writes go through permission-checked, project-serialized RPCs.
-- Soft revocation preserves existing id, project, prefix and usage audit data.
REVOKE ALL ON public.api_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, project_id, key_prefix, last_used_at, revoked_at)
  ON public.api_keys TO authenticated;

CREATE FUNCTION public.create_api_key(p_project_id uuid, p_replace_key_id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, project_id uuid, key_prefix text, last_used_at timestamptz, revoked_at timestamptz, key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_secret text;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT public.has_permission(p_project_id, 'create', 'api_keys')
     OR (p_replace_key_id IS NOT NULL AND NOT public.has_permission(p_project_id, 'delete', 'api_keys')) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.projects p WHERE p.id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_replace_key_id IS NOT NULL THEN
    UPDATE public.api_keys ak SET revoked_at = clock_timestamp()
    WHERE ak.id = p_replace_key_id AND ak.project_id = p_project_id AND ak.revoked_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Selected active API key not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  -- Preserve the SDK's UUID key format. The only persisted value is its hash.
  v_secret := gen_random_uuid()::text;
  RETURN QUERY
    INSERT INTO public.api_keys AS ak (project_id, key_hash, key_prefix)
    VALUES (p_project_id, encode(extensions.digest(v_secret, 'sha256'), 'hex'), left(v_secret, 8))
    RETURNING ak.id, ak.project_id, ak.key_prefix, ak.last_used_at, ak.revoked_at, v_secret;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'API key creation failed' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE FUNCTION public.revoke_api_key(p_key_id bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_project_id uuid;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  SELECT ak.project_id INTO v_project_id FROM public.api_keys ak WHERE ak.id = p_key_id;
  IF v_project_id IS NULL OR NOT public.has_permission(v_project_id, 'delete', 'api_keys') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.projects p WHERE p.id = v_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.api_keys ak SET revoked_at = clock_timestamp()
  WHERE ak.id = p_key_id AND ak.project_id = v_project_id AND ak.revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Selected active API key not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN p_key_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_api_key(uuid, bigint) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.revoke_api_key(bigint) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_api_key(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(bigint) TO authenticated;
