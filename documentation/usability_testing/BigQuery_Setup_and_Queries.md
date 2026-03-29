# Firebase Analytics BigQuery Guide for Usability Testing

When analyzing your data in BigQuery, Firebase events are stored in a nested format. Custom parameters like `participant_id` and `task_id` exist inside an array called `event_params`.

To read them properly, you must "UNNEST" the `event_params` array.

---

## Project / Dataset Reference

- **Project & dataset:** `soen390-usability.analytics_527504735`
- **Testing dates covered:** March 26, 27, 28, 2026
  - March 29 data: once it flows into BigQuery, uncomment the `events_20260329` line in the `combined_days` CTE used in every query below.
- **Participants (9 so far):** P1, P2, P3, P4, P5, P6, P7, P8, P10
  - Note: P9 was skipped. 3–5 more participants (P11–P15) will be added soon — add their IDs to the `participant_filter` CTE when their sessions are complete.
- **Task IDs:** `'1'` through `'7'`

---

## Reusable CTE Pattern

Every query below opens with the same two CTEs. Copy them as-is.

```sql
-- ============================================================
-- STEP 1 — Edit dates here when new data arrives
-- ============================================================
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- Uncomment the line below once March 29 data flows into BigQuery:
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),

-- ============================================================
-- STEP 2 — Add new participant IDs here when more sessions run
-- ============================================================
real_participants AS (
  SELECT participant_id
  FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- Add new IDs here, e.g.: ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
```

> **In all queries below, the two CTEs above appear at the top. The rest of the query builds on them.**

---

## Finding the Data

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and navigate to **BigQuery**.
2. Make sure you are in the **soen390-usability** project.
3. In the Explorer pane on the left, expand the project → `analytics_527504735`.
4. You will see tables named `events_20260326`, `events_20260327`, `events_20260328`, etc.
   - The standard `events_YYYYMMDD` table is finalized the following day. For same-day data, also query `events_intraday_YYYYMMDD`.

---

## Query 1 — Full Event Flow Per Participant / Task

Extracts every `ut_` event with all key parameters, ordered chronologically per participant and task. Use this to replay exactly what happened during each task.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- Uncomment once March 29 data flows into BigQuery:
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- Add new IDs here, e.g.: ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  TIMESTAMP_MICROS(event_timestamp)                                                      AS event_time,
  event_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')     AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')            AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'building_name')      AS building_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name')        AS screen_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')             AS task_status,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transport_mode')     AS transport_mode,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'destination')        AS destination,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'feature_name')       AS feature_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'reason')             AS reason,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'mode')               AS mode,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campus_selected')    AS campus_selected
FROM combined_days
WHERE
  event_name LIKE 'ut_%'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64), event_timestamp ASC;
```

---

## Query 2 — Time on Task Per Participant / Task

Calculates elapsed seconds between `ut_task_start` and `ut_task_end` for each participant and task.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
),
task_events AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
    event_name,
    TIMESTAMP_MICROS(event_timestamp)                                                  AS event_time,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')         AS completion_status
  FROM combined_days
  WHERE event_name IN ('ut_task_start', 'ut_task_end')
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
        IN (SELECT participant_id FROM real_participants)
)
SELECT
  participant_id,
  task_id,
  MIN(IF(event_name = 'ut_task_start', event_time, NULL)) AS start_time,
  MAX(IF(event_name = 'ut_task_end',   event_time, NULL)) AS end_time,
  MAX(completion_status)                                  AS status,
  TIMESTAMP_DIFF(
    MAX(IF(event_name = 'ut_task_end',   event_time, NULL)),
    MIN(IF(event_name = 'ut_task_start', event_time, NULL)),
    SECOND
  ) AS time_on_task_seconds
FROM task_events
GROUP BY participant_id, task_id
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64);
```

---

## Query 3a — Error Counts Per Participant / Task

One row per participant + task with the four moderator-logged error counts and a total. All values come from `ut_task_end`.

> **Note:** Each error count checks both `int_value` and `double_value`. React Native Firebase stores JavaScript numbers in `double_value` in BigQuery — if only `int_value` is checked, every count will appear as 0.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')   AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id,
  COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0) AS nav_errors,
  COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'),    0) AS misclicks,
  COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),  0) AS help_asked,
  COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'),    0) AS confused,
  COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0)
  + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'), 0)
  + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),0)
  + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'), 0)
    AS total_errors
FROM combined_days
WHERE
  event_name = 'ut_task_end'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64);
```

---

## Query 3b — Error Counts Per Participant (All Tasks Aggregated)

Rolls up all tasks for each participant into a single row. Useful for comparing total error load across participants (bar chart: participant vs. total errors, optionally stacked by error type).

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')    AS participant_id,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0)) AS total_nav_errors,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'),    0)) AS total_misclicks,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),  0)) AS total_help_asked,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'),    0)) AS total_confused,
  SUM(
    COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'), 0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'), 0)
  ) AS grand_total_errors
FROM combined_days
WHERE
  event_name = 'ut_task_end'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY participant_id
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64);
```

---

## Query 3c — Error Counts Per Task (All Participants Aggregated)

Rolls up all participants for each task into a single row. Useful for comparing which tasks generated the most errors overall (bar chart: task vs. total errors, optionally stacked by error type).

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')         AS task_id,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0)) AS total_nav_errors,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'),    0)) AS total_misclicks,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),  0)) AS total_help_asked,
  SUM(COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'),    0)) AS total_confused,
  SUM(
    COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'nav_error_count'),  0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'misclick_count'), 0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'help_asked_count'),0)
    + COALESCE((SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'confused_count'), 0)
  ) AS grand_total_errors
FROM combined_days
WHERE
  event_name = 'ut_task_end'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY task_id
ORDER BY CAST(task_id AS INT64);
```

---

## Query 4 — Rage Click Summary Per Participant / Task

`ut_rage_click` fires automatically when a participant taps the screen 3 times in rapid succession. High counts on a task indicate frustration.

### 4a — Individual Events (full chronological log)

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  TIMESTAMP_MICROS(event_timestamp)                                                    AS event_time,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')   AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id
FROM combined_days
WHERE
  event_name = 'ut_rage_click'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64), event_timestamp ASC;
```

### 4b — Rage Clicks Per Participant / Task (chart: grouped bar — participant × task)

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
  COUNT(*) AS rage_click_count
FROM combined_days
WHERE
  event_name = 'ut_rage_click'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY participant_id, task_id
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64);
```

### 4c — Rage Clicks Per Task (all participants aggregated — chart: bar, x: task, y: count)

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
  COUNT(*) AS rage_click_count
FROM combined_days
WHERE
  event_name = 'ut_rage_click'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY task_id
ORDER BY CAST(task_id AS INT64);
```

---

## Query 5 — Average Time on Task Per Task (chart: bar — x: task, y: avg seconds)

Shows which tasks took the longest on average. Good for a bar chart in a usability report.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
),
task_times AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
    event_name,
    TIMESTAMP_MICROS(event_timestamp)                                                  AS event_time
  FROM combined_days
  WHERE event_name IN ('ut_task_start', 'ut_task_end')
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
        IN (SELECT participant_id FROM real_participants)
),
per_task AS (
  SELECT
    participant_id,
    task_id,
    TIMESTAMP_DIFF(
      MAX(IF(event_name = 'ut_task_end',   event_time, NULL)),
      MIN(IF(event_name = 'ut_task_start', event_time, NULL)),
      SECOND
    ) AS time_on_task_seconds
  FROM task_times
  GROUP BY participant_id, task_id
)
SELECT
  task_id,
  COUNT(*)                                          AS participant_count,
  ROUND(AVG(time_on_task_seconds), 1)               AS avg_seconds,
  MIN(time_on_task_seconds)                         AS min_seconds,
  MAX(time_on_task_seconds)                         AS max_seconds,
  ROUND(STDDEV(time_on_task_seconds), 1)            AS stddev_seconds
FROM per_task
GROUP BY task_id
ORDER BY CAST(task_id AS INT64);
```

---

## Query 6 — Transport Mode Preferences (chart: pie or bar — mode vs. selections)

Counts how many times each transport mode was selected or switched to. Shows which modes participants gravitated toward.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  COALESCE(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'mode'),
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transport_mode')
  ) AS transport_mode,
  event_name,
  COUNT(*) AS selection_count
FROM combined_days
WHERE
  event_name IN ('ut_transport_mode_changed', 'ut_route_preview', 'ut_directions_started')
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY transport_mode, event_name
ORDER BY transport_mode, event_name;
```

---

## Query 7 — Search Behavior: Success vs. Abandoned vs. No Results (chart: grouped bar or stacked bar per task)

Measures how well participants used the search feature. High abandonment or no-results counts on a task suggest search discoverability or labeling issues.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
  COUNTIF(event_name = 'ut_search_performed')   AS searches_completed,
  COUNTIF(event_name = 'ut_search_abandoned')   AS searches_abandoned,
  COUNTIF(event_name = 'ut_search_no_results')  AS searches_no_results
FROM combined_days
WHERE
  event_name IN ('ut_search_performed', 'ut_search_abandoned', 'ut_search_no_results')
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY task_id
ORDER BY CAST(task_id AS INT64);
```

---

## Query 8 — Building Interaction Frequency (chart: horizontal bar — which buildings were tapped most)

Shows which buildings participants tapped on the map most often. Useful for understanding navigation patterns and map discoverability.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'building_name') AS building_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campus')        AS campus,
  COUNT(*) AS tap_count
FROM combined_days
WHERE
  event_name = 'ut_building_selected'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY building_name, campus
ORDER BY tap_count DESC;
```

---

## Query 9 — Dead Taps Per Task (chart: bar — x: task, y: dead tap count)

`ut_dead_tap` fires when a participant taps an area that does not respond. High counts point to confusing UI affordances or missing touch targets.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'element')        AS element,
  COUNT(*) AS dead_tap_count
FROM combined_days
WHERE
  event_name = 'ut_dead_tap'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY participant_id, task_id, element
ORDER BY dead_tap_count DESC;
```

---

## Query 10 — First Interaction Per Task Per Participant

Returns the very first `ut_` event each participant fired after a task started. Useful for first-click analysis — did participants immediately go to the right place?

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
),
all_events AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
    event_name,
    TIMESTAMP_MICROS(event_timestamp)                                                  AS event_time,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'building_name')  AS building_name,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'feature_name')   AS feature_name
  FROM combined_days
  WHERE
    event_name LIKE 'ut_%'
    AND event_name != 'ut_task_start'
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
        IN (SELECT participant_id FROM real_participants)
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY participant_id, task_id ORDER BY event_time ASC) AS rn
  FROM all_events
)
SELECT
  participant_id,
  task_id,
  event_name   AS first_event,
  event_time,
  building_name,
  feature_name
FROM ranked
WHERE rn = 1
ORDER BY CAST(SUBSTR(participant_id, 2) AS INT64), CAST(task_id AS INT64);
```

---

## Query 11 — Campus Toggle Usage Per Task (chart: bar — how often participants switched campus per task)

High toggle counts on a task may indicate participants were disoriented about which campus a building is on.

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campus_selected')  AS campus_selected,
  COUNT(*) AS toggle_count
FROM combined_days
WHERE
  event_name = 'ut_campus_toggled'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY task_id, campus_selected
ORDER BY CAST(task_id AS INT64), campus_selected;
```

---

## Query 12 — Feature Tap Breakdown (chart: horizontal bar — which features were most tapped)

Aggregates `ut_feature_tap` events to show which UI features participants used most. Helps quantify discoverability of less obvious features (e.g. shuttle button).

```sql
WITH combined_days AS (
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260326`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260327`
  UNION ALL
  SELECT * FROM `soen390-usability.analytics_527504735.events_20260328`
  -- UNION ALL SELECT * FROM `soen390-usability.analytics_527504735.events_20260329`
),
real_participants AS (
  SELECT participant_id FROM UNNEST([
    'P1','P2','P3','P4','P5','P6','P7','P8','P10'
    -- ,'P11','P12','P13','P14','P15'
  ]) AS participant_id
)
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'feature_name')  AS feature_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')       AS task_id,
  COUNT(*) AS tap_count
FROM combined_days
WHERE
  event_name = 'ut_feature_tap'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')
      IN (SELECT participant_id FROM real_participants)
GROUP BY feature_name, task_id
ORDER BY tap_count DESC;
```
