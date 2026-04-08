-- ============================================================
-- Hotlog: Seed Data for Supabase
-- ============================================================
-- Run this in the Supabase SQL Editor.
--
-- IMPORTANT: Replace the placeholder user IDs below with real
-- auth.users IDs from your Supabase project. You can find them
-- in the Supabase dashboard under Authentication > Users.
-- ============================================================

-- Step 0: Set your real user IDs here
-- Replace these with actual user UUIDs from auth.users
DO $$
DECLARE
  user1_id uuid := '00000000-0000-0000-0000-000000000001'; -- Replace with your user ID
  user2_id uuid := '00000000-0000-0000-0000-000000000002'; -- Replace with a second user ID (or remove user2 references)

  -- Generated IDs (no need to change these)
  project1_id uuid := gen_random_uuid();
  project2_id uuid := gen_random_uuid();
  role_admin_id uuid := gen_random_uuid();
  role_viewer_id uuid := gen_random_uuid();
  role_editor_id uuid := gen_random_uuid();
  schema_logs_id uuid := gen_random_uuid();
  schema_metrics_id uuid := gen_random_uuid();
  schema_errors_id uuid := gen_random_uuid();
  field_message_id uuid := gen_random_uuid();
  field_level_id uuid := gen_random_uuid();
  field_timestamp_id uuid := gen_random_uuid();
  field_cpu_id uuid := gen_random_uuid();
  field_memory_id uuid := gen_random_uuid();
  field_error_msg_id uuid := gen_random_uuid();
  field_stack_id uuid := gen_random_uuid();
  component1_id uuid := gen_random_uuid();
  component2_id uuid := gen_random_uuid();

  layout1_id int8;
  layout2_id int8;

  perm_create_all uuid;
  perm_read_all uuid;
  perm_update_all uuid;
  perm_delete_all uuid;
  perm_read_events uuid;
  perm_create_events uuid;
  perm_read_schemas uuid;
  perm_create_schemas uuid;
  perm_read_layouts uuid;

BEGIN

  -- ============================================================
  -- 1. PROJECTS
  -- ============================================================
  INSERT INTO public.projects (id, name, creator_id)
  VALUES
    (project1_id, 'Production API', user1_id),
    (project2_id, 'Staging Environment', user1_id);

  -- ============================================================
  -- 2. USER_PROJECTS (project memberships)
  -- ============================================================
  INSERT INTO public.user_projects (id, user_id, project_id)
  VALUES
    (gen_random_uuid(), user1_id, project1_id),
    (gen_random_uuid(), user1_id, project2_id),
    (gen_random_uuid(), user2_id, project1_id);

  -- ============================================================
  -- 3. ROLES
  -- ============================================================
  INSERT INTO public.roles (id, name, project_id)
  VALUES
    (role_admin_id,  'Admin',  project1_id),
    (role_viewer_id, 'Viewer', project1_id),
    (role_editor_id, 'Editor', project2_id);

  -- ============================================================
  -- 4. USER_ROLES
  -- ============================================================
  INSERT INTO public.user_roles (id, user_id, role_id)
  VALUES
    (gen_random_uuid(), user1_id, role_admin_id),
    (gen_random_uuid(), user2_id, role_viewer_id);

  -- ============================================================
  -- 5. ROLE_PERMISSIONS
  --    Link roles to permissions seeded by the migration.
  -- ============================================================
  SELECT id INTO perm_create_all   FROM public.permissions WHERE action = 'create' AND subject = 'all' LIMIT 1;
  SELECT id INTO perm_read_all     FROM public.permissions WHERE action = 'read'   AND subject = 'all' LIMIT 1;
  SELECT id INTO perm_update_all   FROM public.permissions WHERE action = 'update' AND subject = 'all' LIMIT 1;
  SELECT id INTO perm_delete_all   FROM public.permissions WHERE action = 'delete' AND subject = 'all' LIMIT 1;
  SELECT id INTO perm_read_events  FROM public.permissions WHERE action = 'read'   AND subject = 'events' LIMIT 1;
  SELECT id INTO perm_create_events FROM public.permissions WHERE action = 'create' AND subject = 'events' LIMIT 1;
  SELECT id INTO perm_read_schemas FROM public.permissions WHERE action = 'read'   AND subject = 'schemas' LIMIT 1;
  SELECT id INTO perm_create_schemas FROM public.permissions WHERE action = 'create' AND subject = 'schemas' LIMIT 1;
  SELECT id INTO perm_read_layouts FROM public.permissions WHERE action = 'read'   AND subject = 'layouts' LIMIT 1;

  -- Admin role: full access
  INSERT INTO public.role_permissions (id, role_id, permission_id)
  VALUES
    (gen_random_uuid(), role_admin_id, perm_create_all),
    (gen_random_uuid(), role_admin_id, perm_read_all),
    (gen_random_uuid(), role_admin_id, perm_update_all),
    (gen_random_uuid(), role_admin_id, perm_delete_all);

  -- Viewer role: read-only
  INSERT INTO public.role_permissions (id, role_id, permission_id)
  VALUES
    (gen_random_uuid(), role_viewer_id, perm_read_all);

  -- Editor role: read + create events/schemas
  INSERT INTO public.role_permissions (id, role_id, permission_id)
  VALUES
    (gen_random_uuid(), role_editor_id, perm_read_events),
    (gen_random_uuid(), role_editor_id, perm_create_events),
    (gen_random_uuid(), role_editor_id, perm_read_schemas),
    (gen_random_uuid(), role_editor_id, perm_create_schemas),
    (gen_random_uuid(), role_editor_id, perm_read_layouts);

  -- ============================================================
  -- 6. SCHEMAS
  -- ============================================================
  INSERT INTO public.schemas (id, name, project_id)
  VALUES
    (schema_logs_id,    'Application Logs', project1_id),
    (schema_metrics_id, 'System Metrics',   project1_id),
    (schema_errors_id,  'Error Reports',    project2_id);

  -- ============================================================
  -- 7. FIELDS
  -- ============================================================
  -- Application Logs fields
  INSERT INTO public.fields (id, name, type, schema_id, metadata)
  VALUES
    (field_message_id,   'message',   'STRING',   schema_logs_id, null),
    (field_level_id,     'level',     'ENUM',     schema_logs_id, '{"values": ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]}'::json),
    (field_timestamp_id, 'timestamp', 'DATETIME', schema_logs_id, null);

  -- System Metrics fields
  INSERT INTO public.fields (id, name, type, schema_id, metadata)
  VALUES
    (field_cpu_id,    'cpu_usage',    'NUMBER', schema_metrics_id, '{"unit": "percent", "min": 0, "max": 100}'::json),
    (field_memory_id, 'memory_usage', 'NUMBER', schema_metrics_id, '{"unit": "MB"}'::json);

  -- Error Reports fields
  INSERT INTO public.fields (id, name, type, schema_id, metadata)
  VALUES
    (field_error_msg_id, 'error_message', 'STRING', schema_errors_id, null),
    (field_stack_id,     'stack_trace',   'STRING', schema_errors_id, null);

  -- ============================================================
  -- 8. EVENTS (sample log/metric data)
  -- ============================================================
  -- Application log events
  INSERT INTO public.events (value, project_id, schema_id)
  VALUES
    ('{"message": "Server started on port 3000", "level": "INFO", "timestamp": "2026-04-01T08:00:00Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Database connection established", "level": "INFO", "timestamp": "2026-04-01T08:00:01Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Cache miss for key user:123", "level": "DEBUG", "timestamp": "2026-04-01T08:01:30Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Request timeout on /api/reports", "level": "WARN", "timestamp": "2026-04-01T08:05:12Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Unhandled rejection in payment handler", "level": "ERROR", "timestamp": "2026-04-01T08:10:45Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Rate limiter triggered for IP 192.168.1.50", "level": "WARN", "timestamp": "2026-04-01T08:12:00Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Webhook delivered to https://example.com/hook", "level": "INFO", "timestamp": "2026-04-01T08:15:22Z"}'::json, project1_id, schema_logs_id),
    ('{"message": "Memory usage exceeded 80% threshold", "level": "WARN", "timestamp": "2026-04-01T08:20:00Z"}'::json, project1_id, schema_logs_id);

  -- System metric events
  INSERT INTO public.events (value, project_id, schema_id)
  VALUES
    ('{"cpu_usage": 23.5, "memory_usage": 1024}'::json, project1_id, schema_metrics_id),
    ('{"cpu_usage": 45.2, "memory_usage": 1280}'::json, project1_id, schema_metrics_id),
    ('{"cpu_usage": 78.9, "memory_usage": 1536}'::json, project1_id, schema_metrics_id),
    ('{"cpu_usage": 12.1, "memory_usage": 980}'::json,  project1_id, schema_metrics_id),
    ('{"cpu_usage": 91.3, "memory_usage": 1820}'::json, project1_id, schema_metrics_id),
    ('{"cpu_usage": 34.7, "memory_usage": 1100}'::json, project1_id, schema_metrics_id);

  -- Error report events (staging)
  INSERT INTO public.events (value, project_id, schema_id)
  VALUES
    ('{"error_message": "Cannot read property ''id'' of undefined", "stack_trace": "TypeError: Cannot read property ''id'' of undefined\n    at UserService.getUser (/app/services/user.ts:42)\n    at handler (/app/routes/users.ts:15)"}'::json, project2_id, schema_errors_id),
    ('{"error_message": "ECONNREFUSED 127.0.0.1:5432", "stack_trace": "Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)"}'::json, project2_id, schema_errors_id),
    ('{"error_message": "JWT token expired", "stack_trace": "TokenExpiredError: jwt expired\n    at verify (/app/node_modules/jsonwebtoken/verify.js:30)\n    at authMiddleware (/app/middleware/auth.ts:18)"}'::json, project2_id, schema_errors_id);

  -- ============================================================
  -- 9. LAYOUTS
  -- ============================================================
  INSERT INTO public.layouts (name, description, project_id)
  VALUES
    ('Server Dashboard', 'Real-time server health monitoring', project1_id)
  RETURNING id INTO layout1_id;

  INSERT INTO public.layouts (name, description, project_id)
  VALUES
    ('Error Tracker', 'Staging error monitoring view', project2_id)
  RETURNING id INTO layout2_id;

  -- ============================================================
  -- 10. COMPONENTS
  -- ============================================================
  INSERT INTO public.components (id, name, description, type, index, inputs_ids, layout_id)
  VALUES
    (component1_id, 'CPU Over Time',    'CPU usage time series chart',    'TIME_SERIES', 0, '[]'::json, layout1_id),
    (component2_id, 'Memory Over Time', 'Memory usage time series chart', 'TIME_SERIES', 1, '[]'::json, layout1_id);

  -- ============================================================
  -- 11. API_KEYS
  -- ============================================================
  INSERT INTO public.api_keys (key, project_id)
  VALUES
    ('hk_live_' || encode(gen_random_bytes(24), 'hex'), project1_id),
    ('hk_test_' || encode(gen_random_bytes(24), 'hex'), project2_id);

  -- ============================================================
  -- Done! Print summary.
  -- ============================================================
  RAISE NOTICE '✅ Seed data inserted successfully!';
  RAISE NOTICE '   Project 1 (Production API):    %', project1_id;
  RAISE NOTICE '   Project 2 (Staging Environment): %', project2_id;
  RAISE NOTICE '   Schema (Logs):    %', schema_logs_id;
  RAISE NOTICE '   Schema (Metrics): %', schema_metrics_id;
  RAISE NOTICE '   Schema (Errors):  %', schema_errors_id;

END $$;
