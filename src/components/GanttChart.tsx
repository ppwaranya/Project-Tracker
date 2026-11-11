import React, { useState } from 'react';
import { Project, TaskComputeResult } from '../lib/types';
import {
  flatTasks,
  monday,
  addD,
  pd,
  dow,
  todayISO,
  fmt,
  TM,
  PHASE_NAMES_EN,
} from '../lib/trackerLogic';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface GanttChartProps {
  project: Project;
  computedTasks: Record<string, TaskComputeResult>;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  computedTasks,
}) => {
  // Collapsible phases state as requested
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const fl = flatTasks(project);
  if (!fl.length) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        No scheduled tasks found in this project.
      </div>
    );
  }

  let minS: string | null = null;
  let maxE: string | null = null;

  for (const t of fl) {
    const r = computedTasks[t.id];
    if (r) {
      if (!minS || r.s < minS) minS = r.s;
      if (!maxE || r.e > maxE) maxE = r.e;
    }
  }

  if (!minS || !maxE) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        Calculating schedule...
      </div>
    );
  }

  const weeks: string[] = [];
  let m = monday(minS);
  let g = 0;
  while (m <= maxE && g++ < 260) {
    weeks.push(m);
    m = addD(m, 7);
  }

  const CW = 52; // Column width per week
  const NW = 260; // Name column width
  const n = weeks.length;
  const w0 = pd(weeks[0]).getTime();

  // Exact math from original ganttHtml
  const wi = (s: string) =>
    Math.round((pd(monday(s)).getTime() - w0) / (7 * 864e5));
  const di = (s: string) => Math.min(4, (dow(s) + 6) % 7);

  // Group weeks by Month
  const months: { k: string; n: number }[] = [];
  weeks.forEach((w) => {
    const k = w.slice(0, 7);
    const l = months[months.length - 1];
    if (l && l.k === k) {
      l.n++;
    } else {
      months.push({ k, n: 1 });
    }
  });

  const td = todayISO();
  const showToday =
    td >= weeks[0] && td <= addD(weeks[n - 1], 6);
  const tf = Math.min(5, (dow(td) + 6) % 7) / 5;
  const todayLeft = showToday ? Math.round((wi(td) + tf) * CW) : null;

  const phaseColors: Record<number, string> = {
    1: '#0d9488',
    2: '#2563eb',
    3: '#f59e0b',
    4: '#8b5cf6',
    5: '#f43f5e',
    6: '#475569',
  };

  const togglePhase = (phaseK: number) => {
    const next = new Set(collapsedPhases);
    if (next.has(phaseK)) next.delete(phaseK);
    else next.add(phaseK);
    setCollapsedPhases(next);
  };

  const allCollapsed =
    project.phases.length > 0 &&
    project.phases.every((phase) => collapsedPhases.has(phase.k));

  const toggleAllPhases = () => {
    setCollapsedPhases(
      allCollapsed
        ? new Set()
        : new Set(project.phases.map((phase) => phase.k))
    );
  };

  return (
    <div className="space-y-3">
      {/* Controls to Collapse / Expand All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">
            Weekly Timeline & Milestones
          </span>
          <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium lg:hidden">
            Swipe left/right to scroll timeline ↔
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={toggleAllPhases}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
          >
            {allCollapsed ? (
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs max-w-full touch-pan-x">
        <table
          className="border-collapse border-spacing-0 table-fixed bg-white text-xs select-none"
          style={{ width: `${NW + n * CW}px` }}
        >
          <colgroup>
            <col style={{ width: `${NW}px` }} />
            {weeks.map((_, i) => (
              <col key={i} style={{ width: `${CW}px` }} />
            ))}
          </colgroup>

          {/* Month & Week Headers */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-slate-100 px-3.5 py-2 text-left font-bold text-slate-800 border-r border-slate-200 text-xs font-heading"
              >
                Phase & Tasks
              </th>
              {months.map((x, idx) => {
                const a = x.k.split('-').map(Number);
                const monthName = TM[a[1] - 1] || '';
                const yearCe = a[0]; // English CE year, e.g. 2026
                return (
                  <th
                    key={idx}
                    colSpan={x.n}
                    className="px-2 py-1.5 text-center font-bold text-slate-800 border-l border-slate-200 bg-slate-100/95 tracking-wide text-xs"
                  >
                    {monthName} {yearCe}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              {weeks.map((w, idx) => {
                const dayNum = +w.slice(8);
                const weekNum = Math.ceil(dayNum / 7);
                return (
                  <th
                    key={idx}
                    title={`Week starting ${fmt(w)}`}
                    className="py-1 text-center font-semibold text-slate-500 border-l border-slate-200 text-[11px] leading-tight"
                  >
                    <span className="text-[10px] text-slate-400 block font-normal">
                      W{weekNum}
                    </span>
                    <span>{dayNum}</span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {project.phases.map((ph) => {
              if (!ph.tasks.length) return null;

              const isCollapsed = collapsedPhases.has(ph.k);

              let ps: string | null = null;
              let pe: string | null = null;

              ph.tasks.forEach((t) => {
                const r = computedTasks[t.id];
                if (r) {
                  if (!ps || r.s < ps) ps = r.s;
                  if (!pe || r.e > pe) pe = r.e;
                }
              });

              // Phase Bar calculation
              let phaseBarLeft = 0;
              let phaseBarWidth = 0;
              if (ps && pe) {
                const l = (wi(ps) + di(ps) / 5) * CW;
                const r = (wi(pe) + (di(pe) + 1) / 5) * CW;
                phaseBarLeft = Math.round(l);
                phaseBarWidth = Math.max(6, Math.round(r - l));
              }

              const color = phaseColors[ph.k] || '#475569';

              return (
                <React.Fragment key={ph.k}>
                  {/* Phase Row with Collapse / Expand Toggle */}
                  <tr
                    onClick={() => togglePhase(ph.k)}
                    className="border-b border-slate-200 bg-slate-50/90 hover:bg-amber-50/50 transition-colors cursor-pointer"
                  >
                    <td className="sticky left-0 z-10 bg-slate-50/95 px-3 py-2 font-bold text-slate-900 border-r border-slate-200 truncate">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-0.5 rounded-md hover:bg-slate-200 text-slate-500"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">
                          {ph.k}. {PHASE_NAMES_EN[ph.k] || ph.name}
                        </span>
                        {isCollapsed && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({ph.tasks.length} tasks)
                          </span>
                        )}
                      </div>
                    </td>

                    <td colSpan={n} className="p-0 relative h-9">
                      {/* Grid lines */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${
                            CW - 1
                          }px, #e2e8f0 ${CW - 1}px, #e2e8f0 ${CW}px)`,
                        }}
                      />

                      {/* Today marker */}
                      {todayLeft !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none shadow-xs"
                          style={{ left: `${todayLeft}px` }}
                          title={`Today: ${fmt(td)}`}
                        />
                      )}

                      {/* Phase span bar */}
                      {ps && pe && (
                        <div
                          className="absolute top-2.5 h-3 rounded-md shadow-xs transition-all flex items-center px-1 text-[10px] text-white font-bold truncate"
                          style={{
                            left: `${phaseBarLeft}px`,
                            width: `${phaseBarWidth}px`,
                            backgroundColor: color,
                          }}
                          title={`${PHASE_NAMES_EN[ph.k] || ph.name}: ${fmt(ps)} – ${fmt(pe)}`}
                        >
                          <span className="truncate hidden sm:inline">
                            {PHASE_NAMES_EN[ph.k] || ph.name}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Task Rows (Shown only if phase is NOT collapsed) */}
                  {!isCollapsed &&
                    ph.tasks.map((t) => {
                      const r = computedTasks[t.id];
                      if (!r) return null;

                      const l = (wi(r.s) + di(r.s) / 5) * CW;
                      const right = (wi(r.e) + (di(r.e) + 1) / 5) * CW;
                      const barLeft = Math.round(l);
                      const barWidth = Math.max(8, Math.round(right - l));

                      return (
                        <tr
                          key={t.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                        >
                          <td
                            className="sticky left-0 z-10 bg-white px-3 py-1.5 text-slate-700 border-r border-slate-200 text-xs truncate max-w-[260px]"
                            title={t.name}
                          >
                            <div className="flex items-center gap-1.5 pl-5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  t.done ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span
                                className={`truncate ${
                                  t.done
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 font-medium'
                                }`}
                              >
                                {t.name || '(Untitled Task)'}
                              </span>
                            </div>
                          </td>

                          <td colSpan={n} className="p-0 relative h-8">
                            {/* Grid lines */}
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${
                                  CW - 1
                                }px, #f1f5f9 ${CW - 1}px, #f1f5f9 ${CW}px)`,
                              }}
                            />

                            {/* Today marker */}
                            {todayLeft !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                                style={{ left: `${todayLeft}px` }}
                              />
                            )}

                            {/* Task Bar with {t.days}d abbreviation */}
                            <div
                              className={`absolute top-1.5 h-5 rounded-md px-1.5 flex items-center text-[10px] font-bold text-white shadow-2xs truncate transition-all ${
                                t.done
                                  ? 'opacity-40 saturate-50'
                                  : 'hover:scale-y-105'
                              }`}
                              style={{
                                left: `${barLeft}px`,
                                width: `${barWidth}px`,
                                backgroundColor: color,
                              }}
                              title={`${t.name || '(Task)'} · ${fmt(r.s)} – ${fmt(
                                r.e
                              )} · ${t.days}d ${
                                t.done ? '(Completed)' : ''
                              }`}
                            >
                              <span className="truncate">{t.days}d</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500 rounded-full" />
            <span>Red line indicates "Today"</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-slate-400 rounded-xs opacity-40" />
            <span>Faded bars represent completed tasks</span>
          </div>
        </div>
        <p className="italic text-slate-400">
          Scroll horizontally to view the full timeline
        </p>
      </div>
    </div>
  );
};
