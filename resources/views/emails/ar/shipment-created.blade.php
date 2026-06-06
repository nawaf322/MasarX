@extends('emails.ar.layout')
@section('content')
<div class="body">
  <h1>تم استلام شحنتك ✓</h1>
  <p>عزيزي {{ $customerName }}،</p>
  <p>تم إنشاء شحنتك بنجاح وسنبدأ في معالجتها فورًا.</p>

  <div class="divider"></div>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><div class="info-row"><span class="info-label">رقم التتبع</span><span class="info-value" style="color:#FF6B4A">{{ $shipment->tracking_number }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">المرسَل إليه</span><span class="info-value">{{ $shipment->receiver_details['name'] ?? ($shipment->receiver_name ?? '') }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">مدينة الوصول</span><span class="info-value">{{ $shipment->receiver_details['city'] ?? ($shipment->receiver_city ?? '') }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">الإجمالي</span><span class="info-value">{{ number_format((float)($shipment->total ?? 0), 2) }} {{ $shipment->currency ?? 'SAR' }}</span></div></td>
    </tr>
  </table>

  <div class="divider"></div>

  <p style="text-align:center">
    <a href="{{ $trackingUrl }}" class="btn">تتبع الشحنة</a>
  </p>

  <p class="muted">يمكنك متابعة شحنتك في أي وقت عبر رقم التتبع أعلاه أو من خلال الزر أعلاه.</p>
</div>
@endsection
