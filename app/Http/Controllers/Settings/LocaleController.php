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
use App\Services\SettingsService;
use App\Services\AuditService;
use App\Models\Currency;

class LocaleController extends Controller
{
    protected $settings;
    protected $audit;

    public function __construct(SettingsService $settings, AuditService $audit)
    {
        $this->settings = $settings;
        $this->audit = $audit;
    }

    public function show(Request $request)
    {
        // Obtener todas las monedas activas para el selector (primero la primaria)
        $activeCurrencies = Currency::where('is_active', true)
            ->orderByDesc('is_primary')
            ->orderBy('code')
            ->get()
            ->map(function ($currency) {
                return [
                    'code' => $currency->code,
                    'name' => $currency->name,
                    'symbol' => $currency->symbol,
                ];
            });

        // Obtener todas las monedas para gestión (activas e inactivas) con paginación
        // Ordenar primero por primaria, luego por código
        $query = Currency::orderByDesc('is_primary')->orderBy('code');
        
        // Búsqueda opcional
        if ($request->filled('search') && is_string($request->search)) {
            $search = trim($request->search);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('code', 'like', '%'.$search.'%')
                        ->orWhere('name', 'like', '%'.$search.'%')
                        ->orWhere('symbol', 'like', '%'.$search.'%');
                });
            }
        }

        $perPage = $request->input('per_page', 15);
        $currenciesPaginated = $query->paginate($perPage)->withQueryString();
        
        $allCurrencies = $currenciesPaginated->map(function ($currency) {
            return [
                'id' => $currency->id,
                'code' => $currency->code,
                'name' => $currency->name,
                'symbol' => $currency->symbol,
                'exchange_rate' => (float) ($currency->exchange_rate ?? 1.0),
                'is_active' => (bool) $currency->is_active,
                'is_primary' => (bool) $currency->is_primary,
            ];
        });

        $orgId = $request->user()?->organization_id;
        if ($orgId === null) {
            return redirect()->route('onboarding.index')
                ->with('warning', 'You must belong to an organization to access settings.');
        }
        $effective = app(\App\Services\Settings\SettingsResolver::class)->getEffectiveSettings($orgId);

        return Inertia::render('Settings/Locale', [
            'settings' => $this->settings->getGroup('locale'),
            'effective_units' => ['weight_unit' => $effective['weight_unit'], 'dimension_unit' => $effective['dimension_unit']],
            'timezones' => \DateTimeZone::listIdentifiers(),
            'currencies' => $activeCurrencies,
            'allCurrencies' => $allCurrencies,
            'currenciesMeta' => [
                'current_page' => $currenciesPaginated->currentPage(),
                'last_page' => $currenciesPaginated->lastPage(),
                'per_page' => $currenciesPaginated->perPage(),
                'total' => $currenciesPaginated->total(),
                'from' => $currenciesPaginated->firstItem(),
                'to' => $currenciesPaginated->lastItem(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        // weight_unit and dimension_unit are managed in Shipping Configuration
        $data = $request->validate([
            'language' => 'sometimes|required|in:en,es',
            'timezone' => 'sometimes|required|string',
            'date_format' => 'sometimes|required|string',
            'time_format' => 'sometimes|required|in:12h,24h',
            'currency' => 'sometimes|required|string|size:3',
        ]);

        $oldValues = $this->settings->getGroup('locale');

        foreach ($data as $key => $value) {
            $this->settings->set('locale', $key, $value);
        }

        // Persistir preferencia de idioma en el usuario (tabla users) para que sobreviva al logout
        if (isset($data['language']) && $request->user()) {
            $request->user()->update(['language' => $data['language']]);
        }

        $this->audit?->log(
            'updated',
            'settings',
            'Locale Settings',
            $oldValues,
            $data
        );

        return response()->json(['success' => true, 'message' => 'Locale settings updated.']);
    }

    /**
     * Activar o desactivar una moneda
     */
    public function toggleCurrency(Request $request, $id)
    {
        try {
            $currency = Currency::findOrFail($id);
            
            // No permitir desactivar la moneda primaria
            if ($currency->is_primary && !$request->boolean('is_active')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede desactivar la moneda primaria.'
                ], 422);
            }

            $oldStatus = $currency->is_active;
            $currency->is_active = $request->boolean('is_active');
            $currency->save();

            // Si se desactivó la moneda y era la seleccionada, cambiar a la primaria
            $settings = app(\App\Services\SettingsService::class);
            $currentCurrency = $settings->get('locale', 'currency', 'USD');
            if (!$currency->is_active && $currency->code === $currentCurrency) {
                $primaryCurrency = Currency::where('is_primary', true)->where('is_active', true)->first();
                if ($primaryCurrency) {
                    $settings->set('locale', 'currency', $primaryCurrency->code);
                }
            }

            $this->audit?->log(
                'updated',
                'currency',
                "Currency {$currency->code}",
                ['is_active' => $oldStatus],
                ['is_active' => $currency->is_active]
            );

            return response()->json([
                'success' => true,
                'message' => $currency->is_active 
                    ? "Moneda {$currency->code} activada correctamente."
                    : "Moneda {$currency->code} desactivada correctamente.",
                'currency' => [
                    'id' => $currency->id,
                    'code' => $currency->code,
                    'name' => $currency->name,
                    'symbol' => $currency->symbol,
                    'is_active' => $currency->is_active,
                    'is_primary' => $currency->is_primary,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error al actualizar moneda: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la moneda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Establecer una moneda como primaria
     */
    public function setPrimaryCurrency(Request $request, $id)
    {
        try {
            $currency = Currency::findOrFail($id);
            
            // No permitir establecer como primaria una moneda inactiva
            if (!$currency->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede establecer una moneda inactiva como primaria.'
                ], 422);
            }

            // Desmarcar todas las monedas como primarias
            Currency::where('is_primary', true)->update(['is_primary' => false]);
            
            // Marcar la nueva moneda como primaria
            $currency->is_primary = true;
            $currency->save();

            // Actualizar la configuración de locale si no hay moneda seleccionada o si la anterior era la primaria
            $settings = app(\App\Services\SettingsService::class);
            $currentCurrency = $settings->get('locale', 'currency', 'USD');
            $oldPrimary = Currency::where('is_primary', false)->where('code', $currentCurrency)->first();
            
            // Si la moneda anteriormente primaria era la seleccionada, cambiar a la nueva primaria
            if ($oldPrimary && $oldPrimary->code === $currentCurrency) {
                $settings->set('locale', 'currency', $currency->code);
            }

            $this->audit?->log(
                'updated',
                'currency',
                "Currency {$currency->code}",
                ['is_primary' => false],
                ['is_primary' => true]
            );

            return response()->json([
                'success' => true,
                'message' => "Moneda {$currency->code} establecida como primaria correctamente.",
                'currency' => [
                    'id' => $currency->id,
                    'code' => $currency->code,
                    'name' => $currency->name,
                    'symbol' => $currency->symbol,
                    'is_primary' => $currency->is_primary,
                    'is_active' => $currency->is_active,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error al establecer moneda como primaria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al establecer la moneda como primaria: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva moneda personalizada
     */
    public function storeCurrency(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|size:3|unique:currencies,code|regex:/^[A-Z]{3}$/',
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $currency = Currency::create([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'symbol' => $validated['symbol'],
            'exchange_rate' => $validated['exchange_rate'],
            'is_active' => $validated['is_active'] ?? true,
            'is_primary' => false,
        ]);

        $this->audit?->log(
            'created',
            'currency',
            "Currency {$currency->code}",
            null,
            $currency->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => "Moneda {$currency->code} creada correctamente.",
            'currency' => [
                'id' => $currency->id,
                'code' => $currency->code,
                'name' => $currency->name,
                'symbol' => $currency->symbol,
                'exchange_rate' => $currency->exchange_rate,
                'is_active' => $currency->is_active,
                'is_primary' => $currency->is_primary,
            ]
        ]);
    }
}
