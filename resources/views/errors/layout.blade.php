<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Error') - {{ config('app.name', 'MasarX') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800&display=swap" rel="stylesheet" />
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .error-container {
            width: 100%;
            max-width: 480px;
            text-align: center;
            animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .error-card {
            background: white;
            border-radius: 24px;
            padding: 3rem 2.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.04);
        }
        .error-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .error-icon svg { width: 36px; height: 36px; }
        .error-code {
            font-size: 4rem;
            font-weight: 800;
            letter-spacing: -2px;
            line-height: 1;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--code-from), var(--code-to));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .error-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.75rem;
        }
        .error-message {
            font-size: 0.875rem;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        .error-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: white;
            background: linear-gradient(135deg, var(--btn-from), var(--btn-to));
            border: none;
            border-radius: 12px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px -2px var(--btn-shadow);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px -2px var(--btn-shadow); }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #475569;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-secondary:hover { background: #e2e8f0; }
        .error-footer {
            margin-top: 2rem;
            font-size: 0.75rem;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="error-container">
        @yield('content')
        <p class="error-footer">{{ config('app.name', 'MasarX') }}</p>
    </div>
</body>
</html>
