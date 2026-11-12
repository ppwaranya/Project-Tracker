import React, { useState } from 'react';
import { Project } from '../lib/types';
import {
  compute,
  costOf,
  summ,
  fmt,
  baht,
  STATUS_LIST,
  displayCategory,
  displayStatus,
  PHASE_NAMES_EN,
} from '../lib/trackerLogic';
import {
  Search,
  Plus,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  EyeOff,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  X,
  Layers,
  Wallet,
} from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  holidaysSet: Set<string>;
  costPrivacy: boolean;
  isViewOnly?: boolean;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, category: 'อาหารเสริม' | 'สกินแคร์') => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  holidaysSet,
  costPrivacy,
  isViewOnly = false,
  onSelectProject,
  onCreateProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Shortcut Modal for New Project
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<'อาหารเสริม' | 'สกินแคร์'>('อาหารเสริม');

  const handleShortcutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    onCreateProject(quickName.trim(), quickCategory);
    setQuickName('');
    setIsShortcutOpen(false);
  };

  const handleFastPreset = (cat: 'อาหารเสริม' | 'สกินแคร์', defaultName: string) => {
    onCreateProject(defaultName, cat);
    setIsShortcutOpen(false);
  };

  // Filter and sort
  const filteredProjects = projects
    .filter((p) => {
      const matchesQuery =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.factory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.lotNo && p.lotNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.fdaNo && p.fdaNo.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = !selectedCategory || p.category === selectedCategory;
      const matchesStatus = !selectedStatus || p.status === selectedStatus;
      return matchesQuery && matchesCat && matchesStatus;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // High-level metrics
  const totalCount = projects.length;
  const inProgressCount = projects.filter((p) => displayStatus(p.status) === 'In Progress').length;
  const completedCount = projects.filter((p) => displayStatus(p.status) === 'Completed').length;
  const totalVolume = projects.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
  const totalAllProjectsCost = projects.reduce((acc, p) => acc + (costOf(p).batch || 0), 0);

  const phaseColors: Record<number, string> = {
    1: '#0d9488',
    2: '#2563eb',
    3: '#f59e0b',
    4: '#8b5cf6',
    5: '#f43f5e',
    6: '#475569',
  };

  return (
    <div className="space-y-6">
      {/* Sleek, Modern Stat Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Projects Dashboard
          </h2>
        </div>

        {!isViewOnly && (
          <button
            onClick={() => setIsShortcutOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] shadow-sm hover:shadow-md transition-all cursor-pointer self-start md:self-auto transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* 5 Metric Cards (รวมยอด Sum ต้นทุนทุกโปรเจกต์) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Lavender / Soft Lilac */}
        <div className="bg-[#eee8ff] p-5 rounded-2xl sm:rounded-3xl border border-[#ded5fc] shadow-2xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4d3b94]">
              Total Projects
            </span>
            <div className="w-7 h-7 rounded-full bg-[#dfd6fc] text-[#5841b8] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#2a1b63]">{totalCount}</p>
            <span className="text-[11px] text-[#6954b8] font-semibold mt-0.5 block">Active & archived</span>
          </div>
        </div>

        {/* Card 2: Sky Blue Pastel */}
        <div className="bg-[#daf0ff] p-5 rounded-2xl sm:rounded-3xl border border-[#c4e5ff] shadow-2xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#124d91]">
              In Progress
            </span>
            <div className="w-7 h-7 rounded-full bg-[#c8e7fc] text-[#1b64ba] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#0f3d73]">{inProgressCount}</p>
            <span className="text-[11px] text-[#2467b6] font-semibold mt-0.5 block">Active development cycles</span>
          </div>
        </div>

        {/* Card 3: Mint / Soft Emerald Pastel */}
        <div className="bg-[#cbf7df] p-5 rounded-2xl sm:rounded-3xl border border-[#b1f1ce] shadow-2xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e5c36]">
              Completed / Ready
            </span>
            <div className="w-7 h-7 rounded-full bg-[#b5efce] text-[#128a4f] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-[#084225]">{completedCount}</p>
            <span className="text-[11px] text-[#1b7a48] font-semibold mt-0.5 block">Ready for commercial launch</span>
          </div>
        </div>

        {/* Card 4: Sleek Dark Slate / Teal with Lime Pill */}
        <div className="bg-slate-900 p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xs text-white transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
              Target Volume
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#ccf835] text-slate-950 font-black text-[10px] tracking-wide">
              Planned
            </span>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {totalVolume > 0 ? totalVolume.toLocaleString('en-US') : '-'}
            </p>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Total order units planned</span>
          </div>
        </div>

        {/* Card 5: Total Cost Sum Across All Projects */}
        <div className="col-span-2 md:col-span-1 bg-[#fef3c7] p-5 rounded-2xl sm:rounded-3xl border border-[#fde68a] shadow-2xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78350f]">
              Total Project Cost
            </span>
            <div className="w-7 h-7 rounded-full bg-[#fde68a] text-[#92400e] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            {costPrivacy ? (
              <div className="inline-flex items-center gap-1.5 text-amber-900/70 bg-amber-200/60 px-2.5 py-1 rounded-xl text-xs font-bold font-mono my-1">
                <EyeOff className="w-3.5 h-3.5" />
                <span>••••••</span>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-black text-[#451a03] truncate">
                {totalAllProjectsCost > 0 ? `${baht(totalAllProjectsCost)} ฿` : '-'}
              </p>
            )}
            <span className="text-[11px] text-[#92400e] font-semibold mt-0.5 block">
              Sum of all projects (incl. VAT)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder=""
            className="w-full text-xs sm:text-sm pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#ccf835] bg-slate-50/60 font-medium"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#ccf835] cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="Dietary Supplement">Dietary Supplement</option>
            <option value="Skincare">Skincare</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#ccf835] cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Toggle View Mode: Cards vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('cards')}
              title="Card View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#ccf835] text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#ccf835] text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: RICH PROJECT CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-800">No projects found</p>
              <p className="text-xs text-slate-400">
                Click "New Project" above to create your first launch project.
              </p>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const cs = compute(p, holidaysSet);
              const co = costOf(p);
              const s = summ(p, cs, co, holidaysSet);

              const isSupplement = displayCategory(p.category) === 'Dietary Supplement';

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
                    isSupplement
                      ? 'border-2 border-[#84cc16] hover:border-[#65a30d] bg-gradient-to-b from-[#f7fee7]/80 via-white to-white'
                      : 'border-2 border-[#0284c7] hover:border-[#0369a1] bg-gradient-to-b from-[#f0f9ff]/80 via-white to-white'
                  }`}
                >
                  {/* Category Accent top border */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isSupplement ? 'bg-[#84cc16]' : 'bg-[#0284c7]'
                    }`}
                  />

                  {/* Card Header: Name, Lot, FDA, Category, Status */}
                  <div className="space-y-2.5 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                              isSupplement
                                ? 'bg-[#ccf835] text-slate-950 border border-[#84cc16]'
                                : 'bg-[#0284c7] text-white border border-[#0369a1]'
                            }`}
                          >
                            {displayCategory(p.category)}
                          </span>
                          {p.lotNo && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                              {p.lotNo}
                            </span>
                          )}
                          {p.fdaNo && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              FDA {p.fdaNo}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading leading-snug whitespace-normal break-words pt-0.5">
                          {p.name || '(Untitled Project)'}
                        </h3>
                      </div>

                      {/* Status Badge in English */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          displayStatus(p.status) === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : displayStatus(p.status) === 'In Progress'
                            ? 'bg-blue-50 text-blue-800'
                            : displayStatus(p.status) === 'On Hold'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {displayStatus(p.status)}
                      </span>
                    </div>

                    {/* Owner & Factory info */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {p.owner && (
                        <span>
                          Owner: <strong className="text-slate-600">{p.owner}</strong>
                        </span>
                      )}
                      {p.factory && (
                        <span>
                          Factory: <strong className="text-slate-600">{p.factory}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PROGRESS SECTION: OVERALL BAR & MAIN PHASE MILESTONES */}
                  <div className="my-3 p-3.5 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs space-y-3">
                    {/* Overall Project Progress Header & Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full animate-pulse"
                            style={{
                              backgroundColor:
                                s.pct === 100
                                  ? '#10b981'
                                  : isSupplement
                                  ? '#84cc16'
                                  : '#0284c7',
                            }}
                          />
                          <span className="font-extrabold text-slate-900">
                            Overall Project Progress
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm">
                            {s.pct}%
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            ({s.done}/{s.total} tasks)
                          </span>
                        </div>
                      </div>

                      {/* Main Overall Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/70">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${s.pct}%`,
                            backgroundColor:
                              s.pct === 100
                                ? '#10b981'
                                : isSupplement
                                ? '#84cc16'
                                : '#0284c7',
                          }}
                        />
                      </div>
                    </div>

                    {/* Phase Milestones */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold uppercase tracking-wider text-slate-500">
                          Phase Milestones
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Progress by Stage
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {p.phases.map((ph) => {
                          const phaseTotal = ph.tasks.length;
                          const phaseDone = ph.tasks.filter((t) => t.done).length;
                          const phasePct = phaseTotal
                            ? Math.round((phaseDone / phaseTotal) * 100)
                            : 0;
                          const phaseName = PHASE_NAMES_EN[ph.k] || ph.name;
                          const color = phaseColors[ph.k] || '#0d9488';
                          const isDone = phasePct === 100;
                          const isInProgress = phasePct > 0 && phasePct < 100;

                          return (
                            <div
                              key={ph.k}
                              className={`p-2 rounded-xl border transition-colors ${
                                isDone
                                  ? 'bg-emerald-50/70 border-emerald-200/80'
                                  : isInProgress
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-white border-slate-200/60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      isInProgress ? 'animate-pulse' : ''
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                  <span
                                    className="font-bold text-slate-800 truncate"
                                    title={phaseName}
                                  >
                                    {phaseName}
                                  </span>
                                </div>
                                <span
                                  className={`text-[11px] font-black flex-shrink-0 ml-1.5 ${
                                    isDone
                                      ? 'text-emerald-700'
                                      : isInProgress
                                      ? 'text-slate-900'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {phasePct}%
                                </span>
                              </div>

                              {/* Compact Mini Bar */}
                              <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${phasePct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Units, Est. Delivery, Cost / Unit, Total Cost, View Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap sm:flex-nowrap">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[11px]">
                        Order Quantity
                      </span>
                      <strong className="text-slate-800 text-sm">
                        {p.qty ? `${Number(p.qty).toLocaleString('en-US')} pcs` : '-'}
                      </strong>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[11px]">
                        Est. Delivery
                      </span>
                      <strong className="text-slate-800">
                        {fmt(s.last)}
                      </strong>
                      {s.vs && (
                        <span
                          className={`block text-[10px] font-bold ${
                            s.vc === 'ok'
                              ? 'text-teal-700'
                              : s.vc === 'late'
                              ? 'text-rose-600'
                              : 'text-amber-700'
                          }`}
                        >
                          {s.vs}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-slate-400 block text-[11px]">
                        Cost / Unit
                      </span>
                      {costPrivacy ? (
                        <span className="inline-flex items-center gap-1 font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                          <EyeOff className="w-3 h-3" />
                          <span>••••••</span>
                        </span>
                      ) : (
                        <strong className="text-slate-900 text-sm">
                          {co.unit > 0 ? `${baht(co.unit)} ฿` : '-'}
                        </strong>
                      )}
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-slate-400 block text-[11px]">
                        Total Cost
                      </span>
                      {costPrivacy ? (
                        <span className="inline-flex items-center gap-1 font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                          <EyeOff className="w-3 h-3" />
                          <span>••••••</span>
                        </span>
                      ) : (
                        <strong className="text-teal-800 text-sm font-black">
                          {co.batch > 0 ? `${baht(co.batch)} ฿` : '-'}
                        </strong>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectProject(p.id)}
                      className="p-2 rounded-xl bg-slate-100 group-hover:bg-[#ccf835] text-slate-700 group-hover:text-slate-950 transition-colors cursor-pointer flex-shrink-0"
                      title="View Project Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: COMPACT DATA TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[1060px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <th className="py-3.5 px-4">Project Name</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Lot #</th>
                  <th className="py-3.5 px-3 text-right">Qty (Units)</th>
                  <th className="py-3.5 px-4">Current Stage & Task</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Est. Delivery</th>
                  <th className="py-3.5 px-4 text-right">Cost / Unit</th>
                  <th className="py-3.5 px-4 text-right">Total Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const cs = compute(p, holidaysSet);
                  const co = costOf(p);
                  const s = summ(p, cs, co, holidaysSet);
                  const isSupplement = displayCategory(p.category) === 'Dietary Supplement';

                  // Compute concurrent active tasks
                  const doneTaskIds = new Set(
                    p.phases.flatMap((ph) => ph.tasks.filter((t) => t.done).map((t) => t.id))
                  );

                  const activeTasks: {
                    phaseKey: number;
                    phaseName: string;
                    phaseColor: string;
                    taskName: string;
                  }[] = [];

                  p.phases.forEach((ph) => {
                    const allDone = ph.tasks.length > 0 && ph.tasks.every((t) => t.done);
                    if (allDone) return;
                    const unblocked = ph.tasks.filter((t) => {
                      if (t.done) return false;
                      if (!t.dep || t.dep === '@start' || t.dep === '') return true;
                      if (t.dep === '@all') {
                        const others = ph.tasks.filter((o) => o.id !== t.id);
                        return others.length > 0 && others.every((o) => o.done);
                      }
                      return doneTaskIds.has(t.dep);
                    });
                    if (unblocked.length > 0) {
                      unblocked.forEach((t) => {
                        activeTasks.push({
                          phaseKey: ph.k,
                          phaseName: ph.name,
                          phaseColor: phaseColors[ph.k] || '#0d9488',
                          taskName: t.name,
                        });
                      });
                    }
                  });

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                        isSupplement
                          ? 'border-l-4 border-l-[#84cc16]'
                          : 'border-l-4 border-l-[#0284c7]'
                      }`}
                    >
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors whitespace-normal break-words leading-snug">
                          {p.name || '(Untitled)'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {p.owner && <span>Owner: {p.owner}</span>}
                          {p.fdaNo && (
                            <span className="text-emerald-700 font-bold">
                              FDA {p.fdaNo}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            isSupplement
                              ? 'bg-[#ccf835] text-slate-950 border border-[#84cc16]'
                              : 'bg-[#0284c7] text-white border border-[#0369a1]'
                          }`}
                        >
                          {displayCategory(p.category)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-medium text-slate-600">
                        {p.lotNo || '-'}
                      </td>

                      <td className="py-3.5 px-3 text-right tabular-nums font-semibold text-slate-700">
                        {p.qty ? Number(p.qty).toLocaleString('en-US') : '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                phaseColors[s.stage.k] || (isSupplement ? '#a3e635' : '#0284c7'),
                            }}
                          />
                          <span>{s.stage.name}</span>
                        </div>
                        {activeTasks.length > 1 ? (
                          <div className="flex flex-col gap-0.5 mt-1">
                            {activeTasks.slice(0, 2).map((at, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 text-[11px] text-slate-600 truncate max-w-[200px]"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: at.phaseColor }}
                                />
                                <span className="font-semibold text-slate-800 truncate">
                                  {at.taskName}
                                </span>
                              </div>
                            ))}
                            {activeTasks.length > 2 && (
                              <span className="text-[10px] text-teal-700 font-bold">
                                +{activeTasks.length - 2} more concurrent
                              </span>
                            )}
                          </div>
                        ) : s.currentTaskName ? (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {s.currentTaskName}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-teal-700 mb-1">
                          {s.pct}% ({s.done}/{s.total})
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {fmt(s.last)}
                        </div>
                        {s.vs && (
                          <span
                            className={`text-[10px] font-bold ${
                              s.vc === 'ok'
                                ? 'text-teal-700'
                                : s.vc === 'late'
                                ? 'text-rose-600'
                                : 'text-amber-700'
                            }`}
                          >
                            {s.vs}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right tabular-nums font-bold">
                        {costPrivacy ? (
                          <span className="text-slate-400 font-mono text-xs">
                            ••••••
                          </span>
                        ) : co.unit > 0 ? (
                          <span className="text-slate-900">{baht(co.unit)} ฿</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right tabular-nums font-black">
                        {costPrivacy ? (
                          <span className="text-slate-400 font-mono text-xs">
                            ••••••
                          </span>
                        ) : co.batch > 0 ? (
                          <span className="text-teal-800">{baht(co.batch)} ฿</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            displayStatus(p.status) === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : displayStatus(p.status) === 'In Progress'
                              ? 'bg-blue-50 text-blue-800'
                              : displayStatus(p.status) === 'On Hold'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {displayStatus(p.status)}
                        </span>
                      </td>

                      <td className="py-3.5 px-2 text-right">
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SHORTCUT MODAL TO START PROJECT INSTANTLY */}
      {isShortcutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsShortcutOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-5">
              <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center mb-2 shadow-xs border border-slate-200 bg-white p-1">
                <img
                  src="/assets/aistudio/image_5173417e.png"
                  alt="Project Tracker"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                New Project Shortcut
              </h3>
              <p className="text-xs text-slate-500">
                Choose a 1-click preset or enter project title to auto-generate standard 6-phase timeline
              </p>
            </div>

            {/* Quick Presets */}
            <div className="mb-5 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                1-Click Presets:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleFastPreset(
                      'อาหารเสริม',
                      'New Supplement Launch Project'
                    )
                  }
                  className="p-3 text-left rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition-all cursor-pointer group"
                >
                  <span className="block text-xs font-bold text-amber-900">
                    + Dietary Supplement
                  </span>
                  <span className="text-[11px] text-amber-700/80">
                    Powder / Capsule / Jelly
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleFastPreset(
                      'สกินแคร์',
                      'New Skincare Launch Project'
                    )
                  }
                  className="p-3 text-left rounded-2xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/80 transition-all cursor-pointer group"
                >
                  <span className="block text-xs font-bold text-teal-900">
                    + Skincare
                  </span>
                  <span className="text-[11px] text-teal-700/80">
                    Serum / Cream / Cleanser
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Name Form */}
            <form onSubmit={handleShortcutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder=""
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      quickCategory === 'อาหารเสริม'
                        ? 'border-[#ccf835] bg-[#f4fae1] text-slate-950 font-black'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcat"
                      checked={quickCategory === 'อาหารเสริม'}
                      onChange={() => setQuickCategory('อาหารเสริม')}
                      className="accent-[#0f172a]"
                    />
                    <span>Dietary Supplement</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      quickCategory === 'สกินแคร์'
                        ? 'border-[#c4e5ff] bg-[#daf0ff] text-[#0f3f77]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcat"
                      checked={quickCategory === 'สกินแคร์'}
                      onChange={() => setQuickCategory('สกินแคร์')}
                      className="accent-[#0f172a]"
                    />
                    <span>Skincare</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShortcutOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickName.trim()}
                  className="px-5 py-2 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};