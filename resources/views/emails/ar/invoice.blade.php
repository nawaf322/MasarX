@extends('emails.ar.layout')
@section('content')
<div class="body">
  <h1>فاتورتك جاهزة 🧾</h1>
  <p>عزيزي {{ $customerName }}،</p>
  <p>يسعدنا إرسال فاتورتك الضريبية للشحنة رقم <strong style="color:#FF6B4A">{{ $shipment->tracking_number }}</strong>.</p>

  <div class="divider"></div>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><div class="info-row"><span class="info-label">رقم الفاتورة</span><span class="info-value">INV-{{ $shipment->id }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">المجموع (قبل الضريبة)</span><span class="info-value">{{ number_format($net, 2) }} {{ $currency }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">ضريبة القيمة المضافة 15%</span><span class="info-value">{{ number_format($vatAmount, 2) }} {{ $currency }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row" style="border-bottom:none"><span class="info-label" style="font-weight:900;color:#0E1626;font-size:16px">الإجمالي شامل الضريبة</span><span class="info-value" style="color:#FF512F;font-size:16px">{{ number_format($grandTotal, 2) }} {{ $currency }}</span></div></td>
    </tr>
  </table>

  <div class="divider"></div>

  <p style="text-align:center">
    <a href="{{ $invoiceUrl }}" class="btn">عرض الفاتورة الكاملة</a>
  </p>
</div>
@endsection
