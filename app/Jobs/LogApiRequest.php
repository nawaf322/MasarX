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

namespace App\Jobs;

use App\Models\ApiRequestLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\PersonalAccessToken;

class LogApiRequest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tokenId;
    protected $organizationId;
    protected $data;

    /**
     * Create a new job instance.
     */
    public function __construct(PersonalAccessToken $token, $requestData)
    {
        $this->tokenId = $token->id;
        $this->organizationId = $token->organization_id; // Added via macro/forceFill in controller
        $this->data = $requestData;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        ApiRequestLog::create([
            'token_id' => $this->tokenId,
            'organization_id' => $this->organizationId,
            'method' => $this->data['method'],
            'endpoint' => $this->data['endpoint'],
            'request_headers' => $this->data['headers'],
            'request_body' => $this->data['body'],
            'status_code' => $this->data['status_code'] ?? 0,
            'response_body' => $this->data['response_body'] ?? [],
            'ip_address' => $this->data['ip'],
            'user_agent' => $this->data['user_agent'],
            'duration_ms' => $this->data['duration'] ?? 0,
        ]);
    }
}
