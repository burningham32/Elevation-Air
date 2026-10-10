# Elevation Air Field App

An iPhone-friendly, installable web app for field inspections, QuietCool recommendations, installed estimates, and printable customer proposals. All customer records and photos are stored locally in IndexedDB. No account, server, or API key is required. It does not sync devices; export backups regularly and protect the files as customer information.

## Development

Use the existing isolated cloud checkout; no additional Git worktree is needed.

Requires Node.js 22.12+ (Node 24 recommended):

```sh
cd /workspace/Elevation-Air
npm ci --cache /tmp/elevation-npm-cache
npm run dev -- --port 5173
```

For a production build and local validation:

```sh
npm test
npm run build
npm run preview -- --port 4173
npm run test:e2e
```

Browser tests use `/usr/bin/chromium` by default. Override `CHROMIUM_PATH` for another installation. They cover desktop and iPhone viewport layouts, multiple levels, QuietCool pricing/series selection, photos, IndexedDB persistence, print/PDF rendering, offline reload, and backup restoration. They use Chromium with an iPhone-sized viewport; physical iPhone Safari testing remains a deployment check.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` tests, builds, and deploys on pushes to `main` or manual runs.

1. Push this project to `burningham32/Elevation-Air` on `main`.
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Private repositories require a GitHub plan that supports Pages.
3. Open **Actions → Deploy Elevation Air to GitHub Pages** and run the workflow if the initial run happened before Pages was enabled.
4. Wait for a successful deployment and open the URL reported by the deployment. The expected standard URL is `https://burningham32.github.io/Elevation-Air/`; do not treat it as live before deployment succeeds.
5. On iPhone, open the deployed HTTPS URL in Safari, then **Share → Add to Home Screen**. Open the app online once so the service worker can finish installing. Once its assets have been cached, inspections and proposals work offline.
6. Complete a trial inspection on the physical iPhone, add a photo, generate a proposal, and verify **Print / PDF**. In the iPhone print preview, open the PDF preview and use **Share → Save to Files**.

Repository Pages paths are supported by the manifest, service worker, and bundled assets. For a local Pages-path check:

```sh
VITE_BASE_PATH=/Elevation-Air/ npm run build
TEST_BASE_PATH=/Elevation-Air/ npm run test:e2e
```

If you later configure a custom domain, change the workflow's `VITE_BASE_PATH` to `/` and configure that domain in GitHub Pages. The public site contains the app and catalog, not customer records. Customer records remain on each device; there is no server authentication or encrypted database in this version.

## Before customer use

In **Settings**, enter business contact details, license information, applicable tax rate, and any ventilation upgrade allowances. The supplied fan price sheet is treated as **installed pricing**:

| QuietCool model | Installed price |
| --- | ---: |
| Trident Pro 4.8 | $2,100 |
| Trident Pro 5.5 | $2,250 |
| Trident Pro 6.0 | $2,350 |
| Trident Pro 7.0 | $2,500 |
| Stealth Pro 4.8 | $2,400 |
| Stealth Pro 5.5 | $2,550 |
| Stealth Pro 6.0 | $2,750 |
| Stealth Pro 7.0 | $2,850 |
| AFG SMT ES-3.0 · gable | $700 |
| AFR SMT ES-2.0 · roof | $900 |
| AFR SLR-40W · solar | $975 |
| Garage fan · exact model pending | $900 |

Attic names are normalized from the supplied model descriptions; confirm labels against the installed products. **Whole house CFM defaults are rounded placeholders derived from model names, not manufacturer ratings. Attic and garage CFM defaults are blank.** Current official manufacturer specs could not be retrieved through this environment's network policy. Enter the exact rated CFM for each model and mark it verified. Changing a model name or airflow removes its verification flag. Prices can be changed independently.

Whole house automatic selection picks the smallest listed airflow that meets the target within the chosen series. Attic application automatically selects Roof → AFR SMT ES-2.0, Gable → AFG SMT ES-3.0, or Roof Solar → AFR SLR-40W, using the saved price and rated airflow from each assigned catalog entry. If the assigned fan’s verified airflow is below the target, the proposal flags that shortfall. An unrated attic model can appear as a **draft candidate** with the supplied price, but its sizing is not approved. A model below the target is flagged; exceeding all rated models requires additional equipment configuration rather than silently selecting an undersized fan. Missing measurements, unknown ratings, unverified models, or missing prices keep proposals visibly marked **Draft**.

## Calculation assumptions

- Whole house target: total occupied floor area × 2 CFM/ft² by default.
- Air changes/hour: selected whole house CFM × 60 ÷ the sum of each level's area × ceiling height. Actual installed airflow varies.
- Attic fan planning target: attic footprint × 0.7 CFM/ft² by default.
- Passive attic NFA: attic footprint ÷ 150 × 144 in², split approximately 50% intake / 50% exhaust. The 1:300 option is applied only after the inspector confirms local code eligibility.
- Existing exhaust NFA: sum each vent row’s count (or ridge linear feet) × manufacturer NFA per unit. Enter multiple vent types separately. Selecting ridge, box/static, or gable prefills editable values of 18 in² per linear foot, 60 in² per vent, or 80 in² per vent respectively. Loading existing inspections preserves their saved ratings. Unknown rows are flagged and the known sum is labeled partial. Required passive NFA and intake/exhaust targets are displayed in square feet, with square inches retained for reference (144 in² = 1 ft²). Older single-vent inspections and backups migrate without losing their measurements.
- Whole house attic discharge planning target: fan CFM ÷ 750 CFM per ft² NFA. This is separate from passive ventilation; use the governing requirement and the current installation manual.
- Installed price: selected scope + optional allowances/additional work − discount + configured tax. Tax currently applies to the entire discounted subtotal; set it appropriately for local rules.

Sizing rules are editable planning assumptions, not an engineering or code approval. Verify manufacturer coverage and installation requirements, intake/discharge paths, combustion appliance safety, electrical work, and permits before installation. A powered attic fan does not replace passive net free vent area.

## Files

- `src/calculations.js`: sizing, model selection, totals, and pricing defaults.
- `src/app.js`: inspection, recommendations, settings, photos, saved jobs, proposal, and backup flows.
- `src/storage.js`: IndexedDB storage.
- `src/backup.js`: imported backup validation.
- `public/sw.js` and `vite.config.js`: offline caching with build-time asset precaching.
- `test/` and `e2e/`: calculation, import validation, and browser workflow tests.
