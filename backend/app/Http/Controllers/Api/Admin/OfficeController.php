<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSetting;
use App\Models\Office;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OfficeController extends Controller
{
    public function index()
    {
        return response()->json(Office::withCount('employees')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius' => ['required', 'integer', 'min:10', 'max:5000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $office = Office::create($validator->validated());

        // Seed a default attendance-rules row for this office so check-in/out
        // logic always has settings to fall back to.
        AttendanceSetting::create(['office_id' => $office->id]);

        return response()->json($office, 201);
    }

    public function update(Request $request, Office $office)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'radius' => ['sometimes', 'integer', 'min:10', 'max:5000'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $office->update($validator->validated());

        return response()->json($office);
    }

    public function destroy(Office $office)
    {
        if ($office->employees()->exists()) {
            return response()->json(['message' => 'Cannot delete an office with employees assigned to it.'], 409);
        }

        $office->delete();

        return response()->json(['message' => 'Office removed']);
    }
}
