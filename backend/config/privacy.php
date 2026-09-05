<?php

return [
    // Cleanup is deliberately opt-in. Values are days and are only used when enabled.
    'retention_enabled' => (bool) env('PRIVACY_RETENTION_ENABLED', false),
    'photo_retention_days' => max(1, (int) env('ATTENDANCE_PHOTO_RETENTION_DAYS', 365)),
    'location_log_retention_days' => max(1, (int) env('LOCATION_LOG_RETENTION_DAYS', 180)),
    'cleanup_batch_size' => min(1000, max(1, (int) env('PRIVACY_CLEANUP_BATCH_SIZE', 250))),
    'cleanup_time' => env('PRIVACY_CLEANUP_TIME', '02:15'),
];
