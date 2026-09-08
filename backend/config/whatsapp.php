<?php

return [
    // Keep WhatsApp disabled locally. Template approval and webhook handling are later phases.
    'enabled' => (bool) env('WHATSAPP_ENABLED', false),
    'provider' => env('WHATSAPP_PROVIDER', 'cloud'),
    'base_url' => rtrim((string) env('WHATSAPP_API_BASE_URL', 'https://graph.facebook.com'), '/'),
    'graph_api_version' => trim((string) env('WHATSAPP_GRAPH_API_VERSION', 'v25.0'), '/'),
    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
    'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
    'attendance_recipient' => env('WHATSAPP_ATTENDANCE_RECIPIENT'),
    'daily_report_recipient' => env('WHATSAPP_DAILY_REPORT_RECIPIENT'),
    'notifications' => [
        'punch_in' => (bool) env('WHATSAPP_NOTIFY_PUNCH_IN', true),
        'punch_out' => (bool) env('WHATSAPP_NOTIFY_PUNCH_OUT', true),
        'late' => (bool) env('WHATSAPP_NOTIFY_LATE', true),
    ],
    'rate_per_minute' => (int) env('WHATSAPP_RATE_PER_MINUTE', 20),
    'attach_attendance_photo' => (bool) env('WHATSAPP_ATTACH_ATTENDANCE_PHOTO', false),
    'daily_report_time' => env('WHATSAPP_DAILY_REPORT_TIME', '18:45'),
];
