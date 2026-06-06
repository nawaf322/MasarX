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

namespace App\Events;

use App\Models\Shipment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PackageStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $shipment;

    /**
     * Create a new event instance.
     */
    public function __construct(Shipment $shipment)
    {
        $this->shipment = $shipment;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to a public channel for tracking, or private for authenticated dashboard
        // For public tracking page, usually it listens to 'tracking.{uuid}'
        return [
            new Channel('tracking.' . $this->shipment->tracking_number),
            new PrivateChannel('organization.' . $this->shipment->organization_id),
        ];
    }

    public function broadcastWith()
    {
        $status = $this->shipment->status;
        $statusLabel = $status instanceof \BackedEnum
            ? $status->label()
            : (string) $status;

        return [
            'tracking_number' => $this->shipment->tracking_number,
            'status' => $status instanceof \BackedEnum ? $status->value : $status,
            'status_label' => $statusLabel,
            'updated_at' => $this->shipment->updated_at,
            'history' => $this->shipment->history()->latest()->first()
        ];
    }
}
