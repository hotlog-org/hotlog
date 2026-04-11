-- =============================================================
-- events_daily_counts(project_id, days)
-- =============================================================
-- Returns one row per day for the trailing `days` days, with a
-- `count` of events created on that day for the given project.
-- Days with zero events are zero-filled via generate_series so the
-- caller never has to fill gaps in the line chart.
-- =============================================================

CREATE OR REPLACE FUNCTION public.events_daily_counts(
  p_project_id uuid,
  p_days integer
) RETURNS TABLE (day date, count bigint)
LANGUAGE sql
STABLE
AS $$
  WITH series AS (
    SELECT generate_series(
      (current_date - (p_days - 1))::date,
      current_date,
      interval '1 day'
    )::date AS day
  )
  SELECT s.day, count(e.id)::bigint
    FROM series s
    LEFT JOIN public.events e
      ON date_trunc('day', e.created_at)::date = s.day
     AND e.project_id = p_project_id
   GROUP BY s.day
   ORDER BY s.day;
$$;
