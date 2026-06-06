<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            margin-top: 40px;
            margin-bottom: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .header {
            background: #1f2937;
            padding: 30px;
            text-align: center;
        }

        .header img {
            max-height: 50px;
        }

        .content {
            padding: 40px 30px;
            color: #374151;
            line-height: 1.6;
        }

        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
        }

        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
        }

        .footer a {
            color: #6b7280;
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header" style="background-color: {{ $branding['primary_color'] ?? '#1f2937' }}">
            @if(isset($branding['logo_url']))
                <img src="{{ $branding['logo_url'] }}" alt="Logo" />
            @else
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                    {{ $branding['company_name'] ?? 'Deprixa Logistics' }}</h1>
            @endif
        </div>

        <div class="content">
            @yield('content')
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ $branding['company_name'] ?? 'Deprixa Logistics' }}. All rights reserved.</p>
            <p>
                <a href="{{ url('/') }}">Track Shipment</a> |
                <a href="{{ url('/privacy') }}">Privacy Policy</a>
            </p>
        </div>
    </div>
</body>

</html>