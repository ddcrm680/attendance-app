<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditService
{
    public function record(Request $request, string $action, ?Model $resource = null, array $metadata = []): AuditLog
    {
        $actor = $request->user();
        $employeeId = $resource instanceof Employee ? $resource->id : ($resource?->getAttribute('employee_id'));
        return AuditLog::create([
            'actor_id' => $actor?->id, 'employee_id' => $employeeId, 'action' => $action,
            'resource_type' => $resource ? class_basename($resource) : 'System', 'resource_id' => $resource?->getKey(),
            'ip_address' => $request->ip(), 'user_agent' => str((string) $request->userAgent())->limit(512)->toString(),
            'metadata' => $this->sanitize($metadata),
        ]);
    }

    /** @param array<string,mixed> $metadata */
    private function sanitize(array $metadata): array
    {
        $blocked = ['password', 'token', 'secret', 'authorization', 'photo', 'latitude', 'longitude', 'accuracy', 'path'];
        $result = [];
        foreach ($metadata as $key => $value) {
            $normalized = strtolower((string) $key);
            if (in_array($normalized, $blocked, true) || collect($blocked)->contains(fn ($blockedKey) => str_contains($normalized, $blockedKey))) continue;
            if (is_array($value)) $value = $this->sanitize($value);
            if (is_scalar($value) || $value === null || is_array($value)) $result[$key] = $value;
        }
        return $result;
    }
}
