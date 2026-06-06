@extends('errors.layout')
@section('title', 'Too Many Requests')
@section('content')
<div class="error-card" style="--code-from:#f97316;--code-to:#ea580c;--btn-from:#f97316;--btn-to:#ea580c;--btn-shadow:rgba(249,115,22,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#fff7ed,#ffedd5);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#f97316"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
    </div>
    <div class="error-code">429</div>
    <h1 class="error-title">Too Many Requests</h1>
    <p class="error-message">You've sent too many requests in a short period. Please wait a moment and try again.</p>
    <div class="error-actions">
        <a href="javascript:location.reload()" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
            Try Again
        </a>
        <a href="{{ url('/dashboard') }}" class="btn-secondary">Go to Dashboard</a>
    </div>
</div>
@endsection
