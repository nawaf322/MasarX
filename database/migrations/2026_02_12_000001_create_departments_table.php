<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the departments table (organization-scoped).
 * This table was present in the SQL install dump but had no corresponding
 * migration file, causing schema drift on fresh-migrate installs.
 * Added during the April 2026 production audit to close the gap.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('departments')) {
            Schema::create('departments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')
                      ->constrained('organizations')
                      ->cascadeOnDelete();
                $table->string('name', 100);
                $table->string('code', 20)->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->index('organization_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
