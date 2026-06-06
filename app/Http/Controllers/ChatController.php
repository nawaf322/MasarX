<?php
// *************************************************************************
// *                                                                       *
// * DEPRIXA PLUS - The All-in-One Courier  & Logistics Platform           *
// * Copyright (c) CODDINGPRO. All Rights Reserved                         *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * Email: soporte@coddingpro.com                                         *
// * Website: https://code-market.shop                                     *
// *                                                                       *
// *************************************************************************
// *                                                                       *
// * This software is furnished under a license and may be used and copied *
// * only  in  accordance  with  the  terms  of such  license and with the *
// * inclusion of the above copyright notice.                              *
// * If you Purchased from Codecanyon, Please read the full License from   *
// * here- http://codecanyon.net/licenses/standard                         *
// *                                                                       *
// *************************************************************************

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    private const PRESENCE_TTL = 90; // seconds — 3× heartbeat interval

    // ── GET /chat/messages ─────────────────────────────────────────
    public function messages(Request $request): JsonResponse
    {
        if (!Schema::hasTable('chat_messages')) {
            return response()->json(['messages' => [], 'last_id' => null]);
        }

        $orgId       = Auth::user()->organization_id;
        $afterId     = $request->integer('after_id', 0);
        $limit       = min((int) $request->get('limit', 50), 100);
        $recipientId = $request->integer('recipient_id', 0) ?: null;
        $myId        = Auth::id();

        if ($recipientId) {
            // DM conversation: messages between me and recipient
            $baseQuery = ChatMessage::with('sender')
                ->where('organization_id', $orgId)
                ->where(function ($q) use ($myId, $recipientId) {
                    $q->where(function ($inner) use ($myId, $recipientId) {
                        $inner->where('sender_id', $myId)
                              ->where('recipient_id', $recipientId);
                    })->orWhere(function ($inner) use ($myId, $recipientId) {
                        $inner->where('sender_id', $recipientId)
                              ->where('recipient_id', $myId);
                    });
                });
        } else {
            // Team chat: messages with no recipient (broadcast)
            $baseQuery = ChatMessage::with('sender')
                ->where('organization_id', $orgId)
                ->whereNull('recipient_id');
        }

        if ($afterId > 0) {
            $rows = (clone $baseQuery)
                ->orderBy('id', 'asc')
                ->where('id', '>', $afterId)
                ->limit($limit)
                ->get();
        } else {
            // Initial load — return last N messages
            $rows = (clone $baseQuery)
                ->orderBy('id', 'desc')
                ->limit($limit)
                ->get()
                ->reverse()
                ->values();
        }

        $messages = $rows->map(fn($m) => $this->formatMessage($m));

        return response()->json([
            'messages' => $messages,
            'last_id'  => $rows->last()?->id,
        ]);
    }

    // ── POST /chat/messages ────────────────────────────────────────
    public function send(Request $request): JsonResponse
    {
        $request->validate(['message' => 'required|string|max:1000']);

        if (!Schema::hasTable('chat_messages')) {
            return response()->json(['error' => 'Chat not available'], 503);
        }

        $user        = Auth::user();
        $recipientId = $request->integer('recipient_id', 0) ?: null;

        $msg = ChatMessage::create([
            'organization_id' => $user->organization_id,
            'sender_id'       => $user->id,
            'recipient_id'    => $recipientId,
            'message'         => $request->input('message'),
            'is_read'         => false,
        ]);

        $msg->load('sender');

        return response()->json($this->formatMessage($msg), 201);
    }

    // ── POST /chat/ping ────────────────────────────────────────────
    public function ping(): JsonResponse
    {
        $user = Auth::user();
        Cache::put("chat_online_{$user->organization_id}_{$user->id}", true, self::PRESENCE_TTL);
        return response()->json(['ok' => true]);
    }

    // ── GET /chat/online ───────────────────────────────────────────
    public function online(): JsonResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        // Find all users in this org that have a live presence key
        $onlineUsers = User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->get()
            ->filter(fn($u) => Cache::has("chat_online_{$orgId}_{$u->id}"))
            ->map(fn($u) => [
                'id'     => $u->id,
                'name'   => $u->name,
                'avatar' => $u->avatar ?? null,
                'is_me'  => $u->id === $user->id,
            ])
            ->values();

        return response()->json(['users' => $onlineUsers]);
    }

    // ── POST /chat/read ────────────────────────────────────────────
    public function markRead(Request $request): JsonResponse
    {
        if (!Schema::hasTable('chat_messages')) {
            return response()->json(['ok' => true]);
        }

        $user        = Auth::user();
        $recipientId = $request->integer('recipient_id', 0) ?: null;
        $myId        = $user->id;

        if ($recipientId) {
            // Mark DMs from a specific sender as read
            ChatMessage::where('organization_id', $user->organization_id)
                ->where('sender_id', $recipientId)
                ->where('recipient_id', $myId)
                ->where('is_read', false)
                ->update(['is_read' => true]);
        } else {
            // Mark all team messages (no recipient) as read
            ChatMessage::where('organization_id', $user->organization_id)
                ->where('sender_id', '!=', $myId)
                ->whereNull('recipient_id')
                ->where('is_read', false)
                ->update(['is_read' => true]);
        }

        return response()->json(['ok' => true]);
    }

    // ── GET /chat/unread ───────────────────────────────────────────
    public function unread(Request $request): JsonResponse
    {
        if (!Schema::hasTable('chat_messages')) {
            return response()->json(['unread' => 0]);
        }

        $user        = Auth::user();
        $myId        = $user->id;
        $recipientId = $request->integer('recipient_id', 0) ?: null;

        if ($recipientId) {
            // Count unread DMs from a specific sender
            $count = ChatMessage::where('organization_id', $user->organization_id)
                ->where('sender_id', $recipientId)
                ->where('recipient_id', $myId)
                ->where('is_read', false)
                ->count();
        } else {
            // Count unread team messages (no recipient) + all DMs to me
            $count = ChatMessage::where('organization_id', $user->organization_id)
                ->where('sender_id', '!=', $myId)
                ->where('is_read', false)
                ->where(function ($q) use ($myId) {
                    $q->whereNull('recipient_id')
                      ->orWhere('recipient_id', $myId);
                })
                ->count();
        }

        return response()->json(['unread' => $count]);
    }

    // ── POST /chat/upload ──────────────────────────────────────────
    public function upload(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf']);
        $path = $request->file('file')->storeAs('chat-attachments', Str::uuid() . '.' . $request->file('file')->getClientOriginalExtension(), 'public');
        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    // ── private helper ─────────────────────────────────────────────
    private function formatMessage(ChatMessage $m): array
    {
        return [
            'id'            => $m->id,
            'message'       => $m->message,
            'sender_id'     => $m->sender_id,
            'recipient_id'  => $m->recipient_id,
            'sender_name'   => $m->sender?->name ?? 'Unknown',
            'sender_avatar' => $m->sender?->avatar ?? null,
            'is_mine'       => $m->sender_id === Auth::id(),
            'time'          => $m->created_at?->format('H:i') ?? '',
        ];
    }
}
