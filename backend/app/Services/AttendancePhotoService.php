<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendancePhotoService
{
    public function store(UploadedFile $photo, Employee $employee, string $punch): string
    {
        // The validated file's server-detected MIME type determines the stored extension.
        $extension = match ($photo->getMimeType()) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
            default => throw new \InvalidArgumentException('Unsupported image type.'),
        };
        $path = sprintf('attendance/%d/%s/%s_%s.%s', $employee->id, now()->format('Y/m'), $punch, Str::uuid(), $extension);
        if (! Storage::disk(config('attendance.photo_disk'))->putFileAs(dirname($path), $photo, basename($path))) {
            throw new \RuntimeException('Unable to store the attendance selfie.');
        }
        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path) Storage::disk(config('attendance.photo_disk'))->delete($path);
    }

    public function response(Attendance $attendance, string $punch): StreamedResponse
    {
        $path = $punch === 'check_in' ? $attendance->check_in_photo_path : $attendance->check_out_photo_path;
        abort_unless($path && Storage::disk(config('attendance.photo_disk'))->exists($path), 404);
        $disk = Storage::disk(config('attendance.photo_disk'));
        return response()->stream(fn () => fpassthru($disk->readStream($path)), 200, [
            'Content-Type' => $disk->mimeType($path) ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="attendance-selfie"',
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
