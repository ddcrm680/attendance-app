<?php

return [
    'login_rate_limit' => (int) env('LOGIN_RATE_LIMIT', 5),

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => 'employees',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'employees',
        ],
    ],

    'providers' => [
        'employees' => [
            'driver' => 'eloquent',
            'model' => App\Models\Employee::class,
        ],
    ],

    'passwords' => [
        'employees' => [
            'provider' => 'employees',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),
];
