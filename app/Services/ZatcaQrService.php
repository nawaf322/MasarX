<?php

namespace App\Services;

class ZatcaQrService
{
    /**
     * Generate a ZATCA Phase-1 compliant Base64 TLV QR payload.
     *
     * @param string $sellerName     Seller / company legal name
     * @param string $vatNumber      15-digit VAT registration number
     * @param string $timestamp      ISO-8601 timestamp (e.g. 2026-06-06T12:00:00Z)
     * @param string $totalWithVat   Invoice grand total including VAT
     * @param string $vatAmount      Total VAT amount
     */
    public function generate(
        string $sellerName,
        string $vatNumber,
        string $timestamp,
        string $totalWithVat,
        string $vatAmount
    ): string {
        $tlv  = $this->tlv(1, $sellerName);
        $tlv .= $this->tlv(2, $vatNumber);
        $tlv .= $this->tlv(3, $timestamp);
        $tlv .= $this->tlv(4, $totalWithVat);
        $tlv .= $this->tlv(5, $vatAmount);

        return base64_encode($tlv);
    }

    /**
     * Build a single Tag-Length-Value triplet.
     */
    private function tlv(int $tag, string $value): string
    {
        return chr($tag) . chr(strlen($value)) . $value;
    }
}
