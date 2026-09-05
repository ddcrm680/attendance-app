<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $identifier = $request->input('identifier');
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'mobile';

        $employee = Employee::where($field, $identifier)->first();

        if (! $employee || ! Hash::check($request->input('password'), $employee->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($employee->status !== 'active') {
            return response()->json(['message' => 'Your account is not active. Contact HR.'], 403);
        }

        $ability = $employee->isSuperAdmin()
            ? 'super-admin'
            : ($employee->isHrAdmin() ? 'admin' : 'employee');
        $token = $employee->createToken('attendance-app', [$ability])->plainTextToken;

        return response()->json([
            'token' => $token,
            'employee' => $employee->load(['department', 'office']),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load(['department', 'office']));
    }
}
