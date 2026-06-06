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

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\NotificationRule;
use App\Models\NotificationTemplate;
use App\Models\NotificationChannel;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;
use App\Services\AuditService;
use Illuminate\Support\Facades\Crypt;

class NotificationsController extends Controller
{
    protected $audit;

    public function __construct(AuditService $audit)
    {
        $this->audit = $audit;
    }

    public function index()
    {
        $orgId = Auth::user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }

        $rules = NotificationRule::where('organization_id', $orgId)->get()->keyBy('event_key');
        $templates = NotificationTemplate::where('organization_id', $orgId)->get();
        $channels = NotificationChannel::where('organization_id', $orgId)->get()->map(function ($c) {
            // Mask secrets — must copy array first (direct subscript on cast array causes ErrorException)
            $cfg = $c->config ?? [];
            foreach (['password', 'secret', 'token', 'api_key'] as $key) {
                if (isset($cfg[$key]) && is_string($cfg[$key])) {
                    $cfg[$key] = '********';
                }
            }
            $c->config = $cfg;
            return $c;
        });

        $this->audit?->log('viewed', 'notifications', 'Viewed notification settings', null, null);

        return Inertia::render('Settings/Notifications', [
            'rules' => $rules,
            'templates' => $templates,
            'channels' => $channels,
            'default_events' => ['shipment_created', 'out_for_delivery', 'delivered', 'exception'],
        ]);
    }

    public function updateChannel(Request $request)
    {
        $request->validate([
            'channel_type' => 'required|string',
            'name' => 'required|string',
            'config' => 'required|array',
        ]);

        $orgId = Auth::user()->organization_id;
        $config = $request->config;

        $keysToEncrypt = ['password', 'secret', 'api_key', 'token'];
        foreach ($keysToEncrypt as $key) {
            if (isset($config[$key]) && strpos($config[$key], '*') === false) {
                $config[$key] = Crypt::encryptString($config[$key]);
            } else {
                $existing = NotificationChannel::where('organization_id', $orgId)
                    ->where('channel_type', $request->channel_type)
                    ->first();
                if ($existing && isset($existing->config[$key])) {
                    $config[$key] = $existing->config[$key];
                }
            }
        }

        NotificationChannel::updateOrCreate(
            ['organization_id' => $orgId, 'channel_type' => $request->channel_type],
            ['name' => $request->name, 'config' => $config, 'status' => 'active']
        );

        $this->audit?->log('updated', 'notifications', "Channel: {$request->channel_type}", null, null);

        return response()->json(['success' => true, 'message' => 'Channel configuration saved.']);
    }

    public function testChannel(Request $request, NotificationService $service)
    {
        $request->validate(['channel_type' => 'required']);

        $channel = NotificationChannel::where('organization_id', Auth::user()->organization_id)
            ->where('channel_type', $request->channel_type)
            ->firstOrFail();

        try {
            $config = $channel->config ?? [];
            // Decrypt only if value looks encrypted (avoid decrypting masked '********' or legacy plain text)
            foreach (['password', 'token', 'secret', 'api_key'] as $key) {
                if (isset($config[$key]) && is_string($config[$key]) && strpos($config[$key], '*') === false) {
                    try {
                        $config[$key] = Crypt::decryptString($config[$key]);
                    } catch (\Exception $e) {
                        $this->audit?->log('test_connection', 'notifications', "Tested Channel: {$request->channel_type}", null, ['success' => false, 'error' => 'invalid_credential']);
                        return response()->json(['error' => 'Invalid or legacy credential for "' . $key . '". Please re-enter the value in Channels and save.'], 422);
                    }
                }
            }

            if ($request->channel_type === 'smtp') {
                $service->testSmtp($config, Auth::user()->email);
                $this->audit?->log('test_connection', 'notifications', "Tested Channel: {$request->channel_type}", null, ['success' => true]);
                return response()->json(['success' => true, 'message' => 'Test email sent to ' . Auth::user()->email]);
            }

            if ($request->channel_type === 'twilio') {
                // Verify credentials and send real test message when phone provided
                $twilio = new \Twilio\Rest\Client($config['sid'], $config['token']);
                $account = $twilio->api->v2010->accounts($config['sid'])->fetch();

                $testPhone = $request->input('test_phone') ?: Auth::user()->phone;
                $testPhone = $testPhone ? preg_replace('/\s+/', '', $testPhone) : null;

                $sent = [];
                if ($testPhone) {
                    if (!empty($config['whatsapp_from'])) {
                        try {
                            $service->sendWhatsapp($config, $testPhone, 'Test WhatsApp from MasarX. Your Twilio integration is working.');
                            $sent[] = 'WhatsApp';
                        } catch (\Exception $e) {
                            // Fallback to SMS if WhatsApp fails
                            if (!empty($config['sms_from'])) {
                                try {
                                    $service->sendSms($config, $testPhone, 'Test SMS from MasarX. Your Twilio integration is working.');
                                    $sent[] = 'SMS';
                                } catch (\Exception $e2) {
                                    throw $e;
                                }
                            } else {
                                throw $e;
                            }
                        }
                    } elseif (!empty($config['sms_from'])) {
                        $service->sendSms($config, $testPhone, 'Test SMS from MasarX. Your Twilio integration is working.');
                        $sent[] = 'SMS';
                    }
                }

                $this->audit?->log('test_connection', 'notifications', 'Tested Channel: Twilio', null, ['success' => true, 'sent' => $sent]);
                if (!empty($sent)) {
                    return response()->json(['success' => true, 'message' => 'Test message sent via ' . implode(' + ', $sent) . ' to ' . $testPhone]);
                }
                return response()->json(['success' => true, 'message' => 'Twilio verified (SID: ' . $account->friendlyName . '). Enter a phone number and click Test to send a real message.']);
            }
        } catch (\Exception $e) {
            $this->audit?->log('test_connection', 'notifications', "Tested Channel: {$request->channel_type}", null, ['success' => false, 'error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json(['error' => 'Test not implemented for this channel.'], 422);
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

        $this->audit?->log('updated', 'notifications', "Rule: {$request->event_key}", null, ['active' => $request->is_active]);

        return response()->json(['success' => true, 'message' => 'Rule updated.']);
    }

    public function updateTemplate(Request $request)
    {
        $request->validate([
            'channel' => 'required|string',
            'event_key' => 'required|string',
            'content' => 'required|string',
            'subject' => 'nullable|string',
            'language' => 'nullable|string', // Added validation for language
            'design_type' => 'nullable|string' // Explicit design type
        ]);

        $orgId = Auth::user()->organization_id;

        NotificationTemplate::updateOrCreate(
            [
                'organization_id' => $orgId,
                'channel' => $request->channel,
                'event_key' => $request->event_key,
                'language' => $request->language ?? 'en' // Default or passed
            ],
            [
                'subject' => $request->subject,
                'content' => $request->content,
                'design_type' => $request->design_type, // Explicit design persistence
                'is_active' => true
            ]
        );

        $this->audit?->log('updated', 'notifications', "Template: {$request->event_key} ({$request->channel})", null, null);

        return response()->json(['success' => true, 'message' => 'Template saved.']);
    }
}
