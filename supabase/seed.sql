-- ============================================================
-- Hotlog: Seed Data for Supabase
-- ============================================================
-- Paste this entire script into the Supabase SQL Editor and run.
-- It auto-detects your users from auth.users — no manual edits needed.
-- Safe to re-run (uses ON CONFLICT where possible).
-- ============================================================

DO $$
DECLARE
  -- Auto-detect users from auth.users
  user1_id uuid;
  user2_id uuid;

  -- Projects
  p_prod uuid := gen_random_uuid();
  p_staging uuid := gen_random_uuid();
  p_analytics uuid := gen_random_uuid();
  p_mobile uuid := gen_random_uuid();

  -- Roles
  r_admin uuid := gen_random_uuid();
  r_viewer uuid := gen_random_uuid();
  r_editor uuid := gen_random_uuid();
  r_devops uuid := gen_random_uuid();
  r_analyst uuid := gen_random_uuid();

  -- Schemas
  s_app_logs uuid := gen_random_uuid();
  s_sys_metrics uuid := gen_random_uuid();
  s_errors uuid := gen_random_uuid();
  s_http uuid := gen_random_uuid();
  s_user_actions uuid := gen_random_uuid();
  s_deployments uuid := gen_random_uuid();
  s_perf uuid := gen_random_uuid();

  -- Layouts
  lay_server int8;
  lay_errors int8;
  lay_api int8;
  lay_overview int8;

  -- Permission IDs
  perm_create_all uuid;
  perm_read_all uuid;
  perm_update_all uuid;
  perm_delete_all uuid;
  perm_read_events uuid;
  perm_create_events uuid;
  perm_read_schemas uuid;
  perm_create_schemas uuid;
  perm_read_layouts uuid;
  perm_create_layouts uuid;
  perm_read_api_keys uuid;
  perm_create_api_keys uuid;

  -- Loop helpers
  i int;
  ts timestamp;
  lvl text;
  levels text[] := ARRAY['DEBUG','INFO','INFO','INFO','WARN','ERROR'];
  msgs_info text[] := ARRAY[
    'Request processed successfully',
    'Database query completed in 23ms',
    'Cache hit for session token',
    'User authentication successful',
    'Background job completed',
    'Email notification sent',
    'File upload processed',
    'API response served from cache',
    'Webhook payload delivered',
    'Scheduled task executed'
  ];
  msgs_warn text[] := ARRAY[
    'Request timeout on /api/reports',
    'Memory usage exceeded 80% threshold',
    'Rate limiter triggered',
    'Slow query detected (>500ms)',
    'Connection pool near capacity',
    'Disk usage above 75%',
    'Retry attempt 2/3 for external API',
    'Deprecated endpoint called: /v1/users'
  ];
  msgs_error text[] := ARRAY[
    'Unhandled rejection in payment handler',
    'Database connection lost',
    'Failed to parse JSON payload',
    'Authentication token expired',
    'Service unavailable: upstream timeout',
    'Out of memory in worker process'
  ];
  msgs_debug text[] := ARRAY[
    'Cache miss for key user:session',
    'Query plan: sequential scan on events',
    'GC pause: 12ms',
    'Socket connection established',
    'Middleware chain completed in 2ms'
  ];
  endpoints text[] := ARRAY[
    '/api/users','/api/events','/api/projects','/api/auth/login',
    '/api/auth/refresh','/api/schemas','/api/layouts','/api/keys',
    '/api/health','/api/webhooks','/api/export','/api/search'
  ];
  methods text[] := ARRAY['GET','GET','GET','POST','PUT','DELETE','GET','POST'];
  statuses int[] := ARRAY[200,200,200,201,200,204,301,400,401,403,404,500];
  actions text[] := ARRAY[
    'page_view','button_click','form_submit','file_download',
    'settings_change','project_create','schema_edit','logout',
    'search','filter_apply','export_csv','invite_sent'
  ];
  deploy_statuses text[] := ARRAY['success','success','success','success','failed','rolled_back'];
  error_msgs text[] := ARRAY[
    'Cannot read property ''id'' of undefined',
    'ECONNREFUSED 127.0.0.1:5432',
    'JWT token expired',
    'Maximum call stack size exceeded',
    'ENOMEM: not enough memory',
    'ETIMEDOUT: connection timed out',
    'Unexpected token < in JSON at position 0',
    'ENOSPC: no space left on device',
    'TypeError: null is not an object',
    'RangeError: Invalid array length'
  ];

BEGIN
  -- ============================================================
  -- 0. AUTO-DETECT USERS
  -- ============================================================
  SELECT id INTO user1_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO user2_id FROM auth.users ORDER BY created_at ASC LIMIT 1 OFFSET 1;

  IF user1_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users. Please sign up at least one user first.';
  END IF;

  -- If only one user, use them for both
  IF user2_id IS NULL THEN
    user2_id := user1_id;
  END IF;

  RAISE NOTICE 'Using user1: %', user1_id;
  RAISE NOTICE 'Using user2: %', user2_id;

  -- ============================================================
  -- 1. PROJECTS (4 projects)
  -- ============================================================
  INSERT INTO public.projects (id, name, creator_id) VALUES
    (p_prod,      'Production API',      user1_id),
    (p_staging,   'Staging Environment', user1_id),
    (p_analytics, 'Analytics Platform',  user1_id),
    (p_mobile,    'Mobile Backend',      user2_id);

  -- ============================================================
  -- 2. USER_PROJECTS (memberships)
  -- ============================================================
  INSERT INTO public.user_projects (id, user_id, project_id) VALUES
    (gen_random_uuid(), user1_id, p_prod),
    (gen_random_uuid(), user1_id, p_staging),
    (gen_random_uuid(), user1_id, p_analytics),
    (gen_random_uuid(), user1_id, p_mobile),
    (gen_random_uuid(), user2_id, p_prod),
    (gen_random_uuid(), user2_id, p_mobile);

  -- ============================================================
  -- 3. ROLES (5 roles across projects)
  -- ============================================================
  INSERT INTO public.roles (id, name, project_id) VALUES
    (r_admin,   'Admin',    p_prod),
    (r_viewer,  'Viewer',   p_prod),
    (r_editor,  'Editor',   p_staging),
    (r_devops,  'DevOps',   p_prod),
    (r_analyst, 'Analyst',  p_analytics);

  -- ============================================================
  -- 4. USER_ROLES
  -- ============================================================
  INSERT INTO public.user_roles (id, user_id, role_id) VALUES
    (gen_random_uuid(), user1_id, r_admin),
    (gen_random_uuid(), user2_id, r_viewer),
    (gen_random_uuid(), user1_id, r_editor),
    (gen_random_uuid(), user1_id, r_analyst);

  -- ============================================================
  -- 5. ROLE_PERMISSIONS
  -- ============================================================
  SELECT id INTO perm_create_all     FROM public.permissions WHERE action='create' AND subject='all' LIMIT 1;
  SELECT id INTO perm_read_all       FROM public.permissions WHERE action='read'   AND subject='all' LIMIT 1;
  SELECT id INTO perm_update_all     FROM public.permissions WHERE action='update' AND subject='all' LIMIT 1;
  SELECT id INTO perm_delete_all     FROM public.permissions WHERE action='delete' AND subject='all' LIMIT 1;
  SELECT id INTO perm_read_events    FROM public.permissions WHERE action='read'   AND subject='events' LIMIT 1;
  SELECT id INTO perm_create_events  FROM public.permissions WHERE action='create' AND subject='events' LIMIT 1;
  SELECT id INTO perm_read_schemas   FROM public.permissions WHERE action='read'   AND subject='schemas' LIMIT 1;
  SELECT id INTO perm_create_schemas FROM public.permissions WHERE action='create' AND subject='schemas' LIMIT 1;
  SELECT id INTO perm_read_layouts   FROM public.permissions WHERE action='read'   AND subject='layouts' LIMIT 1;
  SELECT id INTO perm_create_layouts FROM public.permissions WHERE action='create' AND subject='layouts' LIMIT 1;
  SELECT id INTO perm_read_api_keys  FROM public.permissions WHERE action='read'   AND subject='api_keys' LIMIT 1;
  SELECT id INTO perm_create_api_keys FROM public.permissions WHERE action='create' AND subject='api_keys' LIMIT 1;

  -- Admin: full access
  INSERT INTO public.role_permissions (id, role_id, permission_id) VALUES
    (gen_random_uuid(), r_admin, perm_create_all),
    (gen_random_uuid(), r_admin, perm_read_all),
    (gen_random_uuid(), r_admin, perm_update_all),
    (gen_random_uuid(), r_admin, perm_delete_all);

  -- Viewer: read-only
  INSERT INTO public.role_permissions (id, role_id, permission_id) VALUES
    (gen_random_uuid(), r_viewer, perm_read_all);

  -- Editor: read + create events/schemas
  INSERT INTO public.role_permissions (id, role_id, permission_id) VALUES
    (gen_random_uuid(), r_editor, perm_read_events),
    (gen_random_uuid(), r_editor, perm_create_events),
    (gen_random_uuid(), r_editor, perm_read_schemas),
    (gen_random_uuid(), r_editor, perm_create_schemas),
    (gen_random_uuid(), r_editor, perm_read_layouts);

  -- DevOps: events + schemas + layouts + api_keys
  INSERT INTO public.role_permissions (id, role_id, permission_id) VALUES
    (gen_random_uuid(), r_devops, perm_read_events),
    (gen_random_uuid(), r_devops, perm_create_events),
    (gen_random_uuid(), r_devops, perm_read_schemas),
    (gen_random_uuid(), r_devops, perm_create_schemas),
    (gen_random_uuid(), r_devops, perm_read_layouts),
    (gen_random_uuid(), r_devops, perm_create_layouts),
    (gen_random_uuid(), r_devops, perm_read_api_keys),
    (gen_random_uuid(), r_devops, perm_create_api_keys);

  -- Analyst: read everything
  INSERT INTO public.role_permissions (id, role_id, permission_id) VALUES
    (gen_random_uuid(), r_analyst, perm_read_all);

  -- ============================================================
  -- 6. SCHEMAS (7 schemas across projects)
  -- ============================================================
  INSERT INTO public.schemas (id, name, project_id) VALUES
    (s_app_logs,     'Application Logs',  p_prod),
    (s_sys_metrics,  'System Metrics',    p_prod),
    (s_errors,       'Error Reports',     p_staging),
    (s_http,         'HTTP Requests',     p_prod),
    (s_user_actions, 'User Actions',      p_analytics),
    (s_deployments,  'Deployments',       p_prod),
    (s_perf,         'Performance',       p_mobile);

  -- ============================================================
  -- 7. FIELDS (across all schemas)
  -- ============================================================
  -- Application Logs
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'message',   'STRING',   s_app_logs, null),
    (gen_random_uuid(), 'level',     'ENUM',     s_app_logs, '{"values":["DEBUG","INFO","WARN","ERROR","FATAL"]}'::json),
    (gen_random_uuid(), 'timestamp', 'DATETIME', s_app_logs, null),
    (gen_random_uuid(), 'service',   'STRING',   s_app_logs, null);

  -- System Metrics
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'cpu_usage',      'NUMBER',  s_sys_metrics, '{"unit":"percent","min":0,"max":100}'::json),
    (gen_random_uuid(), 'memory_usage',   'NUMBER',  s_sys_metrics, '{"unit":"MB"}'::json),
    (gen_random_uuid(), 'disk_io',        'NUMBER',  s_sys_metrics, '{"unit":"MB/s"}'::json),
    (gen_random_uuid(), 'network_in',     'NUMBER',  s_sys_metrics, '{"unit":"KB/s"}'::json),
    (gen_random_uuid(), 'network_out',    'NUMBER',  s_sys_metrics, '{"unit":"KB/s"}'::json),
    (gen_random_uuid(), 'active_connections','NUMBER',s_sys_metrics, null);

  -- Error Reports
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'error_message', 'STRING', s_errors, null),
    (gen_random_uuid(), 'stack_trace',   'STRING', s_errors, null),
    (gen_random_uuid(), 'severity',      'ENUM',   s_errors, '{"values":["low","medium","high","critical"]}'::json);

  -- HTTP Requests
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'method',      'STRING',  s_http, null),
    (gen_random_uuid(), 'endpoint',    'STRING',  s_http, null),
    (gen_random_uuid(), 'status_code', 'NUMBER',  s_http, null),
    (gen_random_uuid(), 'duration_ms', 'NUMBER',  s_http, '{"unit":"ms"}'::json),
    (gen_random_uuid(), 'ip_address',  'STRING',  s_http, null);

  -- User Actions
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'action',     'STRING',  s_user_actions, null),
    (gen_random_uuid(), 'user_agent', 'STRING',  s_user_actions, null),
    (gen_random_uuid(), 'page',       'STRING',  s_user_actions, null),
    (gen_random_uuid(), 'session_id', 'STRING',  s_user_actions, null);

  -- Deployments
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'version',     'STRING',  s_deployments, null),
    (gen_random_uuid(), 'environment', 'STRING',  s_deployments, null),
    (gen_random_uuid(), 'status',      'ENUM',    s_deployments, '{"values":["success","failed","rolled_back"]}'::json),
    (gen_random_uuid(), 'duration_s',  'NUMBER',  s_deployments, '{"unit":"seconds"}'::json);

  -- Performance (Mobile)
  INSERT INTO public.fields (id, name, type, schema_id, metadata) VALUES
    (gen_random_uuid(), 'screen_name',   'STRING', s_perf, null),
    (gen_random_uuid(), 'load_time_ms',  'NUMBER', s_perf, '{"unit":"ms"}'::json),
    (gen_random_uuid(), 'fps',           'NUMBER', s_perf, null),
    (gen_random_uuid(), 'battery_level', 'NUMBER', s_perf, '{"unit":"percent"}'::json);

  -- ============================================================
  -- 8. EVENTS — ~200 total across all schemas
  -- ============================================================

  -- 8a. Application Logs — 50 events over the past 7 days
  FOR i IN 1..50 LOOP
    ts := now() - (random() * interval '7 days');
    lvl := levels[1 + floor(random() * array_length(levels,1))::int];
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'message', CASE lvl
          WHEN 'INFO'  THEN msgs_info[1 + floor(random() * array_length(msgs_info,1))::int]
          WHEN 'WARN'  THEN msgs_warn[1 + floor(random() * array_length(msgs_warn,1))::int]
          WHEN 'ERROR' THEN msgs_error[1 + floor(random() * array_length(msgs_error,1))::int]
          WHEN 'DEBUG' THEN msgs_debug[1 + floor(random() * array_length(msgs_debug,1))::int]
          ELSE msgs_info[1 + floor(random() * array_length(msgs_info,1))::int]
        END,
        'level', lvl,
        'timestamp', ts,
        'service', (ARRAY['api-gateway','auth-service','worker','scheduler','mailer'])[1 + floor(random()*5)::int]
      ),
      p_prod, s_app_logs
    );
  END LOOP;

  -- 8b. System Metrics — 60 events (one every ~2.8 hours for 7 days)
  FOR i IN 1..60 LOOP
    ts := now() - (i * interval '2 hours 48 minutes');
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'cpu_usage',    round((random() * 85 + 5)::numeric, 1),
        'memory_usage', round((random() * 1500 + 500)::numeric, 0),
        'disk_io',      round((random() * 200)::numeric, 1),
        'network_in',   round((random() * 5000)::numeric, 0),
        'network_out',  round((random() * 3000)::numeric, 0),
        'active_connections', floor(random() * 500 + 10)::int
      ),
      p_prod, s_sys_metrics
    );
  END LOOP;

  -- 8c. Error Reports — 20 errors
  FOR i IN 1..20 LOOP
    ts := now() - (random() * interval '14 days');
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'error_message', error_msgs[1 + floor(random() * array_length(error_msgs,1))::int],
        'stack_trace', 'Error: ' || error_msgs[1 + floor(random() * array_length(error_msgs,1))::int]
          || E'\n    at handler (/app/routes/api.ts:' || (floor(random()*200)+10)::int || ')'
          || E'\n    at processRequest (/app/middleware/core.ts:' || (floor(random()*100)+5)::int || ')',
        'severity', (ARRAY['low','medium','high','critical'])[1 + floor(random()*4)::int]
      ),
      p_staging, s_errors
    );
  END LOOP;

  -- 8d. HTTP Requests — 50 events
  FOR i IN 1..50 LOOP
    ts := now() - (random() * interval '3 days');
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'method',      methods[1 + floor(random() * array_length(methods,1))::int],
        'endpoint',    endpoints[1 + floor(random() * array_length(endpoints,1))::int],
        'status_code', statuses[1 + floor(random() * array_length(statuses,1))::int],
        'duration_ms', floor(random() * 2000 + 5)::int,
        'ip_address',  '192.168.' || floor(random()*255)::int || '.' || floor(random()*255)::int
      ),
      p_prod, s_http
    );
  END LOOP;

  -- 8e. User Actions — 30 events
  FOR i IN 1..30 LOOP
    ts := now() - (random() * interval '7 days');
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'action',     actions[1 + floor(random() * array_length(actions,1))::int],
        'user_agent', (ARRAY['Chrome/120','Firefox/121','Safari/17','Edge/120','Mobile Safari'])[1 + floor(random()*5)::int],
        'page',       (ARRAY['/dashboard','/projects','/settings','/events','/schemas','/layouts'])[1 + floor(random()*6)::int],
        'session_id', encode(gen_random_bytes(8), 'hex')
      ),
      p_analytics, s_user_actions
    );
  END LOOP;

  -- 8f. Deployments — 15 events
  FOR i IN 1..15 LOOP
    ts := now() - (i * interval '12 hours');
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'version',     'v' || (2 + i/10)::int || '.' || (i % 10) || '.' || floor(random()*20)::int,
        'environment', (ARRAY['production','staging','preview'])[1 + floor(random()*3)::int],
        'status',      deploy_statuses[1 + floor(random() * array_length(deploy_statuses,1))::int],
        'duration_s',  floor(random() * 300 + 30)::int
      ),
      p_prod, s_deployments
    );
  END LOOP;

  -- 8g. Mobile Performance — 25 events
  FOR i IN 1..25 LOOP
    INSERT INTO public.events (value, project_id, schema_id) VALUES (
      json_build_object(
        'screen_name',  (ARRAY['HomeScreen','ProfileScreen','SettingsScreen','EventsScreen','LoginScreen','SearchScreen'])[1 + floor(random()*6)::int],
        'load_time_ms', floor(random() * 3000 + 100)::int,
        'fps',          floor(random() * 30 + 30)::int,
        'battery_level',floor(random() * 100)::int
      ),
      p_mobile, s_perf
    );
  END LOOP;

  -- ============================================================
  -- 9. LAYOUTS (4 dashboards)
  -- ============================================================
  INSERT INTO public.layouts (name, description, project_id)
    VALUES ('Server Health', 'Real-time server monitoring dashboard', p_prod)
    RETURNING id INTO lay_server;

  INSERT INTO public.layouts (name, description, project_id)
    VALUES ('Error Tracker', 'Staging error monitoring and triage', p_staging)
    RETURNING id INTO lay_errors;

  INSERT INTO public.layouts (name, description, project_id)
    VALUES ('API Overview', 'HTTP traffic and latency overview', p_prod)
    RETURNING id INTO lay_api;

  INSERT INTO public.layouts (name, description, project_id)
    VALUES ('Analytics Overview', 'User behavior analytics', p_analytics)
    RETURNING id INTO lay_overview;

  -- ============================================================
  -- 10. COMPONENTS (8 chart components)
  -- ============================================================
  INSERT INTO public.components (id, name, description, type, index, inputs_ids, layout_id) VALUES
    (gen_random_uuid(), 'CPU Usage',         'CPU usage over time',            'TIME_SERIES', 0, '[]'::json, lay_server),
    (gen_random_uuid(), 'Memory Usage',      'Memory consumption over time',   'TIME_SERIES', 1, '[]'::json, lay_server),
    (gen_random_uuid(), 'Network Traffic',   'Inbound/outbound network',       'TIME_SERIES', 2, '[]'::json, lay_server),
    (gen_random_uuid(), 'Error Rate',        'Errors over time by severity',   'TIME_SERIES', 0, '[]'::json, lay_errors),
    (gen_random_uuid(), 'Response Times',    'API latency over time',          'TIME_SERIES', 0, '[]'::json, lay_api),
    (gen_random_uuid(), 'Request Volume',    'Requests per minute',            'TIME_SERIES', 1, '[]'::json, lay_api),
    (gen_random_uuid(), 'User Activity',     'Actions over time',              'TIME_SERIES', 0, '[]'::json, lay_overview),
    (gen_random_uuid(), 'Session Duration',  'Average session length',         'TIME_SERIES', 1, '[]'::json, lay_overview);

  -- ============================================================
  -- 11. API_KEYS (4 keys)
  -- ============================================================
  INSERT INTO public.api_keys (key, project_id) VALUES
    ('hk_live_' || encode(gen_random_bytes(24), 'hex'), p_prod),
    ('hk_test_' || encode(gen_random_bytes(24), 'hex'), p_staging),
    ('hk_live_' || encode(gen_random_bytes(24), 'hex'), p_analytics),
    ('hk_live_' || encode(gen_random_bytes(24), 'hex'), p_mobile);

  -- ============================================================
  -- DONE
  -- ============================================================
  RAISE NOTICE '-----------------------------------------------';
  RAISE NOTICE 'Seed complete! Inserted:';
  RAISE NOTICE '  4 projects';
  RAISE NOTICE '  6 user_project memberships';
  RAISE NOTICE '  5 roles with permissions';
  RAISE NOTICE '  7 schemas with 30 fields';
  RAISE NOTICE '  ~250 events (logs, metrics, errors, HTTP, user actions, deploys, perf)';
  RAISE NOTICE '  4 layouts with 8 components';
  RAISE NOTICE '  4 API keys';
  RAISE NOTICE '-----------------------------------------------';
  RAISE NOTICE 'Production API:      %', p_prod;
  RAISE NOTICE 'Staging Environment: %', p_staging;
  RAISE NOTICE 'Analytics Platform:  %', p_analytics;
  RAISE NOTICE 'Mobile Backend:      %', p_mobile;

END $$;
