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
use Inertia\Inertia;
use App\Models\NotificationRule;
use App\Models\NotificationTemplate;
use Illuminate\Support\Facades\Auth;

class NotificationsController extends Controller
{
    public function index()
    {
        $orgId = Auth::user()->organization_id;

        // Ensure default rules exist for the UI to show
        $defaultEvents = ['shipment_created', 'out_for_delivery', 'delivered', 'exception'];
        $rules = NotificationRule::where('organization_id', $orgId)->get()->keyBy('event_key');

        // Fetch templates
        $templates = NotificationTemplate::where('organization_id', $orgId)->get();

        // Read real channel availability from DB, not hardcoded mocks.
        $channels = \App\Models\NotificationChannel::where('organization_id', $orgId)->get()->keyBy('channel_type');
        $smtpCfg   = $channels->get('smtp')?->config ?? [];
        $twilioCfg = $channels->get('twilio')?->config ?? [];

        $channelsConfig = [
            'email'     => !empty($smtpCfg['host']) && !empty($smtpCfg['username']),
            'whatsapp'  => !empty($twilioCfg['sid']) && !empty($twilioCfg['token']) && !empty($twilioCfg['whatsapp_from']),
            'sms'       => !empty($twilioCfg['sid']) && !empty($twilioCfg['token']) && !empty($twilioCfg['sms_from']),
        ];

        return Inertia::render('Settings/Notifications', [
            'rules' => $rules,
            'templates' => $templates,
            'default_events' => $defaultEvents,
            'channels_config' => $channelsConfig,
        ]);
    }

    public function updateRule(Request $request)
    {
        $request->validate([
            'event_key' => 'required|string',
            'channels' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        NotificationRule::updateOrCreate(
            [
                'organization_id' => Auth::user()->organization_id,
                'event_key' => $request->event_key
            ],
            [
                'channels' => $request->channels ?? [],
                'is_active' => $request->is_active
            ]
        );

        return back()->with('success', 'Rule updated.');
    }

    public function updateTemplate(Request $request)
    {
        $request->validate([
            'channel' => 'required|string',
            'event_key' => 'required|string',
            'content' => 'required|string',
            'subject' => 'nullable|string'
        ]);

        NotificationTemplate::updateOrCreate(
            [
                'organization_id' => Auth::user()->organization_id,
                'channel' => $request->channel,
                'event_key' => $request->event_key
            ],
            [
                'content' => $request->content,
                'subject' => $request->subject,
                'is_active' => true
            ]
        );

        return back()->with('success', 'Template saved.');
    }
}
