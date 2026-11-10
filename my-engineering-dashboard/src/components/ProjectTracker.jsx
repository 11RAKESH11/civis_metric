import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';

const initialPhases = [
  {
    id: 'phase-1',
    name: 'Phase 1: Substructure & Earthwork',
    icon: '',
    startDate: '2026-06-01',
    endDate: '2026-07-15',
    status: 'Completed',
    milestones: [
      { id: 'm-1-1', title: 'Site Clearance & Benchmarking Layout', plannedDays: 5, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-1-2', title: 'Earthwork Pit & Trench Excavation (345 m³)', plannedDays: 12, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-1-3', title: 'PCC 1:4:8 Blinding Bed (75mm thick)', plannedDays: 6, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-1-4', title: 'Isolated Footing Rebar & M25 Concrete Pour', plannedDays: 14, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-1-5', title: 'Plinth Beam Casting & Soil Backfilling', plannedDays: 10, status: 'Completed', progress: 100, inspectionSigned: true },
    ]
  },
  {
    id: 'phase-2',
    name: 'Phase 2: RCC Superstructure',
    icon: '',
    startDate: '2026-07-16',
    endDate: '2026-09-30',
    status: 'In Progress',
    milestones: [
      { id: 'm-2-1', title: 'Ground Floor Columns Casting & 14-Day Curing', plannedDays: 15, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-2-2', title: 'First Floor Slab Formwork & Rebar Shuttering', plannedDays: 12, status: 'Completed', progress: 100, inspectionSigned: true },
      { id: 'm-2-3', title: 'First Floor Slab M25 Concrete Pour (68 m³)', plannedDays: 2, status: 'In Progress', progress: 85, inspectionSigned: false },
      { id: 'm-2-4', title: 'Slab Wet Curing (IS 456 Cl. 13.5 — 14 Days)', plannedDays: 14, status: 'In Progress', progress: 40, inspectionSigned: false },
      { id: 'm-2-5', title: 'Second Floor Columns & Beam Casting', plannedDays: 18, status: 'Upcoming', progress: 0, inspectionSigned: false },
    ]
  },
  {
    id: 'phase-3',
    name: 'Phase 3: Masonry & External Envelope',
    icon: '',
    startDate: '2026-10-01',
    endDate: '2026-11-20',
    status: 'Upcoming',
    milestones: [
      { id: 'm-3-1', title: '230mm Outer Brickwork in CM 1:6 (18,500 bricks)', plannedDays: 20, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-3-2', title: '115mm Internal Partition Walls with Hoop Iron', plannedDays: 14, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-3-3', title: 'RCC Lintel Beams & Chajjas Casting', plannedDays: 10, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-3-4', title: 'Parapet Wall & Roof Waterproofing Screed', plannedDays: 12, status: 'Upcoming', progress: 0, inspectionSigned: false },
    ]
  },
  {
    id: 'phase-4',
    name: 'Phase 4: MEP & Internal Services',
    icon: '',
    startDate: '2026-11-21',
    endDate: '2026-12-31',
    status: 'Upcoming',
    milestones: [
      { id: 'm-4-1', title: 'Electrical PVC Conduit Chasing & Box Fixing', plannedDays: 14, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-4-2', title: 'Plumbing CPVC Water Supply & Soil Waste Lines', plannedDays: 16, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-4-3', title: 'Firefighting & HVAC Duct Sleeves', plannedDays: 10, status: 'Upcoming', progress: 0, inspectionSigned: false },
    ]
  },
  {
    id: 'phase-5',
    name: 'Phase 5: Finishing & Handover',
    icon: '',
    startDate: '2027-01-01',
    endDate: '2027-02-28',
    status: 'Upcoming',
    milestones: [
      { id: 'm-5-1', title: 'Internal Cement Plaster 1:4 with Sponge Finish', plannedDays: 20, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-5-2', title: 'External 2-Coat Weatherproof Plaster (20mm)', plannedDays: 18, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-5-3', title: 'Vitrified Floor Tiling & Wall Dados', plannedDays: 22, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-5-4', title: '3-Coat Acrylic Emulsion Painting & Putty', plannedDays: 16, status: 'Upcoming', progress: 0, inspectionSigned: false },
      { id: 'm-5-5', title: 'Final Structural Quality Audit & Handover', plannedDays: 7, status: 'Upcoming', progress: 0, inspectionSigned: false },
    ]
  }
];

export default function ProjectTracker() {
  const { engineerInCharge } = useProject();
  const [phases, setPhases] = useState(initialPhases);
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'curing' | 'manpower' | 'timeline'
  const [selectedPhaseId, setSelectedPhaseId] = useState('phase-2');

  // Daily Site Log State
  const [siteNotes, setSiteNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');

  // Manpower Distribution State
  const [manpower] = useState({
    masons: 8,
    barBenders: 12,
    carpentersShuttering: 10,
    helpers: 22,
    operators: 3,
    supervisors: 2
  });

  // Calculate Overall Progress
  const allMilestones = phases.flatMap(p => p.milestones);
  const totalMilestones = allMilestones.length;
  const completedMilestones = allMilestones.filter(m => m.progress === 100).length;
  const overallProgress = Math.round(
    allMilestones.reduce((sum, m) => sum + m.progress, 0) / (totalMilestones || 1)
  );

  // Toggle milestone completion / progress
  const handleUpdateProgress = (phaseId, milestoneId, newProgress) => {
    setPhases(prevPhases =>
      prevPhases.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedMilestones = phase.milestones.map(m => {
          if (m.id !== milestoneId) return m;
          const status = newProgress === 100 ? 'Completed' : newProgress > 0 ? 'In Progress' : 'Upcoming';
          return { ...m, progress: newProgress, status, inspectionSigned: newProgress === 100 ? m.inspectionSigned : false };
        });

        // Update phase status based on milestones
        const allDone = updatedMilestones.every(m => m.progress === 100);
        const anyStarted = updatedMilestones.some(m => m.progress > 0);
        const phaseStatus = allDone ? 'Completed' : anyStarted ? 'In Progress' : 'Upcoming';

        return { ...phase, milestones: updatedMilestones, status: phaseStatus };
      })
    );
  };

  const handleToggleSignoff = (phaseId, milestoneId) => {
    setPhases(prevPhases =>
      prevPhases.map(phase => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          milestones: phase.milestones.map(m =>
            m.id === milestoneId ? { ...m, inspectionSigned: !m.inspectionSigned } : m
          )
        };
      })
    );
  };

  const handleAddSiteNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      author: engineerInCharge || 'Resident Engineer',
      text: newNoteText,
      type: newNoteType
    };
    setSiteNotes([newNote, ...siteNotes]);
    setNewNoteText('');
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-6 text-ink font-sans">
      
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-bg border border-line p-5 shadow-e1 sm:p-8">
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col wide:flex-row justify-between items-start wide:items-center gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-tight">
              Construction Project <span className="gradient-text">Milestone & Progress Tracker</span>
            </h2>
            <p className="text-sm sm:text-base text-ink max-w-2xl leading-relaxed">
              Track 5-phase civil milestones, IS 456 formwork stripping safety schedules, 14-day curing countdowns, daily site logs, and manpower deployments.
            </p>
          </div>

          {/* Project Progress Circular / Metric Badge */}
          <div className="flex items-center gap-5 bg-surface border border-line p-5 rounded-2xl shadow-e1 shrink-0">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-line"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  strokeDasharray={`${overallProgress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute font-bold text-lg tabular-nums text-ink">
                {overallProgress}%
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink block">Overall Completion</span>
              <span className="mt-0.5 text-base font-bold text-ink block">{completedMilestones} of {totalMilestones} Tasks Verified</span>
              <span className="text-sm text-ink">Phase 2 currently active</span>
            </div>
          </div>
        </div>

        {/* Phase Summary Pill Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 mt-6 pt-5 border-t border-line">
          {phases.map(phase => {
            const phaseMilestones = phase.milestones;
            const phaseProgress = Math.round(
              phaseMilestones.reduce((sum, m) => sum + m.progress, 0) / (phaseMilestones.length || 1)
            );
            const isSelected = selectedPhaseId === phase.id;

            return (
              <div
                key={phase.id}
                onClick={() => setSelectedPhaseId(phase.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
                  isSelected
                    ? 'bg-primary/15 border-primary shadow-e1'
                    : 'bg-surface border-line hover:border-line-control'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-base">{phase.icon}</span>
                  <span className={`whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-bold text-ink ${
                    phase.status === 'Completed' ? 'bg-success/25' :
                    phase.status === 'In Progress' ? 'bg-primary/30' : 'bg-sunken border border-line'
                  }`}>
                    {phase.status}
                  </span>
                </div>
                <h4 className="mt-2 break-words text-sm font-bold leading-snug text-ink">{phase.name.split(':')[1] || phase.name}</h4>
                <div className="w-full h-2 bg-line/60 rounded-full mt-3 overflow-hidden">
                  <div style={{ width: `${phaseProgress}%` }} className="h-full rounded-full bg-primary transition-[width] duration-500"></div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-ink mt-1.5 block">{phaseProgress}% done</span>
              </div>
            );
          })}
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex gap-2 overflow-x-auto pt-5 mt-4 border-t border-line no-scrollbars">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`pill-tab ${activeTab === 'milestones' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
          >
            Phase Tasks & Sign-Offs
          </button>
          <button
            onClick={() => setActiveTab('curing')}
            className={`pill-tab ${activeTab === 'curing' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
          >
            IS 456 Curing & Formwork Stripping
          </button>
          <button
            onClick={() => setActiveTab('manpower')}
            className={`pill-tab ${activeTab === 'manpower' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
          >
            Site Manpower & Diary
          </button>
        </div>
      </div>

      {/* ── TAB 1: PHASE MILESTONES & SIGN-OFFS ── */}
      {activeTab === 'milestones' && (
        <div className="bg-surface border border-line rounded-2xl shadow-e1 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-line">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink">
                {phases.find(p => p.id === selectedPhaseId)?.name}
              </h2>
              <span className="text-xs text-muted">
                Target Schedule: {phases.find(p => p.id === selectedPhaseId)?.startDate} to {phases.find(p => p.id === selectedPhaseId)?.endDate}
              </span>
            </div>
            <span className="text-xs text-muted">
              Drag a slider to update progress
            </span>
          </div>

          <div className="space-y-3">
            {phases.find(p => p.id === selectedPhaseId)?.milestones.map((milestone, idx) => (
              <div
                key={milestone.id}
                className="bg-bg border border-line rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-line-control hover:shadow-e1 transition-all"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/25 text-ink flex items-center justify-center font-bold text-sm tabular-nums shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-semibold text-ink leading-snug">{milestone.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        milestone.status === 'Completed' ? 'bg-success/25 text-ink' :
                        milestone.status === 'In Progress' ? 'bg-primary/30 text-ink' : 'bg-sunken text-ink border border-line'
                      }`}>
                        {milestone.status}
                      </span>
                    </div>
                    <p className="text-sm text-ink">
                      Planned Duration: {milestone.plannedDays} Days · QA Status: {milestone.inspectionSigned ? 'Signed by Engineer' : 'Pending Pour Inspection'}
                    </p>
                  </div>
                </div>

                {/* Progress Control & QA Signoff Action */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line">
                  {/* Slider Control */}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      aria-label={`Progress for ${milestone.title}`}
                      min="0"
                      max="100"
                      step="5"
                      value={milestone.progress}
                      onChange={e => handleUpdateProgress(selectedPhaseId, milestone.id, Number(e.target.value))}
                      className="w-24 sm:w-28 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-bold tabular-nums text-ink w-11 text-right">{milestone.progress}%</span>
                  </div>

                  {/* QA Inspection Stamp Button */}
                  <button
                    onClick={() => handleToggleSignoff(selectedPhaseId, milestone.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                      milestone.inspectionSigned
                        ? 'bg-success/25 text-ink border border-line-control'
                        : 'bg-surface text-ink hover:bg-primary/15 border border-line'
                    }`}
                  >
                    {milestone.inspectionSigned ? 'QA Verified' : 'Sign QA Stamp'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: IS 456 CURING & FORMWORK REMOVAL SAFETY ── */}
      {activeTab === 'curing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Curing Countdown Tracker */}
          <div className="bg-surface border border-line rounded-2xl shadow-e1 p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
Active Concrete Curing Schedule
                </h3>
                <span className="text-xs text-muted">IS 456 Cl. 13.5 (Ponding & Wet Burlap)</span>
              </div>
              <span className="px-2.5 py-1 bg-sunken border border-line-control text-primary rounded-full text-xs font-bold">
                M25 Mix Active
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-bg p-4 rounded-xl border border-line space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-ink">First Floor Roof Slab (68 m³)</span>
                  <span className="text-primary font-bold">Day 6 of 14</span>
                </div>
                <div className="w-full h-2.5 bg-line/60 rounded-full overflow-hidden">
                  <div style={{ width: `${(6 / 14) * 100}%` }} className="h-full rounded-full bg-primary"></div>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Poured: 2026-08-10</span>
                  <span>Target 70% Strength: 2026-08-24</span>
                </div>
              </div>

              <div className="bg-bg p-4 rounded-xl border border-line space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-ink">Ground Floor Columns (16 Nos)</span>
                  <span className="text-ink font-bold">Day 14 of 14 (Curing Complete)</span>
                </div>
                <div className="w-full h-2.5 bg-line/60 rounded-full overflow-hidden">
                  <div style={{ width: '100%' }} className="h-full bg-success rounded-full"></div>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Poured: 2026-08-01</span>
                  <span>Full 28-day Cube Test: 2026-08-29</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formwork Stripping Safety Checklist (IS 456 Cl. 11.3) */}
          <div className="bg-surface border border-line rounded-2xl shadow-e1 p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
Formwork Stripping Safety (IS 456 Cl. 11.3)
                </h3>
                <span className="text-xs text-muted">Minimum safe period before strike-off</span>
              </div>
              <span className="px-2.5 py-1 shrink-0 whitespace-nowrap bg-sunken text-ink border border-line-control rounded-full text-xs font-bold">
                SAFETY RULE
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-line">
                <span className="text-ink font-sans font-medium">Vertical forms to columns, walls & beams</span>
                <span className="text-primary font-bold">16 – 24 Hours</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-line">
                <span className="text-ink font-sans font-medium">Soffit formwork to slabs (props left under)</span>
                <span className="text-primary font-bold">3 Days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-line">
                <span className="text-ink font-sans font-medium">Soffit formwork to beams (props left under)</span>
                <span className="text-primary font-bold">7 Days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-line">
                <span className="text-ink font-sans font-medium">Props under slabs spanning up to 4.5m</span>
                <span className="text-accent font-bold">7 Days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg rounded-xl border border-line">
                <span className="text-ink font-sans font-medium">Props under beams & arches spanning up to 6m</span>
                <span className="text-error font-bold">14 Days</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 3: MANPOWER & DAILY SITE LOG ── */}
      {activeTab === 'manpower' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Manpower Distribution (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface border border-line rounded-2xl shadow-e1 p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-line">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
Daily Manpower Deployment
                </h3>
                <span className="text-xs text-primary font-bold">
                  {Object.values(manpower).reduce((a, b) => a + b, 0)} Active Workers
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between p-3.5 bg-bg rounded-xl border border-line">
                  <span className="text-ink-2 font-sans">Mason (Head & Skilled)</span>
                  <span className="font-bold text-primary">{manpower.masons} masons</span>
                </div>
                <div className="flex justify-between p-3.5 bg-bg rounded-xl border border-line">
                  <span className="text-ink-2 font-sans">Bar Benders & Cutters</span>
                  <span className="font-bold text-primary">{manpower.barBenders} benders</span>
                </div>
                <div className="flex justify-between p-3.5 bg-bg rounded-xl border border-line">
                  <span className="text-ink-2 font-sans">Shuttering Carpenters</span>
                  <span className="font-bold text-accent">{manpower.carpentersShuttering} carpenters</span>
                </div>
                <div className="flex justify-between p-3.5 bg-bg rounded-xl border border-line">
                  <span className="text-ink-2 font-sans">Unskilled Helpers / Labour</span>
                  <span className="font-bold text-ink">{manpower.helpers} helpers</span>
                </div>
                <div className="flex justify-between p-3.5 bg-bg rounded-xl border border-line">
                  <span className="text-ink-2 font-sans">Concrete Pump & Lift Operators</span>
                  <span className="font-bold text-primary">{manpower.operators} operators</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Site Diary Log (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-surface border border-line rounded-2xl shadow-e1 p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-line">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
Resident Engineer Site Diary
                </h3>
                <span className="text-xs text-muted">{siteNotes.length} entries recorded</span>
              </div>

              {/* Add Note Input */}
              <form onSubmit={handleAddSiteNote} className="space-y-3">
                <div className="flex gap-2">
                  <input aria-label="Site diary note"
                    type="text"
                    required
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Log site milestone, slump test result, cube crushing or concrete delivery..."
                    className="flex-1 bg-sunken border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  />
                  <select aria-label="Note type"
                    value={newNoteType}
                    onChange={e => setNewNoteType(e.target.value)}
                    className="bg-sunken border border-line rounded-lg px-3 text-sm text-ink outline-none"
                  >
                    <option value="general">General</option>
                    <option value="critical">Critical Pour</option>
                    <option value="inspection">QA Inspection</option>
                    <option value="material">Material Log</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-lg text-sm"
                  >
                    + Log
                  </button>
                </div>
              </form>

              {/* Site Notes Feed */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scroll pr-1">
                {siteNotes.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line bg-bg p-4 text-sm text-ink">No entries yet. Log a pour, an inspection or a delivery above and it will appear here.</p>
                )}
                {siteNotes.map(note => (
                  <div key={note.id} className="bg-bg border border-line rounded-xl p-4 space-y-1 text-sm">
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span className="font-bold text-primary">{note.author}</span>
                      <span>{note.date}</span>
                    </div>
                    <p className="text-ink leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
