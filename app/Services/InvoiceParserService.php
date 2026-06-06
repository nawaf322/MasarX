<?php

namespace App\Services;

use App\Models\PreAlert;
use App\Models\PreAlertAttachment;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Extracts structured invoice data from uploaded purchase invoices (PDF or image).
 *
 * Strategy (no external libraries required):
 *  1. For PDFs  → extract raw text from PDF streams (FlateDecode + raw BT/ET blocks)
 *  2. For images → extract text via pdftotext/tesseract if available, else skip
 *  3. Apply store-specific + generic regex patterns to the extracted text
 *  4. Return structured array stored in pre_alerts.invoice_data
 */
class InvoiceParserService
{
    /** Parse the purchase invoice attachment attached to a PreAlert. */
    public function parseForPreAlert(PreAlert $preAlert): array
    {
        $attachment = $preAlert->attachments()
            ->where('type', 'purchase_invoice')
            ->latest()
            ->first();

        if (!$attachment) {
            return $this->failure('No purchase invoice attachment found.');
        }

        return $this->parseAttachment($attachment);
    }

    /** Parse a single attachment file. */
    public function parseAttachment(PreAlertAttachment $attachment): array
    {
        $disk = Storage::disk('public');
        if (!$disk->exists($attachment->path)) {
            return $this->failure('File not found in storage.');
        }

        $fullPath = $disk->path($attachment->path);
        $mime     = $attachment->mime_type ?? mime_content_type($fullPath);

        try {
            if (str_contains($mime, 'pdf')) {
                $text = $this->extractTextFromPdf($fullPath);
            } elseif (str_starts_with($mime, 'image/')) {
                $text = $this->extractTextFromImage($fullPath);
            } else {
                return $this->failure("Unsupported file type: {$mime}");
            }

            if (empty(trim($text))) {
                return $this->failure('Could not extract text from file. File may be scanned or protected.');
            }

            $fields = $this->matchInvoiceFields($text);
            $fields['parsed_at']       = now()->toIso8601String();
            $fields['source']          = str_contains($mime, 'pdf') ? 'pdf_text' : 'image_ocr';
            $fields['raw_text_length'] = strlen($text);

            return $fields;

        } catch (\Throwable $e) {
            Log::warning('InvoiceParserService: ' . $e->getMessage());
            return $this->failure('Parse error: ' . $e->getMessage());
        }
    }

    // ── PDF TEXT EXTRACTION ──────────────────────────────────────────────────

    private function extractTextFromPdf(string $path): string
    {
        // Try shell pdftotext first (poppler-utils)
        $pdftotext = trim(shell_exec('which pdftotext 2>/dev/null') ?? '');
        if ($pdftotext) {
            $escaped = escapeshellarg($path);
            $out = shell_exec("{$pdftotext} -enc UTF-8 -nopgbrk {$escaped} - 2>/dev/null");
            if (!empty($out)) {
                return (string) $out;
            }
        }

        // Pure PHP fallback: read PDF binary and extract text from streams
        return $this->extractTextFromPdfBinary($path);
    }

    private function extractTextFromPdfBinary(string $path): string
    {
        $content = file_get_contents($path);
        if ($content === false) {
            return '';
        }

        $text = '';

        // Find all stream...endstream blocks
        if (preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $content, $streams)) {
            foreach ($streams[1] as $stream) {
                // Try zlib decompression (FlateDecode)
                $decompressed = @gzuncompress($stream);
                if ($decompressed !== false) {
                    $text .= $this->extractTextFromPdfStreamContent($decompressed) . "\n";
                } else {
                    // Try gzinflate (raw deflate without header)
                    $inflated = @gzinflate(substr($stream, 2));
                    if ($inflated !== false) {
                        $text .= $this->extractTextFromPdfStreamContent($inflated) . "\n";
                    } else {
                        // Non-compressed stream — extract text directly
                        $text .= $this->extractTextFromPdfStreamContent($stream) . "\n";
                    }
                }
            }
        }

        // Also extract from parenthesised literal strings in uncompressed sections
        if (preg_match_all('/\(([^)\\\\]|\\\\.)*\)/', $content, $literals)) {
            foreach ($literals[1] as $lit) {
                $decoded = stripcslashes($lit);
                if (preg_match('/^[\x20-\x7E\s]{3,}$/', $decoded)) {
                    $text .= $decoded . ' ';
                }
            }
        }

        return $text;
    }

    private function extractTextFromPdfStreamContent(string $stream): string
    {
        $text = '';

        // Extract text between BT ... ET markers (text blocks)
        if (preg_match_all('/BT\s(.*?)\sET/s', $stream, $blocks)) {
            foreach ($blocks[1] as $block) {
                // Tj — show string: (text) Tj
                if (preg_match_all('/\(([^)]*)\)\s*Tj/', $block, $tjs)) {
                    foreach ($tjs[1] as $t) {
                        $text .= $this->decodePdfString($t) . ' ';
                    }
                }
                // TJ — show string array: [(text1)(text2)] TJ
                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $block, $tjs)) {
                    foreach ($tjs[1] as $arr) {
                        if (preg_match_all('/\(([^)]*)\)/', $arr, $parts)) {
                            foreach ($parts[1] as $p) {
                                $text .= $this->decodePdfString($p);
                            }
                        }
                    }
                    $text .= ' ';
                }
                // ' and " operators (move to next line and show string)
                if (preg_match_all('/\(([^)]*)\)\s*[\'"]/', $block, $quotes)) {
                    foreach ($quotes[1] as $q) {
                        $text .= $this->decodePdfString($q) . "\n";
                    }
                }
            }
        }

        // Fallback: extract all parenthesised strings from the stream
        if (empty(trim($text))) {
            if (preg_match_all('/\(([^)\\\\]|\\\\.){2,}\)/', $stream, $literals)) {
                foreach ($literals[0] as $lit) {
                    $inner = substr($lit, 1, -1);
                    $decoded = $this->decodePdfString($inner);
                    if (preg_match('/[\w\s\$\.]{3,}/', $decoded)) {
                        $text .= $decoded . ' ';
                    }
                }
            }
        }

        return $text;
    }

    private function decodePdfString(string $s): string
    {
        // Handle octal escape sequences \nnn
        $s = preg_replace_callback('/\\\\([0-7]{1,3})/', function ($m) {
            return chr(octdec($m[1]));
        }, $s);
        // Handle common escape sequences
        $s = str_replace(['\\n', '\\r', '\\t', '\\\\', '\\(', '\\)'], ["\n", "\r", "\t", '\\', '(', ')'], $s);
        return $s;
    }

    // ── IMAGE TEXT EXTRACTION ────────────────────────────────────────────────

    private function extractTextFromImage(string $path): string
    {
        $tesseract = trim(shell_exec('which tesseract 2>/dev/null') ?? '');
        if (!$tesseract) {
            return ''; // No OCR available
        }

        $escaped    = escapeshellarg($path);
        $tmpOut     = sys_get_temp_dir() . '/masarx_ocr_' . uniqid();
        $escapedOut = escapeshellarg($tmpOut);
        shell_exec("{$tesseract} {$escaped} {$escapedOut} -l eng 2>/dev/null");
        $result = @file_get_contents($tmpOut . '.txt');
        @unlink($tmpOut . '.txt');
        return $result ?: '';
    }

    // ── PATTERN MATCHING ─────────────────────────────────────────────────────

    /**
     * Apply regex patterns to extracted text and return structured fields.
     */
    public function matchInvoiceFields(string $text): array
    {
        $text  = $this->normalizeText($text);
        $store = $this->detectStore($text);

        $fields = [
            'store_detected' => $store,
            'order_number'   => $this->extractOrderNumber($text, $store),
            'order_date'     => $this->extractDate($text),
            'currency'       => $this->detectCurrency($text),
            'subtotal'       => $this->extractAmount($text, ['subtotal', 'sub total', 'sub-total', 'merchandise total']),
            'shipping'       => $this->extractAmount($text, ['shipping', 'delivery', 'postage', 'freight', 'envio', 'envío']),
            'tax'            => $this->extractAmount($text, ['tax', 'vat', 'gst', 'iva', 'impuesto']),
            'discount'       => $this->extractAmount($text, ['discount', 'coupon', 'promo', 'descuento']),
            'total'          => $this->extractTotal($text),
            'items'          => $this->extractItems($text, $store),
            'seller_name'    => $this->extractSellerName($text, $store),
        ];

        // Remove null values
        return array_filter($fields, fn($v) => $v !== null && $v !== '' && $v !== []);
    }

    private function normalizeText(string $text): string
    {
        // Normalize whitespace but keep line structure
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\r\n|\r/', "\n", $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        return $text;
    }

    private function detectStore(string $text): string
    {
        $stores = [
            'Amazon'      => '/amazon\.com|amazon order|order #\s*\d{3}-\d{7}/i',
            'eBay'        => '/ebay\.com|ebay purchase|ebay order/i',
            'Shein'       => '/shein\.com|shein order/i',
            'AliExpress'  => '/aliexpress\.com|aliexpress order/i',
            'Walmart'     => '/walmart\.com|walmart order/i',
            'Target'      => '/target\.com|target order/i',
            'BestBuy'     => '/bestbuy\.com|best buy order/i',
            'Costco'      => '/costco\.com|costco order/i',
            'Etsy'        => '/etsy\.com|etsy order/i',
            'Wish'        => '/wish\.com|wish order/i',
            'Temu'        => '/temu\.com|temu order/i',
            'Zara'        => '/zara\.com|zara order/i',
            'H&M'         => '/hm\.com|h&m order/i',
            'ASOS'        => '/asos\.com|asos order/i',
            'Sephora'     => '/sephora\.com|sephora order/i',
            'Nike'        => '/nike\.com|nike order/i',
            'Adidas'      => '/adidas\.com|adidas order/i',
            'Apple'       => '/apple\.com|apple store order/i',
        ];

        foreach ($stores as $name => $pattern) {
            if (preg_match($pattern, $text)) {
                return $name;
            }
        }

        return 'Unknown';
    }

    private function extractOrderNumber(string $text, string $store): ?string
    {
        $patterns = [
            // Amazon: 123-4567890-1234567
            '/order\s*[#:№]?\s*(\d{3}-\d{7}-\d{7})/i',
            // Generic order number
            '/order\s*(?:id|#|number|no\.?|num)\s*[:\s]*([A-Z0-9\-]{5,30})/i',
            '/(?:confirmation|reference)\s*(?:number|#)\s*[:\s]*([A-Z0-9\-]{5,30})/i',
            // Numeric-only
            '/(?:^|\s)#([0-9]{6,18})(?:\s|$)/m',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                return trim($m[1]);
            }
        }
        return null;
    }

    private function extractDate(string $text): ?string
    {
        $patterns = [
            // Month DD, YYYY
            '/(?:order\s*date|date\s*ordered|placed\s*on|fecha)[:\s]*([A-Za-z]+ \d{1,2},?\s*\d{4})/i',
            // YYYY-MM-DD
            '/(?:order\s*date|date)[:\s]*(\d{4}-\d{2}-\d{2})/i',
            // MM/DD/YYYY or DD/MM/YYYY
            '/(?:order\s*date|date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                $raw = trim($m[1]);
                $ts  = strtotime($raw);
                if ($ts !== false) {
                    return date('Y-m-d', $ts);
                }
                return $raw;
            }
        }
        return null;
    }

    private function detectCurrency(string $text): string
    {
        $map = [
            'USD' => '/\$|USD|US Dollar/i',
            'EUR' => '/€|EUR|Euro/i',
            'GBP' => '/£|GBP|Pound/i',
            'CAD' => '/CAD|C\$/i',
            'MXN' => '/MXN|MX\$|Peso\s*Mexicano/i',
            'BRL' => '/BRL|R\$/i',
            'COP' => '/COP|Peso\s*Colombiano/i',
        ];

        $counts = [];
        foreach ($map as $code => $pattern) {
            preg_match_all($pattern, $text, $m);
            $counts[$code] = count($m[0]);
        }
        arsort($counts);
        $winner = array_key_first($counts);
        return ($counts[$winner] > 0) ? $winner : 'USD';
    }

    private function extractAmount(string $text, array $labels): ?float
    {
        $labelPattern = implode('|', array_map('preg_quote', $labels));
        $pattern = '/(?:' . $labelPattern . ')\s*[:\|]?\s*[\$€£]?\s*([\d,]+\.?\d*)/i';

        if (preg_match($pattern, $text, $m)) {
            return (float) str_replace(',', '', $m[1]);
        }

        // Labeled amount with currency after
        $pattern2 = '/(?:' . $labelPattern . ')\s*[:\|]?\s*([\d,]+\.?\d*)\s*(?:USD|EUR|GBP|CAD|MXN)?/i';
        if (preg_match($pattern2, $text, $m)) {
            return (float) str_replace(',', '', $m[1]);
        }

        return null;
    }

    private function extractTotal(string $text): ?float
    {
        // Try "Order Total", "Grand Total", "Total Due" first (most specific)
        $highPriority = [
            '/(?:order\s*total|grand\s*total|total\s*(?:due|amount|charged|payment))\s*[:\|]?\s*[\$€£]?\s*([\d,]+\.?\d*)/i',
            '/(?:total)\s*[:\|]?\s*[\$€£]?\s*([\d,]+\.?\d*)(?=\s*(?:USD|EUR|GBP|CAD|MXN|\n))/i',
        ];

        foreach ($highPriority as $p) {
            if (preg_match($p, $text, $m)) {
                return (float) str_replace(',', '', $m[1]);
            }
        }

        // Generic total fallback
        return $this->extractAmount($text, ['total', 'total amount', 'total a pagar', 'importe total']);
    }

    private function extractItems(string $text, string $store): array
    {
        $items = [];

        // Generic: look for lines with a quantity and price like:
        // "2x Blue Wireless Mouse $29.99"
        // "Wireless Mouse (x2) 29.99"
        $linePattern = '/(\d+)\s*[xX×*]\s*(.{5,80}?)\s+[\$€£]?\s*([\d,]+\.\d{2})/m';
        if (preg_match_all($linePattern, $text, $m, PREG_SET_ORDER)) {
            foreach (array_slice($m, 0, 10) as $match) {
                $items[] = [
                    'qty'         => (int) $match[1],
                    'description' => trim($match[2]),
                    'unit_price'  => null,
                    'total'       => (float) str_replace(',', '', $match[3]),
                ];
            }
        }

        // If nothing found, try price-tagged lines
        if (empty($items)) {
            $priceLinePattern = '/^(.{8,60}?)\s+[\$€£]?\s*([\d,]+\.\d{2})$/m';
            if (preg_match_all($priceLinePattern, $text, $m, PREG_SET_ORDER)) {
                // Filter out obvious totals/headers
                $skipWords = ['subtotal', 'shipping', 'tax', 'total', 'discount', 'coupon', 'order', 'date', 'payment'];
                foreach (array_slice($m, 0, 8) as $match) {
                    $desc = strtolower(trim($match[1]));
                    $skip = false;
                    foreach ($skipWords as $word) {
                        if (str_contains($desc, $word)) { $skip = true; break; }
                    }
                    if (!$skip) {
                        $items[] = [
                            'qty'         => 1,
                            'description' => trim($match[1]),
                            'unit_price'  => (float) str_replace(',', '', $match[2]),
                            'total'       => (float) str_replace(',', '', $match[2]),
                        ];
                    }
                }
            }
        }

        return $items;
    }

    private function extractSellerName(string $text, string $store): ?string
    {
        if ($store !== 'Unknown') {
            return $store;
        }

        // Try: "Sold by: Acme Corp"
        if (preg_match('/(?:sold\s*by|seller|vendedor|tienda|store)[:\s]+([A-Za-z0-9 &\.,\-]{3,50})/i', $text, $m)) {
            return trim($m[1]);
        }

        return null;
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private function failure(string $reason): array
    {
        return [
            'error'     => $reason,
            'parsed_at' => now()->toIso8601String(),
        ];
    }
}
