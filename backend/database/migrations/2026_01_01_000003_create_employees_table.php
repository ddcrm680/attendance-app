<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("employees", function (Blueprint $table) {
            $table->id();
            $table->string("employee_code")->unique();
            $table->string("name");
            $table->string("email")->unique();
            $table->string("mobile")->unique();
            $table->string("password");
            $table->enum("role", ["super_admin", "hr_admin", "employee"])->default("employee");
            $table->foreignId("department_id")->nullable()->constrained("departments")->nullOnDelete();
            $table->string("designation")->nullable();
            $table->foreignId("office_id")->nullable()->constrained("offices")->nullOnDelete();
            $table->date("joining_date")->nullable();
            $table->enum("status", ["active", "inactive", "suspended"])->default("active");
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("employees");
    }
};
