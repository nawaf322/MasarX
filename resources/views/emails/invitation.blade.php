@component('mail::message')

# You've been invited to {{ $orgName }}

Hi **{{ $invitee->name }}**,

**{{ $invitedBy->name }}** has invited you to join **{{ $orgName }}** as a **{{ $roleName }}**.

Click the button below to set your password and activate your account.

@component('mail::button', ['url' => $invitationUrl, 'color' => 'primary'])
Accept Invitation
@endcomponent

This link will expire in **7 days**. If you did not expect this invitation, you can ignore this email.

Thanks,
{{ $orgName }}

---
<small>If the button doesn't work, paste this link in your browser:<br>{{ $invitationUrl }}</small>

@endcomponent
