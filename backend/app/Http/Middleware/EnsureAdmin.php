<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Restricts a route to super_admin / hr_admin roles.
     * Registered as the "admin" route middleware alias in bootstrap/app.php.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $employee = $request->user();

        if (! $employee || ! $employee->isAdmin()) {
            return response()->json(['message' => 'You do not have permission to access this resource.'], 403);
        }

        return $next($request);
    }
}
