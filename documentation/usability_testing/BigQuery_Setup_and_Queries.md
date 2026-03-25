# Firebase Analytics BigQuery Guide for Usability Testing

When analyzing your data in BigQuery, Firebase events are stored in a nested format. Custom parameters like `participant_id` and `task_id` exist inside an array called `event_params`.

To read them properly, you must "UNNEST" the `event_params` array.

## Finding the Data
1. Open the [Google Cloud Console](https://console.cloud.google.com/) and navigate to **BigQuery**.
2. Make sure you are in the project associated with your Firebase App.
3. In the Explorer pane on the left, expand your project. You should see a dataset named `analytics_<YOUR_PROPERTY_ID>`.
4. Inside your dataset, you will see tables like `events_YYYYMMDD` and `events_intraday_YYYYMMDD`. 
   * Note: The standard `events_` table updates daily. For real-time testing, query the `events_intraday_` table.

## Core Usability Query - Linear Event Flow

This query extracts every event along with its associated `participant_id` and `task_id`, ordered chronologically. It filters only for events prefixed with `pilot_`, giving you exactly the sequence of actions that happened during a specific task.

```sql
SELECT 
  TIMESTAMP_MICROS(event_timestamp) AS event_time,
  event_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
  -- Examples of extracting specific event parameters:
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'building_name') AS building_param,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') AS screen_param,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status') AS task_status
FROM 
  -- Replace with your actual project and dataset ID.
  -- Using * lets you query across all days. Append _intraday_ if looking for today's tests.
  `your-project-id.analytics_123456789.events_*` 
WHERE
  event_name LIKE 'pilot_%'
ORDER BY 
  event_timestamp ASC;
```

## How to extract Rage Clicks specifically

```sql
SELECT
  TIMESTAMP_MICROS(event_timestamp) AS event_time,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'tap_count') AS taps
FROM 
  `your-project-id.analytics_123456789.events_*`
WHERE
  event_name = 'pilot_rage_click'
ORDER BY 
  event_timestamp ASC;
```

## How to calculate Time on Task automatically

You can use BigQuery window functions to find the time difference between `pilot_task_start` and `pilot_task_end` for each participant and task.

```sql
WITH task_events AS (
  SELECT 
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') AS participant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'task_id') AS task_id,
    event_name,
    TIMESTAMP_MICROS(event_timestamp) AS event_time,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'status') AS completion_status
  FROM `your-project-id.analytics_123456789.events_*`
  WHERE event_name IN ('pilot_task_start', 'pilot_task_end')
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') IS NOT NULL
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'participant_id') != 'none'
)
SELECT 
  participant_id,
  task_id,
  MIN(IF(event_name = 'pilot_task_start', event_time, NULL)) AS start_time,
  MAX(IF(event_name = 'pilot_task_end', event_time, NULL)) AS end_time,
  MAX(completion_status) AS status,
  TIMESTAMP_DIFF(
    MAX(IF(event_name = 'pilot_task_end', event_time, NULL)),
    MIN(IF(event_name = 'pilot_task_start', event_time, NULL)),
    SECOND
  ) AS time_on_task_seconds
FROM task_events
GROUP BY participant_id, task_id
ORDER BY participant_id, task_id;
```