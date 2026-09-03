<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("offices", function (Blueprint $table) {
            $table->id();
            $table->string("name");
            $table->string("address")->nullable();
            $table->decimal("latitude", 10, 7);
            $table->decimal("longitude", 10, 7);
            $table->unsignedInteger("radius")->default(200);
            $table->enum("status", ["active", "inactive"])->default("active");
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("offices");
    }
};
