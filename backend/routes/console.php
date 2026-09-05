<?php

use App\Services\WhatsAppNotificationService;
use App\Services\SensitiveDataRetentionService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('whatsapp:daily-summary {date? : Date in the application timezone}', function (?string $date = null) {
    $day = $date ? Carbon::parse($date) : now();
    $log = app(WhatsAppNotificationService::class)->queueDailySummary($day);
    $this->info($log ? "Daily summary queued (log {$log->id})." : 'Daily summary is disabled or has no valid recipient.');
})->purpose('Queue the configured WhatsApp daily attendance summary');

Schedule::command('whatsapp:daily-summary')->dailyAt(config('whatsapp.daily_report_time'));

Artisan::command('privacy:cleanup {--force : Run even when privacy retention is disabled}', function (SensitiveDataRetentionService $retention) {
    if (! config('privacy.retention_enabled') && ! $this->option('force')) {
        $this->warn('Privacy retention is disabled; no sensitive records were deleted.');
        return self::SUCCESS;
    }
    $result = $retention->cleanup();
    $this->info("Cleanup completed: {$result['photos']} photos and {$result['location_logs']} location logs removed.");
    return self::SUCCESS;
})->purpose('Safely remove expired attendance photos and closed-session location logs');

Schedule::command('privacy:cleanup')->dailyAt(config('privacy.cleanup_time'));
