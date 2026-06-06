@extends('emails.ar.layout')
@section('content')
<div class="body">
  <p style="text-align:center;font-size:48px;margin:0 0 8px">📦</p>
  <h1 style="text-align:center">تم تسليم شحنتك!</h1>
  <p style="text-align:center">عزيزي {{ $customerName }}، تمّ تسليم شحنتك بنجاح.</p>

  <div class="divider"></div>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><div class="info-row"><span class="info-label">رقم التتبع</span><span class="info-value" style="color:#FF6B4A">{{ $shipment->tracking_number }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">تاريخ التسليم</span><span class="info-value">{{ $deliveredAt }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">الحالة</span><td><span class="badge badge-success">تم التسليم</span></td></div></td>
    </tr>
  </table>

  <div class="divider"></div>

  <p style="text-align:center">
    <a href="{{ $trackingUrl }}" class="btn">عرض تفاصيل الشحنة</a>
  </p>

  <p class="muted">شكرًا لاختيارك MasarX. نتطلع إلى خدمتك مرة أخرى.</p>
</div>
@endsection
