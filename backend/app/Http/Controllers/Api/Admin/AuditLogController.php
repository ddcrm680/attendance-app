<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'actor_id' => ['nullable', 'integer', 'exists:employees,id'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'action' => ['nullable', 'string', 'max:100'],
            'resource_type' => ['nullable', 'string', 'max:100'],
            'resource_id' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = AuditLog::query()->with(['actor:id,name,employee_code', 'employee:id,name,employee_code'])->latest('id');
        foreach (['actor_id', 'employee_id', 'action', 'resource_type', 'resource_id'] as $key) {
            if (isset($data[$key])) {
                $query->where($key, $data[$key]);
            }
        }

        if (isset($data['from'])) {
            $query->where('created_at', '>=', $data['from']);
        }
        if (isset($data['to'])) {
            $query->where('created_at', '<=', Carbon::parse($data['to'])->endOfDay());
        }
        return response()->json($query->paginate($data['per_page'] ?? 25));
    }
    public function show(AuditLog $auditLog)
    {
        return response()->json(
            $auditLog->load(['actor:id,name,employee_code', 'employee:id,name,employee_code'])
        );
    }
}
