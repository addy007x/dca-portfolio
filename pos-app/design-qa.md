# Design QA

- Source visual truth: `qa/reference-easymart.png`
- Desktop implementation: `qa/production-desktop.png`
- Mobile implementation: `qa/production-mobile.png`
- Full comparison: `qa/easymart-comparison.png`
- Viewports: 1536 x 1024 desktop, 390 x 844 mobile
- State: sale screen with five cart lines, six units, and a total of THB 109

## Findings

- Typography: passed. Thai product names, prices, stock, cart totals, and actions have clear hierarchy.
- Layout: passed. The desktop preserves the reference's sidebar, catalog, and fixed cart composition; mobile becomes a two-column catalog with a fixed cart action.
- Colors: passed. White surfaces, primary blue actions, and yellow promotional accents closely match the reference.
- Product imagery: passed. The app intentionally uses the project's real grocery photography instead of copying the reference packaging.
- Content: passed. SiamFolio branding and current product data remain intact.
- Interaction: passed. Search, barcode entry, categories, sorting, grid/list view, cart quantity, payment, change calculation, and receipt output remain functional.
- Smoke test: passed. One product was added, cash payment completed, THB 90 change calculated, and the receipt modal opened with a THB 10 total.

## Residual Differences

- P3: The current inventory has fewer products than the visual reference, leaving more space below the catalog.
- P3: Cash received and change are collected in the payment modal to preserve the existing cashier workflow.

final result: passed
