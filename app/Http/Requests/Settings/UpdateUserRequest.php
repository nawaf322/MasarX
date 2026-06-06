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
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'branch_id' => $this->filled('branch_id') ? $this->branch_id : null,
            'department_id' => $this->filled('department_id') ? $this->department_id : null,
            'document_id' => $this->filled('document_id') ? trim((string) $this->document_id) : null,
        ]);
    }

    public function rules(): array
    {
        $orgId = $this->user()->organization_id;
        $userId = $this->route('user')?->id;

        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'role' => 'required|string|exists:roles,name',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'department_id' => 'nullable|integer|exists:departments,id',
            'document_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::when($this->filled('document_id'), [
                    Rule::unique('users', 'document_id')
                        ->where('organization_id', $orgId)
                        ->ignore($userId),
                ]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => __('validation.custom.email.unique'),
            'document_id.unique' => __('validation.custom.document_id.unique'),
        ];
    }

    public function attributes(): array
    {
        return [
            'email' => __('validation.attributes.email'),
            'document_id' => __('validation.attributes.document_id'),
        ];
    }
}
