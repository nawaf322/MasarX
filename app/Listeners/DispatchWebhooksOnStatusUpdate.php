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

namespace App\Listeners;

use App\Events\PackageStatusUpdated;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchWebhooksOnStatusUpdate implements ShouldQueue
{
    public function __construct(
        protected WebhookDispatcher $dispatcher
    ) {}

    public function handle(PackageStatusUpdated $event): void
    {
        $shipment = $event->shipment;
        $status = $shipment->status;
        $statusValue = $status instanceof \BackedEnum ? $status->value : (string) $status;

        $payload = [
            'event' => 'tracking.updated',
            'timestamp' => now()->toIso8601String(),
            'data' => [
                'tracking_number' => $shipment->tracking_number,
                'uuid' => $shipment->uuid,
                'status' => $statusValue,
                'shipment_id' => $shipment->id,
                'organization_id' => $shipment->organization_id,
            ],
        ];

        $this->dispatcher->dispatch('tracking.updated', $payload, $shipment->organization_id);
    }
}
