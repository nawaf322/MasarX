<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة ضريبية {{ $shipment->tracking_number }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Tajawal', sans-serif; }
        body { background: #f3f4f6; color: #0E1626; padding: 24px; }
        .sheet { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,.08); }
        .brand-bar { height: 6px; background: linear-gradient(90deg, #FF6B4A, #E2231A); border-radius: 6px; margin-bottom: 28px; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f0f0f0; padding-bottom: 24px; margin-bottom: 24px; }
        .title-ar { font-size: 26px; font-weight: 900; color: #0E1626; }
        .title-en { font-size: 13px; color: #6A7894; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
        .inv-meta { font-size: 13px; color: #6A7894; margin-top: 10px; line-height: 1.9; }
        .inv-meta b { color: #0E1626; }
        .seller { text-align: left; }
        .seller h2 { font-size: 20px; font-weight: 900; color: #FF512F; }
        .seller p { font-size: 12.5px; color: #6A7894; line-height: 1.9; }
        .parties { display: flex; gap: 20px; margin-bottom: 28px; }
        .party { flex: 1; background: #F6F8FC; border: 1px solid #eef1f6; border-radius: 12px; padding: 16px 18px; }
        .party h3 { font-size: 12px; color: #FF6B4A; font-weight: 700; margin-bottom: 8px; }
        .party p { font-size: 13px; color: #0E1626; line-height: 1.9; }
        .party .muted { color: #6A7894; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { background: #0E1626; color: #fff; }
        th, td { padding: 12px 16px; text-align: right; font-size: 13.5px; }
        tbody tr { border-bottom: 1px solid #f0f0f0; }
        .totals { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; }
        .qr-box { text-align: center; }
        .qr-box #qrcode { display: inline-block; padding: 10px; background: #fff; border: 1px solid #eef1f6; border-radius: 12px; }
        .qr-box .cap { font-size: 11px; color: #6A7894; margin-top: 8px; }
        .sum { width: 320px; }
        .sum-row { display: flex; justify-content: space-between; padding: 9px 0; font-size: 14px; border-bottom: 1px dashed #eef1f6; }
        .sum-row.grand { border-top: 2px solid #0E1626; border-bottom: none; margin-top: 6px; padding-top: 14px; font-size: 19px; font-weight: 900; }
        .sum-row.grand .val { color: #FF512F; }
        .vat-badge { display: inline-block; background: #FFF1ED; color: #E2231A; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-top: 6px; }
        .foot { text-align: center; color: #6A7894; font-size: 12px; border-top: 2px solid #f0f0f0; margin-top: 32px; padding-top: 20px; line-height: 1.9; }
        .print-btn { position: fixed; bottom: 24px; left: 24px; background: linear-gradient(135deg,#FF6B4A,#E2231A); color: #fff; border: none; padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 8px 24px rgba(226,35,26,.3); }
        @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; max-width: 100%; } .no-print { display: none; } }
    </style>
</head>

<body>
    <div class="sheet">
        <div class="brand-bar"></div>

        <div class="head">
            <div>
                <div class="title-ar">فاتورة ضريبية</div>
                <div class="title-en">Tax Invoice</div>
                <div class="inv-meta">
                    <div><b>رقم الفاتورة:</b> INV-{{ $shipment->id }}</div>
                    <div><b>رقم التتبع:</b> {{ $shipment->tracking_number }}</div>
                    <div><b>تاريخ الإصدار:</b> {{ $issuedAt->format('Y-m-d H:i') }}</div>
                </div>
            </div>
            <div class="seller">
                <h2>{{ $sellerName }}</h2>
                @if($org->address)<p>{{ $org->address }}</p>@endif
                @if($org->phone)<p>{{ $org->phone }}</p>@endif
                @if($org->email)<p>{{ $org->email }}</p>@endif
                @if($vatNumber)<p><b>الرقم الضريبي:</b> {{ $vatNumber }}</p>@endif
                @if($crNumber)<p><b>السجل التجاري:</b> {{ $crNumber }}</p>@endif
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <h3>فاتورة إلى (المرسِل)</h3>
                <p>{{ $shipment->sender_details['name'] ?? 'عميل' }}</p>
                <p class="muted">{{ $shipment->sender_details['city'] ?? '' }} {{ $shipment->sender_details['country'] ?? '' }}</p>
                @if(!empty($shipment->sender_details['phone']))<p class="muted">{{ $shipment->sender_details['phone'] }}</p>@endif
            </div>
            <div class="party">
                <h3>المستلِم</h3>
                <p>{{ $shipment->receiver_details['name'] ?? ($shipment->receiver_name ?? '') }}</p>
                <p class="muted">{{ $shipment->receiver_details['city'] ?? ($shipment->receiver_city ?? '') }} {{ $shipment->receiver_details['country'] ?? ($shipment->receiver_country ?? '') }}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>الوصف</th>
                    <th>الكمية</th>
                    <th>السعر (غير شامل الضريبة)</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>خدمة شحن — {{ $shipment->tracking_number }}</td>
                    <td>1</td>
                    <td>{{ number_format($net, 2) }} {{ $currency }}</td>
                    <td>{{ number_format($net, 2) }} {{ $currency }}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            <div class="qr-box">
                <div id="qrcode"></div>
                <div class="cap">رمز الاستجابة السريعة (ZATCA)<br>QR متوافق مع هيئة الزكاة والضريبة والجمارك</div>
            </div>

            <div class="sum">
                <div class="sum-row">
                    <span>المجموع الفرعي (غير شامل الضريبة)</span>
                    <span class="val">{{ number_format($net, 2) }} {{ $currency }}</span>
                </div>
                @if($discount > 0)
                <div class="sum-row">
                    <span>الخصم</span>
                    <span class="val">- {{ number_format($discount, 2) }} {{ $currency }}</span>
                </div>
                @endif
                <div class="sum-row">
                    <span>ضريبة القيمة المضافة (15%)</span>
                    <span class="val">{{ number_format($vatAmount, 2) }} {{ $currency }}</span>
                </div>
                <div class="sum-row grand">
                    <span>الإجمالي شامل الضريبة</span>
                    <span class="val">{{ number_format($grandTotal, 2) }} {{ $currency }}</span>
                </div>
                @if($vatEnabled)
                <span class="vat-badge">شامل ضريبة القيمة المضافة 15%</span>
                @endif
            </div>
        </div>

        <div class="foot">
            <p>شكرًا لتعاملكم مع {{ $sellerName }}</p>
            <p>هذه فاتورة ضريبية صادرة إلكترونيًا عبر منصة MasarX — مسار إكس</p>
        </div>
    </div>

    <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>

    <script>
        // Render the ZATCA Phase-1 Base64 TLV payload as a QR code (client-side).
        new QRCode(document.getElementById("qrcode"), {
            text: @json($zatcaPayload),
            width: 120,
            height: 120,
            correctLevel: QRCode.CorrectLevel.M
        });
    </script>
</body>

</html>
