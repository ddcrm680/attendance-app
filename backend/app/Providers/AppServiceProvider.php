<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use App\Services\WhatsApp\CloudApiWhatsAppProvider;
use App\Services\WhatsApp\WhatsAppProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(WhatsAppProvider::class, CloudApiWhatsAppProvider::class);
    }

    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $identifier = Str::lower(trim((string) $request->input('identifier')));

            return Limit::perMinute((int) config('auth.login_rate_limit', 5))
                ->by($identifier.'|'.$request->ip());
        });

        RateLimiter::for('whatsapp', fn () => Limit::perMinute(max(1, (int) config('whatsapp.rate_per_minute', 20))));
        RateLimiter::for('attendance', fn (Request $request) => Limit::perMinute(12)->by($request->user()?->id.'|'.$request->ip()));
        RateLimiter::for('location', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id.'|'.$request->ip()));
        RateLimiter::for('photo', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id.'|'.$request->ip()));
        RateLimiter::for('admin-api', fn (Request $request) => Limit::perMinute(180)->by($request->user()?->id.'|'.$request->ip()));
    }
}
