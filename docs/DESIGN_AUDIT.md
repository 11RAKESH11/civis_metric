# CivisMetric — Design, Responsiveness & Frontend Audit

Date: 2026-10-27 · Scope: `my-engineering-dashboard` (React 19 + Vite 8 + Tailwind 3 + three.js) and its relationship to `engineering-backend`.
Status: audited 2026-10-27; P0–P3 implemented, team zip merged and tested 2026-11-06/07 (uncommitted). See "Implementation status" below.

## Implementation status

| Phase | Done | Verified how |
|---|---|---|
| P0 | Tool registry (`src/tools.js`) wires all 9 calculators; planned tools listed, not clickable. Mock Overview, fake status widgets, intro and Live Workspace panel removed. Calculators sized by their container (`CalculatorFrame`, `wide:` variant). Semantic nav, drawer focus handling, labels on every input, global focus outline, reduced motion. Currency selector removed; `en-IN` grouping for ₹ tools. Fonts load via `<link>`. Palette A tokens in `index.css`. | Fresh loads at 320–1920 px: canvas width = container, no horizontal scroll; 0 unlabeled inputs on all 9; keyboard drawer pass; Bricks golden numbers 1,673 / ₹21,363. |
| P1 | Glows, glass, gradient text and per-calculator brand headers removed; text ≥ 12 px; controls ≥ 28 px (44 px on touch, 16 px input text); 3D wheel zoom gated, no auto-rotate; sticky result bar on narrow layouts; document scroll below 1024 px; route changes as transitions. | 375/320/1024 px: bar pinned to bottom edge; 0 controls < 24 px; drawer closes immediately. |
| P2 | Calculators moved onto the palette tokens (light/dark parity), flat input sections, 3 radii (4 px, 8 px, full), sentence-case labels, panel shadows removed, Math/Report as paper sheets, one `h1` per page. The 3D viewport stays dark in both themes. | Screenshots in light and dark; layout checks repeated; golden numbers unchanged. |

| P3 | `src/lib/disposeObject.js` frees geometry, materials and textures on every rebuild and on unmount (Bricks and Excavation were leaking). Rendering skipped while the model is hidden or the tab is in the background; deprecated `PCFSoftShadowMap` replaced. Recalculation runs through `useEffectEvent`: **lint 0 errors / 0 warnings** (was 24 / 9). Model has `role="img"` and a text alternative; report tables have column and row header scopes. Vite template files removed; brand favicon; project README. | Lint and build clean; no console errors loading all 9; Bricks 1,673 / ₹21,363 and Pool $73,395 unchanged after 20 rapid input changes. |

| Merge + follow-ups | The team zip (31 tools, login, units, CAD links, backend, docs) merged and restyled; project lints at 0 errors / 0 warnings. Per-tool icon set (`ToolIcon.jsx`); honest demo login (no "Secure", no fake client mode); header Metric/Imperial switch shown only on the two tools that follow it; CAD Studio wheel zoom made non-passive (it also scrolled the page); print rules for the app shell. | All 31 screens + index at 360, 375, 390, 430, 820 and 1440 px (light), dark theme at 1440 and 375; deep input/dropdown/toggle sweep on every screen; CAD place/draw/undo/redo/delete/import by dispatched mouse and key events. |

**Not done:** shared `ui/` components (calculators still duplicate their shell code, which is a refactor with real regression risk); real authentication; print was checked by re-applying the `@media print` rules on screen, not in a browser print preview; no Lighthouse, screen-reader or real-device testing; GPU memory not profiled.

## How this audit was done (and what it does not cover)

| Method | What was covered |
|---|---|
| Source reading | `App.jsx` (all 661 lines), `BricksCalculator.jsx` (all 837 lines), `index.css`, `App.css`, `tailwind.config.js`, `index.html`, `main.jsx`, `LoginPage.js` (partial), plus pattern counts (grep) across all 9 calculator components. `server.js` in the backend. |
| Rendered app (in-app Chromium) | Overview at **320, 375, 768, 1024, 1280, 1440, 1920** px (DOM measurements: overflow, font sizes, control sizes, labels). Bricks Calculator at **375, 853 (natural pane), 1280** px with screenshots at 853 (dark + light). Clicked through "Cement Calculator" to confirm routing behavior. Console errors captured. |
| Tooling | `eslint .` and `vite build` run (output into a scratch dir, not the repo). WCAG contrast ratios computed for the actual Tailwind hex values. |
| **Not tested** | Widths 360/390/430/820 px; Foundation, Excavation, Column, Pool, Cement, Sand, Aggregate, Concrete calculators were **not visually inspected** (source pattern counts only — they share Bricks' shell, so most Bricks findings likely apply, but that's an inference). No Lighthouse run, no screen reader, no real iOS/Android devices, no landscape, no 200% zoom test. Screenshots under viewport emulation in this pane were unreliable (cropped/stale), so findings at emulated widths rest on **DOM measurements**, not pictures. |

---

## A. Executive summary

**What CivisMetric actually is.** It's not a civic-technology platform. The code, copy and defaults describe a **construction material and cost estimator** for the Indian market: ₹ default, "Standard India (Red Clay)" brick, 50 kg cement bags, 1:5 mortar, crew-day labor rates. Each working calculator takes dimensions, shows a live 3D model (three.js), a step-by-step **"Math" proof**, and a printable **itemized estimate**. Likely users are site engineers, small contractors, quantity surveyors, civil-engineering students and owner-builders. Their core job is to enter wall, pit or slab dimensions and get quantities plus cost they can trust, then print or share it. Trust here comes from **showing the working**, not from looking futuristic.

**Biggest problems, in order:**

1. **Most of the product isn't there, but the UI says it is.** The sidebar lists 31 tools. Only **5 open a real screen**. 4 finished calculators (Cement, Sand, Aggregate, Concrete) exist in `src/components` but are **never imported**. 22 files are **0 bytes**. Clicking any unwired item changes the page title (e.g. "Cement Calculator") but shows the same static mock dashboard (verified).
2. **The Overview is a fake dashboard.** Inputs are `div`s with chevrons, sliders don't move, bar heights are `Math.random()` on every render, "Project Health 100%", "System Online · Sync 2m ago", a red notification dot, a dead "Export" button and "Pro AI Tools" all imply a system that doesn't exist. For an estimating tool, invented indicators are the fastest way to lose credibility.
3. **Layout breaks at common laptop widths.** At **1280 px**, with both side panels open, the Bricks 3D viewer panel has **clientWidth = 0** and the canvas is drawn **800 px wide, ending at x = 1617** in a 1280 px viewport. The calculators were built as full-page apps (`min-h-screen`, `xl:w-[380px]`, `xl:w-[calc(100%-404px)]`) but render inside a ~412 px content column.
4. **It looks like an AI template.** Seven blurred glow blobs, cyan→indigo gradients on the logo, active dots, progress and sliders, gradient *text*, `backdrop-blur-xl` glass over opaque backgrounds, neon `shadow-[0_0_8px_#06b6d4]` dots, emoji tiles (🧱 🧪 ⏳ 🪨 🚜), uppercase 9–11 px labels everywhere, 11 different corner radii, and a 6.8-second unskippable intro with a red "laser" wordmark.
5. **Accessibility basics are missing.** There are 0 `aria-*` attributes and 0 `htmlFor`. All 31 nav items are clickable `div`s, so the app can't be navigated by keyboard. Bricks has 16 inputs with no programmatic label, icon-only buttons have no names, there's no `prefers-reduced-motion` handling anywhere, and text goes down to 8 px.
6. **Brand fonts never load.** The Google Fonts `@import` comes after the `@tailwind` directives, so PostCSS drops it (the build warns: *"@import must precede all other statements"*). `document.fonts.size === 0` at runtime, so Inter, Roboto Mono and Montserrat come from whatever the OS has installed.

**Biggest opportunity.** The **Math view** (Step 1 → Step 4, real numbers substituted into real formulas) and the **print-ready Report** are genuinely distinctive and match how engineers check estimates. A design language built around **"the drafting sheet / bill of quantities"** would be credible and recognizably CivisMetric: paper-toned surfaces, ink-dark type, one blueprint accent, tabular figures, ruled tables and the existing blueprint grid used sparingly. Make that the product's signature instead of the neon dashboard.

---

## B. Overall assessment (1–10)

| Area | Score | Basis | Why |
|---|---|---|---|
| Visual originality | 3 | Both | Glow blobs, gradient text, glass panels, emoji tiles and a card-grid dashboard: the common AI-dashboard kit. The 3D brick wall and blueprint grid are the only original ideas, and they're buried under effects. |
| Brand identity | 2 | Both | Four names and marks: "E" gradient tile, "Workspace", "CivisMetric / Estimation Engine" (repeated inside every calculator), red "CIVISMETRIC" laser text, and `<title>` "Premium Engineering Dashboard". |
| Color system | 3 | Both | Two neutral families mixed (zinc shell `#09090b`, slate calculators `#020617`, main `#050b1a`). 6+ accents (cyan, indigo, purple, orange, emerald, rose, blue, yellow) with no meaning attached. Light mode is only partial. |
| Typography | 3 | Both | Web fonts fail to load; 8–11 px uppercase labels; `font-black` + `tracking-widest` used as decoration; three font families declared. |
| Visual hierarchy | 4 | Both | On calculators the key result (bricks to order, total) sits in a toolbar *above the 3D view, below all inputs* — 1,176 px down at 375 px wide. Inputs and results get the same visual weight. |
| Desktop layout | 4 | Both | Works at 1440. Viewer collapses at 1280. At 1280 the Overview content column gets 432 of 1248 px (35%). |
| Mobile responsiveness | 3 | DOM measurements | No page-level horizontal scroll (overflow is clipped), but triple-nested padding, 8–10 px text, 0 of 29 controls ≥ 44 px, results far below the fold, and the 3D canvas traps scroll. |
| Tablet responsiveness | 4 | Both (853 px) | Stacks reasonably, but the canvas wheel-trap and nested panels hurt. |
| Accessibility | 2 | Source + DOM | No keyboard nav for the sidebar, no labels, focus outlines removed, low-contrast text, no reduced-motion handling. |
| Usability | 3 | Both | 26 of 31 nav items mislead; currency selector changes the symbol but not the values; fake controls on the Overview. |
| Consistency | 3 | Source | Each calculator re-implements the same shell, Three.js setup and inputs by copy-paste (676–1045 lines each). |
| Frontend performance | 4 | Build + source | 1,008 KB JS (253 KB gzip) in one chunk; three.js loaded upfront; per-recalculation geometry/material not disposed; continuous rAF + autoRotate even when the view is hidden. |
| Maintainability | 3 | Source + lint | 24 lint errors / 9 warnings; 22 empty files; dead `App.css`, `LoginPage.js` and template assets; heavy duplication. |

---

## C. Findings register

Severity: **Critical / High / Medium / Low**. Effort: S (< ½ day), M (½–2 days), L (> 2 days). **V** = verified in the running app, **S** = verified in source, **P** = probable, needs testing.

### C1. Functional and trust failures

| ID | Where | Issue and evidence | Viewports | Impact | Sev | Fix | Effort | Risk |
|---|---|---|---|---|---|---|---|---|
| F01 | `src/App.jsx:75-81, 506-520` | **26 of 31 nav items don't open their tool.** Only Bricks, Foundation, Excavation, Column and Pool are routed. `CementCalculator`, `SandCalculator`, `AggregateCalculator` and `ConcreteCalculator` (40–48 KB each) are never imported. 22 component files are 0 bytes. **V:** clicked "Cement Calculator" → header reads "Cement Calculator", body shows the "Cement Mix… Material Yield" mock cards. | All | Users conclude the tool is broken or fake. | Critical | Import and route the 4 finished calculators. For the rest, either remove them from the nav or show them disabled with a "Planned" tag and no click. Move the view map into one `tools` config (id, label, group, component, status) that the sidebar and router both read. | S | Low. The 4 components are self-contained; each needs a visual smoke test. |
| F02 | `App.jsx:127-152, 520-587, 642-651, 83-101` | **Fabricated status and data.** "Project Health 100%", "System Online", "Sync: 2m ago", unread-notification dot, "Export" (no handler), avatar "Admin" from `ui-avatars.com`, "Pro AI Tools", "Upload CAD files or sync to cloud". Overview inputs are `div`s; `VerticalBarChartStatic` uses `Math.random()` inside render (lint: `react-hooks/purity` ×5), so bars jump on every re-render. The donut's center label reads "Data". | All | Undermines trust in the real calculations. | Critical | Remove every indicator that isn't backed by state. Replace the Overview with a **tool index** (grouped list with a one-line description and the inputs each tool needs), plus "Recent estimates" once persistence exists. Keep "Export" only when it does something (e.g. print the current report). | M | None for logic, since all of this is static. |
| F03 | All calculators, e.g. `BricksCalculator.jsx:430-436, 589` | **3D viewer collapses inside the shell at `xl`.** **V** at 1280×800 with sidebars open: viewer panel `clientWidth = 0`, canvas falls back to `800` px (`container.clientWidth \|\| 800`, line 88) and extends to **x = 1617**. Root cause: the calculator switches to `xl:flex-row` with a fixed `xl:w-[380px]` input panel based on the **viewport**, but its real container is ~412 px wide (88 rail + 252 nav + 380 "Live Workspace" panel take the rest). | 1280–~1500 with panels open (P: up to the point the main column reaches ~800 px) | The core feature is invisible on the most common laptop width. | Critical | (1) On calculator routes, don't render the "Live Workspace" right panel; it's a demo. (2) Base the calculator's two-column switch on **its own width** (Tailwind 3 container queries via `@tailwindcss/container-queries`, which is a new dependency and needs approval, or a `ResizeObserver` on the root). Two columns at ≥ 880 px container width, stacked below. (3) Drop `min-h-screen` / `h-[88vh]` inside the shell. | M | Re-test all 9 calculators at 1024–1920. |
| F04 | Calculators: `select name="currency"` (e.g. `BricksCalculator.jsx:446`) | **Currency selector changes only the symbol.** Choosing $ shows "$21,363" for a ₹-priced estimate. | All | A wrong number in a cost tool. | High | Remove the selector, or make it a "rates entered in" label with no conversion implied. Format with `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})` so lakh grouping shows (`₹1,23,456`); the code currently uses `'en-US'` grouping. | S | Low. |
| F05 | `App.jsx:446-450, 454-471, 473` | **6.8 s intro blocks every page load.** No skip, no `prefers-reduced-motion` check. During it the app shell sits at `scale-90 opacity-0 blur-lg`. | All | Every visit costs 7 s. Motion-sensitive users get bricks dropping, a glitch effect and a laser sweep. | High | Remove it. If a brand moment is wanted, show the wordmark statically for ≤ 600 ms on the first visit only (sessionStorage), skippable, with no animation under reduced motion. | S | None. |
| F06 | `src/index.css:5` | **Web fonts never load.** `@import url(fonts.googleapis…)` comes after `@tailwind`; PostCSS drops it (build warning). **V:** `document.fonts.size === 0`. | All | Typography differs per machine; the planned type system isn't what users see. | High | Move the font request to `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` (or self-host). Load only the weights used. Drop Montserrat (used once, in the intro). | S | None. |
| F07 | `App.jsx:225-239` | **Broken SVG path** in `AnimatedLineChartStatic`. **V:** console `Error: <path> attribute d: Expected number, "…C 350,20 400,30 L400,100 Z"` (the cubic is missing its third point). | All | Console noise; the chart renders partially. | Low | Goes away with F02. Otherwise complete the curve. | S | None. |

### C2. Layout and responsiveness

| ID | Where | Issue and evidence | Viewports | Sev | Fix | Effort |
|---|---|---|---|---|---|---|
| R01 | `App.jsx:473`, `index.css:7-23` | **Transformed shell breaks `fixed` drawers.** The shell always carries `scale-*` and `blur-*` classes, so it has a `transform`/`filter`, which makes it the containing block for its `fixed` children. Drawers are then positioned relative to the shell and clipped by its `overflow-hidden`. **V:** at 320 px the right drawer measured to x = 480 inside a shell with `scrollWidth = 480`; `main` `scrollWidth = 380` vs `clientWidth = 320`. | ≤ 1023 | High | After removing the intro (F05), drop the transform/filter classes from the shell. Render drawers and overlays outside the shell (React portal to `body`). | S |
| R02 | `App.jsx:473`, `index.css:16-23` | **`h-screen` inside a padded `#root`.** At ≥ 1024 the root adds 16 px padding but the shell is still `100vh`. **V:** shell is 900 px tall in an 868 px box, so the rounded corners and top/bottom padding are clipped. `100vh` also misbehaves under the mobile Safari URL bar (P). | ≥ 1024; mobile Safari | Medium | Use `h-dvh` (Tailwind ≥ 3.4 has it) and size the shell to the padded box (`h-full` on a `100dvh` root). Consider dropping the "floating rounded window" frame entirely; it wastes 32 px on every side for no function. | S |
| R03 | `App.jsx:51, 597, 600`; calculators | **Too many columns at 1280.** 88 px rail + 252 px nav + content + 380 px "Live Workspace". **V:** Overview content column 432 px, cards 196 px each, so labels like "Estimated Cost" wrap. | 1024–1440 | High | Two-level nav collapses to the rail by default below 1440 (labels on hover/focus via tooltip, or a single 240 px labeled list with no separate rail). Remove the right panel (see F03). | M |
| R04 | Calculators, e.g. Bricks `430, 436, 589` | **Nested padding and frames.** `main p-4` → calculator `p-4` → panel `p-5` → section card `p-4` → inner box `p-2`. **V:** at 375 px the calculator root's content is 383 px wide inside 331 px. The panels-in-cards-in-panels also read as clutter. | ≤ 640 | High | One frame per region: the calculator root has no padding or background; the input column is a plain form with section headings and dividers, not cards. | M |
| R05 | Bricks `588-616`, all calculators (P) | **Results below the fold on mobile.** **V:** at 375 px the result summary (bricks to order, total) starts ~1,176 px down, after every input and section. | ≤ 1023 | High | Mobile pattern: a **sticky bottom summary bar** (total + primary quantity + "View breakdown") that opens the report as a full-height sheet. On desktop, keep the summary pinned at the top of the result column. | M |
| R06 | Bricks `101-108` (OrbitControls), all 3D calculators | **Scroll trap.** OrbitControls captures the wheel. When stacked (< 1280) the 500 px canvas sits in the scroll flow, so scrolling over it zooms the model instead of the page. **V:** at 853 px, the second scroll zoomed the wall out instead of scrolling. `autoRotate` is always on. Touch drag over the canvas (P) also rotates instead of scrolling. | ≤ 1279, touch | High | `controls.enableZoom = false` until the canvas is clicked/focused ("Click to interact" overlay), or zoom only with Ctrl/⌘ + wheel. `autoRotate = false` by default. Set `touch-action: pan-y` on the canvas until activated. Add explicit zoom +/– and "Reset view" buttons. | S |
| R07 | Bricks `459-547` and similar | **8–10 px labels.** **V** at 375 px on Bricks: 4 elements at 8 px, 12 at 9 px, 7 at 10 px. All uppercase. | All, worst on mobile | High | Minimum 12 px for labels and metadata, 14 px for inputs. **Use 16 px input text on mobile** to stop iOS zoom-on-focus (P). Sentence-case labels. | S |
| R08 | All calculators | **Touch targets.** **V** Bricks @375: 0 of 29 controls ≥ 44×44, 4 under 24×24 (fails WCAG 2.5.8): the opening-remove "✕" and the inline price inputs. | Touch | High | Min 40 px tall controls (44 on touch), 24×24 absolute minimum for inline icon buttons with spacing. | S |
| R09 | `App.jsx:109-155` | **Header wraps into two rows on mobile** (V @375 screenshot: title row, then the toggle/bell/avatar/panel row). It also shows decorative items (bell, avatar) that do nothing. | ≤ 640 | Medium | Mobile header: menu button, page title, one overflow button. Remove the bell and avatar until accounts exist. | S |
| R10 | `index.css:7-12` | `html, body { overflow: hidden }`, so all scrolling happens in inner `div`s. Breaks browser scroll restoration, pull-to-refresh, and "scroll focused input into view" when the on-screen keyboard opens (P). | Mobile | Medium | Let the document scroll on < 1024 and keep inner scroll areas only for the desktop split layout. | M |

### C3. AI-template visual patterns (originality audit)

| ID | Where | Current pattern | Why it weakens CivisMetric | Alternative | Benefit | Pri |
|---|---|---|---|---|---|---|
| V01 | `App.jsx:456-458, 481-488`; every calculator (2 each) | Blurred colored blobs (`blur-[100–150px]`, purple/cyan/orange/red) behind content. 7 in `App.jsx`, 2 per calculator. | Pure decoration. Costs GPU, lowers text contrast unpredictably, and is the single most recognizable "AI landing page" trait. | Remove. Use a flat paper or ink background; the blueprint grid at very low opacity only *inside* the 3D viewport, where it means "drawing area". | Calm, credible, faster. | High |
| V02 | Logo `App.jsx:59`; active dot `:36`; health bar `:133`; slider `:187`; brick count `Bricks:599`; title `:465` | Cyan→indigo gradients on brand, state and data; gradient **text** for key numbers. | Gradient text lowers legibility of the most important number on the page; gradients on state indicators carry no meaning. | Solid colors. Key totals in ink color at large size with tabular figures; the accent reserved for *one* thing (primary action / selection). | Hierarchy through size and weight, not effects. | High |
| V03 | Calculators: `backdrop-blur-xl` on panels (4–5 each) | Glassmorphism over opaque `#020617`. | There's nothing behind the glass to blur; it just costs paint time. | Opaque surfaces with a 1 px border. | Simpler, faster. | Medium |
| V04 | `shadow-[0_0_8px_#06b6d4]` dots, glowing buttons (`Bricks:459, 513, 553, 621, 628`) | Neon glows on section dots and active segments. | Reads as "cyber" rather than "engineering". Glow makes the active state ambiguous on light backgrounds. | Active segment = solid fill + text color change; section headings without dots. | Clear state. | Medium |
| V05 | Calculator headers (🧱 `Bricks:440`, 🧪 Cement, ⏳ Sand, 🪨 Aggregate, 🚜 Excavation); shell uses Heroicons-style SVGs | Emoji as product icons next to a stroked SVG set; 6 rail icons (`App.jsx:61-67`) do nothing. | Two icon languages, and emoji render differently per OS. Dead icons teach users that clicking does nothing. | One stroked icon set (keep the existing 1.5 px outline style; draw ~12 domain icons: wall, footing, column, slab, excavation, pool, bag, sand pile). The rail either gets real destinations (tool groups) or is removed. | Coherent, recognizable. | High |
| V06 | Every calculator: 28–38 `uppercase` + `tracking-wider/widest` per file | Uppercase micro-labels as the default label style. | Uppercase 9 px text is slow to read and flattens hierarchy, since everything looks like a "kicker". | Sentence case, 12–13 px, medium weight. Reserve uppercase for table column headers only. | Readability. | Medium |
| V07 | Shell vs calculators | Three neutral bases (`#09090b`, `#050b1a`, `#020617`) and per-section accent coding (cyan geometry, orange materials, emerald rates; Math steps cyan/orange/indigo/emerald/yellow). | Colors suggest meaning that doesn't exist; no palette to grow into. | One neutral ramp and one accent; semantic colors only for success/warn/error and the material legend in charts. | Coherence. | High |
| V08 | `App.jsx:521-587` | Six identical "card + fake input + fake slider + chart" tiles. | The template's signature move, with fake content. | Tool index as a **list/table** grouped by trade (Masonry, Concrete, Earthwork, Finishing, Costing), with each row: name, what it estimates, inputs needed. | Scannable, honest. | High |
| V09 | Radii inventory | `rounded-[2rem]`, `3xl`, `2xl`, `xl`, `[11px]`, `lg`, `md`, `[4px]`, `[3px]`, `[2px]`, `full` (11 values). Pills on toggles and badges. | Inconsistent; large radii make an engineering tool feel toy-like. | 3 radii: 4 px (inputs, buttons, tags), 8 px (panels, sheets), full (avatars and switch thumbs only). | Precise, technical feel. | Medium |
| V10 | `App.jsx:465-467`, `index.css:139-151` | Red "laser sweep" gradient wordmark, "Architecting The Future". | Generic tagline; red reads as error in a cost tool. | A simple wordmark in ink with one structural detail (e.g. a dimension tick under "Metric"). | Ownable mark. | Medium |

**Keep (these are good):** the **Math view** (`Bricks:653-740`), the **itemized Report** with `print:` styles (`:743-833`), the 3D wall with openings and the instance cap (`:292-301`), the **Realistic/Blueprint** toggle, debounced recalculation (`:204-207`), the unit selector, `tabular-nums` in the Overview. The blueprint-grid motif is on-theme; use it with restraint.

### C4. Accessibility (WCAG 2.2 AA)

| ID | Issue | Evidence | Status | Sev | Fix |
|---|---|---|---|---|---|
| A01 | Nav not keyboard-operable | `SidebarSection` items are `div onClick` (`App.jsx:28-41`); logo and Overview icon likewise. 0 `role`, 0 `tabIndex`. | S | Critical | `<nav aria-label="Tools">` with `<button>` items (or links if routing is added) and `aria-current="page"` on the active item. |
| A02 | Inputs without programmatic labels | V: 16 inputs/selects on Bricks have no `label[for]`/`aria-label` (`<label>` elements exist but aren't associated). 0 `htmlFor` in the codebase. | V | High | Shared `<Field id label unit hint error>` component that wires `htmlFor`, `aria-describedby` for units/hints, and `aria-invalid`. |
| A03 | Focus visibility removed | `outline-none` on most inputs with a 1 px `focus:ring-1`; theme toggle `focus:outline-none` with no replacement; 0 `focus-visible` usages. | S | High | Global `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }`; remove `outline-none`. |
| A04 | Icon-only buttons without names | V: 3–4 per screen (menu, right-panel toggle, theme switch, mobile close). | V | High | `aria-label` ("Open tool list", "Switch to light theme"…); the theme switch should be `role="switch" aria-checked`. |
| A05 | Text contrast | Computed: light-mode section headings `slate-400` on white **2.56:1**; `cyan-500` text/buttons vs white **2.43:1**; `zinc-500` on `#18181b` **3.67:1** at 10–12 px; `slate-500` 9 px labels on `slate-900` **3.75:1**; footnote `slate-400` on `slate-50` **2.45:1**. | Computed | High | Adopt the token palette in §D (all text ≥ 4.5:1; verified values listed). |
| A06 | Motion | No `prefers-reduced-motion` anywhere (V: grep). Infinite animations: laser text, bob, ping, pulse, autoRotate, shimmer. | S | High | Respect reduced motion globally: no intro, no autoRotate, no brick-drop animation (place bricks instantly). |
| A07 | Status by color only | Door/window type in the openings list is shown only by emerald vs blue text; Math steps are distinguished by color. | S | Medium | Text is present for door/window (OK). Add an icon/label where color is the only cue; Math steps already have "Step n" text (OK). |
| A08 | 3D canvas has no text alternative | The canvas has no `aria-label`; all its information exists in the Report (good). | S | Medium | `role="img"` + `aria-label` summarizing ("Brick wall 15 × 10 ft, 1,673 bricks"); keyboard controls for rotate/zoom/reset. |
| A09 | Live results not announced | Totals update after a 300 ms debounce with no live region. | S | Medium | Put the summary bar in `aria-live="polite"`. |
| A10 | Heading structure | `h1` is "Workspace" in the sidebar; the page title is an `h2`; calculators then use `h2` "CivisMetric" and `h1` "Engineering Calculations" inside the content. | S | Medium | One `h1` per view (the tool name); `h2` for regions (Inputs, Results, Breakdown). |
| A11 | Tables | Report tables use `<th>` without `scope`; the spec tables are label/value rows in `<td>`. | S | Low | `scope="col"`; use `<th scope="row">` for labels. |

Not verifiable here: screen-reader output, 200% zoom/reflow at 320 CSS px, Windows High Contrast, voice control.

### C5. Performance and code quality

| ID | Issue | Evidence | Sev | Fix |
|---|---|---|---|---|
| P01 | Single 1 MB bundle | Build: `index-*.js 1,008.52 kB (gzip 253.47 kB)`; three.js and all calculators load before anything renders. | High | `React.lazy` per calculator, so three.js loads only when a 3D tool opens. The Overview/index then ships ~150 KB. |
| P02 | GPU memory growth on every input change | `BricksCalculator.jsx:279-282`: each recalculation creates a new `BoxGeometry` + `MeshStandardMaterial` and only calls `mesh.dispose()`, which doesn't dispose geometry or material. Same pattern in the others (P). | Medium (P: not profiled) | Dispose `mesh.geometry` and `mesh.material` too, or reuse one geometry/material and only update the instance matrices. |
| P03 | Render loop never pauses | rAF + `autoRotate` run while Math/Report is shown (canvas hidden with `hidden`) and when the tab is idle. Shadow map 2048². V: console `PCFSoftShadowMap has been deprecated`. | Medium | Render on demand (on controls `change` or during the drop animation); pause when hidden; `PCFShadowMap`; 1024² shadow map. |
| P04 | Expensive paint effects | 7+ `blur-[100px+]` layers, `backdrop-blur-xl` panels, `drop-shadow` filters on animated SVGs. | Medium | Removed by V01–V04. |
| P05 | Lint | `eslint .`: **24 errors, 9 warnings**. `react-hooks/immutability` (`calculateAndRender` used before declaration) in all 9 calculators; `react-hooks/purity` ×5 (`Math.random` in render, `App.jsx`); `no-unused-vars` ×10; `exhaustive-deps` ×9. | Medium | Fix during the shared-component refactor (wrap calculation in a pure `compute(inputs)` function plus a `useMemo`; keep Three.js side effects in an effect). |
| P06 | Dead code and assets | `src/App.css` (Vite template, unused), `assets/hero.png`, `react.svg`, `vite.svg`, `LoginPage.js` (unused; JSX in a `.js` file), 22 empty `.jsx` files, `README.md` is the Vite template. | Low | Delete after confirming nothing is planned for them; replace the README with product docs. |
| P07 | Massive duplication | 9 calculators × 676–1,045 lines, each re-implementing the panel shell, inputs, Three.js scene, toolbar, Math/Report views and print styles. Only 7 responsive-prefix usages per calculator. | High (root cause of most inconsistency) | Extract ~6 shared pieces (see §G). Keep each calculator's **formula** and **scene builder** as its own module. |
| P08 | Third-party request | Avatar image from `ui-avatars.com` on every load. | Low | Remove (no accounts exist). |
| P09 | Backend unused | `engineering-backend/server.js` exposes 7 `/api/calculate/*` routes; the frontend makes **0** network calls (V: grep). The backend's formulas (e.g. foundation `4500 ₹/m³`) differ from the frontend's. | Info | Not a design task. Flagging so nobody assumes the API is the source of truth. **No API contract changes are proposed.** |

---

## D. Color and design recommendations

### What's there now
- Neutrals: zinc (`#09090b`, `#18181b`, `#27272a`), slate (`#f8fafc` … `#020617`), plus an ad-hoc `#050b1a`.
- Accents: cyan `#06b6d4`, indigo `#6366f1`, and decoratively purple, orange, red, emerald, rose, blue, yellow.
- **Keep:** the *idea* of a cool blueprint blue for drawing/3D contexts, emerald-ish for money totals (map it to a token), and the brick reds for 3D materials (they're material colors, not UI colors).
- **Remove:** gradients, purple, rose, glow shadows, `#050b1a`/`#020617` as page backgrounds, cyan as a text color on light surfaces (2.43:1).
- **Adjust:** use one neutral family; make light mode first-class (site engineers print and use phones outdoors in bright light).

All ratios below were computed against the listed backgrounds (page / surface).

### Direction A — "Drafting Sheet" (recommended)
Warm paper, ink text, blueprint blue, one construction-orange signal.

| Token | HEX | Contrast |
|---|---|---|
| bg (page) | `#F6F4EF` | — |
| surface | `#FFFFFF` | — |
| surface-sunken (inputs, table stripes) | `#ECE8DF` | — |
| text-primary | `#1C1B18` | 15.7 / 17.2 |
| text-secondary | `#47443D` | 8.8 / 9.7 |
| text-muted | `#6A665C` | 5.2 / 5.7 |
| border (dividers) | `#D9D3C6` | decorative |
| border-control (inputs) | `#8C8475` | 3.4 / 3.7 (≥ 3:1 non-text) |
| primary (blueprint) | `#1E4E8C` | 7.6 / 8.3 |
| primary-hover | `#173D6E` | — |
| on-primary | `#FFFFFF` | 8.3 |
| focus ring | `#2563EB` 2 px + 2 px offset | 5.2 vs white |
| accent (signal: totals highlight, selected material) | `#B4471A` | 5.0 / 5.4 |
| success | `#2F6B3A` | 5.8 / 6.4 |
| warning | `#8A5A00` | 5.4 / 5.9 |
| error | `#B42318` | 6.0 / 6.6 |
| info | `#1E4E8C` | = primary |

Proportions: ~80% paper/white, ~15% ink text and rules, ~4% blueprint (primary buttons, links, selection, 3D wireframe), ~1% orange signal.
Strengths: matches printed estimates, reads well in sunlight, distinctive against the dark-SaaS crowd, and the 3D viewport becomes the one dark "drawing board" region.
Weaknesses: warm neutrals can look beige if overused (keep surfaces white and the page tone subtle); needs a dark mode built from the same hues.

### Direction B — "Site at Night" (dark-first)
| Token | HEX | Contrast (bg/surface) |
|---|---|---|
| bg / surface / sunken | `#111315` / `#181B1F` / `#0C0E10` | — |
| text / secondary / muted | `#ECE9E3` / `#BDB8AE` / `#8F8A80` | 15.4/14.3 · 9.4/8.8 · 5.4/5.0 |
| primary (safety amber) | `#F0A23B`, on-primary `#1A1206` | 8.8/8.2 · 8.8 |
| secondary (survey teal) | `#5FB3A6` | 7.5/7.0 |
| success / warning / error / info | `#6BBF7A` / `#F0C04A` / `#F07166` / `#7DB2F0` | all ≥ 6.0 |
| border-control | needs ≥ 3:1 vs `#181B1F`: `#5E656F` is only 2.93, so go lighter (verify) | — |

Strengths: closest to today's dark look, so the easiest migration; amber is construction-native. Weaknesses: dark UIs print badly and read poorly outdoors; amber primaries are common in construction SaaS.

### Direction C — "Civic Slate"
| Token | HEX | Contrast (bg/surface) |
|---|---|---|
| bg / surface / sunken | `#F3F5F7` / `#FFFFFF` / `#E8ECF0` | — |
| text / secondary / muted | `#101828` / `#344054` / `#5D6B7E` | 16.2/17.8 · 9.6/10.5 · 5.0/5.4 |
| primary (deep teal) | `#0F6E66`, on-primary `#FFFFFF` | 5.6/6.1 · 6.1 |
| accent (ochre) | `#B45309` | 4.6/5.0 |
| success / warning / error / info | `#15803D` / `#A15C07` / `#B42318` / `#1D5FA8` | 4.6–6.6 |
| border-control | `#7D879A` | 3.6 vs white |

Strengths: neutral and trustworthy. Weaknesses: the least distinctive; it's what most dashboards already look like.

**Recommendation: A ("Drafting Sheet")**, with a dark theme derived from B's neutrals and A's blueprint hue lifted for dark (e.g. `#7DB2F0`). It's the only direction that comes from what CivisMetric produces (a printed bill of quantities with workings), and it makes the Math/Report views, currently forced to light `bg-slate-50` inside a dark app, the natural center of the product.

---

## E. Responsive issue matrix

✅ checked, no issue found · ❌ verified issue · ⚠️ probable (source-based) · — not tested

| Page | 320 | 360 | 375 | 390 | 430 | 768 | 820 | 853 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Overview | ❌ R01 drawer/shell overflow, R09 | — | ❌ R09, R01 | — | — | ✅ no overflow; ⚠️ 2-col cards | — | — | ❌ R01 drawer positioned off shell | ❌ R03 cramped 196 px cards | ✅ | ⚠️ R02 shell max 1600, empty margins |
| Bricks | ⚠️ R04/R07 worse | — | ❌ R04, R05, R07, R08, A02 | — | — | — | — | ❌ R06 scroll trap, V-patterns | ⚠️ | ❌ **F03 viewer width 0, canvas to x=1617** | ⚠️ (not re-measured) | ⚠️ |
| Foundation, Excavation, Column, Pool | ⚠️ same shell as Bricks (`xl:w-[380–420px]`, `h-[88vh]`, `min-h-screen`) | — | ⚠️ | — | — | — | — | — | — | ⚠️ F03 likely | — | — |
| Cement, Sand, Aggregate, Concrete | Not reachable (F01) | | | | | | | | | | | |
| Intro | ⚠️ fixed 340 px stage at `scale(1.25)` = 300 px house in a 320 px viewport | — | — | — | — | — | — | — | — | — | ✅ | — |

---

## F. Page-by-page redesign plan

**1. Overview → "Tools" index** (`App.jsx:520-587`)
- *Goal:* pick the right estimator quickly. *Today:* a mock dashboard with nothing to do.
- *New structure:* page title "Estimators" + one-line purpose. Grouped list by trade (Masonry · Concrete & Structure · Earthwork · Finishing · Costing). Each row shows the tool name, what it outputs ("Bricks, cement bags, sand, labor days, cost") and its inputs ("wall L × H × T, openings"). Planned tools are listed muted with a "Planned" tag and aren't clickable.
- *Later:* "Recent estimates" (requires local persistence; no backend change).
- *Mobile:* the same list, full width; no cards.

**2. Shell / navigation** (`Sidebar`, `DashboardHeader`)
- One 248 px labeled sidebar ≥ 1280; collapsible to a 64 px icon rail with tooltips at 1024–1279; drawer (portal) < 1024 with focus trap, Esc to close, and focus returned to the menu button.
- Header: tool name (h1), and on calculator pages a right-aligned **Print estimate** button. Remove Project Health, bell, avatar, Export, the right-panel toggle and the "Live Workspace" panel (its 3D demo duplicates what calculators do for real).
- Theme switch moves to the sidebar footer.

**3. Calculator pages** (shared layout for all 9)
- **Desktop (container ≥ 880 px):** two columns. Left (360 px): the inputs form in 3 sections (Dimensions · Material · Rates), with headings and hairline dividers, not cards. Right: a **result summary strip** (primary quantity, secondary quantities, total cost in large tabular figures), then tabs: **Model · Workings · Estimate** (rename "3D Vis / Math / Report"; "Workings" is the term engineers use).
- **Mobile/tablet:** a single column of inputs; a **sticky bottom bar** with total + primary quantity + "View estimate", which opens Workings/Estimate as a full-screen sheet. The 3D model sits behind a "Show model" disclosure with a 4:3 aspect ratio, interaction gated by a tap.
- Remove the per-calculator "CivisMetric / Estimation Engine" header, emoji tile and currency select (F04).
- Openings editor (Bricks): a table (Type · W · H · X · Y · remove) with an "Add opening" row; 40 px controls.
- **States:** today an invalid dimension (0) just clears the model and keeps stale results. Add field-level validation ("Length must be greater than 0"), an empty state in the model area ("Enter wall dimensions to see the model"), and a "Model simplified for display; quantities are exact" notice styled as info, not an orange pill.

**4. Workings view** (`Bricks:653-740` pattern)
- Already strong. Restyle as a calculation sheet: numbered steps, the formula in mono, substituted values, and the result right-aligned and bold. Ruled lines instead of card-in-card. Keep the color-coded step borders out; use step numbers.

**5. Estimate / Report view** (`Bricks:743-833`)
- Make it a real document: project name field, date, prepared-by (optional, local only), rates basis, then the itemized table (Item · Qty · Unit · Rate · Amount) with right-aligned tabular numbers, subtotal / labor / grand total, and assumptions as a numbered list (currently a single italic footnote). `en-IN` currency formatting. Print stylesheet already exists; keep it and test it in Chrome's print preview.

**6. Intro** — remove (F05).

**7. LoginPage.js** — unused; there's no auth in the app. Leave it out of scope; delete or park it.

---

## G. Design system proposal

**Tokens** (CSS custom properties in `index.css`, mapped once in `tailwind.config.js` `theme.extend.colors` so Tailwind classes read `bg-surface`, `text-muted`, etc.; dark mode redefines the variables under `.dark`, so components never write `dark:` pairs):

```
--bg --surface --surface-sunken --text --text-2 --text-muted
--border --border-control --primary --primary-hover --on-primary
--accent --focus --success --warning --error --info
--viz-1..6 (material legend: brick, cement, sand, aggregate, steel, water)
```

**Typography**: Inter (variable, 400/500/600/700) for UI; **JetBrains Mono or Roboto Mono 400/500 only for the Workings formulas** (the mono font is already declared). Drop Montserrat. Enable `font-feature-settings: "tnum"` for all numeric cells and results.

| Role | Mobile | Desktop | Weight / line-height |
|---|---|---|---|
| Page title (h1) | 22 | 28 | 600 / 1.2 |
| Section (h2) | 17 | 18 | 600 / 1.3 |
| Subsection / label group (h3) | 14 | 14 | 600 / 1.4 |
| Body / inputs | 16 | 14–15 | 400 / 1.5 |
| Label | 13 | 13 | 500 / 1.4 |
| Caption / meta | 12 | 12 | 400 / 1.4 |
| Key figure (total) | 28 | 36 | 600 tnum / 1.1 |
| Table numbers | 14 | 14 | 500 tnum |

Max line length 72ch for prose (Workings notes, assumptions).

**Spacing** (4 px base): 4, 8, 12, 16, 24, 32, 48. Page gutter 16 (mobile) / 24 (tablet) / 32 (desktop). Section gap 24. Form row gap 12. Use Tailwind's default scale; ban arbitrary `p-[…]`.

**Breakpoints**: Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536) for the shell; **container width** (not viewport) for the calculator split at 880 px.

**Radii**: `--r-sm 4px` (controls, tags), `--r-md 8px` (panels, sheets, model viewport), `full` (switch thumb only).
**Borders**: 1 px everywhere; 2 px only for the focus ring and the grand-total rule.
**Shadows**: one, for floating layers only (drawer, sheet, menu): `0 8px 24px rgb(0 0 0 / .12)`. No shadows on in-flow panels.

**Components (shared, in `src/components/ui/`):**
`AppShell`, `SideNav`, `PageHeader`, `Field` (label + input + unit suffix + hint + error), `NumberInput`, `Select`, `SegmentedControl` (Model/Workings/Estimate; Door/Window; Realistic/Blueprint), `Button` (primary / secondary / ghost / danger; sm 32, md 40, lg 48), `ResultSummary`, `EstimateTable`, `WorkingsStep`, `ModelViewport` (shared three.js renderer: resize, on-demand render, gated controls, dispose), `Notice` (info / warn / error).

**Interaction states:** hover = surface-sunken background or primary-hover; active = 1 px translate-y is *not* used, darken instead; focus-visible = 2 px `--focus` outline, 2 px offset; disabled = 40% opacity + `cursor-not-allowed` + `aria-disabled`; selected (segmented/nav) = `--primary` text + 2 px left/bottom indicator. Transitions 120–160 ms `ease-out` on color/background only; none under reduced motion.

---

## H. Prioritized implementation roadmap

**P0 — critical failures**
1. F01 Wire the 4 finished calculators; disable/hide the 22 empty tools via a single `tools` config.
2. F02 Remove fabricated indicators and the fake Overview; ship the Tools index.
3. F03 + R03 Remove the "Live Workspace" panel on calculator routes; calculators size to their container; drop `min-h-screen`/`h-[88vh]` inside the shell.
4. F05 Remove the intro (fixes R01's transform root cause at the same time).
5. A01–A04 Semantic nav buttons, associated labels, focus-visible, accessible names.
6. F04 Currency: remove the symbol switch; `en-IN` formatting.

**P1 — high-impact responsive and visual**
7. R05 sticky mobile result bar; R04 flatten nesting; R07/R08 type and target sizes; R06 gated 3D controls; R09 mobile header; R10 document scroll on mobile.
8. F06 fix font loading.
9. V01–V04 remove blobs, gradients, glass and glows.
10. P01 code-split calculators.

**P2 — brand, type and structure**
11. Tokens + Direction A palette + full light/dark parity (fixes the dark calculator inside light shell).
12. Shared `ui/` components; migrate calculators one at a time (Bricks first as the reference).
13. V05 icon set; V06 sentence-case labels; V09 radii; wordmark (V10).
14. Workings and Estimate views restyled as sheet/document; print verification.

**P3 — polish**
15. P02/P03 Three.js disposal and on-demand rendering; A08/A09 canvas alternative and live region; A10/A11 headings and table scopes; P05 lint to zero; P06 dead files; README.

---

## I. Validation strategy

- **Baseline first:** `npm run lint` (currently 24 errors / 9 warnings), `npm run build` (currently 1,008 KB JS, CSS `@import` warning), console (currently 2 SVG path errors + Three.js deprecation warning). Capture screenshots of Overview, Bricks, Foundation and Pool at 375 / 768 / 1280 / 1440 in both themes.
- **Per change:** representative routes (Tools index, Bricks, Foundation, Pool) at 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920. Check: `document.documentElement.scrollWidth === innerWidth`; no element's right edge > viewport; the viewer canvas width equals its container width; the result summary is visible without scrolling on desktop and pinned on mobile.
- **Interaction:** change every input → result updates within 300 ms; add/remove opening; switch Model/Workings/Estimate; print preview of Estimate; theme toggle on every page; drawer open/close with keyboard (Tab, Esc) and focus return.
- **Accessibility:** keyboard-only pass through nav → form → tabs → print. axe DevTools (0 serious/critical). Contrast tokens ≥ 4.5:1 (text) and ≥ 3:1 (controls, focus). Reduced-motion emulation: no intro, no autoRotate, no brick drop. 200% zoom at 1280 and reflow at 320. NVDA or VoiceOver spot-check of one calculator.
- **Regression for calculations:** before refactoring, record outputs for 3 fixed input sets per calculator (e.g. Bricks: 15×10×0.75 ft, Standard India, 1:5, 5% → currently **1,673 bricks, ₹21,363**). After each migration the numbers must match exactly. This is the main guard that "business logic is preserved".

## J. Before-and-after success criteria

| Criterion | Before (measured) | Target |
|---|---|---|
| Nav items that open the screen they name | 5 / 31 | 100% of visible items (planned items non-interactive) |
| Fabricated status indicators | 7 (health, online, sync, bell dot, avatar, AI tools, CAD upload) | 0 |
| Viewer width at 1280×800 | 0 px (canvas overflows to x=1617) | = container width, ≥ 480 px |
| Time to interactive content on load | ≥ 6.8 s (intro) | < 1 s on a dev build |
| Smallest text on calculators | 8 px | ≥ 12 px |
| Controls ≥ 24×24 / ≥ 44 tall on touch (Bricks @375) | 25/29 · 0/29 | 29/29 · all primary controls |
| Unlabeled inputs (Bricks) | 16 | 0 |
| Keyboard-reachable nav items | 0 | all |
| Lowest text contrast in palette | 2.43:1 | ≥ 4.5:1 |
| Web fonts loaded | 0 faces | Inter (+ mono on Workings) |
| Initial JS (gzip) | 253 KB | ≤ 120 KB on the Tools index; three.js only on 3D tools |
| Lint | 24 errors / 9 warnings | 0 / 0 |
| Corner radii in use | 11 | 3 |
| Accent hues in UI chrome | 6+ | 1 primary + 1 signal + 4 semantic |
| Distinct brand marks/names | 4 | 1 |

---

## Phase 12 — Implementation sequence (files, impact, tests)

| Step | Files | Shared? | Impact on other pages | Tests / acceptance |
|---|---|---|---|---|
| 1. Tool registry + routing | new `src/tools.js`; `App.jsx` (sidebar lists, view switch) | Yes, single source for nav + views | All nav | Every listed tool opens its component; planned items not focusable/clickable. |
| 2. Remove intro, fake header widgets, Live Workspace panel, Overview mock | `App.jsx`, `index.css` (intro keyframes) | Shell | All pages gain width | No console errors; no `transform` on the shell (`getComputedStyle(shell).transform === 'none'`). |
| 3. Font loading + tokens | `index.html`, `index.css`, `tailwind.config.js` | Yes | Everything restyles via tokens | `document.fonts.check('16px Inter')` with `fonts.size > 0`; build has no CSS warnings. |
| 4. Shell a11y + responsive nav | `App.jsx` → `components/ui/AppShell.jsx`, `SideNav.jsx`, `PageHeader.jsx` | Yes | All | Keyboard pass; drawer focus trap; widths 320–1920 without overflow. |
| 5. Shared form + result + viewport components | `components/ui/Field.jsx`, `SegmentedControl.jsx`, `ResultSummary.jsx`, `EstimateTable.jsx`, `WorkingsStep.jsx`, `ModelViewport.jsx` | Yes | Calculators adopt one at a time | Unit-level: render in isolation in both themes. |
| 6. Migrate Bricks (reference) | `BricksCalculator.jsx`: keep `brickTypes`, the calculation and the instance-building code; replace the JSX shell | — | None | Golden numbers match; F03/R04–R08 checks pass at all widths. |
| 7. Migrate the other 8 | each calculator file | — | None | Golden numbers per calculator; same responsive checks. |
| 8. Code-split | `App.jsx` (`React.lazy` + `Suspense` with a skeleton matching the calculator layout) | — | Faster first load | Build: index chunk ≤ target; each calculator its own chunk. |
| 9. Three.js lifecycle | `ModelViewport.jsx` | Yes | All 3D tools | Memory stable across 50 input changes (DevTools memory); no rAF while hidden. |
| 10. Cleanup | delete `App.css`, unused assets, empty files (after confirming), README | — | None | Lint 0/0. |

No backend routes, request/response shapes, or calculation formulas change in any step.
