# Firebase Analytics BigQuery Guide for Usability Testing

When analyzing your data in BigQuery, Firebase events are stored in a nested format. Custom parameters like `participant_id` and `task_id` exist inside an array called `event_params`.

To read them properly, you must "UNNEST" the `event_params` array.

---

## Finding the Data

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and navigate to **BigQuery**.
2. Make sure you are in the project associated with your Firebase App.
3. In the Explorer pane on the left, expand your project. You should see a dataset named `analytics_<YOUR_PROPERTY_ID>`.
4. Inside your dataset, you will see tables like `events_YYYYMMDD` and `events_intraday_YYYYMMDD`.
   * The standard `events_` table updates once per day. For same-day testing, query the `events_intraday_` table instead.

> **In all queries below, replace `your-project-id.analytics_123456789` with your actual project and dataset ID.**

---

## Query 1 — Full Event Flow Per Participant / Task

This query extracts every event along with its `participant_id` and `task_id`, ordered chronologically. Use it to replay exactly what happened during a task.

```sql
SELECT
  TIMESTAMP_MICROS(event_timestamp) AS event_time,
  event_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'building_name')  AS building_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name')    AS screen_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')         AS task_status,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transport_mode') AS transport_mode,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'destination')    AS destination
FROM
  `your-project-id.analytics_123456789.events_*`
WHERE
  event_name LIKE 'ut_%'
ORDER BY
  participant_id, task_id, event_timestamp ASC;
```

---

## Query 2 — Time on Task Per Participant / Task

Calculates elapsed seconds between `ut_task_start` and `ut_task_end` for each participant and task. Also surfaces the completion status (pass / fail / abandoned).

```sql
WITH task_events AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')        AS task_id,
    event_name,
    TIMESTAMP_MICROS(event_timestamp)                                                  AS event_time,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')         AS completion_status
  FROM `your-project-id.analytics_123456789.events_*`
  WHERE event_name IN ('ut_task_start', 'ut_task_end')
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') IS NOT NULL
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') != 'none'
)
SELECT
  participant_id,
  task_id,
  MIN(IF(event_name = 'ut_task_start', event_time, NULL))  AS start_time,
  MAX(IF(event_name = 'ut_task_end',   event_time, NULL))  AS end_time,
  MAX(completion_status)                                    AS status,
  TIMESTAMP_DIFF(
    MAX(IF(event_name = 'ut_task_end',   event_time, NULL)),
    MIN(IF(event_name = 'ut_task_start', event_time, NULL)),
    SECOND
  ) AS time_on_task_seconds
FROM task_events
GROUP BY participant_id, task_id
ORDER BY participant_id, task_id;
```

---

## Query 3 — Error Counts Per Participant / Task

Returns the four moderator-logged error counts (entered in the Dev Menu after each task) plus a total. All counts come from parameters on the `ut_task_end` event.

```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')   AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')           AS status,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'nav_error_count')  AS nav_errors,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'misclick_count')   AS misclicks,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'help_asked_count') AS help_asked,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'confused_count')   AS confused,
  COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'nav_error_count'), 0)
  + COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'misclick_count'), 0)
  + COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'help_asked_count'), 0)
  + COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'confused_count'), 0)
    AS total_errors
FROM
  `your-project-id.analytics_123456789.events_*`
WHERE
  event_name = 'ut_task_end'
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') IS NOT NULL
  AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') != 'none'
ORDER BY participant_id, task_id;
```

---

## Query 4 — Task Completion Rate (Pass / Fail / Abandoned)

Aggregates outcomes across all participants for each task. Useful for identifying which tasks caused the most failures.

```sql
WITH outcomes AS (
  SELECT
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status')  AS status
  FROM `your-project-id.analytics_123456789.events_*`
  WHERE event_name = 'ut_task_end'
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') IS NOT NULL
    AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') != 'none'
)
SELECT
  task_id,
  COUNT(*)                                                      AS total_attempts,
  COUNTIF(status = 'pass')                                      AS passed,
  COUNTIF(status = 'fail')                                      AS failed,
  COUNTIF(status = 'abandoned')                                 AS abandoned,
  ROUND(COUNTIF(status = 'pass') / COUNT(*) * 100, 1)          AS pass_rate_pct
FROM outcomes
GROUP BY task_id
ORDER BY task_id;
```

---

## Query 5 — Rage Click Summary Per Participant / Task

`ut_rage_click` fires automatically whenever the participant taps the screen 3 times in rapid succession. High counts on a specific task indicate frustration.

Individual rage click events (with timestamp and screen):

```sql
SELECT
  TIMESTAMP_MICROS(event_timestamp)                                                    AS event_time,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id')   AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name')      AS screen_name
FROM
  `your-project-id.analytics_123456789.events_*`
WHERE
  event_name = 'ut_rage_click'
ORDER BY
  participant_id, task_id, event_timestamp ASC;
```

Aggregated count per task and screen:

```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id')          AS task_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name')      AS screen_name,
  COUNT(*) AS rage_click_count
FROM
  `your-project-id.analytics_123456789.events_*`
WHERE
  event_name = 'ut_rage_click'
GROUP BY task_id, screen_name
ORDER BY rage_click_count DESC;
```
