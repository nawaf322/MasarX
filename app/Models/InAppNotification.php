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

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class InAppNotification extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'organization_id',
        'user_id',
        'type',
        'title',
        'body',
        'icon',
        'url',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * Scope: notifications visible to a user.
     * When $broadcastsVisible = true  → own + org-wide broadcasts (staff/admin)
     * When $broadcastsVisible = false → only notifications explicitly addressed to the user (customers)
     */
    public function scopeForUser($query, int $userId, int $orgId, bool $broadcastsVisible = true)
    {
        $query->where('organization_id', $orgId);

        if ($broadcastsVisible) {
            $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')->orWhere('user_id', $userId);
            });
        } else {
            $query->where('user_id', $userId);
        }

        return $query;
    }
}
