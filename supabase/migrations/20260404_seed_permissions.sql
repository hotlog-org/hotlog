-- =============================================================
-- Seed permissions table with all action:subject combinations
-- =============================================================
-- Inserts 43 permissions. Project creation is open to all authenticated
-- users, so create:projects is intentionally excluded.
-- Uses ON CONFLICT DO NOTHING to be idempotent — safe to re-run.
-- =============================================================

-- Ensure uniqueness on (action, subject) for idempotent seeding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'permissions_action_subject_unique'
  ) THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_action_subject_unique UNIQUE (action, subject);
  END IF;
END $$;

INSERT INTO public.permissions (action, subject) VALUES
  -- all (wildcard)
  ('create', 'all'),
  ('read', 'all'),
  ('update', 'all'),
  ('delete', 'all'),
  -- projects (create:projects intentionally omitted - open to all)
  ('read', 'projects'),
  ('update', 'projects'),
  ('delete', 'projects'),
  -- events
  ('create', 'events'),
  ('read', 'events'),
  ('update', 'events'),
  ('delete', 'events'),
  -- schemas
  ('create', 'schemas'),
  ('read', 'schemas'),
  ('update', 'schemas'),
  ('delete', 'schemas'),
  -- fields
  ('create', 'fields'),
  ('read', 'fields'),
  ('update', 'fields'),
  ('delete', 'fields'),
  -- layouts
  ('create', 'layouts'),
  ('read', 'layouts'),
  ('update', 'layouts'),
  ('delete', 'layouts'),
  -- components
  ('create', 'components'),
  ('read', 'components'),
  ('update', 'components'),
  ('delete', 'components'),
  -- roles
  ('create', 'roles'),
  ('read', 'roles'),
  ('update', 'roles'),
  ('delete', 'roles'),
  -- permissions
  ('create', 'permissions'),
  ('read', 'permissions'),
  ('update', 'permissions'),
  ('delete', 'permissions'),
  -- users
  ('create', 'users'),
  ('read', 'users'),
  ('update', 'users'),
  ('delete', 'users'),
  -- api_keys
  ('create', 'api_keys'),
  ('read', 'api_keys'),
  ('update', 'api_keys'),
  ('delete', 'api_keys')
ON CONFLICT (action, subject) DO NOTHING;

-- Remove create:projects if it exists (project creation is open to all)
DELETE FROM public.permissions
  WHERE action = 'create' AND subject = 'projects';
