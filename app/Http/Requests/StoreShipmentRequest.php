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

class StoreShipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $orgId = $this->user()->organization_id;
        
        return [
            'sender_details' => 'required|array',
            'sender_details.name' => 'required|string|max:255',
            'sender_details.phone' => 'required|string|max:50',
            'sender_details.address' => 'required|string|max:255',
            'sender_details.city' => 'nullable|string|max:100',
            'sender_details.country' => 'required|string|max:100',
            'sender_details.country_code' => 'nullable|string|max:3',
            'sender_details.country_id' => 'required|exists:countries,id',
            'sender_details.state' => 'nullable|string|max:100',
            'sender_details.state_id' => 'nullable|exists:states,id',
            'sender_details.city_id' => 'nullable|exists:cities,id',

            'receiver_details' => 'required|array',
            'receiver_details.name' => 'required|string|max:255',
            'receiver_details.phone' => 'required|string|max:50',
            'receiver_details.address' => 'required|string|max:255',
            'receiver_details.city' => 'nullable|string|max:100',
            'receiver_details.country' => 'required|string|max:100',
            'receiver_details.country_code' => 'nullable|string|max:3',
            'receiver_details.country_id' => 'required|exists:countries,id',
            'receiver_details.state' => 'nullable|string|max:100',
            'receiver_details.state_id' => 'nullable|exists:states,id',
            'receiver_details.city_id' => 'nullable|exists:cities,id',
            
            'packages' => 'nullable|array|min:1',
            'packages.*.weight' => 'required|numeric|min:0.1',
            'packages.*.length' => 'required|numeric|min:1',
            'packages.*.width' => 'required|numeric|min:1',
            'packages.*.height' => 'required|numeric|min:1',
            'packages.*.declared_value' => 'required|numeric|min:0',
            'packages.*.pieces' => 'required|integer|min:1',
            'packages.*.content_description' => 'required|string|min:1',
            
            'package_details' => 'nullable|array',
            'package_details.weight' => 'nullable|numeric|min:0.1',
            'package_details.length' => 'nullable|numeric|min:1',
            'package_details.width' => 'nullable|numeric|min:1',
            'package_details.height' => 'nullable|numeric|min:1',
            
            'service_type' => 'required|string',
            'rate_data' => 'required|array',
            'rate_data.rate_rule_id' => 'nullable|exists:rate_rules,id',
            'rate_data.rate_card_id' => 'nullable|exists:rate_cards,id',
            'rate_data.total_price' => 'nullable|numeric|min:0.01',
            
            'payment_status' => 'required|string|in:unpaid,pending,paid',
            'payment_method' => 'nullable|string|in:stripe,paypal,manual',
            
            'attachment_photo' => 'nullable|file|max:5120|mimes:jpg,jpeg,png,gif,webp,pdf',
            'attachment_payment_proof' => 'nullable|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ];
    }

    public function messages(): array
    {
        return [
            'sender_details.name.required' => __('shipments.wizard.validation.name_required'),
            'sender_details.phone.required' => __('shipments.wizard.validation.phone_required'),
            'sender_details.address.required' => __('shipments.wizard.validation.address_required'),
            'sender_details.country_id.required' => __('shipments.wizard.validation.country_required'),
            'receiver_details.name.required' => __('shipments.wizard.validation.name_required'),
            'receiver_details.phone.required' => __('shipments.wizard.validation.phone_required'),
            'receiver_details.address.required' => __('shipments.wizard.validation.address_required'),
            'receiver_details.country_id.required' => __('shipments.wizard.validation.country_required'),
            'packages.*.weight.required' => __('shipments.wizard.validation.weight_required'),
            'packages.*.weight.min' => __('shipments.wizard.validation.weight_min'),
            'packages.*.content_description.required' => __('shipments.wizard.validation.content_description_required'),
            'service_type.required' => __('shipments.wizard.validation.service_required'),
            'rate_data.required' => __('shipments.wizard.validation.rate_required'),
        ];
    }
}
