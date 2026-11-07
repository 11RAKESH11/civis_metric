import { useId, useState } from 'react';
import { GRADES, computeSlab } from './slab';

// A working mini-estimator for a concrete slab. It uses the same method as the Concrete estimator
// in the app: wet volume x 1.54 dry factor, split by the grade's nominal mix ratio, cement at
// 1440 kg/m³ in 50 kg bags, sand and aggregate at 1600 kg/m³. Rates are optional and start empty.
const num = (s) => (s === '' || Number.isNaN(Number(s)) ? NaN : Number(s));
const fmt = (n, d = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });

const Field = ({ label, unit, value, onChange, step = 'any', placeholder }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label} <span className="font-normal">({unit})</span></label>
      <input id={id} type="number" inputMode="decimal" min="0" step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-base tabular-nums focus:border-primary" />
    </div>
  );
};

export default function MiniEstimator() {
  const [v, setV] = useState({ length: '6', width: '4', thickness: '150', wastage: '5', cement: '', sand: '', agg: '' });
  const [grade, setGrade] = useState('M20');
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));

  const length = num(v.length), width = num(v.width), thickness = num(v.thickness), wastage = num(v.wastage);
  const ok = length > 0 && width > 0 && thickness > 0 && wastage >= 0;
  const r = ok ? computeSlab({ length, width, thickness, grade, wastage }) : null;
  const rate = (s) => (s === '' ? null : num(s));
  const cost = r && [rate(v.cement), rate(v.sand), rate(v.agg)].some((x) => x != null && x >= 0)
    ? (rate(v.cement) || 0) * r.bags + (rate(v.sand) || 0) * r.sandT + (rate(v.agg) || 0) * r.aggT
    : null;

  return (
    <div className="rounded-xl bg-surface text-ink border border-line shadow-e2 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-nav text-on-nav text-sm font-semibold">
        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-stripe" /> Concrete slab · live estimate
      </div>
      <div className="grid md:grid-cols-2">
        <form className="p-5 space-y-3 md:border-r border-line" onSubmit={(e) => e.preventDefault()} aria-label="Slab dimensions">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Length" unit="m" value={v.length} onChange={set('length')} />
            <Field label="Width" unit="m" value={v.width} onChange={set('width')} />
            <Field label="Thickness" unit="mm" value={v.thickness} onChange={set('thickness')} />
            <Field label="Wastage" unit="%" value={v.wastage} onChange={set('wastage')} />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Concrete grade</legend>
            <div className="mt-1 flex gap-2" role="radiogroup" aria-label="Concrete grade">
              {GRADES.map((g) => (
                <button key={g.id} type="button" role="radio" aria-checked={grade === g.id} onClick={() => setGrade(g.id)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${grade === g.id ? 'bg-primary text-on-primary border-primary' : 'border-line-control hover:border-primary'}`}>
                  {g.id}<span className="block text-xs font-normal">{g.ratio.join(' : ')}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Local rates <span className="font-normal">(optional, ₹)</span></legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <Field label="Cement" unit="/bag" value={v.cement} onChange={set('cement')} placeholder="rate" />
              <Field label="Sand" unit="/t" value={v.sand} onChange={set('sand')} placeholder="rate" />
              <Field label="Aggregate" unit="/t" value={v.agg} onChange={set('agg')} placeholder="rate" />
            </div>
          </fieldset>
        </form>

        <div className="p-5 bg-sunken" aria-live="polite">
          {r ? (
            <>
              <p className="text-sm font-semibold">Results</p>
              <dl className="mt-2 divide-y divide-line">
                {[
                  ['Wet volume', `${fmt(r.wet)} m³`],
                  ['Order volume (with wastage)', `${fmt(r.order)} m³`],
                  ['Cement', `${r.bags} bags of 50 kg`],
                  ['Sand', `${fmt(r.sandT)} t`],
                  ['Aggregate', `${fmt(r.aggT)} t`],
                ].map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-4 py-2 text-base"><dt>{k}</dt><dd className="font-semibold tabular-nums text-right">{val}</dd></div>
                ))}
              </dl>
              <div className="mt-3 rounded-md bg-surface border border-line p-3 flex justify-between items-baseline">
                <span className="text-sm font-semibold">Material cost</span>
                <span className="text-lg font-semibold tabular-nums">{cost == null ? 'Add rates' : `₹ ${fmt(cost, 0)}`}</span>
              </div>
              <p className="mt-3 text-sm">Order volume × 1.54 dry factor, split {GRADES.find((g) => g.id === grade).ratio.join(':')}; cement at 1440 kg/m³, sand and aggregate at 1600 kg/m³.</p>
            </>
          ) : (
            <p role="alert" className="text-base font-semibold text-error">Enter a length, width and thickness above zero, and a wastage of zero or more.</p>
          )}
        </div>
      </div>
    </div>
  );
}
