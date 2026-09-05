<?php

return [
    // Attendance media will use this non-public disk in Phase 5.
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'throw' => false,
        ],
    ],
];
