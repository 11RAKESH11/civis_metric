# CivisMetric — construction estimator

Estimates construction materials and cost from dimensions and local rates, and shows the workings.
Each estimator has three views: a 3D model of the inputs, **Math** (the calculation step by step)
and **Report** (an itemized estimate that prints cleanly).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run lint
```

The Express API in `../engineering-backend` (`node server.js`, port 5000) is separate; this app
doesn't call it — all calculations run in the browser.

## Where things live

| Path | What it is |
|---|---|
| `src/tools.js` | The estimator registry. The sidebar, the index page and routing all read it. A tool without `component` shows as "In development". |
| `src/App.jsx` | Shell: sidebar with collapsible trades / mobile drawer, top bar with the Ctrl+K search, hash routing (`#/` Dashboard, `#/estimators`, `#/bricks`…). |
| `src/components/Dashboard.jsx` | The home page. Only shows real data: project/BOQ figures from `ProjectContext`, tools opened in this browser. |
| `src/components/EstimatorIndex.jsx` | All estimators, by trade, with search. |
| `src/components/CommandPalette.jsx` | Ctrl/⌘+K: jump to any tool or page. |
| `src/components/*Calculator.jsx`, `Pool.jsx` | One estimator each: inputs, calculation, three.js scene, Math and Report views. |
| `src/components/CalculatorFrame.jsx` | Switches a calculator to side-by-side layout when it has ≥ 900px (the `wide:` Tailwind variant). |
| `src/lib/disposeObject.js` | Frees three.js geometry, materials and textures when a scene is rebuilt or unmounted. |
| `src/index.css` | Palette tokens (light on `:root`, dark on `.dark`), focus outline, touch sizes, reduced motion. |
| `tailwind.config.js` | Maps the tokens to Tailwind colors (`bg-surface`, `text-muted`, `border-line`, `bg-primary`…) and defines `wide:`. |
| `../docs/DESIGN_AUDIT.md` | The design audit, decisions and implementation status. |

## Adding an estimator

1. Build the component in `src/components/`. Use palette classes (`bg-surface`, `text-ink`, `text-muted`,
   `border-line`, `border-line-control` for inputs, `bg-primary text-on-primary` for selected states),
   not raw Tailwind colors, so it works in both themes.
2. Label every input (`<label htmlFor>` or `aria-label`) and keep text at 12px or larger.
3. Use `wide:` rather than `xl:` for the inputs/model split, and call `disposeObject` on anything you
   remove from the scene.
4. Add `component: lazy(() => import('./components/YourCalculator'))` and a one-line `summary` to its
   entry in `src/tools.js`.
