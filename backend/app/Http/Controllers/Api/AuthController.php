<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $identifier = $request->input('identifier');
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'mobile';

        $employee = Employee::where($field, $identifier)->first();

        if (! $employee || ! Hash::check($request->input('password'), $employee->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($employee->status !== 'active') {
            return response()->json(['message' => 'Your account is not active. Contact HR.'], 403);
        }

        $token = $employee->createToken('attendance-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'employee' => $employee->load(['department', 'office']),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load(['department', 'office']));
    }
}
