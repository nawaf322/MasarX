@extends('emails.ar.layout')
@section('content')
<div class="body">
  <p style="text-align:center;font-size:48px;margin:0 0 8px">💰</p>
  <h1 style="text-align:center">تم شحن محفظتك!</h1>
  <p style="text-align:center">عزيزي {{ $customerName }}، تمّ إضافة الرصيد إلى محفظتك بنجاح.</p>

  <div class="divider"></div>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><div class="info-row"><span class="info-label">المبلغ المضاف</span><span class="info-value" style="color:#059669">+ {{ number_format($amount, 2) }} {{ $currency }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">الرصيد الجديد</span><span class="info-value">{{ number_format($newBalance, 2) }} {{ $currency }}</span></div></td>
    </tr>
    <tr>
      <td><div class="info-row"><span class="info-label">رقم المعاملة</span><span class="info-value">{{ $transactionRef }}</span></div></td>
    </tr>
  </table>

  <div class="divider"></div>

  <p class="muted" style="text-align:center">شكرًا لثقتك بـ MasarX. رصيدك جاهز للاستخدام الآن.</p>
</div>
@endsection
