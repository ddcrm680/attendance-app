<?php

namespace App\Jobs;

use App\Models\WhatsAppMessageLog;
use App\Services\WhatsApp\WhatsAppPermanentException;
use App\Services\WhatsApp\WhatsAppProvider;
use App\Services\WhatsAppNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [60, 300, 900];

    public function __construct(public int $logId) {}

    public function middleware(): array
    {
        return [new RateLimited('whatsapp')];
    }

    public function handle(WhatsAppProvider $provider, WhatsAppNotificationService $notifications): void
    {
        $log = WhatsAppMessageLog::find($this->logId);
        if (! $log || $log->status === 'sent') {
            return;
        }

        $log->update(['status' => 'processing', 'attempts' => $log->attempts + 1, 'error_message' => null]);
        try {
            $result = $provider->send($log->getRawOriginal('recipient'), $notifications->bodyFor($log), $this->photoPath($log));
            $log->update([
                'status' => 'sent',
                'provider_message_id' => $result['message_id'] ?? null,
                'sent_at' => now(),
                'error_message' => null,
            ]);
        } catch (WhatsAppPermanentException $exception) {
            $log->update(['status' => 'failed', 'failed_at' => now(), 'error_message' => $this->safeError($exception)]);
            $this->fail($exception);
        } catch (Throwable $exception) {
            $log->update(['status' => 'queued', 'error_message' => $this->safeError($exception)]);
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        WhatsAppMessageLog::whereKey($this->logId)
            ->where('status', '!=', 'sent')
            ->update([
                'status' => 'failed',
                'failed_at' => now(),
                'error_message' => $exception
                    ? $this->safeError($exception)
                    : 'Delivery failed.',
            ]);
    }

    private function safeError(Throwable $exception): string
    {
        return str($exception->getMessage())
            ->replaceMatches('/(token|bearer|secret|password)[^\s]*/i', '$1 [redacted]')
            ->limit(240)
            ->toString();
    }

    private function photoPath(WhatsAppMessageLog $log): ?string
    {
        if (
            ! config('whatsapp.attach_attendance_photo')
            || ! in_array($log->notification_type, ['punch_in', 'punch_out'], true)
        ) {
            return null;
        }
        $attendance = $log->attendance;
        return $attendance?->getRawOriginal($log->notification_type === 'punch_in' ? 'check_in_photo_path' : 'check_out_photo_path');
    }
}
