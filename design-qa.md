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

# Manga Quest Dashboard Design QA

- Reference: `C:\Users\NITRO5\Downloads\ChatGPT Image 15 มิ.ย. 2569 22_53_29.png`
- Implementation: `D:\DCA\dashboard-design.html` and `D:\DCA\assets\manga-dashboard-scene.webp`
- Desktop viewport: 1672 x 941 px
- Mobile viewport: 390 x 844 px
- Data state: six seeded holdings, earn balance, annual goal, crypto watchlist, profile fallback, and one-minute refresh wiring

## Visual Evidence

- Side-by-side comparison: `D:\DCA\.qa-manga-dashboard\dashboard-manga-comparison.png`
- Final desktop render: `D:\DCA\.qa-manga-dashboard\dashboard-manga-seeded.png`
- Final mobile render: `D:\DCA\.qa-manga-dashboard\dashboard-manga-mobile.png`

## Checks

- The supplied black/red Manga Quest art direction is preserved across profile, navigation, portfolio, holdings, central scene, annual goal, crypto market, and news ticker regions.
- The central castle artwork uses a source-derived bitmap rather than CSS-drawn or placeholder art.
- Crypto icons use verified CoinGecko image URLs; stock icons use company-domain web favicons with an initials fallback.
- Portfolio calculations, holdings ordering, annual target, music player, AI chat, LINE OA, command, draggable panels, logout, and one-minute refresh timers remain connected.
- The desktop layout matches the reference hierarchy at the same viewport without overlapping the three main columns.
- The mobile layout stacks controls and data panels without horizontal text overlap; long navigation and action rows remain horizontally scrollable.

## Result

No actionable P0, P1, or P2 visual issues found. CoinGecko can temporarily return HTTP 429 during repeated QA refreshes; the dashboard preserves icon rendering and retries market prices on the existing one-minute schedule.

Final result: passed

---

# Widescreen Manga Authentication Design QA

- Login reference: `C:\Users\NITRO5\Downloads\ChatGPT Image 15 มิ.ย. 2569 19_04_23.png`
- Registration reference: `C:\Users\NITRO5\Downloads\ChatGPT Image 15 มิ.ย. 2569 19_10_12.png`
- Implementation: `D:\DCA\index.html`, `D:\DCA\auth.jsx`, `D:\DCA\icons.jsx`, and the Manga Quest Auth V3 section in `D:\DCA\styles.css`
- Desktop viewport: 1672 x 941 px
- Mobile viewport: 390 x 844 CSS px
- States: password login, password registration, login/register switching, password visibility, Google OAuth overlay, and responsive mobile forms

## Visual Evidence

- Full login side-by-side comparison: `D:\DCA\.qa-manga-wide\compare-login.png`
- Full registration side-by-side comparison: `D:\DCA\.qa-manga-wide\compare-signup.png`
- Final login render: `D:\DCA\.qa-manga-wide\login-final.png`
- Final registration render: `D:\DCA\.qa-manga-wide\signup-final2.png`
- Mobile login render: `D:\DCA\.qa-manga-wide\login-mobile-real.png`
- Mobile registration render: `D:\DCA\.qa-manga-wide\signup-mobile-real.png`

## Checks

- The supplied widescreen artwork is used directly at the source aspect ratio with no recreated or approximate manga imagery.
- Desktop login preserves the central manga panel composition and places the live HTML form over the reference form area.
- Desktop registration preserves the illustrated left panel and uses a clean white functional form panel on the right.
- User, email, lock, and eye controls use the existing icon system and remain aligned at desktop and mobile sizes.
- The custom Google presentation uses the official Google G asset while the live Google Identity iframe remains the real click target.
- Login and registration fields, mode switching, Google iframe presence, and password visibility were verified in Chrome through the rendered DOM.
- Mobile forms fit within a 390 px CSS viewport without horizontal overflow and keep all primary controls reachable by vertical scrolling.

## Result

No actionable P0, P1, or P2 visual issues found. Google can change the internal iframe markup, but its transparent full-size click layer remains contained by the custom button.

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
