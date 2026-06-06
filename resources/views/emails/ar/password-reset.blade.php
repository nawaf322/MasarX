@extends('emails.ar.layout')
@section('content')
<div class="body">
  <h1>إعادة تعيين كلمة المرور 🔐</h1>
  <p>عزيزي {{ $customerName }}،</p>
  <p>تلقّينا طلبًا لإعادة تعيين كلمة المرور لحسابك. انقر على الزر أدناه للمتابعة.</p>

  <p style="text-align:center;margin:32px 0">
    <a href="{{ $resetUrl }}" class="btn">إعادة تعيين كلمة المرور</a>
  </p>

  <div class="divider"></div>
  <p class="muted">ينتهي هذا الرابط خلال {{ $expiresInMinutes ?? 60 }} دقيقة.</p>
  <p class="muted">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد — حسابك بأمان.</p>
</div>
@endsection
