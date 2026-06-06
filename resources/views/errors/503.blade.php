@extends('errors.layout')
@section('title', 'Service Unavailable')
@section('content')
<div class="error-card" style="--code-from:#14b8a6;--code-to:#0d9488;--btn-from:#14b8a6;--btn-to:#0d9488;--btn-shadow:rgba(20,184,166,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#14b8a6"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17l-5.58-5.58m0 0l5.58-5.58m-5.58 5.58h13.14M4.16 12.02l1.36 1.45c.38.4.58.94.58 1.49v7.34a.75.75 0 001.5 0v-7.34c0-.17.06-.34.18-.46l1.36-1.45"/></svg>
    </div>
    <div class="error-code">503</div>
    <h1 class="error-title">Under Maintenance</h1>
    <p class="error-message">We're currently performing scheduled maintenance to improve your experience. We'll be back shortly.</p>
    <div class="error-actions">
        <a href="javascript:location.reload()" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
            Check Again
        </a>
    </div>
</div>
@endsection
