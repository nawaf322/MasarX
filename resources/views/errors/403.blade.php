@extends('errors.layout')
@section('title', 'Access Forbidden')
@section('content')
<div class="error-card" style="--code-from:#f59e0b;--code-to:#d97706;--btn-from:#f59e0b;--btn-to:#d97706;--btn-shadow:rgba(245,158,11,0.4);">
    <div class="error-icon" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#f59e0b"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
    </div>
    <div class="error-code">403</div>
    <h1 class="error-title">Access Forbidden</h1>
    <p class="error-message">You don't have the required permissions to access this resource. If you believe this is a mistake, please contact your administrator.</p>
    <div class="error-actions">
        <a href="{{ url('/dashboard') }}" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
            Go to Dashboard
        </a>
        <a href="javascript:history.back()" class="btn-secondary">Go Back</a>
    </div>
</div>
@endsection
