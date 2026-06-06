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
use Illuminate\Validation\Rules\Password;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route binds {customer} as a User model.
        // Org check is handled by the controller after scoped findOrFail.
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim($this->email ?? '')),
            'phone' => trim($this->phone ?? ''),
        ]);
    }

    public function rules(): array
    {
        $orgId      = $this->user()->organization_id;
        $customerId = $this->route('customer')?->id ?? $this->route('id');

        return [
            'name'          => 'required|string|max:255',
            'email'         => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')
                    ->where('organization_id', $orgId)
                    ->ignore($customerId),
            ],
            'phone'         => [
                'required', 'string', 'max:30',
                Rule::unique('users', 'phone')
                    ->where('organization_id', $orgId)
                    ->ignore($customerId),
            ],
            'gender'        => 'nullable|string|in:male,female,other,prefer_not_to_say',
            'document_type' => 'nullable|string|in:CC,NIF,RUC,PASSPORT,CE,OTHER',
            'document_id'   => 'nullable|string|max:50',
            'date_of_birth' => 'nullable|date',
            'address'       => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city'          => 'nullable|string|max:100',
            'country'       => 'nullable|string|max:100',
            'zip_code'      => 'nullable|string|max:20',
            'country_id'            => 'required|integer|exists:countries,id',
            'state_id'              => 'required|integer|exists:states,id',
            'city_id'               => 'required|integer|exists:cities,id',
            'password'              => ['nullable', 'string', Password::min(8), 'confirmed'],
            'password_confirmation' => 'nullable|string',
        ];
    }
}
