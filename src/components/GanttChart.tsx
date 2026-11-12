import React, { useState, useEffect, useRef } from 'react';
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
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface GanttChartProps {
  project: Project;
  computedTasks: Record<string, TaskComputeResult>;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  computedTasks,
}) => {
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // ความกว้างพื้นฐานและคำนวณตามระดับการซูม
  const baseCW = isMobile ? 44 : 52;
  const CW = Math.max(12, Math.round(baseCW * zoomScale));
  const NW = isMobile ? 140 : zoomScale < 0.65 ? 190 : 250;
  const isCompact = CW < 32;

  const n = weeks.length;
  const w0 = pd(weeks[0]).getTime();

  const wi = (s: string) =>
    Math.round((pd(monday(s)).getTime() - w0) / (7 * 864e5));
  const di = (s: string) => Math.min(4, (dow(s) + 6) % 7);

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
  const showToday = td >= weeks[0] && td <= addD(weeks[n - 1], 6);
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

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))));
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(1.6, Number((prev + 0.15).toFixed(2))));
  };

  const handleFitAll = () => {
    const containerWidth = containerRef.current?.clientWidth || (isMobile ? 360 : 1000);
    const nameColWidth = isMobile ? 140 : 190;
    const availableForWeeks = Math.max(120, containerWidth - nameColWidth - 4);
    const idealCW = availableForWeeks / Math.max(1, n);
    const idealScale = Math.max(0.25, Math.min(1, Number((idealCW / baseCW).toFixed(2))));
    setZoomScale(idealScale);
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">
            Weekly Timeline & Milestones
          </span>
          <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium">
            {n} สัปดาห์ · เลื่อนซ้าย-ขวา หรือกด +/- เพื่อย่อขยาย
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* แถบปุ่มย่อ/ขยายตาราง (- / % / + / Fit) */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.25}
              title="ย่อตาราง (Zoom Out)"
              className="px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              title="รีเซ็ตขนาด 100%"
              className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 border-x border-slate-200 min-w-[46px] text-center tabular-nums cursor-pointer"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomScale >= 1.6}
              title="ขยายตาราง (Zoom In)"
              className="px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitAll}
              title="ย่อให้เห็นทั้งหมดพอดีหน้าจอ"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-teal-700 bg-teal-50/70 hover:bg-teal-100 border-l border-slate-200 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>

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

      {/* กรอบตารางแบบ Scroll ทั้งแนวนอนและแนวตั้ง */}
      <div
        ref={containerRef}
        className="overflow-auto max-h-[65vh] sm:max-h-[72vh] border border-slate-200 rounded-2xl bg-white shadow-2xs max-w-full touch-pan-x"
      >
        <table
          className="border-separate border-spacing-0 table-fixed bg-white text-xs select-none"
          style={{ width: `${NW + n * CW}px` }}
        >
          <colgroup>
            <col style={{ width: `${NW}px` }} />
            {weeks.map((_, i) => (
              <col key={i} style={{ width: `${CW}px` }} />
            ))}
          </colgroup>

          {/* Month & Week Headers */}
          <thead className="sticky top-0 z-30 shadow-xs">
            <tr>
              <th
                rowSpan={2}
                style={{ width: `${NW}px`, minWidth: `${NW}px` }}
                className="sticky left-0 top-0 z-50 bg-slate-100 px-2 sm:px-3.5 py-2 text-left font-bold text-slate-800 border-r border-b border-slate-200 text-xs font-heading shadow-[4px_0_10px_-3px_rgba(0,0,0,0.08)]"
              >
                Phase & Tasks
              </th>
              {months.map((x, idx) => {
                const a = x.k.split('-').map(Number);
                const monthName = TM[a[1] - 1] || '';
                const yearCe = a[0];
                const isNarrowMonth = x.n * CW < 65;
                return (
                  <th
                    key={idx}
                    colSpan={x.n}
                    title={`${monthName} ${yearCe}`}
                    className="px-1 py-1 text-center font-bold text-slate-800 border-l border-b border-slate-200 bg-slate-100 tracking-wide text-[11px] sm:text-xs truncate"
                  >
                    {isNarrowMonth ? `${monthName} '${String(yearCe).slice(-2)}` : `${monthName} ${yearCe}`}
                  </th>
                );
              })}
            </tr>

            <tr>
              {weeks.map((w, idx) => {
                const dayNum = +w.slice(8);
                const weekNum = Math.ceil(dayNum / 7);
                return (
                  <th
                    key={idx}
                    title={`Week ${weekNum} (${fmt(w)})`}
                    className="py-1 text-center font-semibold text-slate-600 border-l border-b border-slate-200 bg-slate-50 text-[9px] sm:text-[11px] leading-tight overflow-hidden"
                  >
                    {isCompact ? (
                      <span className="text-[9px] text-slate-500 font-medium">
                        {weekNum}
                      </span>
                    ) : (
                      <>
                        <span className="text-[9px] text-slate-400 block font-normal">
                          W{weekNum}
                        </span>
                        <span>{dayNum}</span>
                      </>
                    )}
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

              let phaseBarLeft = 0;
              let phaseBarWidth = 0;
              if (ps && pe) {
                const l = (wi(ps) + di(ps) / 5) * CW;
                const r = (wi(pe) + (di(pe) + 1) / 5) * CW;
                phaseBarLeft = Math.round(l);
                phaseBarWidth = Math.max(4, Math.round(r - l));
              }

              const color = phaseColors[ph.k] || '#475569';

              return (
                <React.Fragment key={ph.k}>
                  {/* แถว Phase Header */}
                  <tr
                    onClick={() => togglePhase(ph.k)}
                    className="border-b border-slate-200 bg-slate-50/90 hover:bg-amber-50/50 transition-colors cursor-pointer group"
                  >
                    <td
                      style={{ width: `${NW}px`, minWidth: `${NW}px` }}
                      className="sticky left-0 z-20 bg-slate-100 px-2 sm:px-3 py-2 font-bold text-slate-900 border-r border-b border-slate-200 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex items-start gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 rounded-md p-0.5 hover:bg-slate-200 text-slate-500"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm flex-shrink-0 mt-1"
                          style={{ backgroundColor: color }}
                        />
                        <span className="min-w-0 text-[11px] sm:text-xs whitespace-normal break-words leading-tight">
                          {ph.k}. {PHASE_NAMES_EN[ph.k] || ph.name}
                        </span>
                      </div>
                    </td>

                    <td colSpan={n} className="p-0 relative h-9 border-b border-slate-200">
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${
                            CW - 1
                          }px, #e2e8f0 ${CW - 1}px, #e2e8f0 ${CW}px)`,
                        }}
                      />

                      {todayLeft !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-0 pointer-events-none shadow-xs"
                          style={{ left: `${todayLeft}px` }}
                          title={`Today: ${fmt(td)}`}
                        />
                      )}

                      {ps && pe && (
                        <div
                          className="absolute top-2.5 h-3.5 rounded-md shadow-xs transition-all flex items-center px-1 text-[9px] sm:text-[10px] text-white font-bold truncate z-10"
                          style={{
                            left: `${phaseBarLeft}px`,
                            width: `${phaseBarWidth}px`,
                            backgroundColor: color,
                          }}
                          title={`${PHASE_NAMES_EN[ph.k] || ph.name}: ${fmt(ps)} – ${fmt(pe)}`}
                        >
                          {phaseBarWidth > 45 && (
                            <span className="truncate hidden sm:inline">
                              {PHASE_NAMES_EN[ph.k] || ph.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* แถว Task ย่อย */}
                  {!isCollapsed &&
                    ph.tasks.map((t) => {
                      const r = computedTasks[t.id];
                      if (!r) return null;

                      const l = (wi(r.s) + di(r.s) / 5) * CW;
                      const right = (wi(r.e) + (di(r.e) + 1) / 5) * CW;
                      const barLeft = Math.round(l);
                      const barWidth = Math.max(5, Math.round(right - l));

                      return (
                        <tr
                          key={t.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                        >
                          <td
                            style={{ width: `${NW}px`, minWidth: `${NW}px` }}
                            className="sticky left-0 z-20 bg-white px-2 sm:px-3 py-1.5 text-slate-700 border-r border-b border-slate-100 text-xs align-top shadow-[4px_0_10px_-3px_rgba(0,0,0,0.08)]"
                            title={t.name}
                          >
                            <div className="flex items-start gap-1 sm:gap-1.5 pl-2 sm:pl-4">
                              <span
                                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                  t.done ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                              <span
                                className={`min-w-0 text-[11px] sm:text-xs whitespace-normal break-words leading-tight ${
                                  t.done
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 font-medium'
                                }`}
                              >
                                {t.name || '(Untitled Task)'}
                              </span>
                            </div>
                          </td>

                          <td colSpan={n} className="p-0 relative h-8 border-b border-slate-100">
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${
                                  CW - 1
                                }px, #f1f5f9 ${CW - 1}px, #f1f5f9 ${CW}px)`,
                              }}
                            />

                            {todayLeft !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-0 pointer-events-none"
                                style={{ left: `${todayLeft}px` }}
                              />
                            )}

                            <div
                              className={`absolute top-1.5 h-5 rounded-md px-1 flex items-center text-[9px] sm:text-[10px] font-bold text-white shadow-2xs truncate transition-all z-10 ${
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
                              {barWidth >= 22 && (
                                <span className="truncate">{t.days}d</span>
                              )}
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

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500 rounded-full" />
            <span>เส้นสีแดง: วันที่ปัจจุบัน</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-slate-400 rounded-xs opacity-40" />
            <span>งานที่เสร็จแล้ว</span>
          </div>
        </div>
      </div>
    </div>
  );
};