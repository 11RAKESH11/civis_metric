import ToolIcon from '../components/ToolIcon';
import { computeSlab } from './slab';

// Product previews drawn as markup/SVG. They illustrate the screens; the figures come from the same
// slab method as the live estimator and are labelled as samples wherever they carry prices.
const SAMPLE = computeSlab({ length: 6, width: 4, thickness: 150, grade: 'M20', wastage: 5 });
const RATES = { cement: 380, sand: 1400, agg: 1250 }; // sample rates for the preview only
const f2 = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const f0 = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const ROWS = [
  { item: 'Cement, OPC 53', qty: SAMPLE.bags, unit: 'bags', rate: RATES.cement },
  { item: 'Sand', qty: SAMPLE.sandT, unit: 't', rate: RATES.sand },
  { item: 'Aggregate, 20 mm', qty: SAMPLE.aggT, unit: 't', rate: RATES.agg },
].map((r) => ({ ...r, amount: r.qty * r.rate }));
const SUBTOTAL = ROWS.reduce((s, r) => s + r.amount, 0);
const GST = SUBTOTAL * 0.18;

const Window = ({ title, children, dark = false, className = '' }) => (
  <div className={`rounded-md overflow-hidden border shadow-e2 ${dark ? 'bg-nav-deep text-white border-white/15' : 'bg-surface text-ink border-line'} ${className}`}>
    <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${dark ? 'border-white/15' : 'border-line bg-sunken'}`}>
      <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
    </div>
    {children}
  </div>
);

export function EstimatorVisual() {
  return (
    <Window title="Concrete estimator · M20 slab">
      <div className="grid grid-cols-5">
        <div className="col-span-2 p-4 space-y-2.5 border-r border-line">
          {[['Length', '6.00 m'], ['Width', '4.00 m'], ['Thickness', '150 mm'], ['Grade', 'M20 · 1 : 1.5 : 3']].map(([k, val]) => (
            <div key={k}><p className="text-xs font-semibold">{k}</p><p className="mt-0.5 rounded border border-line-control px-2 py-1 text-sm tabular-nums">{val}</p></div>
          ))}
        </div>
        <div className="col-span-3 p-4 bg-sunken">
          <svg viewBox="0 0 220 100" className="w-full" aria-hidden="true">
            <polygon points="30,60 130,60 190,32 90,32" fill="#d8d3ca" stroke="rgb(var(--c-primary))" strokeWidth="1.5" />
            <polygon points="30,60 130,60 130,72 30,72" fill="#b5aea2" stroke="rgb(var(--c-primary))" strokeWidth="1.5" />
            <polygon points="130,60 190,32 190,44 130,72" fill="#8c8478" stroke="rgb(var(--c-primary))" strokeWidth="1.5" />
            <path d="M30 82h100M30 79v6M130 79v6" stroke="#F28C28" strokeWidth="1.5" />
            <text x="80" y="95" fontSize="9" textAnchor="middle" fill="rgb(var(--c-nav))" fontWeight="600">6.00 m</text>
          </svg>
          <dl className="mt-2 text-sm space-y-1">
            <div className="flex justify-between"><dt>Order volume</dt><dd className="font-semibold tabular-nums">{f2(SAMPLE.order)} m³</dd></div>
            <div className="flex justify-between"><dt>Cement</dt><dd className="font-semibold tabular-nums">{SAMPLE.bags} bags</dd></div>
            <div className="flex justify-between"><dt>Sand</dt><dd className="font-semibold tabular-nums">{f2(SAMPLE.sandT)} t</dd></div>
          </dl>
        </div>
      </div>
    </Window>
  );
}

export function CadVisual() {
  return (
    <Window title="CAD Studio · Ground floor plan" dark>
      <div className="relative">
        <svg viewBox="0 0 400 230" className="w-full block" aria-hidden="true">
          <defs><pattern id="lg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgb(var(--c-tint))" strokeOpacity=".22" strokeWidth=".6" /></pattern></defs>
          <rect width="400" height="230" fill="url(#lg)" />
          <polygon points="70,40 290,40 290,130 220,130 220,190 70,190" fill="rgb(var(--c-primary))" fillOpacity=".25" stroke="rgb(var(--c-tint))" strokeWidth="1.6" />
          <path d="M70 205h220M70 200v10M290 200v10" stroke="#F28C28" strokeWidth="1.2" />
          <text x="180" y="219" fontSize="10" fill="#F28C28" textAnchor="middle" fontWeight="600">11.00 m</text>
          <path d="M310 40v90M305 40h10M305 130h10" stroke="#F28C28" strokeWidth="1.2" />
          <text x="334" y="88" fontSize="10" fill="#F28C28" fontWeight="600">4.50 m</text>
          <circle cx="290" cy="40" r="4" fill="#fff" /><circle cx="70" cy="190" r="4" fill="#fff" />
        </svg>
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {['pen', 'ruler', 'area', 'cube'].map((i) => <span key={i} className="grid place-items-center w-7 h-7 rounded bg-white/10 border border-white/20"><ToolIcon id={i} className="w-4 h-4" /></span>)}
        </div>
      </div>
      <p className="px-3 pb-2.5 pt-1 text-right text-xs font-mono">Snap 0.5 m · Area 41.25 m² · 3D extrude</p>
    </Window>
  );
}

export function BoqVisual() {
  return (
    <Window title="Project BOQ · sample figures">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead><tr className="bg-sunken text-left"><th className="px-3 py-2 font-semibold">Item</th><th className="px-2 py-2 font-semibold text-right">Qty</th><th className="px-2 py-2 font-semibold">Unit</th><th className="px-2 py-2 font-semibold text-right">Rate ₹</th><th className="px-3 py-2 font-semibold text-right">Amount ₹</th></tr></thead>
          <tbody className="divide-y divide-line">
            {ROWS.map((r) => (
              <tr key={r.item}><td className="px-3 py-2">{r.item}</td><td className="px-2 py-2 text-right tabular-nums">{r.unit === 'bags' ? r.qty : f2(r.qty)}</td><td className="px-2 py-2">{r.unit}</td><td className="px-2 py-2 text-right tabular-nums">{f0(r.rate)}</td><td className="px-3 py-2 text-right tabular-nums">{f0(r.amount)}</td></tr>
            ))}
          </tbody>
          <tfoot className="border-t border-line-control">
            <tr><td colSpan="4" className="px-3 py-1.5 text-right">Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums">{f0(SUBTOTAL)}</td></tr>
            <tr><td colSpan="4" className="px-3 py-1.5 text-right">GST 18%</td><td className="px-3 py-1.5 text-right tabular-nums">{f0(GST)}</td></tr>
            <tr className="bg-sunken font-semibold"><td colSpan="4" className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right tabular-nums">{f0(SUBTOTAL + GST)}</td></tr>
          </tfoot>
        </table>
      </div>
    </Window>
  );
}

export function RebarVisual() {
  const stock = 12;
  const cuts = [[4.8, 'rgb(var(--c-primary))'], [3.45, '#F28C28'], [3.85, '#159B72']];
  let x = 0;
  return (
    <Window title="BBS rebar optimizer · 12 m stock bars">
      <div className="p-4 space-y-4">
        <svg viewBox="0 0 260 60" className="w-full" aria-hidden="true">
          <path d="M10 45h60V15" fill="none" stroke="rgb(var(--c-primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M100 45h30l14-30h30" fill="none" stroke="rgb(var(--c-primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="205" y="12" width="44" height="34" rx="4" fill="none" stroke="rgb(var(--c-primary))" strokeWidth="5" />
          <text x="40" y="58" fontSize="8" textAnchor="middle" fontWeight="600">L-bend</text>
          <text x="140" y="58" fontSize="8" textAnchor="middle" fontWeight="600">Cranked</text>
          <text x="227" y="58" fontSize="8" textAnchor="middle" fontWeight="600">Stirrup</text>
        </svg>
        <div>
          <p className="text-xs font-semibold">Cutting pattern, one stock bar</p>
          <div className="mt-1 flex h-8 rounded overflow-hidden border border-line-control" role="img" aria-label="Three cut lengths of 4.8, 3.45 and 3.85 metres from one 12 metre bar, leaving 0.9 metres of offcut">
            {cuts.map(([len, c]) => { const w = (len / stock) * 100; x += len; return <span key={len} style={{ width: `${w}%`, background: c }} className="grid place-items-center text-xs font-semibold text-white">{len}</span>; })}
            <span className="flex-1 grid place-items-center text-xs bg-sunken">{(stock - x).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

export function TrackerVisual() {
  const phases = [['Substructure & earthwork', 5], ['RCC superstructure', 4], ['Masonry & envelope', 3], ['MEP & services', 2], ['Finishing & handover', 1]];
  return (
    <Window title="Project tracker · 5 phases">
      <ol className="p-4 space-y-2.5">
        {phases.map(([name, i]) => (
          <li key={name} className="flex items-center gap-3">
            <span className="grid place-items-center w-6 h-6 rounded-full bg-nav text-on-nav text-xs font-semibold">{6 - i}</span>
            <span className="flex-1 text-sm font-medium">{name}</span>
            <span aria-hidden="true" className="w-24 h-1.5 rounded bg-sunken overflow-hidden"><span className="block h-full bg-stripe" style={{ width: `${i * 20}%` }} /></span>
          </li>
        ))}
      </ol>
    </Window>
  );
}

export function MaterialsVisual() {
  const mats = [['cement', 'Cement'], ['sand', 'Sand'], ['aggregate', 'Aggregate'], ['bricks', 'Bricks'], ['concrete', 'Concrete'], ['steel', 'Steel']];
  return (
    <div className="grid grid-cols-3 gap-3">
      {mats.map(([id, label]) => (
        <div key={id} className="group rounded-lg border border-line bg-surface p-4 text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-e2 transition duration-200">
          <ToolIcon id={id} className="w-7 h-7 mx-auto text-primary" />
          <p className="mt-2 text-sm font-semibold">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportVisual() {
  return (
    <div className="rounded-lg bg-white text-black shadow-[0_24px_60px_rgb(0_0_0/0.35)] p-6 sm:p-8 text-sm" role="img" aria-label="Sample estimate report with project information, itemised quantities, rates, GST and total">
      <div className="flex flex-col gap-1 border-b-2 border-nav pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div><p className="text-xs font-bold tracking-widest uppercase">Estimate report</p><p className="text-lg font-semibold">Sample project · RCC slab</p></div>
        <p className="text-xs sm:text-right">Sample data<br />Concrete M20</p>
      </div>
      <table className="w-full mt-3">
        <thead><tr className="text-left text-xs uppercase tracking-wide border-b border-[#DEDBD5]"><th className="py-1.5">Item</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right hidden sm:table-cell">Rate</th><th className="py-1.5 pl-3 text-right">Amount ₹</th></tr></thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.item} className="border-b border-[#EEECE8]"><td className="py-1.5">{r.item}</td><td className="py-1.5 text-right tabular-nums">{r.unit === 'bags' ? r.qty : f2(r.qty)} {r.unit}</td><td className="py-1.5 text-right tabular-nums hidden sm:table-cell">{f0(r.rate)}</td><td className="py-1.5 pl-3 text-right tabular-nums">{f0(r.amount)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 ml-auto w-full sm:w-3/5 space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{f0(SUBTOTAL)}</dd></div>
        <div className="flex justify-between"><dt>GST 18%</dt><dd className="tabular-nums">{f0(GST)}</dd></div>
        <div className="flex justify-between border-t-2 border-nav pt-1.5 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">₹ {f0(SUBTOTAL + GST)}</dd></div>
      </dl>
    </div>
  );
}
