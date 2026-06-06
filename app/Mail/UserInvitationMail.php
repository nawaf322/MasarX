<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $invitationUrl;
    public string $orgName;
    public string $roleName;

    public function __construct(
        public readonly User $invitee,
        string $token,
        public readonly User $invitedBy,
    ) {
        $this->invitationUrl = url(route('invitation.show', ['token' => $token], false));
        $this->orgName       = $invitee->organization?->name ?? config('app.name');
        $this->roleName      = $invitee->roles->first()?->name ?? 'User';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to {$this->orgName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.invitation',
        );
    }
}
