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

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WarehouseInventoryMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'warehouse_id' => 'required|integer|exists:warehouses,id',
            'sku' => 'required_without:item_id|string|max:64',
            'item_id' => 'required_without:sku|integer|exists:inventory_items,id',
            'location_code' => 'nullable|string|max:32',
            'type' => ['required', 'string', Rule::in(['IN', 'OUT', 'ADJUST'])],
            'qty' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
            'reference_type' => 'nullable|string|max:64',
            'reference_id' => 'nullable|string|max:64',
        ];
    }
}
