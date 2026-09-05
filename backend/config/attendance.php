<?php

return [
    'photo_disk' => env('ATTENDANCE_PHOTO_DISK', 'local'),
    'photo_max_kilobytes' => (int) env('ATTENDANCE_PHOTO_MAX_KILOBYTES', 5120),
    'max_position_age_seconds' => (int) env('ATTENDANCE_MAX_POSITION_AGE_SECONDS', 300),
];
