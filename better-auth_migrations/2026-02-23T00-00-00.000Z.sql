create table if not exists "event_schemas" (
  "id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "name" text not null,
  "version" text not null,
  "fields" jsonb not null,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP
);

create table if not exists "events" (
  "id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "schema_id" text not null references "event_schemas" ("id") on delete cascade,
  "title" text not null,
  "source" text not null,
  "status" text not null,
  "payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default CURRENT_TIMESTAMP
);

create index if not exists "event_schemas_user_id_idx" on "event_schemas" ("user_id");
create index if not exists "events_user_created_idx" on "events" ("user_id", "created_at" desc);
create index if not exists "events_user_schema_created_idx" on "events" ("user_id", "schema_id", "created_at" desc);
