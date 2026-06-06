<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('key', 255);
            $table->string('method', 10);
            $table->string('path', 500);
            $table->unsignedSmallInteger('response_status');
            $table->longText('response_body');
            $table->timestamp('created_at')->useCurrent();

            // Un mismo key solo puede usarse una vez por organización
            $table->unique(['organization_id', 'key'], 'idempotency_org_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
