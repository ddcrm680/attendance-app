<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSetting;
use App\Http\Requests\StoreOfficeRequest;
use App\Http\Requests\UpdateOfficeRequest;
use App\Http\Requests\OfficeIndexRequest;
use App\Models\Office;
use App\Services\AuditService;

class OfficeController extends Controller
{
    public function __construct(private AuditService $audit) {}
    public function index(OfficeIndexRequest $request)
    {
        $query = Office::withCount('employees')
            ->when($request->filled('search'), fn ($query) => $query->where(function ($q) use ($request) {
                $search = $request->string('search')->toString();
                $q->where('name', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->orderBy('name');

        if (! $request->hasAny(['search', 'status', 'page', 'per_page'])) {
            return response()->json($query->get());
        }

        $offices = $query->paginate($request->input('per_page', 25))->withQueryString();

        return response()->json($offices);
    }

    public function show(Office $office)
    {
        $this->authorize('view', $office);

        return response()->json($office->loadCount('employees'));
    }

    public function store(StoreOfficeRequest $request)
    {
        $office = Office::create($request->validated());

        // Seed a default attendance-rules row for this office so check-in/out
        // logic always has settings to fall back to.
        AttendanceSetting::create(['office_id' => $office->id]);
        $this->audit->record($request, 'office.created', $office, ['status' => $office->status]);

        return response()->json($office->loadCount('employees'), 201);
    }

    public function update(UpdateOfficeRequest $request, Office $office)
    {
        $data = $request->validated(); $office->update($data);
        $this->audit->record($request, 'office.updated', $office, ['changed_fields' => array_keys($data), 'status' => $office->status]);

        return response()->json($office->loadCount('employees'));
    }

    public function destroy(Office $office)
    {
        $this->authorize('delete', $office);

        if ($office->employees()->exists()) {
            return response()->json(['message' => 'Cannot delete an office with employees assigned to it.'], 409);
        }

        $this->audit->record(request(), 'office.deleted', $office, ['status' => $office->status]);
        $office->delete();

        return response()->json(['message' => 'Office removed']);
    }
}
