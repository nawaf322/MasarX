@extends('emails.layouts.master')

@section('content')
    <h2 style="margin-top: 0; color: #111827;">{{ $subject ?? 'Notification' }}</h2>

    <div style="white-space: pre-line;">
        {!! nl2br(e($content)) !!}
    </div>

    @if(isset($actionUrl) && isset($actionText))
        <div style="text-align: center; margin-top: 30px;">
            <a href="{{ $actionUrl }}" class="button" style="background-color: {{ $branding['primary_color'] ?? '#2563eb' }}">
                {{ $actionText }}
            </a>
        </div>
    @endif
@endsection