@extends('errors.layout')
@section('title', 'Session Expired')
@section('content')
<div class="error-card" style="--code-from:#8b5cf6;--code-to:#7c3aed;--btn-from:#8b5cf6;--btn-to:#7c3aed;--btn-shadow:rgba(139,92,246,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#8b5cf6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    </div>
    <div class="error-code">419</div>
    <h1 class="error-title">Session Expired</h1>
    <p class="error-message">Your session has expired for security reasons. Please refresh the page and try again.</p>
    <div class="error-actions">
        <a href="javascript:location.reload()" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
            Refresh Page
        </a>
        <a href="{{ url('/login') }}" class="btn-secondary">Sign In</a>
    </div>
</div>
@endsection
