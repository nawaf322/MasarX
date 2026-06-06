<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SaudiVatNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $v = preg_replace('/\s/', '', (string) $value);

        // Saudi VAT (TRN): exactly 15 digits, starts with 3, ends with 3
        if (!preg_match('/^3[0-9]{13}3$/', $v)) {
            $fail('الرقم الضريبي غير صالح. يجب أن يتكون من 15 رقمًا ويبدأ وينتهي بالرقم 3.')->translate();
        }
    }
}
