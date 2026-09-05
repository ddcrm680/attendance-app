<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\LocationLog;
use Illuminate\Support\Facades\Storage;

class SensitiveDataRetentionService
{
    /** @return array{photos:int,location_logs:int} */
    public function cleanup(): array
    {
        $photos = $this->cleanupPhotos();
        $logs = $this->cleanupLocationLogs();
        return ['photos' => $photos, 'location_logs' => $logs];
    }

    private function cleanupPhotos(): int
    {
        $cutoff = now()->subDays(config('privacy.photo_retention_days'));
        $records = Attendance::query()
            ->whereNotNull('check_out')
            ->where('check_out', '<', $cutoff)
            ->where(fn ($query) => $query->whereNotNull('check_in_photo_path')->orWhereNotNull('check_out_photo_path'))
            ->orderBy('id')->limit(config('privacy.cleanup_batch_size'))->get();
        $deleted = 0; $disk = Storage::disk(config('attendance.photo_disk'));

        foreach ($records as $attendance) {
            foreach (['check_in_photo_path', 'check_out_photo_path'] as $column) {
                $path = $attendance->getRawOriginal($column);
                if ($path) { $disk->delete($path); $attendance->setAttribute($column, null); $deleted++; }
            }
            $attendance->save();
        }
        return $deleted;
    }

    private function cleanupLocationLogs(): int
    {
        $cutoff = now()->subDays(config('privacy.location_log_retention_days'));
        $ids = LocationLog::query()->where('recorded_at', '<', $cutoff)
            ->whereHas('attendance', fn ($query) => $query->whereNotNull('check_out'))
            ->orderBy('id')->limit(config('privacy.cleanup_batch_size'))->pluck('id');
        return $ids->isEmpty() ? 0 : LocationLog::whereIn('id', $ids)->delete();
    }
}
