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

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCarrierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'carrier_code' => 'required|string|in:dhl,fedex,ups,usps',
            'credentials' => 'required|array',
            'credentials.api_key' => 'nullable|string',
            'credentials.account_number' => 'nullable|string',
            'mode' => 'required|in:test,live',
            'status' => 'required|boolean',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (!$this->boolean('status')) {
                return;
            }
            $creds = $this->input('credentials', []);
            $apiKey = trim((string) ($creds['api_key'] ?? ''));
            $accountNumber = trim((string) ($creds['account_number'] ?? ''));

            if (empty($apiKey)) {
                $validator->errors()->add('credentials.api_key', __('settings.integrations.carriers.errors.api_key_required'));
            }
            if (empty($accountNumber)) {
                $validator->errors()->add('credentials.account_number', __('settings.integrations.carriers.errors.account_number_required'));
            }
        });
    }
}
