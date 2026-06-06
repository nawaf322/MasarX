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
use Illuminate\Support\Facades\Auth;
use App\Models\NumberingSequence;
use App\Services\AuditService;

class TrackingController extends Controller
{
    protected $audit;

    public function __construct(AuditService $audit)
    {
        $this->audit = $audit;
    }

    public function show()
    {
        $sequences = NumberingSequence::where('organization_id', Auth::user()->organization_id)
            ->get()
            ->keyBy('type');

        // Fetch Label Settings
        $settings = app(\App\Services\SettingsService::class);
        $settings->forOrganization(Auth::user()->organization_id);
        $labelConfig = $settings->getGroup('labels');
        
        // Obtener prefijo por defecto desde configuración o usar iniciales de la organización
        $org = Auth::user()->organization;
        $defaultPrefix = $settings->get('shipping_config', 'tracking_prefix', null);
        if (!$defaultPrefix && $org) {
            // Generar prefijo desde nombre de organización (máximo 3-5 caracteres)
            $orgName = strtoupper(preg_replace('/[^A-Z0-9]/', '', $org->name));
            $defaultPrefix = substr($orgName, 0, 5) ?: 'TRK'; // Fallback a 'TRK' si no hay nombre
        } else {
            $defaultPrefix = $defaultPrefix ?: 'TRK'; // Fallback final
        }

        return Inertia::render('Settings/Tracking', [
            'sequences' => $sequences,
            'label_config' => $labelConfig ?: [],
            'default_structure' => [
                'prefix' => $defaultPrefix,
                'padding' => 8,
                'next_number' => 1
            ],
            'company_name' => $org?->name ?? '',
            'company_logo_url' => $org?->logo_url
                ? \Illuminate\Support\Facades\Storage::url($org->logo_url)
                : null,
        ]);
    }

    public function updateSequence(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string',
            'prefix' => 'nullable|string|max:10',
            'padding' => 'required|integer|min:3|max:12',
            'next_number' => 'required|integer|min:1',
            'reset_rule' => 'nullable|string|in:never,year,month',
        ]);

        $payload = [
            'organization_id' => Auth::user()->organization_id,
            'type' => $data['type'],
            'prefix' => $data['prefix'] ?? '',
            'padding' => (int) $data['padding'],
            'next_number' => (int) $data['next_number'],
            'reset_rule' => $data['reset_rule'] ?? 'never',
        ];

        NumberingSequence::updateOrCreate(
            [
                'organization_id' => Auth::user()->organization_id,
                'type' => $data['type']
            ],
            $payload
        );

        $this->audit?->log('updated', 'tracking', "Sequence: {$data['type']}", null, $data);

        return response()->json(['success' => true, 'message' => 'Sequence updated successfully.']);
    }

    public function updateLabels(Request $request)
    {
        $data = $request->validate([
            'paper_size' => 'required|in:4x6,a4,10x15',
            'output_format' => 'required|in:pdf,zpl',
            'barcode_type' => 'required|in:code128,code39,qr',
            'theme' => 'required|in:fedex,ups,dhl,ml',
            'show_logo' => 'boolean',
            'show_phone' => 'boolean',
            'custom_css' => 'nullable|string',
        ]);

        $settings = app(\App\Services\SettingsService::class);
        $settings->forOrganization(Auth::user()->organization_id);

        foreach ($data as $key => $value) {
            $settings->set('labels', $key, $value);
        }

        $this->audit?->log('updated', 'tracking', "Updated Label Configuration", null, $data);

        return response()->json(['success' => true, 'message' => 'Label settings saved.']);
    }
}
