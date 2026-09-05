<?php

return [
    'name' => env('APP_NAME', 'Attendance App'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'Asia/Kolkata',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_US',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'previous_keys' => [],
    'maintenance' => [
        'driver' => 'file',
    ],
    'providers' => [
        App\Providers\AppServiceProvider::class,
        App\Providers\AuthServiceProvider::class,
        Illuminate\Auth\AuthServiceProvider::class,
        Illuminate\Cookie\CookieServiceProvider::class,
        Illuminate\Database\DatabaseServiceProvider::class,
        Illuminate\Encryption\EncryptionServiceProvider::class,
        Illuminate\Filesystem\FilesystemServiceProvider::class,

        Illuminate\Foundation\Providers\FoundationServiceProvider::class,
        Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,

        Illuminate\Cache\CacheServiceProvider::class,
        Illuminate\Bus\BusServiceProvider::class,
        Illuminate\Hashing\HashServiceProvider::class,
        Illuminate\Translation\TranslationServiceProvider::class,
        Illuminate\Queue\QueueServiceProvider::class,

        Illuminate\Session\SessionServiceProvider::class,
        Illuminate\Validation\ValidationServiceProvider::class,
        Illuminate\View\ViewServiceProvider::class,

        Laravel\Sanctum\SanctumServiceProvider::class,
    ],
    'aliases' => [],
];
