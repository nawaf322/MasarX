@extends('errors.layout')
@section('title', 'Server Error')
@section('content')
<div class="error-card" style="--code-from:#ef4444;--code-to:#dc2626;--btn-from:#ef4444;--btn-to:#dc2626;--btn-shadow:rgba(239,68,68,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#fef2f2,#fee2e2);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ef4444"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
    </div>
    <div class="error-code">500</div>
    <h1 class="error-title">Server Error</h1>
    <p class="error-message">Something went wrong on our end. We've been notified and are working on it. Please try again later.</p>
    <div class="error-actions">
        <a href="javascript:location.reload()" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
            Try Again
        </a>
        <a href="{{ url('/') }}" class="btn-secondary">Go to Home</a>
    </div>
</div>
@endsection
