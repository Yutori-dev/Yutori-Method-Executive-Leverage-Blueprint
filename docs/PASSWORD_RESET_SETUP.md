# Password reset and email domain setup

The password-reset flow is built (`/forgot-password`, `/auth/callback`,
`/reset-password`, and a "Forgot password?" link on the sign-in form). It
cannot send a real email until a sending domain is verified, which is the
part that has to happen on the Yutori side. Until then every reset request
returns the same neutral confirmation but no email arrives.

## Will this affect existing accounts, passwords, or past sessions?

No. Verifying a domain and turning on custom email delivery changes how
*outgoing* email is sent. It does not touch any account, password, session,
response, or Blueprint. Two things to leave alone so it stays that way:

- Do **not** switch on "Confirm email" in Supabase Auth. That would start
  requiring email confirmation for sign-ups and would change how the current
  password sign-in behaves.
- Resetting a password only changes the credential. The account, its master
  profile and every past session stay attached to it, which is what lets
  someone who attended a virtual session log back in for an in-person one.

## What Yutori needs to do

1. **Pick the sending domain.** A domain Yutori owns and controls DNS for,
   for example the one the team's email addresses use.
2. **Create a Resend account** (resend.com; the free tier is enough for
   this volume).
3. In Resend go to **Domains → Add Domain** and enter that domain. Resend
   then shows a short list of DNS records (SPF, DKIM, and a suggested DMARC).
4. **Add those records at wherever the domain's DNS is managed**, then click
   **Verify** in Resend. This usually takes minutes, occasionally a few hours.
5. In Resend create an **API key** and send it to the developer through a
   private channel (not a group chat or a plain email).

Tell the developer which address to send from, for example
`no-reply@yourdomain.com`.

## What the developer does once the domain is verified

1. Supabase → Authentication → **SMTP Settings**: enable custom SMTP.
   Host `smtp.resend.com`, port `465`, username `resend`, password = the
   Resend API key, sender = the address above.
2. Authentication → **URL Configuration**: set Site URL to the production
   URL and add `https://<production-domain>/auth/callback` to the Redirect
   URLs allow-list (plus the localhost equivalent for development).
3. Authentication → **Email Templates → Reset Password**: point the link at
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
   The default template's link only works in the same browser that asked for
   the reset; this one also works when someone requests on their phone and
   opens the email on a laptop.
4. Authentication → **Rate Limits**: with custom SMTP the built-in low email
   cap goes away. Set it comfortably above expected use so workshop day
   isn't throttled.
5. Test with a real account: request a reset, open the email, set a new
   password, sign in with it.

## How past and new sessions are tied to one person

- **Same email again:** signing in with the account used for a past session
  and joining a new one adds a new enrollment to the same participant record.
  It is the same person and the same master profile automatically.
- **Different email:** the new registration starts as its own profile until an
  admin links it (Admin → Participants → open the person → "Link another
  registration"). After that, logging in with either email shows the combined
  history, including Blueprints from archived sessions.
- Every merge is recorded (who, when, from which profile to which) so a
  mistaken link can be traced and reversed.
