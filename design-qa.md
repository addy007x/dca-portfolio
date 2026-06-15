# POS Barcode Scanner Design QA

- Reference: Existing SiamFolio POS visual system and `C:\Users\NITRO5\Downloads\Screenshot 2026-06-15 094407.png`
- Implementation: `D:\DCA\pos-app\qa\mobile-scanner-final\sale-scanner-mobile.png` and `D:\DCA\pos-app\qa\mobile-scanner-final\product-scanner-mobile.png`
- Viewport: 390 x 844 px
- States: Sale barcode scanning and add-product barcode scanning

## Checks

- Each scanner opens as one dedicated full-screen mode.
- Sale and add-product modes use distinct labels and accents.
- The underlying sale screen and product form do not overlap the scanner.
- Manual barcode fallback fits within the mobile viewport.
- Camera target, close control, instructions, and fallback input remain visible and usable.

## Result

No actionable P0, P1, or P2 visual issues found. Hardware barcode decoding requires a real mobile browser over HTTPS with camera permission and cannot be fully exercised in headless QA.

Final result: passed

---

# Manga Login and Registration Design QA

- Login reference: `C:\Users\NITRO5\Downloads\ChatGPT Image 15 มิ.ย. 2569 14_43_07.png`
- Registration reference: `C:\Users\NITRO5\Downloads\ChatGPT Image 15 มิ.ย. 2569 14_43_15.png`
- Implementation: `D:\DCA\index.html`, `D:\DCA\auth.jsx`, and the Manga Quest auth section in `D:\DCA\styles.css`
- Desktop viewport: 1024 x 1536 px
- Mobile check: responsive narrow viewport with the registration form
- States: password login, password registration, Google login/registration, loading, API error, and successful redirect

## Visual Evidence

- Full login comparison: `D:\DCA\.qa-manga-login\final-login-comparison.png`
- Focused login comparison: `D:\DCA\.qa-manga-login\final-login-focus.png`
- Full registration comparison: `D:\DCA\.qa-manga-login\final-signup-comparison.png`
- Focused registration comparison: `D:\DCA\.qa-manga-login\final-signup-focus.png`
- Mobile registration: `D:\DCA\.qa-manga-login\final-mobile6.png`

## Checks

- The supplied manga artwork fills the page without stretching or replacing visible source assets with CSS approximations.
- The functional HTML form covers the non-interactive form printed in the reference image while preserving its card position and overall composition.
- Login and registration switch without a reload and retain the same Google authentication path.
- Form controls, password visibility, remember-me, terms acceptance, API feedback, and submit states are visible and usable.
- The responsive form uses a white bordered card over the manga background and remains within the CSS viewport; Windows headless screenshot scaling was verified separately from layout metrics.
- Desktop reference and implementation were compared at the same viewport in both full-page and focused form views.

## Result

No actionable P0, P1, or P2 visual issues found. The live Google Identity button can vary slightly in height and typography because it is rendered by Google.

Final result: passed
