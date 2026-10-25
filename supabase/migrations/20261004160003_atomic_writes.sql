-- Atomic project bootstrap and component saves. Existing tables/policies remain
-- authoritative; only the layout row-lock helper crosses the RLS boundary.
CREATE FUNCTION public.create_project(p_name text)
RETURNS SETOF public.projects
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_role_id uuid;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'name is required';
  END IF;

  INSERT INTO public.projects (name, creator_id)
  VALUES (p_name, auth.uid()) RETURNING * INTO v_project;
  INSERT INTO public.user_projects (user_id, project_id)
  VALUES (auth.uid(), v_project.id);
  INSERT INTO public.roles (name, project_id)
  VALUES ('Owner', v_project.id) RETURNING id INTO v_role_id;
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (auth.uid(), v_role_id);
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id FROM public.permissions p;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Permission catalog is empty';
  END IF;
  RETURN NEXT v_project;
END;
$$;

-- SELECT FOR UPDATE under invoker RLS would also require update:layouts,
-- incorrectly excluding create-only/delete-only component editors. This helper
-- grants only a row lock, never data or writes. Its visibility predicate mirrors
-- layouts_select_member; component operations below still execute with RLS.
CREATE FUNCTION public.lock_layout_for_component_batch(
  p_layout_id bigint,
  p_schema_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_id uuid;
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;
  SELECT l.project_id INTO v_project_id FROM public.layouts l
  WHERE l.id = p_layout_id
    AND public.is_project_member(l.project_id)
    AND (
      NOT EXISTS (SELECT 1 FROM public.role_layouts rl WHERE rl.layout_id = l.id)
      OR EXISTS (
        SELECT 1 FROM public.role_layouts rl
        JOIN public.user_roles ur ON ur.role_id = rl.role_id
        WHERE rl.layout_id = l.id AND ur.user_id = auth.uid()
      )
      OR public.is_project_creator(l.project_id)
      OR public.has_permission(l.project_id, 'read', 'layouts')
    )
    AND (
      public.has_permission(l.project_id, 'create', 'components')
      OR public.has_permission(l.project_id, 'update', 'components')
      OR public.has_permission(l.project_id, 'delete', 'components')
    )
  FOR UPDATE OF l;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Layout unavailable or permission denied';
  END IF;
  IF p_schema_ids IS NULL OR array_position(p_schema_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid schema references';
  END IF;
  -- SHARE prevents a schema project change through the batch write without
  -- requiring update:schemas. It does not prevent later direct schema moves.
  PERFORM s.id FROM public.schemas s
  WHERE s.id = ANY(p_schema_ids) AND s.project_id = v_project_id
  ORDER BY s.id FOR SHARE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(p_schema_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Schema does not belong to layout project';
  END IF;
END;
$$;

CREATE FUNCTION public.batch_layout_components(
  p_layout_id bigint,
  p_creates jsonb DEFAULT '[]'::jsonb,
  p_updates jsonb DEFAULT '[]'::jsonb,
  p_deletes jsonb DEFAULT '[]'::jsonb
)
RETURNS SETOF public.components
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_project_id uuid;
  v_item jsonb;
  v_binding jsonb;
  v_key text;
  v_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_schema_id uuid;
  v_schema_ids uuid[] := ARRAY[]::uuid[];
  v_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Unauthorized';
  END IF;
  IF p_layout_id IS NULL
     OR jsonb_typeof(p_creates) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_updates) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_deletes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'layout_id and component arrays are required';
  END IF;

  PERFORM public.lock_layout_for_component_batch(p_layout_id);
  SELECT l.project_id INTO v_project_id FROM public.layouts l WHERE l.id = p_layout_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Layout unavailable or permission denied';
  END IF;
  IF (jsonb_array_length(p_creates) > 0 AND NOT public.has_permission(v_project_id, 'create', 'components'))
     OR (jsonb_array_length(p_updates) > 0 AND NOT public.has_permission(v_project_id, 'update', 'components'))
     OR (jsonb_array_length(p_deletes) > 0 AND NOT public.has_permission(v_project_id, 'delete', 'components')) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission denied';
  END IF;

  -- Validate the complete batch before any component mutation. Duplicate IDs,
  -- including update/delete overlap, are rejected rather than order-dependent.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_deletes) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Delete IDs must be UUID strings';
    END IF;
    v_id := (v_item #>> '{}')::uuid;
    IF v_id = ANY(v_ids) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Duplicate component ID';
    END IF;
    v_ids := array_append(v_ids, v_id);
    PERFORM c.id FROM public.components c WHERE c.id = v_id AND c.layout_id = p_layout_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Component unavailable in requested layout';
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Update IDs must be UUID strings';
    END IF;
    v_id := (v_item->>'id')::uuid;
    IF v_id = ANY(v_ids) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Duplicate component ID';
    END IF;
    v_ids := array_append(v_ids, v_id);
    -- Update permission was checked above; unlike delete-only editors, this
    -- caller can take the row lock without requiring another action's RLS.
    SELECT c.schema_id INTO v_schema_id FROM public.components c
    WHERE c.id = v_id AND c.layout_id = p_layout_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Component unavailable in requested layout';
    END IF;
    -- Validate the resulting reference, including an unchanged schema_id.
    IF NOT (v_item ? 'schema_id') AND v_schema_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.schemas s WHERE s.id = v_schema_id AND s.project_id = v_project_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Schema does not belong to layout project';
      END IF;
      IF NOT (v_schema_id = ANY(v_schema_ids)) THEN
        v_schema_ids := array_append(v_schema_ids, v_schema_id);
      END IF;
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_creates) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR NOT (v_item ? 'index') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Creates require an object with index';
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_creates || p_updates) LOOP
    FOREACH v_key IN ARRAY ARRAY['title', 'description', 'visualization', 'span'] LOOP
      IF v_item ? v_key AND jsonb_typeof(v_item->v_key) IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = v_key || ' must be a string';
      END IF;
    END LOOP;
    IF v_item ? 'index' THEN
      IF jsonb_typeof(v_item->'index') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'index must be an integer';
      END IF;
      IF (v_item->>'index')::numeric <> trunc((v_item->>'index')::numeric)
         OR (v_item->>'index')::numeric NOT BETWEEN -32768 AND 32767 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'index must be a smallint integer';
      END IF;
    END IF;
    IF v_item ? 'schema_id' AND v_item->'schema_id' <> 'null'::jsonb THEN
      IF jsonb_typeof(v_item->'schema_id') IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'schema_id must be a UUID or null';
      END IF;
      v_schema_id := (v_item->>'schema_id')::uuid;
      IF NOT EXISTS (
        SELECT 1 FROM public.schemas s WHERE s.id = v_schema_id AND s.project_id = v_project_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Schema does not belong to layout project';
      END IF;
      IF NOT (v_schema_id = ANY(v_schema_ids)) THEN
        v_schema_ids := array_append(v_schema_ids, v_schema_id);
      END IF;
    END IF;
    IF v_item ? 'bindings' THEN
      IF jsonb_typeof(v_item->'bindings') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'bindings must be an array';
      END IF;
      FOR v_binding IN SELECT value FROM jsonb_array_elements(v_item->'bindings') LOOP
        IF jsonb_typeof(v_binding) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_binding->'inputId') IS DISTINCT FROM 'string'
           OR NOT (v_binding ? 'fieldKey')
           OR jsonb_typeof(v_binding->'fieldKey') NOT IN ('string', 'null') THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid component binding';
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- At most one resulting schema per validated create/update, deduplicated;
  -- never lock unrelated project schemas. Layout-before-schema lock order.
  PERFORM public.lock_layout_for_component_batch(p_layout_id, v_schema_ids);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_deletes) LOOP
    DELETE FROM public.components c
    WHERE c.id = (v_item #>> '{}')::uuid AND c.layout_id = p_layout_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Component delete denied or row missing';
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
    UPDATE public.components c SET
      name = CASE WHEN v_item ? 'title' THEN v_item->>'title' ELSE c.name END,
      description = CASE WHEN v_item ? 'description' THEN v_item->>'description' ELSE c.description END,
      visualization = CASE WHEN v_item ? 'visualization' THEN v_item->>'visualization' ELSE c.visualization END,
      schema_id = CASE WHEN v_item ? 'schema_id' THEN (v_item->>'schema_id')::uuid ELSE c.schema_id END,
      inputs_ids = CASE WHEN v_item ? 'bindings' THEN (v_item->'bindings')::json ELSE c.inputs_ids END,
      index = CASE WHEN v_item ? 'index' THEN (v_item->>'index')::numeric::smallint ELSE c.index END,
      span = CASE WHEN v_item ? 'span' THEN v_item->>'span' ELSE c.span END
    WHERE c.id = (v_item->>'id')::uuid AND c.layout_id = p_layout_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Component update denied or row missing';
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_creates) LOOP
    INSERT INTO public.components (layout_id, name, description, visualization, schema_id, inputs_ids, index, span, type)
    VALUES (
      p_layout_id, coalesce(v_item->>'title', ''), coalesce(v_item->>'description', ''),
      coalesce(v_item->>'visualization', 'line'), (v_item->>'schema_id')::uuid,
      coalesce(v_item->'bindings', '[]'::jsonb)::json, (v_item->>'index')::numeric::smallint,
      coalesce(v_item->>'span', 'full'), 'TIME_SERIES'
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Component insert denied';
    END IF;
  END LOOP;
  RETURN QUERY SELECT c.* FROM public.components c
  WHERE c.layout_id = p_layout_id ORDER BY c.index, c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project(text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.lock_layout_for_component_batch(bigint, uuid[]) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.batch_layout_components(bigint, jsonb, jsonb, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_project(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_layout_for_component_batch(bigint, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_layout_components(bigint, jsonb, jsonb, jsonb) TO authenticated;
