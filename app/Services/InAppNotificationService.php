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

namespace App\Services;

use App\Models\InAppNotification;

class InAppNotificationService
{
    /**
     * Broadcast to ALL staff users in the organization (user_id = null).
     */
    public function broadcast(
        int $orgId,
        string $type,
        string $title,
        ?string $body = null,
        string $icon = 'bell',
        ?string $url = null,
    ): InAppNotification {
        return InAppNotification::create([
            'organization_id' => $orgId,
            'user_id'         => null,
            'type'            => $type,
            'title'           => $title,
            'body'            => $body,
            'icon'            => $icon,
            'url'             => $url,
        ]);
    }

    /**
     * Notify a specific user.
     */
    public function notify(
        int $orgId,
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        string $icon = 'bell',
        ?string $url = null,
    ): InAppNotification {
        return InAppNotification::create([
            'organization_id' => $orgId,
            'user_id'         => $userId,
            'type'            => $type,
            'title'           => $title,
            'body'            => $body,
            'icon'            => $icon,
            'url'             => $url,
        ]);
    }

    /** Unread count for a user (their own + broadcasts, unless $broadcastsVisible = false). */
    public function unreadCount(int $userId, int $orgId, bool $broadcastsVisible = true): int
    {
        return InAppNotification::forUser($userId, $orgId, $broadcastsVisible)
            ->whereNull('read_at')
            ->count();
    }

    /** Latest 30 notifications for a user. */
    public function list(int $userId, int $orgId, bool $broadcastsVisible = true): \Illuminate\Database\Eloquent\Collection
    {
        return InAppNotification::forUser($userId, $orgId, $broadcastsVisible)
            ->latest()
            ->limit(30)
            ->get();
    }

    public function markRead(int $id, int $userId, int $orgId, bool $broadcastsVisible = true): bool
    {
        return (bool) InAppNotification::forUser($userId, $orgId, $broadcastsVisible)
            ->where('id', $id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function markAllRead(int $userId, int $orgId, bool $broadcastsVisible = true): int
    {
        return InAppNotification::forUser($userId, $orgId, $broadcastsVisible)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
