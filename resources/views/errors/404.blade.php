@extends('errors.layout')
@section('title', 'Page Not Found')
@section('content')
<div class="error-card" style="--code-from:#6366f1;--code-to:#4f46e5;--btn-from:#6366f1;--btn-to:#4f46e5;--btn-shadow:rgba(99,102,241,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#6366f1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
    </div>
    <div class="error-code">404</div>
    <h1 class="error-title">Page Not Found</h1>
    <p class="error-message">The page you're looking for doesn't exist or has been moved. Please check the URL and try again.</p>
    <div class="error-actions">
        <a href="{{ url('/dashboard') }}" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
            Go to Dashboard
        </a>
        <a href="javascript:history.back()" class="btn-secondary">Go Back</a>
    </div>
</div>
@endsection
