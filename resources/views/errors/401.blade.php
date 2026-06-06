@extends('errors.layout')
@section('title', 'Unauthorized')
@section('content')
<div class="error-card" style="--code-from:#3b82f6;--code-to:#1d4ed8;--btn-from:#3b82f6;--btn-to:#2563eb;--btn-shadow:rgba(59,130,246,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#3b82f6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
    </div>
    <div class="error-code">401</div>
    <h1 class="error-title">Unauthorized</h1>
    <p class="error-message">You need to sign in to access this page. Please log in with your credentials and try again.</p>
    <div class="error-actions">
        <a href="{{ url('/login') }}" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
            Sign In
        </a>
        <a href="{{ url('/') }}" class="btn-secondary">Go to Home</a>
    </div>
</div>
@endsection
