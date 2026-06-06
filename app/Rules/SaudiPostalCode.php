<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SaudiPostalCode implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!preg_match('/^[0-9]{5}$/', (string) $value)) {
            $fail('الرمز البريدي يجب أن يتكون من 5 أرقام.')->translate();
        }
    }
}
