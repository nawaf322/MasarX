@extends('emails.ar.layout')
@section('content')
<div class="body">
  <h1>رمز التحقق بخطوتين</h1>
  <p>عزيزي {{ $customerName }}،</p>
  <p>رمز التحقق الخاص بك هو:</p>

  <div style="text-align:center;margin:32px 0">
    <div style="display:inline-block;background:#f8fafc;border:2px dashed #FF6B4A;border-radius:16px;padding:20px 40px">
      <span style="font-size:38px;font-weight:900;color:#FF512F;letter-spacing:8px">{{ $code }}</span>
    </div>
  </div>

  <div class="divider"></div>
  <p class="muted">يصلح هذا الرمز لمدة {{ $expiresInMinutes ?? 10 }} دقائق.</p>
  <p class="muted">إذا لم تطلب هذا الرمز، يُرجى تأمين حسابك فورًا.</p>
</div>
@endsection
