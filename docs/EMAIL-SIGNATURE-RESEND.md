# Email signature — paste into Resend / Gmail

Use **this public ops structure only**. Do not paste the website footer into the signature box as one run-on line.

## Plain text (Resend “plain” field)

```text
WitnessOps
Security and operational reviews

engage@mail.witnessops.com
https://witnessops.com/review/request

Proof beats memory.

Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.
```

## Rules

1. **One idea per line.** Never jam brand + tagline + CTA + secrets warning into one paragraph.
2. Motto is always: `Proof beats memory.`
3. Prefer `engage@mail.witnessops.com` for public ops mail.
4. App-sent mail uses `apps/witnessops-web/src/lib/server/email-signatures.ts` (HTML table layout). Keep the public ops signature aligned with the `ops_minimal` profile.
5. After editing Resend, send a test to yourself and open on mobile.

## HTML (optional Resend rich signature)

Minimal HTML that stays readable on dark UI and light clients:

```html
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#1a1a1a">
  <div style="font-weight:700">WitnessOps</div>
  <div style="color:#555">Security and operational reviews</div>
  <div style="margin-top:8px">
    <a href="mailto:engage@mail.witnessops.com" style="color:#2f7d82;text-decoration:none">engage@mail.witnessops.com</a>
    <span style="color:#999"> · </span>
    <a href="https://witnessops.com/review/request" style="color:#2f7d82;text-decoration:none">Start a review</a>
  </div>
  <div style="margin-top:10px;font-weight:600;color:#2f7d82">Proof beats memory.</div>
  <div style="margin-top:6px;font-size:11px;color:#777;max-width:28rem">
    Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.
  </div>
</div>
```
