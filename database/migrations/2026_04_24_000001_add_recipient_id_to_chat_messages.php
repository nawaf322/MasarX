<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->unsignedBigInteger('recipient_id')->nullable()->after('sender_id');
            $table->index(['organization_id', 'sender_id', 'recipient_id']);
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'sender_id', 'recipient_id']);
            $table->dropColumn('recipient_id');
        });
    }
};
