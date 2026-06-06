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

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\InAppNotificationService;

class InAppNotificationsController extends Controller
{
    public function __construct(protected InAppNotificationService $svc) {}

    /** GET /notifications/inapp — list latest 30 + unread count */
    public function index()
    {
        $user             = Auth::user();
        $showBroadcasts   = ! $user->hasRole('customer');
        $items = $this->svc->list($user->id, $user->organization_id, $showBroadcasts);

        return response()->json([
            'notifications' => $items->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->title,
                'body'       => $n->body,
                'icon'       => $n->icon,
                'url'        => $n->url,
                'read'       => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ]),
            'unread' => $items->whereNull('read_at')->count(),
        ]);
    }

    /** GET /notifications/inapp/count */
    public function count()
    {
        $user           = Auth::user();
        $showBroadcasts = ! $user->hasRole('customer');
        return response()->json([
            'unread' => $this->svc->unreadCount($user->id, $user->organization_id, $showBroadcasts),
        ]);
    }

    /** POST /notifications/inapp/{id}/read */
    public function markRead(int $id)
    {
        $user           = Auth::user();
        $showBroadcasts = ! $user->hasRole('customer');
        $this->svc->markRead($id, $user->id, $user->organization_id, $showBroadcasts);
        return response()->json(['ok' => true]);
    }

    /** POST /notifications/inapp/read-all */
    public function markAllRead()
    {
        $user           = Auth::user();
        $showBroadcasts = ! $user->hasRole('customer');
        $count = $this->svc->markAllRead($user->id, $user->organization_id, $showBroadcasts);
        return response()->json(['marked' => $count]);
    }
}
