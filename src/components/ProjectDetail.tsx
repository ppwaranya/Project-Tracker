import React, { useState } from 'react';
import {
  Formula,
  PackagingItem,
  PackagingStatus,
  Project,
  ProjectDocument,
  RegulatoryItem,
} from '../lib/types';
import {
  baht,
  compute,
  costOf,
  displayCategory,
  DOC_TYPES,
  flatTasks,
  fmt,
  lookup,
  otherPer,
  PACKAGING_STATUS_LIST,
  PKG_TYPES,
  REGULATORY_STATUS_LIST,
  STATUS_LIST,
  summ,
  TEST_STATUS_LIST,
  todayISO,
  uid,
} from '../lib/trackerLogic';
import { GanttChart } from './GanttChart';
import { CostSummary } from './CostSummary';
import { DriveUploadModal } from './DriveUploadModal';
import {
  ArrowLeft,
  Copy,
  Trash2,
  Plus,
  Cloud,
  ExternalLink,
  EyeOff,
  CheckCircle2,
  FileText,
  Info,
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Clock,
  Award,
  Upload,
  X,
  FileCheck,
  Lock,
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  holidaysSet: Set<string>;
  costPrivacy: boolean;
  accessToken: string | null;
  isViewOnly?: boolean;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

type TabKey = 'overview' | 'formula' | 'packaging' | 'cost' | 'timeline' | 'docs';

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  holidaysSet,
  costPrivacy,
  accessToken,
  isViewOnly = false,
  onBack,
  onUpdateProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const [copiedViewLink, setCopiedViewLink] = useState(false);

  // Link document addition state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState<ProjectDocument['type']>('ผลตรวจ / รายงานแล็บ');

  // Multi-line ingredient paste state
  const [ingPasteText, setIngPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Calculations
  const cs = compute(project, holidaysSet);
  const co = costOf(project);
  const s = summ(project, cs, co, holidaysSet);

  const update = (partial: Partial<Project>) => {
    onUpdateProject({
      ...project,
      ...partial,
      updatedAt: Date.now(),
      rev: (project.rev || 0) + 1,
    });
  };

  const handleDuplicate = () => {
    onDuplicateProject(project);
  };

  const handleDelete = () => {
    if (!armDelete) {
      setArmDelete(true);
      setTimeout(() => setArmDelete(false), 4000);
      return;
    }
    onDeleteProject(project.id);
  };

  // Helper for sub-item step pricing changes
  const updateStep = (
    listType: 'formulas' | 'packaging',
    itemId: string,
    stepIdx: number,
    field: 'qty' | 'price',
    val: string
  ) => {
    if (listType === 'formulas') {
      const newFormulas = project.formulas.map((f) => {
        if (f.id !== itemId) return f;
        const newSteps = [...f.steps];
        newSteps[stepIdx] = { ...newSteps[stepIdx], [field]: val };
        return { ...f, steps: newSteps };
      });
      update({ formulas: newFormulas });
    } else {
      const newPackaging = project.packaging.map((p) => {
        if (p.id !== itemId) return p;
        const newSteps = [...p.steps];
        newSteps[stepIdx] = { ...newSteps[stepIdx], [field]: val };
        return { ...p, steps: newSteps };
      });
      update({ packaging: newPackaging });
    }
  };

  const addStep = (listType: 'formulas' | 'packaging', itemId: string) => {
    if (listType === 'formulas') {
      const newFormulas = project.formulas.map((f) => {
        if (f.id !== itemId) return f;
        return { ...f, steps: [...f.steps, { qty: '', price: '' }] };
      });
      update({ formulas: newFormulas });
    } else {
      const newPackaging = project.packaging.map((p) => {
        if (p.id !== itemId) return p;
        return { ...p, steps: [...p.steps, { qty: '', price: '' }] };
      });
      update({ packaging: newPackaging });
    }
  };

  const deleteStep = (
    listType: 'formulas' | 'packaging',
    itemId: string,
    stepIdx: number
  ) => {
    if (listType === 'formulas') {
      const newFormulas = project.formulas.map((f) => {
        if (f.id !== itemId) return f;
        const newSteps = f.steps.filter((_, idx) => idx !== stepIdx);
        return {
          ...f,
          steps: newSteps.length ? newSteps : [{ qty: '', price: '' }],
        };
      });
      update({ formulas: newFormulas });
    } else {
      const newPackaging = project.packaging.map((p) => {
        if (p.id !== itemId) return p;
        const newSteps = p.steps.filter((_, idx) => idx !== stepIdx);
        return {
          ...p,
          steps: newSteps.length ? newSteps : [{ qty: '', price: '' }],
        };
      });
      update({ packaging: newPackaging });
    }
  };

  // Add external link to docs
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    let u = linkUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;

    const newDoc: ProjectDocument = {
      id: uid(),
      title: linkTitle.trim() || u.replace(/^https?:\/\//, '').slice(0, 40),
      type: linkType,
      kind: 'link',
      url: u,
      note: '',
      added: todayISO(),
    };

    update({ docs: [...project.docs, newDoc] });
    setLinkUrl('');
    setLinkTitle('');
  };

  // Multi-line paste ingredients
  const handlePasteIngredients = () => {
    if (!ingPasteText.trim()) return;
    const lines = ingPasteText.split(/\r?\n/);
    const newItems = [...project.ingredients];

    lines.forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/\t|,/);
      newItems.push({
        id: uid(),
        name: (parts[0] || '').trim(),
        amount: (parts[1] || '').trim(),
        note: parts.slice(2).join(', ').trim(),
      });
    });

    update({ ingredients: newItems });
    setIngPasteText('');
    setShowPasteArea(false);
  };

  // Multiple Image Upload Helper (Supports uploading more than 1 image!)
  const handleMultipleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    currentImages: string[],
    onSuccess: (newImages: string[]) => void
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const loadedUrls: string[] = [];
      let completed = 0;

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            loadedUrls.push(reader.result);
          }
          completed++;
          if (completed === files.length) {
            onSuccess([...currentImages, ...loadedUrls]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = ''; // Reset input to allow re-upload
    }
  };

  // Create new iteration directly from an existing formula (User Request in Formula)
  const handleIterateFromFormula = (sourceFormula: Formula) => {
    const nextVer = `V${project.formulas.length + 1}`;
    const newFormula: Formula = {
      id: uid(),
      ver: nextVer,
      code: sourceFormula.code ? `${sourceFormula.code}-rev` : '',
      date: todayISO(),
      changes: `Derived from ${sourceFormula.ver}`,
      steps: JSON.parse(JSON.stringify(sourceFormula.steps)),
      note: '',
      ingredients: sourceFormula.ingredients
        ? JSON.parse(JSON.stringify(sourceFormula.ingredients))
        : [],
      images: sourceFormula.images ? [...sourceFormula.images] : [],
      imageNote: sourceFormula.imageNote || '',
      isConfirmed: false,
    };

    update({
      formulas: [...project.formulas, newFormula],
      chosenFormula: newFormula.id,
    });
  };

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
      {/* Top Header / Navigation & Actions */}
      <div
        className={`rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
          displayCategory(project.category) === 'Dietary Supplement'
            ? 'border-2 border-[#84cc16] bg-gradient-to-b from-[#f7fee7]/70 via-white to-white'
            : 'border-2 border-[#0284c7] bg-gradient-to-b from-[#f0f9ff]/70 via-white to-white'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            displayCategory(project.category) === 'Dietary Supplement'
              ? 'bg-[#84cc16]'
              : 'bg-[#0284c7]'
          }`}
        />
        <div className="space-y-2 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Projects</span>
          </button>

          {/* Full Multiline Project Name (Never truncated, wraps to new line) */}
          <div className="w-full">
            <textarea
              rows={1}
              value={project.name}
              onChange={(e) => {
                update({ name: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              placeholder="Project Name e.g. Peach Collagen Peptide 5,000 mg"
              className="w-full text-xl sm:text-2xl font-extrabold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-hidden bg-transparent px-1 py-1 rounded-sm resize-none overflow-hidden leading-snug whitespace-normal break-words transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {/* Lot Number input */}
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Lot:
              </span>
              <input
                type="text"
                value={project.lotNo || ''}
                onChange={(e) => update({ lotNo: e.target.value })}
                placeholder=""
                className="w-24 text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
              />
            </div>

            <select
              disabled={isViewOnly}
              value={project.category === 'อาหารเสริม' ? 'Dietary Supplement' : project.category === 'สกินแคร์' ? 'Skincare' : project.category}
              onChange={(e) => update({ category: e.target.value as any })}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 shadow-2xs cursor-pointer disabled:opacity-70"
            >
              <option value="Dietary Supplement">Dietary Supplement</option>
              <option value="Skincare">Skincare</option>
            </select>

            <select
              disabled={isViewOnly}
              value={project.status === 'กำลังดำเนินการ' ? 'In Progress' : project.status === 'เสร็จสิ้น' ? 'Completed' : project.status === 'พักไว้' ? 'On Hold' : project.status === 'ยกเลิก' ? 'Cancelled' : project.status}
              onChange={(e) => update({ status: e.target.value as any })}
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold shadow-2xs cursor-pointer disabled:opacity-70 ${
                project.status === 'เสร็จสิ้น' || project.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : project.status === 'กำลังดำเนินการ' || project.status === 'In Progress'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : project.status === 'พักไว้' || project.status === 'On Hold'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
          {/* Share View-Only Link Button */}
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.hash = `#view/${project.id}`;
              navigator.clipboard.writeText(url.toString());
              setCopiedViewLink(true);
              setTimeout(() => setCopiedViewLink(false), 2500);
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 transition-colors cursor-pointer shadow-2xs"
            title="Copy view-only link for team sharing"
          >
            {copiedViewLink ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-teal-600" />
            )}
            <span>{copiedViewLink ? 'Link Copied!' : 'Share View-Only'}</span>
          </button>

          {!isViewOnly && (
            <>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={handleDelete}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  armDelete
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{armDelete ? 'Confirm Delete' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Banner (Niond Style Pastel & Slate Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Current Stage - Lavender */}
        <div className="bg-[#eee8ff] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#ded5fc] shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4d3b94] block mb-1">
            Current Stage
          </span>
          <div className="flex items-center gap-1.5">
            {s.stage.k > 0 && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: phaseColors[s.stage.k] || '#0d9488',
                }}
              />
            )}
            <b className="text-sm sm:text-base font-black text-[#2a1b63] truncate">
              {s.stage.name}
            </b>
          </div>
          <span className="text-[11px] text-[#6954b8] mt-1 block truncate font-semibold">
            {s.currentTaskName ? `Active: ${s.currentTaskName}` : 'Phases 1 to 6'}
          </span>
        </div>

        {/* Card 2: Overall Progress - Mint */}
        <div className="bg-[#cbf7df] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#b1f1ce] shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0e5c36] block mb-1">
            Overall Progress
          </span>
          <b className="text-2xl sm:text-3xl font-black text-[#084225]">{s.pct}%</b>
          <span className="text-[11px] text-[#1b7a48] mt-1 block font-semibold">
            {s.done} of {s.total} tasks completed
          </span>
        </div>

        {/* Card 3: Est. Arrival - Sky Blue */}
        <div className="bg-[#daf0ff] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#c4e5ff] shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#124d91] block mb-1">
            Est. Arrival Date
          </span>
          <b className="text-sm sm:text-base font-black text-[#0f3d73]">
            {fmt(s.last)}
          </b>
          <span className="text-[11px] text-[#2467b6] mt-1 block truncate font-semibold">
            {s.vs || 'Launch target not set'}
          </span>
        </div>

        {/* Card 4: Total Unit Cost */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            Total Unit Cost
          </span>
          {costPrivacy ? (
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
              <EyeOff className="w-3.5 h-3.5" />
              <span>•••••• (Restricted)</span>
            </div>
          ) : (
            <div>
              <b className="text-xl sm:text-2xl font-black text-slate-900">
                {co.unit > 0 ? `${baht(co.unit)} ฿` : '-'}
              </b>
              <span className="text-[11px] text-slate-400 mt-0.5 block truncate font-medium">
                {co.q
                  ? `Lot: ${baht(co.batch)} ฿ (${Number(co.q).toLocaleString('en-US')} pcs)`
                  : 'Enter quantity in Overview'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation (Niond-Style Lime Active Pill) */}
      <div className="border-b border-slate-200/80 overflow-x-auto scrollbar-none pb-1">
        <nav className="flex space-x-1.5 sm:space-x-2 min-w-max p-1 bg-slate-200/60 rounded-2xl">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'formula', label: `Formulation (${project.formulas.length})` },
            { key: 'packaging', label: `Packaging (${project.packaging.length})` },
            ...(!isViewOnly ? [{ key: 'cost', label: 'Cost & Budget' }] : []),
            { key: 'timeline', label: 'Timeline & Gantt' },
            { key: 'docs', label: `Documents (${project.docs.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === t.key
                  ? 'bg-[#ccf835] text-slate-950 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 1: Specifications & FDA Licensing */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600" />
              <span>Project Specifications & Regulatory Registration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Owner
                </label>
                <input
                  type="text"
                  value={project.owner}
                  onChange={(e) => update({ owner: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Manufacturing Factory
                </label>
                <input
                  type="text"
                  value={project.factory}
                  onChange={(e) => update({ factory: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  value={project.lotNo || ''}
                  onChange={(e) => update({ lotNo: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white font-semibold"
                />
              </div>

              {/* FDA / Regulatory License Number (User Request in Overview) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-emerald-800 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>FDA / License No. (เลขที่ อย. / เลขจดแจ้ง)</span>
                </label>
                <input
                  type="text"
                  value={project.fdaNo || ''}
                  onChange={(e) => update({ fdaNo: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 font-bold text-emerald-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Order Quantity (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={project.qty}
                  onChange={(e) => update({ qty: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Start Date
                </label>
                <input
                  type="date"
                  value={project.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Launch Date
                </label>
                <input
                  type="date"
                  value={project.launchTarget}
                  onChange={(e) => update({ launchTarget: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Net Volume / Unit Packaging Spec
                </label>
                <input
                  type="text"
                  value={project.pack}
                  onChange={(e) => update({ pack: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Packaging & Logistics Notes
                </label>
                <textarea
                  rows={2}
                  value={project.packNote}
                  onChange={(e) => update({ packNote: e.target.value })}
                  placeholder=""
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Product Reference & Benchmark (COMPACT & MULTI-IMAGE SUPPORT) */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Product Reference & Benchmark</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Benchmark sensory, texture, taste, packaging & pricing against market competitors
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="space-y-3 lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reference Product / Brand Name
                    </label>
                    <input
                      type="text"
                      value={project.benchmark?.name || ''}
                      onChange={(e) =>
                        update({
                          benchmark: {
                            ...(project.benchmark || { name: '', description: '', images: [] }),
                            name: e.target.value,
                          },
                        })
                      }
                      placeholder=""
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target / Market Retail Price
                    </label>
                    <input
                      type="text"
                      value={project.benchmark?.targetPrice || ''}
                      onChange={(e) =>
                        update({
                          benchmark: {
                            ...(project.benchmark || { name: '', description: '', images: [] }),
                            targetPrice: e.target.value,
                          },
                        })
                      }
                      placeholder=""
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Benchmark Comparison & Winning Factors
                  </label>
                  <textarea
                    rows={3}
                    value={project.benchmark?.description || ''}
                    onChange={(e) =>
                      update({
                        benchmark: {
                          ...(project.benchmark || { name: '', description: '', images: [] }),
                          description: e.target.value,
                        },
                      })
                    }
                    placeholder="Describe target sensory profile (e.g. fast cold water solubility, smooth peach aroma, non-sour aftertaste, premium slide-out box packaging)"
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Compact Multiple Images Gallery (User Request in Overview) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Benchmark Images ({project.benchmark?.images?.length || 0})
                  </label>
                  <label className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        handleMultipleImageUpload(
                          e,
                          project.benchmark?.images || [],
                          (newImages) =>
                            update({
                              benchmark: {
                                ...(project.benchmark || {
                                  name: '',
                                  description: '',
                                  images: [],
                                }),
                                images: newImages,
                              },
                            })
                        )
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Compact Thumbnail Grid */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[90px]">
                  {(!project.benchmark?.images || project.benchmark.images.length === 0) ? (
                    <div className="col-span-3 py-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                      <span>No images added yet</span>
                    </div>
                  ) : (
                    project.benchmark.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square flex items-center justify-center group"
                      >
                        <img
                          src={imgUrl}
                          alt={`Benchmark ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedImages = (project.benchmark?.images || []).filter(
                              (_, idx) => idx !== imgIdx
                            );
                            update({
                              benchmark: {
                                ...(project.benchmark || {
                                  name: '',
                                  description: '',
                                  images: [],
                                }),
                                images: updatedImages,
                              },
                            });
                          }}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: USP & Marketing Claims */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Unique Selling Proposition (USP) & Marketing Claims</span>
            </h3>
            <textarea
              rows={3}
              value={project.uspClaims || ''}
              onChange={(e) => update({ uspClaims: e.target.value })}
              placeholder=""
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </section>

          {/* Section 4: Ingredients List */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ingredients & Active Components ({project.ingredients.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {showPasteArea ? 'Hide Multi-line' : 'Paste Multiple Lines'}
                </button>
                <button
                  onClick={() =>
                    update({
                      ingredients: [
                        ...project.ingredients,
                        { id: uid(), name: '', amount: '', note: '' },
                      ],
                    })
                  }
                  className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ingredient</span>
                </button>
              </div>
            </div>

            {/* Paste box */}
            {showPasteArea && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  Paste rows (one ingredient per line). Separate name, amount, and notes with commas or tabs:
                </p>
                <textarea
                  rows={3}
                  value={ingPasteText}
                  onChange={(e) => setIngPasteText(e.target.value)}
                  placeholder=""
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                />
                <button
                  onClick={handlePasteIngredients}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shadow-xs"
                >
                  Import Ingredients
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5">Ingredient Name</th>
                    <th className="py-2.5 px-3">Concentration / Amount</th>
                    <th className="py-2.5 px-3">Purpose & Source</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No ingredients added yet. Click "+ Add Ingredient" above.
                      </td>
                    </tr>
                  ) : (
                    project.ingredients.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/70">
                        <td className="p-2 pl-3.5">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => {
                              const copy = [...project.ingredients];
                              copy[idx].name = e.target.value;
                              update({ ingredients: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={it.amount}
                            onChange={(e) => {
                              const copy = [...project.ingredients];
                              copy[idx].amount = e.target.value;
                              update({ ingredients: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={it.note}
                            onChange={(e) => {
                              const copy = [...project.ingredients];
                              copy[idx].note = e.target.value;
                              update({ ingredients: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              const copy = project.ingredients.filter(
                                (x) => x.id !== it.id
                              );
                              update({ ingredients: copy });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Laboratory Analysis & QA */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Laboratory Analysis & QA ({project.tests.length})
                </h3>
              </div>

              <button
                onClick={() =>
                  update({
                    tests: [
                      ...project.tests,
                      {
                        id: uid(),
                        name: '',
                        lab: '',
                        date: '',
                        status: 'ยังไม่ส่ง',
                        note: '',
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lab Test</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5">Test Specification</th>
                    <th className="py-2.5 px-3">Laboratory / Agency</th>
                    <th className="py-2.5 px-3">Date Submitted</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Report / Notes</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.tests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No lab tests added yet. Use quick templates below.
                      </td>
                    </tr>
                  ) : (
                    project.tests.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="p-2 pl-3.5">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const copy = [...project.tests];
                              copy[idx].name = e.target.value;
                              update({ tests: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={t.lab}
                            onChange={(e) => {
                              const copy = [...project.tests];
                              copy[idx].lab = e.target.value;
                              update({ tests: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={t.date}
                            onChange={(e) => {
                              const copy = [...project.tests];
                              copy[idx].date = e.target.value;
                              update({ tests: copy });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={t.status}
                            onChange={(e) => {
                              const copy = [...project.tests];
                              copy[idx].status = e.target.value as any;
                              update({ tests: copy });
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg border font-bold ${
                              t.status === 'ผ่าน'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : t.status === 'ไม่ผ่าน / ต้องแก้'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : t.status === 'ส่งแล้ว / รอผล'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {TEST_STATUS_LIST.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={t.note}
                            onChange={(e) => {
                              const copy = [...project.tests];
                              copy[idx].note = e.target.value;
                              update({ tests: copy });
                            }}
                            placeholder="Report details"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              const copy = project.tests.filter((x) => x.id !== t.id);
                              update({ tests: copy });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-slate-500 font-bold">Quick Add:</span>
              {[
                'Stability test',
                'Compatibility test',
                'Nutrition facts',
                'Heavy metals',
                'Microbial test',
                'Patch test (Irritation)',
              ].map((name) => (
                <button
                  key={name}
                  onClick={() =>
                    update({
                      tests: [
                        ...project.tests,
                        {
                          id: uid(),
                          name,
                          lab: '',
                          date: '',
                          status: 'ยังไม่ส่ง',
                          note: '',
                        },
                      ],
                    })
                  }
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                >
                  + {name}
                </button>
              ))}
            </div>
          </section>

          {/* Section 6: Regulatory & Permits */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Regulatory, Licenses & Permits ({project.regulatory?.length || 0})</span>
                </h3>
              </div>

              <button
                onClick={() =>
                  update({
                    regulatory: [
                      ...(project.regulatory || []),
                      {
                        id: uid(),
                        name: '',
                        agency: 'Thai FDA',
                        submissionDate: '',
                        licenseNo: '',
                        status: 'รอเตรียมเอกสาร',
                        note: '',
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Permit</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[760px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5">Permit / Application Name</th>
                    <th className="py-2.5 px-3">Issuing Agency</th>
                    <th className="py-2.5 px-3">Submission Date</th>
                    <th className="py-2.5 px-3">Registration / License No.</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!project.regulatory || project.regulatory.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No regulatory permits registered. Click "+ Add Permit" or choose a quick template below.
                      </td>
                    </tr>
                  ) : (
                    project.regulatory.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="p-2 pl-3.5">
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].name = e.target.value;
                              update({ regulatory: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.agency}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].agency = e.target.value;
                              update({ regulatory: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={r.submissionDate}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].submissionDate = e.target.value;
                              update({ regulatory: copy });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.licenseNo}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].licenseNo = e.target.value;
                              update({ regulatory: copy });
                            }}
                            placeholder=""
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={r.status}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].status = e.target.value as any;
                              update({ regulatory: copy });
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg border font-bold ${
                              r.status === 'อนุมัติแล้ว'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : r.status === 'ต้องแก้ไขเอกสาร'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : r.status === 'ยื่นแล้ว / รอพิจารณา'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {REGULATORY_STATUS_LIST.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.note}
                            onChange={(e) => {
                              const copy = [...(project.regulatory || [])];
                              copy[idx].note = e.target.value;
                              update({ regulatory: copy });
                            }}
                            placeholder="Additional details"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              const copy = (project.regulatory || []).filter(
                                (x) => x.id !== r.id
                              );
                              update({ regulatory: copy });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Templates for Regulatory */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-slate-500 font-bold">Quick Add:</span>
              {[
                { name: 'อย. อาหารเสริม', agency: 'Thai FDA' },
                { name: 'จดแจ้งเครื่องสำอาง (อย.)', agency: 'Thai FDA' },
                { name: 'ใบอนุญาตโฆษณาอาหาร (ฆอ.)', agency: 'Thai FDA' },
                { name: 'ฮาลาล (Halal Certification)', agency: 'CICOT' },
                { name: 'หนังสือรับรองเพื่อการส่งออก (CFS)', agency: 'Thai FDA' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() =>
                    update({
                      regulatory: [
                        ...(project.regulatory || []),
                        {
                          id: uid(),
                          name: item.name,
                          agency: item.agency,
                          submissionDate: '',
                          licenseNo: '',
                          status: 'รอเตรียมเอกสาร',
                          note: '',
                        },
                      ],
                    })
                  }
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: FORMULATION */}
      {activeTab === 'formula' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Formulation Development & Iterations
              </h3>
              <p className="text-xs text-slate-500">
                {project.formulas.length} iterations tracked · Active costing formula:{' '}
                <strong>
                  {
                    project.formulas.find((f) => f.id === project.chosenFormula)
                      ?.ver
                  }
                </strong>
              </p>
            </div>

            <button
              onClick={() => {
                const last = project.formulas[project.formulas.length - 1];
                const newF: Formula = {
                  id: uid(),
                  ver: `V${project.formulas.length + 1}`,
                  code: '',
                  date: todayISO(),
                  changes: '',
                  steps: JSON.parse(JSON.stringify(last.steps)),
                  note: '',
                  images: [],
                  imageNote: '',
                  isConfirmed: false,
                };
                update({
                  formulas: [...project.formulas, newF],
                  chosenFormula: newF.id,
                });
              }}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Formula Iteration</span>
            </button>
          </div>

          <div className="space-y-5">
            {project.formulas
              .slice()
              .reverse()
              .map((f, i) => {
                const isChosen = f.id === project.chosenFormula;
                const formulaPriceRes = lookup(f.steps, Number(project.qty) || 0);

                // Delta vs previous version
                const originalIndex = project.formulas.findIndex((x) => x.id === f.id);
                let deltaText = '';
                if (originalIndex > 0) {
                  const prevFormula = project.formulas[originalIndex - 1];
                  const prevPriceRes = lookup(
                    prevFormula.steps,
                    Number(project.qty) || 0
                  );
                  if (formulaPriceRes.has && prevPriceRes.has) {
                    const diff = formulaPriceRes.price - prevPriceRes.price;
                    if (diff === 0) deltaText = 'Same as previous';
                    else if (diff > 0) deltaText = `▲ +${baht(diff)} ฿`;
                    else deltaText = `▼ -${baht(Math.abs(diff))} ฿`;
                  }
                }

                return (
                  <div
                    key={f.id}
                    className={`p-6 rounded-3xl border transition-all ${
                      f.isConfirmed
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                        : isChosen
                        ? 'bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Version */}
                        <input
                          type="text"
                          value={f.ver}
                          onChange={(e) => {
                            const newFs = project.formulas.map((x) =>
                              x.id === f.id ? { ...x, ver: e.target.value } : x
                            );
                            update({ formulas: newFs });
                          }}
                          className="w-16 font-extrabold text-slate-900 px-2 py-1 rounded-xl border border-slate-200 bg-slate-50 text-sm text-center"
                        />

                        {/* Formula Code Input */}
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-400">
                            Code:
                          </span>
                          <input
                            type="text"
                            value={f.code || ''}
                            onChange={(e) => {
                              const newFs = project.formulas.map((x) =>
                                x.id === f.id ? { ...x, code: e.target.value } : x
                              );
                              update({ formulas: newFs });
                            }}
                            placeholder=""
                            className="w-28 text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
                          />
                        </div>

                        <input
                          type="date"
                          value={f.date}
                          onChange={(e) => {
                            const newFs = project.formulas.map((x) =>
                              x.id === f.id ? { ...x, date: e.target.value } : x
                            );
                            update({ formulas: newFs });
                          }}
                          className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 bg-white"
                        />

                        {/* Price readout */}
                        <div className="flex items-center gap-2 pl-2">
                          {costPrivacy ? (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              ••••••
                            </span>
                          ) : (
                            <>
                              <span className="font-extrabold text-slate-800 text-sm">
                                {formulaPriceRes.has
                                  ? `${baht(formulaPriceRes.price)} ฿ / pc`
                                  : 'Price not set'}
                              </span>
                              {deltaText && (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {deltaText}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* New Version from this formula button */}
                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() => handleIterateFromFormula(f)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#ccf835]/35 hover:bg-[#ccf835]/65 text-slate-950 border border-[#b2e61e] transition-colors cursor-pointer"
                            title="Create new version based on this formula"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>New Version</span>
                          </button>
                        )}

                        {/* Confirm Formulation Button */}
                        <button
                          type="button"
                          disabled={isViewOnly}
                          onClick={() => {
                            const newFs = project.formulas.map((x) =>
                              x.id === f.id
                                ? { ...x, isConfirmed: !x.isConfirmed }
                                : x
                            );
                            update({ formulas: newFs });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            f.isConfirmed
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Formulation</span>
                        </button>

                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            disabled={isViewOnly}
                            name="chosenFormula"
                            checked={isChosen}
                            onChange={() => update({ chosenFormula: f.id })}
                            className="accent-amber-500"
                          />
                          <span>Use for Costing</span>
                        </label>

                        {/* Delete Formula Button (User Request: ให้ลบสูตรได้ด้วย เผื่อกดผิด) */}
                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete formula iteration ${f.ver}?`)) {
                                if (project.formulas.length > 1) {
                                  const newFs = project.formulas.filter(
                                    (x) => x.id !== f.id
                                  );
                                  let newChosen = project.chosenFormula;
                                  if (newChosen === f.id) {
                                    newChosen = newFs[newFs.length - 1].id;
                                  }
                                  update({
                                    formulas: newFs,
                                    chosenFormula: newChosen,
                                  });
                                } else {
                                  const resetF: Formula = {
                                    id: uid(),
                                    ver: 'V1',
                                    code: '',
                                    date: todayISO(),
                                    changes: '',
                                    steps: [{ qty: '', price: '' }],
                                    note: '',
                                    ingredients: [],
                                    images: [],
                                    imageNote: '',
                                    isConfirmed: false,
                                  };
                                  update({ formulas: [resetF], chosenFormula: resetF.id });
                                }
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-colors cursor-pointer"
                            title="Delete this formula iteration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete Formula</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
                      {/* Notes & Multi-Image Gallery */}
                      <div className="space-y-4 lg:col-span-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Changes & Formulation Notes
                          </label>
                          <textarea
                            rows={3}
                            value={f.changes}
                            onChange={(e) => {
                              const newFs = project.formulas.map((x) =>
                                x.id === f.id
                                  ? { ...x, changes: e.target.value }
                                  : x
                              );
                              update({ formulas: newFs });
                            }}
                            placeholder="Reason for changes (e.g. Reduced sweetness by 10%, enhanced natural peach aroma)"
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
                          />
                        </div>

                        {/* Multiple Sample Images (User Request: all image sections must support > 1 image!) */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-slate-500" />
                              <span>Sample & Physical Appearance Images ({f.images?.length || 0})</span>
                            </span>
                            <label className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Upload Images</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) =>
                                  handleMultipleImageUpload(
                                    e,
                                    f.images || [],
                                    (newImgs) => {
                                      const newFs = project.formulas.map((x) =>
                                        x.id === f.id ? { ...x, images: newImgs } : x
                                      );
                                      update({ formulas: newFs });
                                    }
                                  )
                                }
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Multi-image thumbnail grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {(!f.images || f.images.length === 0) ? (
                              <div className="col-span-full py-4 text-center text-slate-400 text-xs">
                                No sample images attached. Click "Upload Images" to attach multiple photos of powder, solution, or texture.
                              </div>
                            ) : (
                              f.images.map((imgUrl, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square flex items-center justify-center group"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Sample ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newImgs = (f.images || []).filter(
                                        (_, idx) => idx !== imgIdx
                                      );
                                      const newFs = project.formulas.map((x) =>
                                        x.id === f.id ? { ...x, images: newImgs } : x
                                      );
                                      update({ formulas: newFs });
                                    }}
                                    className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Image Observations / Sensory Notes
                            </label>
                            <input
                              type="text"
                              value={f.imageNote || ''}
                              onChange={(e) => {
                                const newFs = project.formulas.map((x) =>
                                  x.id === f.id ? { ...x, imageNote: e.target.value } : x
                                );
                                update({ formulas: newFs });
                              }}
                              placeholder=""
                              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tiered Step Pricing */}
                      <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Tiered Pricing (ราคาขั้นบันได)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Per order qty
                          </span>
                        </div>

                        {costPrivacy ? (
                          <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200 font-mono">
                            •••••• Pricing Tiers Hidden
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                                  <th className="py-1">From (Units)</th>
                                  <th className="py-1">Price (THB/pc)</th>
                                  <th className="py-1 w-8"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {f.steps.map((st, sidx) => (
                                  <tr key={sidx}>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        min="0"
                                        value={st.qty}
                                        onChange={(e) =>
                                          updateStep(
                                            'formulas',
                                            f.id,
                                            sidx,
                                            'qty',
                                            e.target.value
                                          )
                                        }
                                        placeholder=""
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium"
                                      />
                                    </td>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={st.price}
                                        onChange={(e) =>
                                          updateStep(
                                            'formulas',
                                            f.id,
                                            sidx,
                                            'price',
                                            e.target.value
                                          )
                                        }
                                        placeholder="0.00"
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium"
                                      />
                                    </td>
                                    <td className="py-1 text-center">
                                      <button
                                        onClick={() =>
                                          deleteStep('formulas', f.id, sidx)
                                        }
                                        className="text-slate-400 hover:text-rose-600 text-sm"
                                        title="Delete step"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <button
                              onClick={() => addStep('formulas', f.id)}
                              className="text-xs text-teal-700 hover:underline font-bold cursor-pointer pt-1"
                            >
                              + Add Price Tier
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Formula Ingredients Breakdown */}
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-slate-800">
                            Formula Ingredients & Active Ratio ({f.ingredients?.length || 0})
                          </span>
                        </div>
                        {!isViewOnly && (
                          <div className="flex items-center gap-2">
                            {project.ingredients.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const imported = project.ingredients.map((ing) => ({
                                    id: uid(),
                                    name: ing.name,
                                    amount: ing.amount,
                                    note: ing.note,
                                  }));
                                  const newFs = project.formulas.map((x) =>
                                    x.id === f.id
                                      ? {
                                          ...x,
                                          ingredients: [
                                            ...(x.ingredients || []),
                                            ...imported,
                                          ],
                                        }
                                      : x
                                  );
                                  update({ formulas: newFs });
                                }}
                                className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                              >
                                Copy from Project Overview
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newIng = {
                                  id: uid(),
                                  name: '',
                                  amount: '',
                                  note: '',
                                };
                                const newFs = project.formulas.map((x) =>
                                  x.id === f.id
                                    ? {
                                        ...x,
                                        ingredients: [
                                          ...(x.ingredients || []),
                                          newIng,
                                        ],
                                      }
                                    : x
                                );
                                update({ formulas: newFs });
                              }}
                              className="flex items-center gap-1 text-[11px] font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Ingredient</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                              <th className="py-2 px-3">Active / Component</th>
                              <th className="py-2 px-3 w-36">Dosage / Ratio</th>
                              <th className="py-2 px-3">Function / Notes</th>
                              {!isViewOnly && (
                                <th className="py-2 px-2 w-8 text-center"></th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(!f.ingredients || f.ingredients.length === 0) ? (
                              <tr>
                                <td
                                  colSpan={isViewOnly ? 3 : 4}
                                  className="py-4 text-center text-slate-400 text-xs"
                                >
                                  No specific ingredient breakdown recorded for this formula iteration.
                                </td>
                              </tr>
                            ) : (
                              f.ingredients.map((ing, ingIdx) => (
                                <tr
                                  key={ing.id}
                                  className="hover:bg-white/80 transition-colors"
                                >
                                  <td className="p-1.5 pl-3">
                                    <input
                                      type="text"
                                      disabled={isViewOnly}
                                      value={ing.name}
                                      onChange={(e) => {
                                        const newFs = project.formulas.map((x) => {
                                          if (x.id !== f.id) return x;
                                          const copy = [...(x.ingredients || [])];
                                          copy[ingIdx] = {
                                            ...copy[ingIdx],
                                            name: e.target.value,
                                          };
                                          return { ...x, ingredients: copy };
                                        });
                                        update({ formulas: newFs });
                                      }}
                                      placeholder=""
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-xs"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      disabled={isViewOnly}
                                      value={ing.amount}
                                      onChange={(e) => {
                                        const newFs = project.formulas.map((x) => {
                                          if (x.id !== f.id) return x;
                                          const copy = [...(x.ingredients || [])];
                                          copy[ingIdx] = {
                                            ...copy[ingIdx],
                                            amount: e.target.value,
                                          };
                                          return { ...x, ingredients: copy };
                                        });
                                        update({ formulas: newFs });
                                      }}
                                      placeholder=""
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-xs"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      disabled={isViewOnly}
                                      value={ing.note}
                                      onChange={(e) => {
                                        const newFs = project.formulas.map((x) => {
                                          if (x.id !== f.id) return x;
                                          const copy = [...(x.ingredients || [])];
                                          copy[ingIdx] = {
                                            ...copy[ingIdx],
                                            note: e.target.value,
                                          };
                                          return { ...x, ingredients: copy };
                                        });
                                        update({ formulas: newFs });
                                      }}
                                      placeholder=""
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                                    />
                                  </td>
                                  {!isViewOnly && (
                                    <td className="p-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newFs = project.formulas.map((x) => {
                                            if (x.id !== f.id) return x;
                                            const copy = (
                                              x.ingredients || []
                                            ).filter((_, idx) => idx !== ingIdx);
                                            return { ...x, ingredients: copy };
                                          });
                                          update({ formulas: newFs });
                                        }}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Remove ingredient"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGING */}
      {activeTab === 'packaging' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Packaging & Materials Specifications
              </h3>
              <p className="text-xs text-slate-500">
                {project.packaging.length} packaging components tracked
              </p>
            </div>

            {/* Single clean '+ Add Package' button as requested */}
            <button
              onClick={() => {
                const newItem: PackagingItem = {
                  id: uid(),
                  type: 'Primary Package',
                  name: '',
                  spec: '',
                  supplier: '',
                  moq: '',
                  steps: [{ qty: '', price: '' }],
                  note: '',
                  images: [],
                  plateCost: '',
                  leadTime: '',
                  paymentTerm: '',
                  warrantyTerms: '',
                  selectedForCost: true,
                  status: 'Not Started',
                };
                update({ packaging: [...project.packaging, newItem] });
              }}
              className="flex items-center gap-1.5 text-xs font-extrabold px-4 py-2 rounded-xl bg-[#ccf835] hover:bg-[#bced28] text-slate-950 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Package</span>
            </button>
          </div>

          <div className="space-y-5">
            {project.packaging.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                No packaging components added yet. Click "+ Add Package" above.
              </div>
            ) : (
              project.packaging.map((it) => {
                const pkgPriceRes = lookup(it.steps, Number(project.qty) || 0);
                const isBelowMoq =
                  project.qty &&
                  Number(it.moq) &&
                  Number(project.qty) < Number(it.moq);

                return (
                  <div
                    key={it.id}
                    className={`p-6 rounded-3xl border bg-white shadow-2xs space-y-4 transition-all ${
                      it.selectedForCost !== false
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50/60 opacity-80'
                    }`}
                  >
                    {/* Header: Package Selection + Type + English Status + Delete */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Checkbox to select for cost calculation */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={it.selectedForCost !== false}
                            onChange={(e) => {
                              const copy = project.packaging.map((x) =>
                                x.id === it.id
                                  ? { ...x, selectedForCost: e.target.checked }
                                  : x
                              );
                              update({ packaging: copy });
                            }}
                            className="w-4 h-4 accent-teal-600 rounded-sm cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            Include in Cost Calculation
                          </span>
                        </label>

                        <select
                          value={it.type}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id
                                ? { ...x, type: e.target.value as any }
                                : x
                            );
                            update({ packaging: copy });
                          }}
                          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-bold bg-white"
                        >
                          {PKG_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>

                        {/* Status in English */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400">
                            Status:
                          </span>
                          <select
                            value={it.status || 'Not Started'}
                            onChange={(e) => {
                              const copy = project.packaging.map((x) =>
                                x.id === it.id
                                  ? { ...x, status: e.target.value as PackagingStatus }
                                  : x
                              );
                              update({ packaging: copy });
                            }}
                            className={`text-xs px-3 py-1 rounded-xl border font-bold ${
                              it.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : it.status === 'In Production'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : it.status === 'Design Approved'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : it.status === 'In Design'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {PACKAGING_STATUS_LIST.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        {costPrivacy ? (
                          <span className="text-xs text-slate-400 font-mono">
                            ••••••
                          </span>
                        ) : (
                          <span className="text-sm font-extrabold text-slate-900">
                            {pkgPriceRes.has
                              ? `${baht(pkgPriceRes.price)} ฿ / pc`
                              : 'Price not set'}
                          </span>
                        )}

                        {isBelowMoq && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            Below MOQ ({it.moq})
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const copy = project.packaging.filter(
                            (x) => x.id !== it.id
                          );
                          update({ packaging: copy });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete packaging"
                      >
                        ×
                      </button>
                    </div>

                    {/* Basic specs: Name, Supplier, MOQ */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id ? { ...x, name: e.target.value } : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Supplier / Printer
                        </label>
                        <input
                          type="text"
                          value={it.supplier}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id
                                ? { ...x, supplier: e.target.value }
                                : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          MOQ (Units)
                        </label>
                        <input
                          type="number"
                          value={it.moq}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id ? { ...x, moq: e.target.value } : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>
                    </div>

                    {/* EXPANDED SPECIFICATIONS & DETAILS FIELD (User Request in Packaging) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detailed Specifications, Dimensions & Dieline (ช่องใส่สเปกและรายละเอียดแบบขยาย)
                      </label>
                      <textarea
                        rows={3}
                        value={it.spec}
                        onChange={(e) => {
                          const copy = project.packaging.map((x) =>
                            x.id === it.id ? { ...x, spec: e.target.value } : x
                          );
                          update({ packaging: copy });
                        }}
                        placeholder="Enter full technical details: e.g. 350 gsm art card, Matte lamination, Hot gold foil stamping on logo, UV Spot finish, Dieline 12x8x18 cm, Tuck end box with inner partition..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                      />
                    </div>

                    {/* Terms & Commercials: Plate Cost, Lead Time, Payment Terms, Warranty */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Plate / Mold Cost (THB)
                        </label>
                        {costPrivacy ? (
                          <div className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-400">
                            ••••••
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isViewOnly}
                            value={it.plateCost || ''}
                            onChange={(e) => {
                              const copy = project.packaging.map((x) =>
                                x.id === it.id
                                  ? { ...x, plateCost: e.target.value }
                                  : x
                              );
                              update({ packaging: copy });
                            }}
                            placeholder=""
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                          />
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Amortized into unit cost
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Production Lead Time
                        </label>
                        <input
                          type="text"
                          value={it.leadTime || ''}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id
                                ? { ...x, leadTime: e.target.value }
                                : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Payment Terms
                        </label>
                        <input
                          type="text"
                          value={it.paymentTerm || ''}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id
                                ? { ...x, paymentTerm: e.target.value }
                                : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Warranty & Claims
                        </label>
                        <input
                          type="text"
                          value={it.warrantyTerms || ''}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id
                                ? { ...x, warrantyTerms: e.target.value }
                                : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder=""
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    {/* Step Pricing & Multi-Image Gallery */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Step Pricing Table */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-slate-800 block">
                          Tiered Pricing Ladder
                        </span>

                        {costPrivacy ? (
                          <div className="py-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200 font-mono">
                            •••••• Pricing Tiers Hidden
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                                  <th className="py-1">From (Units)</th>
                                  <th className="py-1">Price (THB/pc)</th>
                                  <th className="py-1 w-8"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {it.steps.map((st, sidx) => (
                                  <tr key={sidx}>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        min="0"
                                        value={st.qty}
                                        onChange={(e) =>
                                          updateStep(
                                            'packaging',
                                            it.id,
                                            sidx,
                                            'qty',
                                            e.target.value
                                          )
                                        }
                                        placeholder=""
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={st.price}
                                        onChange={(e) =>
                                          updateStep(
                                            'packaging',
                                            it.id,
                                            sidx,
                                            'price',
                                            e.target.value
                                          )
                                        }
                                        placeholder="0.00"
                                        className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>
                                    <td className="py-1 text-center">
                                      <button
                                        onClick={() =>
                                          deleteStep('packaging', it.id, sidx)
                                        }
                                        className="text-slate-400 hover:text-rose-600 text-sm"
                                        title="Delete step"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <button
                              onClick={() => addStep('packaging', it.id)}
                              className="text-xs text-teal-700 hover:underline font-bold cursor-pointer"
                            >
                              + Add Price Tier
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Multiple Images Gallery for Packaging (User Request: All image sections support > 1 image!) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            Packaging Mockup & Dieline Images ({it.images?.length || 0})
                          </label>
                          <label className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Upload Images</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) =>
                                handleMultipleImageUpload(
                                  e,
                                  it.images || [],
                                  (newImgs) => {
                                    const copy = project.packaging.map((x) =>
                                      x.id === it.id ? { ...x, images: newImgs } : x
                                    );
                                    update({ packaging: copy });
                                  }
                                )
                              }
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Multi-image thumbnail grid */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[90px]">
                          {(!it.images || it.images.length === 0) ? (
                            <div className="col-span-3 py-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                              <span>No packaging images attached</span>
                            </div>
                          ) : (
                            it.images.map((imgUrl, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square flex items-center justify-center group"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Packaging ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newImgs = (it.images || []).filter(
                                      (_, idx) => idx !== imgIdx
                                    );
                                    const copy = project.packaging.map((x) =>
                                      x.id === it.id ? { ...x, images: newImgs } : x
                                    );
                                    update({ packaging: copy });
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <input
                          type="text"
                          value={it.note}
                          onChange={(e) => {
                            const copy = project.packaging.map((x) =>
                              x.id === it.id ? { ...x, note: e.target.value } : x
                            );
                            update({ packaging: copy });
                          }}
                          placeholder="Additional notes e.g. Pantone 185C, Gold hot stamp"
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COST & BUDGET */}
      {activeTab === 'cost' && (
        isViewOnly ? (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 font-heading">
              Cost & Budget Restricted
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cost analysis and financial records are restricted for the Viewer role.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between font-heading">
                <span>Cost & Budget Analysis</span>
                {costPrivacy && (
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Presentation Mode Active</span>
                  </span>
                )}
              </h3>

            <CostSummary
              project={project}
              costSummary={co}
              costPrivacy={costPrivacy}
            />
          </section>

          {/* Other / Operating Expenses & Custom Allocation Units */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Operating, Logistics & Incidental Expenses
                </h3>
                <p className="text-xs text-slate-500">
                  Customizable allocation unit (e.g. per piece, per trip, per lot, per kg, per carton)
                </p>
              </div>

              <button
                onClick={() =>
                  update({
                    other: [
                      ...project.other,
                      {
                        id: uid(),
                        name: '',
                        unit: 'Piece',
                        amount: '',
                        times: '',
                        note: '',
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense Item</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[760px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5">Expense Description</th>
                    <th className="py-2.5 px-3">Allocation Unit</th>
                    <th className="py-2.5 px-3">Amount (THB)</th>
                    <th className="py-2.5 px-3">Frequency / Trips</th>
                    <th className="py-2.5 px-3 text-right">Cost Per Unit (THB)</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.other.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No additional expenses recorded. Click "+ Add Expense Item" above.
                      </td>
                    </tr>
                  ) : (
                    project.other.map((o, idx) => {
                      const costPerUnit = otherPer(o, Number(project.qty) || 0);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/70">
                          <td className="p-2 pl-3.5">
                            <input
                              type="text"
                              value={o.name}
                              onChange={(e) => {
                                const copy = [...project.other];
                                copy[idx].name = e.target.value;
                                update({ other: copy });
                              }}
                              placeholder=""
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                            />
                          </td>

                          {/* Editable Custom Allocation Unit */}
                          <td className="p-2">
                            <input
                              type="text"
                              list="unit-suggestions"
                              value={o.unit}
                              onChange={(e) => {
                                const copy = [...project.other];
                                copy[idx].unit = e.target.value;
                                update({ other: copy });
                              }}
                              placeholder=""
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                            />
                          </td>

                          <td className="p-2">
                            {costPrivacy ? (
                              <input
                                type="text"
                                disabled
                                value="••••••"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 font-mono"
                              />
                            ) : (
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={o.amount}
                                onChange={(e) => {
                                  const copy = [...project.other];
                                  copy[idx].amount = e.target.value;
                                  update({ other: copy });
                                }}
                                placeholder="0.00"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                              />
                            )}
                          </td>

                          <td className="p-2">
                            {o.unit === 'เที่ยว' || o.unit === 'Trip' || o.unit === 'ครั้ง' || o.unit === 'Box' ? (
                              <input
                                type="number"
                                min="1"
                                value={o.times || 1}
                                onChange={(e) => {
                                  const copy = [...project.other];
                                  copy[idx].times = e.target.value;
                                  update({ other: copy });
                                }}
                                placeholder="1"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-center"
                              />
                            ) : (
                              <span className="text-slate-400 pl-3">-</span>
                            )}
                          </td>

                          <td className="p-2 text-right tabular-nums font-bold">
                            {costPrivacy ? (
                              <span className="text-slate-400 font-mono">
                                ••••••
                              </span>
                            ) : (
                              <span className="text-slate-800">
                                {baht(costPerUnit)} ฿
                              </span>
                            )}
                          </td>

                          <td className="p-2">
                            <input
                              type="text"
                              value={o.note}
                              onChange={(e) => {
                                const copy = [...project.other];
                                copy[idx].note = e.target.value;
                                update({ other: copy });
                              }}
                              placeholder="Notes"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <button
                              onClick={() => {
                                const copy = project.other.filter(
                                  (x) => x.id !== o.id
                                );
                                update({ other: copy });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <datalist id="unit-suggestions">
              <option value="Piece" />
              <option value="Trip" />
              <option value="Lot" />
              <option value="Kg" />
              <option value="Carton" />
              <option value="Time" />
              <option value="ชิ้น" />
              <option value="เที่ยว" />
              <option value="ล็อต" />
            </datalist>
          </section>
        </div>
        )
      )}

      {/* TAB 5: TIMELINE & GANTT */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Timeline Summary Metrics */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Timeline Milestones & Delivery Schedule
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5 font-medium">
                  First Task Start Date
                </span>
                <b className="text-sm font-extrabold text-slate-800">
                  {fmt(s.first)}
                </b>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5 font-medium">
                  Estimated Delivery / Inspection
                </span>
                <b className="text-sm font-extrabold text-slate-800">
                  {fmt(s.last)}
                </b>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5 font-medium">
                  Total Working Duration
                </span>
                <b className="text-sm font-extrabold text-slate-800">
                  {s.wd} workdays (~{Math.ceil(s.wd / 5)} weeks)
                </b>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5 font-medium">
                  Target Launch Schedule
                </span>
                <b
                  className={`text-sm font-extrabold ${
                    s.vc === 'ok'
                      ? 'text-teal-700'
                      : s.vc === 'late'
                      ? 'text-rose-600'
                      : 'text-amber-700'
                  }`}
                >
                  {s.vs || 'Launch target not set'}
                </b>
              </div>
            </div>
          </section>

          {/* Collapsible Gantt Chart Section */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Weekly Gantt Chart
            </h3>
            <GanttChart project={project} computedTasks={cs} />
          </section>

          {/* Phased Task Schedule */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Phased Task Schedule
                </h3>
                <p className="text-xs text-slate-500">
                  Modifying working days or dependencies dynamically reschedules downstream phases
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[840px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5 min-w-[220px]">Task Name</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Depends On</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Start Date</th>
                    <th className="py-2.5 px-2 w-20 text-center">Workdays</th>
                    <th className="py-2.5 px-3 min-w-[100px]">End Date</th>
                    <th className="py-2.5 px-2 w-14 text-center">Done</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.phases.map((ph) => {
                    const earlierTasks = flatTasks(project);

                    return (
                      <React.Fragment key={ph.k}>
                        {/* Phase Header Row */}
                        <tr className="bg-slate-100/90 font-bold text-slate-900">
                          <td colSpan={7} className="py-2.5 px-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm"
                                  style={{
                                    backgroundColor: phaseColors[ph.k] || '#475569',
                                  }}
                                />
                                <span>
                                  Phase {ph.k}: {ph.name}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  const lastT = ph.tasks[ph.tasks.length - 1];
                                  const newTask = {
                                    id: uid(),
                                    name: 'New Task',
                                    days: 5,
                                    dep: lastT ? lastT.id : '@all',
                                    start: '',
                                    done: false,
                                  };
                                  const newPhases = project.phases.map((x) =>
                                    x.k === ph.k
                                      ? { ...x, tasks: [...x.tasks, newTask] }
                                      : x
                                  );
                                  update({ phases: newPhases });
                                }}
                                className="text-[11px] font-bold text-slate-800 bg-white hover:bg-amber-50 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                              >
                                + Add Task
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Task Rows */}
                        {ph.tasks.map((t) => {
                          const r = cs[t.id];
                          const earlier = earlierTasks.filter(
                            (x) => x.id !== t.id
                          );

                          return (
                            <tr
                              key={t.id}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="p-2 pl-3.5">
                                <input
                                  type="text"
                                  value={t.name}
                                  onChange={(e) => {
                                    const newPhases = project.phases.map((x) => ({
                                      ...x,
                                      tasks: x.tasks.map((task) =>
                                        task.id === t.id
                                          ? { ...task, name: e.target.value }
                                          : task
                                      ),
                                    }));
                                    update({ phases: newPhases });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                                />
                              </td>

                              <td className="p-2">
                                <select
                                  value={t.dep}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newPhases = project.phases.map((x) => ({
                                      ...x,
                                      tasks: x.tasks.map((task) => {
                                        if (task.id === t.id) {
                                          let start = task.start;
                                          if (val === '' && !start) {
                                            start =
                                              cs[task.id]?.s ||
                                              project.startDate;
                                          }
                                          return {
                                            ...task,
                                            dep: val,
                                            start,
                                          };
                                        }
                                        return task;
                                      }),
                                    }));
                                    update({ phases: newPhases });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                                >
                                  <option value="@start">Project Start Date</option>
                                  <option value="@all">
                                    After All Preceding Tasks
                                  </option>
                                  {earlier.map((x) => (
                                    <option key={x.id} value={x.id}>
                                      After: {x.name || '(Untitled)'}
                                    </option>
                                  ))}
                                  <option value="">Custom Start Date</option>
                                </select>
                              </td>

                              <td className="p-2">
                                {t.dep === '@start' ||
                                t.dep === '@all' ||
                                (t.dep && earlier.some((x) => x.id === t.dep)) ? (
                                  <span className="tabular-nums text-slate-700 pl-2 font-medium">
                                    {r ? fmt(r.s) : '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="date"
                                    value={t.start}
                                    onChange={(e) => {
                                      const newPhases = project.phases.map((x) => ({
                                        ...x,
                                        tasks: x.tasks.map((task) =>
                                          task.id === t.id
                                            ? {
                                                ...task,
                                                start: e.target.value,
                                              }
                                            : task
                                        ),
                                      }));
                                      update({ phases: newPhases });
                                    }}
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                  />
                                )}
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={t.days}
                                  onChange={(e) => {
                                    const val = Math.max(
                                      1,
                                      Math.round(Number(e.target.value)) || 1
                                    );
                                    const newPhases = project.phases.map((x) => ({
                                      ...x,
                                      tasks: x.tasks.map((task) =>
                                        task.id === t.id
                                          ? { ...task, days: val }
                                          : task
                                      ),
                                    }));
                                    update({ phases: newPhases });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-center tabular-nums font-bold"
                                />
                              </td>

                              <td className="p-2 tabular-nums font-bold text-slate-800">
                                {r ? fmt(r.e) : '-'}
                              </td>

                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={t.done}
                                  onChange={(e) => {
                                    const newPhases = project.phases.map((x) => ({
                                      ...x,
                                      tasks: x.tasks.map((task) =>
                                        task.id === t.id
                                          ? { ...task, done: e.target.checked }
                                          : task
                                      ),
                                    }));
                                    update({ phases: newPhases });
                                  }}
                                  className="w-4 h-4 accent-teal-600 rounded-sm cursor-pointer"
                                />
                              </td>

                              <td className="p-2 text-center">
                                <button
                                  onClick={() => {
                                    const newPhases = project.phases.map((x) => ({
                                      ...x,
                                      tasks: x.tasks.filter(
                                        (task) => task.id !== t.id
                                      ),
                                    }));
                                    update({ phases: newPhases });
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Delete task"
                                >
                                  ×
                                </button>
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
          </section>
        </div>
      )}

      {/* TAB 6: DOCUMENTS */}
      {activeTab === 'docs' && (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Project Documents & Attachments
                </h3>
                <p className="text-xs text-slate-500">
                  Upload certificates, test reports, artwork files, and contracts directly to Google Drive
                </p>
              </div>

              {/* Upload to Google Drive Button */}
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="flex items-center gap-2 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Cloud className="w-4 h-4" />
                <span>Upload to Google Drive</span>
              </button>
            </div>

            {/* External Link Input Form */}
            <form
              onSubmit={handleAddLink}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder=""
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Web Link (Google Drive / URL)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={!linkUrl.trim()}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Attach Link</span>
              </button>
            </form>
          </section>

          {/* Documents Table */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Attached Documents ({project.docs.length})
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3.5">Document Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">File / Link</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3">Date Added</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.docs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold">No documents attached</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Upload files to Google Drive or attach external links above.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    project.docs.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50/70">
                        <td className="p-3 pl-3.5">
                          <input
                            type="text"
                            value={d.title}
                            onChange={(e) => {
                              const copy = [...project.docs];
                              copy[idx].title = e.target.value;
                              update({ docs: copy });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                          />
                        </td>

                        <td className="p-3">
                          <select
                            value={d.type}
                            onChange={(e) => {
                              const copy = [...project.docs];
                              copy[idx].type = e.target.value as any;
                              update({ docs: copy });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          >
                            {DOC_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3">
                          {d.kind === 'gdrive' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 rounded-lg bg-amber-100 text-amber-900">
                                <Cloud className="w-3.5 h-3.5" />
                              </span>
                              <a
                                href={d.webViewLink || d.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-teal-700 hover:underline max-w-[200px] truncate"
                              >
                                {d.fileName || d.title || 'Open in Drive'}
                              </a>
                              {d.size && (
                                <span className="text-[10px] text-slate-400">
                                  ({(d.size / 1024).toFixed(0)} KB)
                                </span>
                              )}
                            </div>
                          ) : (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-bold text-teal-700 hover:underline max-w-[200px] truncate"
                            >
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{d.url}</span>
                            </a>
                          )}
                        </td>

                        <td className="p-3">
                          <input
                            type="text"
                            value={d.note}
                            onChange={(e) => {
                              const copy = [...project.docs];
                              copy[idx].note = e.target.value;
                              update({ docs: copy });
                            }}
                            placeholder="Add notes..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </td>

                        <td className="p-3 text-slate-500 tabular-nums whitespace-nowrap">
                          {fmt(d.added)}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              const copy = project.docs.filter((x) => x.id !== d.id);
                              update({ docs: copy });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete document"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Google Drive Upload Modal */}
      <DriveUploadModal
        accessToken={accessToken}
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onUploaded={(newDoc) => {
          update({ docs: [...project.docs, newDoc] });
        }}
      />
    </div>
  );
};
