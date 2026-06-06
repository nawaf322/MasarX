<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SaudiPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = preg_replace('/[\s\-()]/', '', (string) $value);

        // Accept: 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX, 9665XXXXXXXX
        $patterns = [
            '/^05[0-9]{8}$/',
            '/^5[0-9]{8}$/',
            '/^\+9665[0-9]{8}$/',
            '/^009665[0-9]{8}$/',
            '/^9665[0-9]{8}$/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $normalized)) {
                return;
            }
        }

        $fail('رقم الجوال السعودي غير صالح. مثال: 0512345678')->translate();
    }

    /**
     * Normalize a Saudi phone number to E.164 format (+9665XXXXXXXX).
     */
    public static function normalize(string $value): ?string
    {
        $n = preg_replace('/[\s\-()]/', '', $value);
        if (preg_match('/^0?5([0-9]{8})$/', $n, $m)) {
            return '+9665' . $m[1];
        }
        if (preg_match('/^(?:\+|00)?9665([0-9]{8})$/', $n, $m)) {
            return '+9665' . $m[1];
        }
        return null;
    }
}
