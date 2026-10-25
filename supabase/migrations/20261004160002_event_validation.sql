-- Validate at the write boundary, including public ingest_event and RLS writes.
-- No historical rows are scanned or rewritten. Public API-key RPCs are unchanged.

-- JSON numbers use JS binary64 semantics, not PostgreSQL arbitrary precision.
-- Normalize the exponent before conversion: json (unlike jsonb) can contain
-- exponents outside numeric's range. JS accepts underflow as zero, not infinity.
CREATE OR REPLACE FUNCTION public.event_number_value(p_value json)
RETURNS double precision
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  v_parts text[];
  v_digits text;
  v_exponent_text text;
  v_exponent bigint;
  v_result double precision;
BEGIN
  IF json_typeof(p_value) IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;
  v_parts := regexp_match(btrim(p_value::text), '^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$');
  v_digits := ltrim(v_parts[2] || coalesce(v_parts[3], ''), '0');
  IF v_digits = '' THEN RETURN 0; END IF;
  v_exponent_text := ltrim(ltrim(coalesce(v_parts[4], '0'), '+-'), '0');
  -- Beyond ten exponent digits, no representable json text can cancel it.
  IF length(v_exponent_text) > 10 THEN
    IF left(v_parts[4], 1) = '-' THEN RETURN 0; END IF;
    RETURN (v_parts[1] || 'Infinity')::double precision;
  END IF;
  v_exponent := coalesce(nullif(v_parts[4], ''), '0')::bigint
    - length(coalesce(v_parts[3], '')) + length(v_digits) - 1;
  IF v_exponent < -324 THEN RETURN 0; END IF;
  IF v_exponent > 308 THEN RETURN (v_parts[1] || 'Infinity')::double precision; END IF;
  BEGIN
    v_result := (v_parts[1] || left(v_digits, 1) || '.' || substr(v_digits, 2)
      || 'e' || v_exponent::text)::double precision;
  EXCEPTION WHEN numeric_value_out_of_range THEN
    IF v_exponent < 0 THEN RETURN 0; END IF;
    RETURN (v_parts[1] || 'Infinity')::double precision;
  END;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.event_number_text(p_value double precision)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' SET extra_float_digits = 3
AS $$
BEGIN
  IF p_value = 0 THEN RETURN '0'; END IF;
  IF abs(p_value) >= 1e-6 AND abs(p_value) < 1e21 THEN
    RETURN p_value::text::numeric::text;
  END IF;
  RETURN regexp_replace(p_value::text, 'e([+-])0+', 'e\1');
END;
$$;

-- Mirrors the existing ISO regex + V8 Date.parse acceptance, deliberately NOT
-- a timestamp cast: V8 accepts February 31, year 0000, 24:00 and +23:59 offsets.
-- Calendar overflow is accepted; day 00/32, leap seconds and nonzero 24h time
-- components are not. No timezone-dependent timestamp conversion is needed.
CREATE OR REPLACE FUNCTION public.event_datetime_valid(p_value text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  v_parts text[];
BEGIN
  v_parts := regexp_match(p_value,
    '^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:T([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]+))?)?(?:Z|[+-]([0-9]{2}):?([0-9]{2}))?)?$');
  IF v_parts IS NULL THEN RETURN false; END IF;
  RETURN v_parts[2]::integer BETWEEN 1 AND 12
    AND v_parts[3]::integer BETWEEN 1 AND 31
    AND coalesce(v_parts[4]::integer, 0) BETWEEN 0 AND 24
    AND coalesce(v_parts[5]::integer, 0) BETWEEN 0 AND 59
    AND coalesce(v_parts[6]::integer, 0) BETWEEN 0 AND 59
    AND coalesce(v_parts[8]::integer, 0) BETWEEN 0 AND 23
    AND coalesce(v_parts[9]::integer, 0) BETWEEN 0 AND 59
    AND (coalesce(v_parts[4]::integer, 0) <> 24 OR (
      v_parts[5]::integer = 0 AND coalesce(v_parts[6]::integer, 0) = 0
      AND coalesce(v_parts[7], '') !~ '[1-9]'));
END;
$$;

CREATE OR REPLACE FUNCTION public.event_primitive_error(p_kind text, p_value json, p_metadata json)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  v_type text := json_typeof(p_value);
  v_number double precision;
  v_bound double precision;
  v_values json := CASE WHEN json_typeof(p_metadata -> 'enumValues') = 'null'
    THEN '[]'::json ELSE coalesce(p_metadata -> 'enumValues', '[]'::json) END;
  v_allowed text;
BEGIN
  CASE p_kind
    WHEN 'string' THEN
      IF v_type IS DISTINCT FROM 'string' THEN RETURN 'expected string'; END IF;
    WHEN 'number' THEN
      v_number := public.event_number_value(p_value);
      IF v_number IS NULL OR v_number IN ('Infinity'::double precision, '-Infinity'::double precision) THEN
        RETURN 'expected finite number';
      END IF;
      v_bound := public.event_number_value(p_metadata -> 'numberRange' -> 'min');
      IF v_bound IS NOT NULL AND v_number < v_bound THEN
        RETURN 'must be >= ' || public.event_number_text(v_bound);
      END IF;
      v_bound := public.event_number_value(p_metadata -> 'numberRange' -> 'max');
      IF v_bound IS NOT NULL AND v_number > v_bound THEN
        RETURN 'must be <= ' || public.event_number_text(v_bound);
      END IF;
    WHEN 'boolean' THEN
      IF v_type IS DISTINCT FROM 'boolean' THEN RETURN 'expected boolean'; END IF;
    WHEN 'datetime' THEN
      IF v_type IS DISTINCT FROM 'string' THEN RETURN 'expected ISO 8601 datetime string'; END IF;
      IF NOT public.event_datetime_valid(p_value #>> '{}') THEN RETURN 'expected ISO 8601 datetime string'; END IF;
    WHEN 'enum' THEN
      IF v_type IS DISTINCT FROM 'string' THEN RETURN 'expected string enum value'; END IF;
      IF NOT EXISTS (SELECT 1 FROM json_array_elements_text(v_values) e(value) WHERE e.value = p_value #>> '{}') THEN
        SELECT string_agg(e.value, ', ' ORDER BY e.ordinality) INTO v_allowed
        FROM json_array_elements_text(v_values) WITH ORDINALITY e(value, ordinality);
        RETURN 'must be one of: ' || coalesce(nullif(v_allowed, ''), '<no values defined>');
      END IF;
    WHEN 'json' THEN
      IF v_type IS DISTINCT FROM 'object' THEN RETURN 'expected object'; END IF;
    WHEN 'array' THEN
      IF v_type IS DISTINCT FROM 'array' THEN RETURN 'expected array'; END IF;
    ELSE NULL;
  END CASE;
  RETURN NULL;
END;
$$;

-- Pure validator: fields are supplied by the protected trigger, never resolved
-- through caller RLS. Keep json throughout; events.value is json, not jsonb.
CREATE OR REPLACE FUNCTION public.event_value_errors(p_value json, p_fields json)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  v_errors jsonb := '[]'::jsonb;
  v_field json;
  v_value json;
  v_kind text;
  v_reason text;
  v_item record;
BEGIN
  IF json_typeof(p_value) IS DISTINCT FROM 'object' THEN
    RETURN '[{"field_key":"<root>","reason":"event value must be an object"}]'::jsonb;
  END IF;
  FOR v_field IN SELECT value FROM json_array_elements(p_fields) LOOP
    v_value := p_value -> (v_field ->> 'key');
    IF v_value IS NULL OR json_typeof(v_value) = 'null' THEN
      IF (v_field ->> 'required')::boolean THEN
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('field_key', v_field ->> 'key', 'reason', 'required field missing'));
      END IF;
      CONTINUE;
    END IF;
    v_kind := lower(v_field ->> 'type');
    v_reason := public.event_primitive_error(v_kind, v_value, v_field -> 'metadata');
    IF v_reason IS NOT NULL THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field_key', v_field ->> 'key', 'reason', v_reason));
    ELSIF v_kind = 'array' THEN
      FOR v_item IN SELECT value, ordinality FROM json_array_elements(v_value) WITH ORDINALITY LOOP
        v_reason := public.event_primitive_error(coalesce(v_field -> 'metadata' ->> 'itemType', 'string'), v_item.value, v_field -> 'metadata');
        IF v_reason IS NOT NULL THEN
          v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'field_key', (v_field ->> 'key') || '[' || (v_item.ordinality - 1)::text || ']', 'reason', v_reason));
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN v_errors;
END;
$$;

-- Field insert/delete/update (including moves) shares the schema lock protocol.
-- This prevents phantom required-field insertions during validation, without
-- table-wide locks or schema versioning. Event validators only take FOR SHARE.
-- Normal PostgreSQL snapshot semantics remain: REPEATABLE READ/SERIALIZABLE
-- validate against their transaction snapshot, not newer committed field edits.
-- AFTER also keeps these privileged locks behind the caller's RLS checks.
CREATE OR REPLACE FUNCTION public.lock_event_field_schema()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM s.id FROM public.schemas s
  WHERE s.id IN (CASE WHEN TG_OP <> 'INSERT' THEN OLD.schema_id END,
                 CASE WHEN TG_OP <> 'DELETE' THEN NEW.schema_id END)
  ORDER BY s.id FOR NO KEY UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_event_write()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_schema public.schemas%ROWTYPE;
  v_fields json;
  v_errors jsonb;
BEGIN
  SELECT s.* INTO v_schema FROM public.schemas s WHERE s.id = NEW.schema_id FOR SHARE;
  IF NOT FOUND OR v_schema.project_id IS DISTINCT FROM NEW.project_id OR v_schema.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'event_schema_invalid',
      DETAIL = '[{"field_key":"schema_key","reason":"Schema not found or not active in this project"}]';
  END IF;
  SELECT coalesce(json_agg(json_build_object('key', f.key, 'type', f.type,
    'required', f.required, 'metadata', f.metadata) ORDER BY f.key), '[]'::json)
  INTO v_fields FROM public.fields f WHERE f.schema_id = NEW.schema_id AND f.status = 'active';
  v_errors := public.event_value_errors(NEW.value, v_fields);
  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'event_value_invalid', DETAIL = v_errors::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fields_lock_event_schema
AFTER INSERT OR DELETE OR UPDATE OF schema_id, key, type, required, status, metadata ON public.fields
FOR EACH ROW EXECUTE FUNCTION public.lock_event_field_schema();

-- AFTER is intentional: RLS WITH CHECK must succeed before this definer can
-- expose field-level errors. BEFORE would disclose foreign schema metadata on
-- an unauthorized INSERT. Errors still roll back the event and RPC key audit.
CREATE TRIGGER events_validate_write
AFTER INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.validate_event_write();

REVOKE ALL ON FUNCTION public.event_number_value(json), public.event_number_text(double precision),
  public.event_datetime_valid(text), public.event_primitive_error(text,json,json),
  public.event_value_errors(json,json), public.lock_event_field_schema(), public.validate_event_write()
FROM PUBLIC, anon, authenticated, service_role;
