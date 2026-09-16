# Chhutta

**Bada payment? Chhote steps mein.**

A mobile-first PWA that reads a merchant's UPI QR and breaks the amount into
₹2,000 payment steps, launching one UPI intent per step. Built to the
`UPI_Splitter_PRD_v1` spec.

> **This is a satirical/experimental payment-flow prototype.** It does not remove
> any fee, tax, surcharge, charge or limit — those are set entirely by your
> payment provider and the merchant. It cannot verify that a payment succeeded:
> every step is marked done by the user, by hand.

## What it does

1. **Scan or upload** a UPI QR. Decoding happens on-device (`qr-scanner`); no image
   is ever uploaded.
2. **Confirm** the payee and amount. The payee VPA is shown verbatim and never altered.
3. **Split** the total into ₹2,000 chunks plus a remainder (₹9,500 → 4 × ₹2,000 + ₹1,500).
4. **Pay** each step via a `upi://pay` intent; the OS shows whichever UPI apps are installed.
5. **Confirm by hand.** Returning from the payment app asks "did you complete this?" —
   it never assumes success. There's a 7-second Undo on each confirmation.
6. **Summary** at the end: total, steps, and how many you marked paid — plus a
   1080x1350 share card rendered on-canvas, with the merchant name but no UPI ID.

## Installing it

The home screen offers an install prompt when the browser says the app
qualifies. On Android Chrome that means capturing `beforeinstallprompt` and
deferring it to an **Install Chhutta** button; iOS Safari fires no such event,
so it shows the Share > Add to Home Screen steps instead. Dismissing the card
is remembered in `localStorage`, and it never appears once the app is running
standalone.

Installability needs HTTPS and a registered service worker, so the prompt will
not appear on `npm run dev` over the LAN — only on a deployed build.

## Running it

```bash
npm install
npm run dev      # then open on a phone over the LAN; `upi://` needs a real device
npm test         # split engine, money maths and QR parsing
npm run build    # typecheck + production build + service worker
```

`npm run icons` regenerates the PWA icons; `node scripts/make-sample-qr.mjs`
writes test QR codes into `samples/` (a ₹10,000 QR, a ₹9,500 one, an
amount-less QR, an order QR, and a non-UPI QR for the error path).

`upi://` links only resolve on a device with a UPI app installed — on desktop the
Pay button will report that nothing opened, which is the intended fallback.

## Design notes

- **Money is integer paise everywhere.** Rupee floats never touch the split maths;
  `paiseToAmParam` renders the UPI `am` value.
- **QR data is untrusted input.** It is parsed with `URL`, the VPA is regex-validated,
  control and bidi characters are stripped from anything displayed, and every
  parameter is re-encoded via `URLSearchParams` when the intent is rebuilt.
- **`sign` is dropped, not forwarded.** Changing `am` voids a signed QR's signature,
  so forwarding it would be a lie; the user is warned instead. Order QRs (`tr`)
  and `minam` QRs raise their own warnings.
- **Session state lives in `sessionStorage`** so Android tearing down the page while
  the user is in their UPI app doesn't lose the queue. "Start over" wipes it.

## Not built (out of scope per the PRD)

No backend, accounts, payment verification, provider APIs, reconciliation or
analytics. No custom chunk size — ₹2,000 is fixed for v1.

## Deployment

Deployed on Vercel — it autodetects Vite, so the defaults are right:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

The app is served from the domain root. To host it under a subpath instead,
build with `DEPLOY_BASE=/subpath/ npm run build` — that sets the Vite base and
the manifest's `start_url`/`scope` together.

HTTPS matters here: the camera scanner and the service worker both refuse to run
on plain `http://`, so testing over the LAN with `npm run dev` gives you the
upload path but not the camera. A Vercel preview URL gives you both.
