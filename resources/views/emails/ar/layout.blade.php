<!DOCTYPE html>
<html dir="rtl" lang="ar" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $title ?? 'MasarX' }}</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  body{margin:0;padding:0;background:#f4f6fb;font-family:'Tajawal',Arial,sans-serif;direction:rtl;text-align:right}
  table{border-spacing:0}
  img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  td{padding:0}
  .wrapper{width:100%;background:#f4f6fb;padding:32px 0}
  .card{max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)}
  .brand-bar{height:5px;background:linear-gradient(90deg,#FF6B4A,#E2231A)}
  .header{background:#0B1220;padding:24px 32px;text-align:center}
  .header-logo{font-size:24px;font-weight:900;color:#FF6B4A;letter-spacing:1px}
  .header-sub{font-size:12px;color:#90A0C2;margin-top:4px}
  .body{padding:36px 40px}
  .body h1{font-size:22px;font-weight:900;color:#0E1626;margin:0 0 8px}
  .body p{font-size:15px;color:#374151;line-height:1.75;margin:0 0 16px}
  .body .muted{color:#6A7894;font-size:13px}
  .btn{display:inline-block;background:linear-gradient(135deg,#FF6B4A,#E2231A);color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;margin:8px 0}
  .divider{height:1px;background:#f0f2f7;margin:24px 0}
  .badge{display:inline-block;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700}
  .badge-success{background:#ecfdf5;color:#059669}
  .badge-warning{background:#fffbeb;color:#d97706}
  .badge-info{background:#eff6ff;color:#2563eb}
  .badge-error{background:#fef2f2;color:#dc2626}
  .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f2f7;font-size:14px}
  .info-label{color:#6A7894;font-weight:500}
  .info-value{color:#0E1626;font-weight:700}
  .footer{background:#f8fafc;padding:24px 40px;text-align:center}
  .footer p{font-size:12px;color:#9ca3af;margin:4px 0;line-height:1.8}
  .footer a{color:#FF6B4A;text-decoration:none}
  @media only screen and (max-width:620px){
    .card{border-radius:0 !important}
    .body{padding:24px 20px !important}
    .footer{padding:20px !important}
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="brand-bar"></div>
    <div class="header">
      <div class="header-logo">مسار إكس</div>
      <div class="header-sub">MasarX — منصة الشحن والخدمات اللوجستية</div>
    </div>
    @yield('content')
    <div class="footer">
      <p>© {{ date('Y') }} MasarX — مسار إكس. جميع الحقوق محفوظة.</p>
      <p>إذا كنت لا تتوقع هذا البريد، يمكنك تجاهله بأمان.</p>
    </div>
  </div>
</div>
</body>
</html>
