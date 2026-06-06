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

namespace App\Http\Controllers\Rates;

use App\Http\Controllers\Controller;
use App\Models\RateRule;
use App\Models\RateCard;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RateRuleController extends Controller
{
    // Typically fetched via Card detail page, but here's a direct index if needed,
// or store/update methods called from the Card's rule manager.

    public function store(Request $request, RateCard $card)
    {
        // Add rule to a specific card
        $validated = $request->validate([
            'rate_zone_id' => 'required|exists:rate_zones,id',
            'service_type' => 'required|string',
            'min_weight' => 'required|numeric|min:0',
            'max_weight' => 'required|numeric|gt:min_weight',
            'price_per_lb' => 'nullable|numeric|min:0',
            'flat_price' => 'nullable|numeric|min:0',
            'min_charge' => 'nullable|numeric|min:0',
            // ... other fields as needed
        ]);

        $card->rules()->create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id
        ]));

        return redirect()->back()->with('success', 'Rule added successfully.');
    }

    public function update(Request $request, RateRule $rule)
    {
        $validated = $request->validate([
            'min_weight' => 'required|numeric|min:0',
            'max_weight' => 'required|numeric|gt:min_weight',
            'price_per_lb' => 'nullable|numeric|min:0',
            'flat_price' => 'nullable|numeric|min:0',
            'min_charge' => 'nullable|numeric|min:0',
            'active' => 'boolean'
        ]);

        $rule->update($validated);

        return redirect()->back()->with('success', 'Rule updated successfully.');
    }

    public function destroy(RateRule $rule)
    {
        $rule->delete();
        return redirect()->back()->with('success', 'Rule deleted successfully.');
    }
}
