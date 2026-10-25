-- Parent/reviewer only. AFTER ALL FOUR forward migrations (20261004160001
-- through 20261004160004), run on one pinned Hotlog postgres connection with
-- unconditional ROLLBACK in the runner finally block. Recheck triggers for
-- external effects. All fixtures are synthetic. Positive ingest_event calls can
-- advance the events identity sequence even after rollback; never reset it.
-- This single-connection test does not prove multi-session lock serialization.
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

-- Canonical parity fixtures, also consumed by src/lib/schema-validator.test.ts.
DO $test$
DECLARE
  v_cases json := $parity$
[
  {"name": "root null", "fields": [{"key": "<root>", "type": "STRING", "required": false, "metadata": null}], "valueJson": "null", "errors": [{"field_key": "<root>", "reason": "event value must be an object"}]},
  {"name": "root []", "fields": [{"key": "<root>", "type": "STRING", "required": false, "metadata": null}], "valueJson": "[]", "errors": [{"field_key": "<root>", "reason": "event value must be an object"}]},
  {"name": "root 1", "fields": [{"key": "<root>", "type": "STRING", "required": false, "metadata": null}], "valueJson": "1", "errors": [{"field_key": "<root>", "reason": "event value must be an object"}]},
  {"name": "root \"object\"", "fields": [{"key": "<root>", "type": "STRING", "required": false, "metadata": null}], "valueJson": "\"object\"", "errors": [{"field_key": "<root>", "reason": "event value must be an object"}]},
  {"name": "root true", "fields": [{"key": "<root>", "type": "STRING", "required": false, "metadata": null}], "valueJson": "true", "errors": [{"field_key": "<root>", "reason": "event value must be an object"}]},
  {"name": "optional {}", "fields": [{"key": "x", "type": "STRING", "required": false, "metadata": null}], "valueJson": "{}", "errors": []},
  {"name": "required {}", "fields": [{"key": "x", "type": "STRING", "required": true, "metadata": null}], "valueJson": "{}", "errors": [{"field_key": "x", "reason": "required field missing"}]},
  {"name": "optional {\"x\":null}", "fields": [{"key": "x", "type": "STRING", "required": false, "metadata": null}], "valueJson": "{\"x\":null}", "errors": []},
  {"name": "required {\"x\":null}", "fields": [{"key": "x", "type": "STRING", "required": true, "metadata": null}], "valueJson": "{\"x\":null}", "errors": [{"field_key": "x", "reason": "required field missing"}]},
  {"name": "unknown nested keys", "fields": [{"key": "x", "type": "STRING", "required": false, "metadata": null}], "valueJson": "{\"x\":\"ok\",\"extra\":{\"nested\":[null,1e9999]}}", "errors": []},
  {"name": "string valid", "fields": [{"key": "x", "type": "STRING", "required": false, "metadata": null}], "valueJson": "{\"x\":\"hello\"}", "errors": []},
  {"name": "string invalid", "fields": [{"key": "x", "type": "STRING", "required": false, "metadata": null}], "valueJson": "{\"x\":1}", "errors": [{"field_key": "x", "reason": "expected string"}]},
  {"name": "boolean valid", "fields": [{"key": "x", "type": "BOOLEAN", "required": false, "metadata": null}], "valueJson": "{\"x\":false}", "errors": []},
  {"name": "boolean invalid", "fields": [{"key": "x", "type": "BOOLEAN", "required": false, "metadata": null}], "valueJson": "{\"x\":0}", "errors": [{"field_key": "x", "reason": "expected boolean"}]},
  {"name": "json valid", "fields": [{"key": "x", "type": "JSON", "required": false, "metadata": null}], "valueJson": "{\"x\":{}}", "errors": []},
  {"name": "json invalid", "fields": [{"key": "x", "type": "JSON", "required": false, "metadata": null}], "valueJson": "{\"x\":[]}", "errors": [{"field_key": "x", "reason": "expected object"}]},
  {"name": "array valid", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": null}], "valueJson": "{\"x\":[]}", "errors": []},
  {"name": "array invalid", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": null}], "valueJson": "{\"x\":{}}", "errors": [{"field_key": "x", "reason": "expected array"}]},
  {"name": "number 0", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":0}", "errors": []},
  {"name": "number -0", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":-0}", "errors": []},
  {"name": "number 1.7976931348623157e308", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1.7976931348623157e308}", "errors": []},
  {"name": "number 1.7976931348623158e308", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1.7976931348623158e308}", "errors": []},
  {"name": "number 1.7976931348623159e308", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1.7976931348623159e308}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "number 1e309", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1e309}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "number -1e309", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":-1e309}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "number 5e-324", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":5e-324}", "errors": []},
  {"name": "number 2e-324", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":2e-324}", "errors": []},
  {"name": "number 1e-99999999999999999999", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1e-99999999999999999999}", "errors": []},
  {"name": "number 0e99999999999999999999", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":0e99999999999999999999}", "errors": []},
  {"name": "number 1e99999999999999999999", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":1e99999999999999999999}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "number \"3\"", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":\"3\"}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "number false", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": null}], "valueJson": "{\"x\":false}", "errors": [{"field_key": "x", "reason": "expected finite number"}]},
  {"name": "range -1", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 0, "max": 10}}}], "valueJson": "{\"x\":-1}", "errors": [{"field_key": "x", "reason": "must be >= 0"}]},
  {"name": "range 0", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 0, "max": 10}}}], "valueJson": "{\"x\":0}", "errors": []},
  {"name": "range 10", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 0, "max": 10}}}], "valueJson": "{\"x\":10}", "errors": []},
  {"name": "range 11", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 0, "max": 10}}}], "valueJson": "{\"x\":11}", "errors": [{"field_key": "x", "reason": "must be <= 10"}]},
  {"name": "infinite minimum metadata", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 1e309}}}], "valueJson": "{\"x\":1}", "errors": [{"field_key": "x", "reason": "must be >= Infinity"}]},
  {"name": "infinite maximum metadata", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"max": -1e309}}}], "valueJson": "{\"x\":1}", "errors": [{"field_key": "x", "reason": "must be <= -Infinity"}]},
  {"name": "binary64 range rounding", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 9007199254740993}}}], "valueJson": "{\"x\":9007199254740992}", "errors": []},
  {"name": "subnormal not zero", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"max": 0}}}], "valueJson": "{\"x\":5e-324}", "errors": [{"field_key": "x", "reason": "must be <= 0"}]},
  {"name": "underflow zero", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 0, "max": 0}}}], "valueJson": "{\"x\":2e-324}", "errors": []},
  {"name": "range formatting 1e-07", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 1e-07}}}], "valueJson": "{\"x\":0}", "errors": [{"field_key": "x", "reason": "must be >= 1e-7"}]},
  {"name": "range formatting 1e-06", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 1e-06}}}], "valueJson": "{\"x\":0}", "errors": [{"field_key": "x", "reason": "must be >= 0.000001"}]},
  {"name": "range formatting 1e+20", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 1e+20}}}], "valueJson": "{\"x\":0}", "errors": [{"field_key": "x", "reason": "must be >= 100000000000000000000"}]},
  {"name": "range formatting 1e+21", "fields": [{"key": "x", "type": "NUMBER", "required": false, "metadata": {"numberRange": {"min": 1e+21}}}], "valueJson": "{\"x\":0}", "errors": [{"field_key": "x", "reason": "must be >= 1e+21"}]},
  {"name": "enum red", "fields": [{"key": "x", "type": "ENUM", "required": false, "metadata": {"enumValues": ["red", "green"]}}], "valueJson": "{\"x\": \"red\"}", "errors": []},
  {"name": "enum blue", "fields": [{"key": "x", "type": "ENUM", "required": false, "metadata": {"enumValues": ["red", "green"]}}], "valueJson": "{\"x\": \"blue\"}", "errors": [{"field_key": "x", "reason": "must be one of: red, green"}]},
  {"name": "enum 1", "fields": [{"key": "x", "type": "ENUM", "required": false, "metadata": {"enumValues": ["red", "green"]}}], "valueJson": "{\"x\": 1}", "errors": [{"field_key": "x", "reason": "expected string enum value"}]},
  {"name": "empty enum", "fields": [{"key": "x", "type": "ENUM", "required": false, "metadata": null}], "valueJson": "{\"x\":\"red\"}", "errors": [{"field_key": "x", "reason": "must be one of: <no values defined>"}]},
  {"name": "null enum values", "fields": [{"key": "x", "type": "ENUM", "required": false, "metadata": {"enumValues": null}}], "valueJson": "{\"x\":\"red\"}", "errors": [{"field_key": "x", "reason": "must be one of: <no values defined>"}]},
  {"name": "datetime 2024-02-29", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-02-29\"}", "errors": []},
  {"name": "datetime 2023-02-29", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2023-02-29\"}", "errors": []},
  {"name": "datetime 2023-02-31", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2023-02-31\"}", "errors": []},
  {"name": "datetime 2023-04-31", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2023-04-31\"}", "errors": []},
  {"name": "datetime 0000-02-30", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"0000-02-30\"}", "errors": []},
  {"name": "datetime 9999-12-31", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"9999-12-31\"}", "errors": []},
  {"name": "datetime 2024-01-01T12:34", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:34\"}", "errors": []},
  {"name": "datetime 2024-01-01T12:34Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:34Z\"}", "errors": []},
  {"name": "datetime 2024-01-01T12:34:56.123456789Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:34:56.123456789Z\"}", "errors": []},
  {"name": "datetime 2024-01-01T24:00", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T24:00\"}", "errors": []},
  {"name": "datetime 2024-01-01T24:00:00.000Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T24:00:00.000Z\"}", "errors": []},
  {"name": "datetime 2024-01-01T12:34+23:59", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:34+23:59\"}", "errors": []},
  {"name": "datetime 2024-01-01T12:34-2359", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:34-2359\"}", "errors": []},
  {"name": "datetime 9999-12-31T24:00-23:59", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"9999-12-31T24:00-23:59\"}", "errors": []},
  {"name": "datetime 2024-00-01", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-00-01\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-13-01", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-13-01\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-00", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-00\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-32", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-32\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T25:00", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T25:00\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T24:01", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T24:01\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T24:00:01", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T24:00:01\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T24:00:00.0001Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T24:00:00.0001Z\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T12:60", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:60\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T12:00:60", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:00:60\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T12:00+24:00", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:00+24:00\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T12:00+00:60", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T12:00+00:60\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01t00:00Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01t00:00Z\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T00:00z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T00:00z\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-1-1", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-1-1\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01Z\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01T00:00.5Z", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01T00:00.5Z\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01\n", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01\\n\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime 2024-01-01junk", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\": \"2024-01-01junk\"}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "datetime nonstring", "fields": [{"key": "x", "type": "DATETIME", "required": false, "metadata": null}], "valueJson": "{\"x\":123}", "errors": [{"field_key": "x", "reason": "expected ISO 8601 datetime string"}]},
  {"name": "array default strings", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": null}], "valueJson": "{\"x\":[\"ok\",1,null]}", "errors": [{"field_key": "x[1]", "reason": "expected string"}, {"field_key": "x[2]", "reason": "expected string"}]},
  {"name": "array of string", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "string", "enumValues": ["red"]}}], "valueJson": "{\"x\":[\"ok\"]}", "errors": []},
  {"name": "array of number", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "number", "enumValues": ["red"]}}], "valueJson": "{\"x\":[1]}", "errors": []},
  {"name": "array of boolean", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "boolean", "enumValues": ["red"]}}], "valueJson": "{\"x\":[true]}", "errors": []},
  {"name": "array of datetime", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "datetime", "enumValues": ["red"]}}], "valueJson": "{\"x\":[\"2023-02-31\"]}", "errors": []},
  {"name": "array of enum", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "enum", "enumValues": ["red"]}}], "valueJson": "{\"x\":[\"red\"]}", "errors": []},
  {"name": "array of json", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "json", "enumValues": ["red"]}}], "valueJson": "{\"x\":[{}]}", "errors": []},
  {"name": "array of array", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "array", "enumValues": ["red"]}}], "valueJson": "{\"x\":[[null,1]]}", "errors": []},
  {"name": "array item range", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "number", "numberRange": {"max": 1}}}], "valueJson": "{\"x\":[0,2]}", "errors": [{"field_key": "x[1]", "reason": "must be <= 1"}]},
  {"name": "array item infinite", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "number"}}], "valueJson": "{\"x\":[1e309]}", "errors": [{"field_key": "x[0]", "reason": "expected finite number"}]},
  {"name": "nested arrays shallow", "fields": [{"key": "x", "type": "ARRAY", "required": false, "metadata": {"itemType": "array"}}], "valueJson": "{\"x\":[[null,{\"a\":1e309}]]}", "errors": []}
]
$parity$::json;
  v_case json;
  v_actual jsonb;
BEGIN
  FOR v_case IN SELECT value FROM json_array_elements(v_cases) LOOP
    v_actual := public.event_value_errors((v_case ->> 'valueJson')::json, v_case -> 'fields');
    IF v_actual IS DISTINCT FROM (v_case -> 'errors')::jsonb THEN
      RAISE EXCEPTION 'Parity fixture failed: %', v_case ->> 'name';
    END IF;
  END LOOP;
  RAISE NOTICE 'Event validator parity: % cases passed', json_array_length(v_cases);
END;
$test$;

DO $test$
DECLARE
  v_user uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_other_project uuid := gen_random_uuid();
  v_schema uuid := gen_random_uuid();
  v_other_schema uuid := gen_random_uuid();
  v_role uuid := gen_random_uuid();
  v_required uuid := gen_random_uuid();
  v_key text := gen_random_uuid()::text;
  v_key_id bigint := -1 - floor(random() * 1000000000000)::bigint;
  v_event_id bigint := -1 - floor(random() * 1000000000000)::bigint;
  v_result record;
  v_details text;
  v_message text;
  v_count bigint;
  v_before bigint;
  v_function text;
BEGIN
  FOREACH v_function IN ARRAY ARRAY[
    'public.event_number_value(json)', 'public.event_number_text(double precision)',
    'public.event_datetime_valid(text)', 'public.event_primitive_error(text,json,json)',
    'public.event_value_errors(json,json)', 'public.lock_event_field_schema()',
    'public.validate_event_write()'
  ] LOOP
    IF has_function_privilege('anon', v_function, 'EXECUTE')
       OR has_function_privilege('authenticated', v_function, 'EXECUTE')
       OR has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected helper execute privilege: %', v_function;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('anon', 'public.ingest_event(text,text,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.ingest_event(text,text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public ingestion compatibility lost';
  END IF;

  INSERT INTO auth.users (id) VALUES (v_user), (v_outsider);
  INSERT INTO public.projects (id, creator_id, name) VALUES
    (v_project, v_user, 'event validation fixture'),
    (v_other_project, v_outsider, 'event validation foreign fixture');
  INSERT INTO public.user_projects (user_id, project_id) VALUES
    (v_user, v_project), (v_outsider, v_other_project);
  INSERT INTO public.roles (id, project_id, name) VALUES (v_role, v_project, 'Event writer');
  INSERT INTO public.permissions (action, subject) VALUES ('create', 'events'), ('update', 'events')
    ON CONFLICT (action, subject) DO NOTHING;
  INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role, id FROM public.permissions WHERE subject = 'events' AND action IN ('create', 'update');
  INSERT INTO public.user_roles (user_id, role_id) VALUES (v_user, v_role);
  INSERT INTO public.schemas (id, project_id, name, key, display_name) VALUES
    (v_schema, v_project, 'Fixture', 'fixture', 'Fixture'),
    (v_other_schema, v_other_project, 'Foreign', 'foreign', 'Foreign');
  INSERT INTO public.fields (id, schema_id, name, key, display_name, type, required, metadata) VALUES
    (v_required, v_schema, 'Name', 'name', 'Name', 'STRING', true, '{}');
  INSERT INTO public.fields (schema_id, name, key, display_name, type, required, status) VALUES
    (v_schema, 'Archived', 'archived', 'Archived', 'NUMBER', true, 'archived'),
    (v_other_schema, 'Hidden', 'hidden', 'Hidden', 'STRING', true, 'active');
  INSERT INTO public.api_keys (id, project_id, key_hash, key_prefix)
    VALUES (v_key_id, v_project, encode(extensions.digest(v_key, 'sha256'), 'hex'), left(v_key, 8));

  -- Anonymous RPC still works; trigger sees ALL active fields as its owner.
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.ingest_event(v_key, 'fixture', '{"name":42}');
    RAISE EXCEPTION 'RPC accepted wrong field type';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_details = PG_EXCEPTION_DETAIL, v_message = MESSAGE_TEXT;
    IF v_message <> 'event_value_invalid' OR v_details::jsonb <>
       '[{"field_key":"name","reason":"expected string"}]'::jsonb THEN
      RAISE EXCEPTION 'RPC did not expose the agreed field error';
    END IF;
  END;
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM public.events WHERE project_id = v_project)
     OR (SELECT last_used_at FROM public.api_keys WHERE id = v_key_id) IS NOT NULL THEN
    RAISE EXCEPTION 'Rejected RPC changed event/key audit state';
  END IF;

  SET LOCAL ROLE anon;
  SELECT * INTO v_result FROM public.ingest_event(v_key, 'fixture', '{"name":"ok","unknown":true}');
  IF v_result.id IS NULL OR v_result.created_at IS NULL THEN RAISE EXCEPTION 'RPC return contract changed'; END IF;
  SELECT count(*) INTO v_count FROM public.get_active_fields_for_ingest(v_key, 'fixture');
  IF v_count <> 1 THEN RAISE EXCEPTION 'Field introspection compatibility lost'; END IF;
  PERFORM public.get_project_schemas_for_sdk(v_key);
  BEGIN
    PERFORM public.ingest_event(gen_random_uuid()::text, 'fixture', '{"name":"ok"}');
    RAISE EXCEPTION 'Invalid key accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'invalid_api_key' THEN RAISE; END IF;
  END;
  RESET ROLE;
  IF (SELECT last_used_at FROM public.api_keys WHERE id = v_key_id) IS NULL THEN
    RAISE EXCEPTION 'Successful RPC did not update key audit';
  END IF;

  -- Event writers need no schema-update permission to acquire validation locks.
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.events (id, project_id, schema_id, value)
    VALUES (v_event_id, v_project, v_schema, '{"name":"direct","unknown":[1,2]}');
  UPDATE public.events SET value = '{"name":"updated"}' WHERE id = v_event_id;
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 1, v_project, v_schema, '{}');
    RAISE EXCEPTION 'Direct INSERT skipped required validation';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    UPDATE public.events SET value = '{"name":null}' WHERE id = v_event_id;
    RAISE EXCEPTION 'Direct UPDATE skipped required validation';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 1, v_project, v_schema, '[]');
    RAISE EXCEPTION 'Direct INSERT accepted nonobject root';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 1, v_project, v_other_schema, '{}');
    RAISE EXCEPTION 'Direct INSERT accepted foreign schema';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT, v_details = PG_EXCEPTION_DETAIL;
    IF v_message <> 'event_schema_invalid' OR v_details LIKE '%hidden%' THEN
      RAISE EXCEPTION 'Foreign schema lookup disclosed metadata';
    END IF;
  END;
  BEGIN
    UPDATE public.events SET schema_id = v_other_schema WHERE id = v_event_id;
    RAISE EXCEPTION 'Direct UPDATE accepted foreign schema';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT value ->> 'name' FROM public.events WHERE id = v_event_id) <> 'updated' THEN
    RAISE EXCEPTION 'Invalid update did not preserve previous value';
  END IF;

  -- AFTER trigger: unauthorized writes fail RLS BEFORE privileged validation,
  -- not with hidden field names (including a same-project schema relationship).
  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 1, v_project, v_schema, '{}');
    RAISE EXCEPTION 'Unauthorized write accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  -- Field/schema changes never scan or rewrite old events. New writes use the
  -- new active contract; even owner/service bypass of RLS cannot skip validation.
  SELECT count(*) INTO v_before FROM public.events WHERE project_id = v_project;
  UPDATE public.fields SET type = 'NUMBER' WHERE id = v_required;
  IF (SELECT count(*) FROM public.events WHERE project_id = v_project) <> v_before
     OR (SELECT value ->> 'name' FROM public.events WHERE id = v_event_id) <> 'updated' THEN
    RAISE EXCEPTION 'Schema edit rewrote historical events';
  END IF;
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 1, v_project, v_schema, '{"name":"old contract"}');
    RAISE EXCEPTION 'Privileged insert bypassed current type';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.ingest_event(v_key, 'fixture', '{"name":1e309}');
    RAISE EXCEPTION 'RPC accepted a number outside JS finite range';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_details = PG_EXCEPTION_DETAIL;
    IF v_details::jsonb <> '[{"field_key":"name","reason":"expected finite number"}]'::jsonb THEN
      RAISE EXCEPTION 'RPC finite-number error changed';
    END IF;
  END;
  PERFORM public.ingest_event(v_key, 'fixture', '{"name":5e-324}');
  RESET ROLE;
  UPDATE public.fields SET status = 'archived' WHERE id = v_required;
  INSERT INTO public.events (id, project_id, schema_id, value)
    VALUES (v_event_id - 1, v_project, v_schema, '{}');
  UPDATE public.schemas SET status = 'archived' WHERE id = v_schema;
  BEGIN
    INSERT INTO public.events (id, project_id, schema_id, value)
      VALUES (v_event_id - 2, v_project, v_schema, '{}');
    RAISE EXCEPTION 'Privileged insert accepted archived schema';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.ingest_event(v_key, 'fixture', '{}');
    RAISE EXCEPTION 'RPC accepted archived schema';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL;
  END;
  RESET ROLE;
  UPDATE public.schemas SET status = 'active' WHERE id = v_schema;
  UPDATE public.api_keys SET revoked_at = now() WHERE id = v_key_id;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.ingest_event(v_key, 'fixture', '{}');
    RAISE EXCEPTION 'Revoked key accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'invalid_api_key' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'Event validation RPC/RLS/history/ACL checks passed';
END;
$test$;

ROLLBACK;
