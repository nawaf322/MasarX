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

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateManifestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth handled by route middleware.
    }

    public function rules(): array
    {
        $orgId = $this->user()->organization_id;

        return [
            'driver_id' => [
                'required',
                Rule::exists('users', 'id')->where('organization_id', $orgId),
            ],
            'shipment_ids' => 'required|array|min:1',
            'shipment_ids.*' => [
                'required', 'integer',
                Rule::exists('shipments', 'id')
                    ->where('organization_id', $orgId)
                    ->where('status', 'processed')
                    ->whereNull('manifest_id'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'driver_id.exists'       => 'The selected driver does not belong to your organization.',
            'shipment_ids.*.exists'  => 'One or more shipments do not belong to your organization.',
        ];
    }
}
