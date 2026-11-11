import React, { useState } from 'react';
import {
  Formula,
  PackagingItem,
  PackagingStatus,
  Project,
  ProjectDocument,
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
  VAT_RATE,
  compressImageFile,
} from '../lib/trackerLogic';
import { GanttChart } from './GanttChart';
import { CostSummary } from './CostSummary';
import { ImagePreviewModal } from './ImagePreviewModal';
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
  Image as ImageIcon,
  Award,
  X,
  FileCheck,
  Lock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  holidaysSet: Set<string>;
  costPrivacy: boolean;
  isViewOnly?: boolean;
  isSharedProjectView?: boolean;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

type TabKey = 'overview' | 'formula' | 'packaging' | 'cost' | 'timeline' | 'docs';

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project: savedProject,
  holidaysSet,
  costPrivacy,
  isViewOnly = false,
  isSharedProjectView = false,
  onBack,
  onUpdateProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const savedTab = localStorage.getItem(`tab_${savedProject.id}`);
    return (savedTab as TabKey) || 'overview';
  });

  const handleTabChange = (newTab: TabKey) => {
    setActiveTab(newTab);
    localStorage.setItem(`tab_${savedProject.id}`, newTab);
  };

  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [comparisonFormulaIds, setComparisonFormulaIds] = useState<Set<string>>(new Set());
  const [showFormulaComparison, setShowFormulaComparison] = useState(false);
  const project = draftProject || savedProject;
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [armDelete, setArmDelete] = useState(false);
  const [copiedViewLink, setCopiedViewLink] = useState(false);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState<ProjectDocument['type']>('ผลตรวจ / รายงานแล็บ');

  const [ingPasteText, setIngPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  const splitIngredientAmount = (amount: string, unit?: string) => {
    if (unit?.trim()) return { amount, unit };
    const match = amount.match(
      /^\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|[+-]?\.\d+)\s*(.*?)\s*$/
    );
    return match
      ? { amount: match[1], unit: match[2] }
      : { amount, unit: '' };
  };

  const canEdit = (panelId: string) =>
    !isViewOnly && editingPanel === panelId;

  const panelToggle = (panelId: string) => {
    const isCollapsed = collapsedPanels.has(panelId);
    const label = isCollapsed ? 'Expand section' : 'Collapse section';
    const togglePanel = () =>
      setCollapsedPanels((current) => {
        const next = new Set(current);
        if (next.has(panelId)) next.delete(panelId);
        else next.add(panelId);
        return next;
      });

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={!isCollapsed}
        title={label}
        onClick={togglePanel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            togglePanel();
          }
        }}
        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    );
  };

  const beginEdit = (panelId: string) => {
    if (isViewOnly || editingPanel !== null) return;
    setDraftProject(JSON.parse(JSON.stringify(savedProject)) as Project);
    setEditingPanel(panelId);
  };

  const runPanelAction = (
    label: string,
    onAction: () => void,
    className: string,
    disabled = false
  ) => (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onAction();
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onAction();
        }
      }}
      className={`${className} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {label}
    </div>
  );

  const savePanelEdits = () => {
    if (!editingPanel || !draftProject || isViewOnly) return;
    onUpdateProject({
      ...draftProject,
      updatedAt: Date.now(),
      rev: (savedProject.rev || 0) + 1,
    });
    setDraftProject(null);
    setEditingPanel(null);
  };

  const cancelPanelEdits = () => {
    setDraftProject(null);
    setEditingPanel(null);
  };

  const panelActions = (panelId: string, collapsible = true) => (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {!isViewOnly && (editingPanel === panelId ? (
        <>
          {runPanelAction(
            'Save',
            savePanelEdits,
            'inline-flex h-8 items-center rounded-lg bg-[#ccf835] px-2.5 sm:px-3 text-xs font-extrabold text-slate-950 hover:bg-[#bced28]'
          )}
          {runPanelAction(
            'Cancel',
            cancelPanelEdits,
            'inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-bold text-slate-600 hover:bg-slate-50'
          )}
        </>
      ) : (
        runPanelAction(
          'Edit',
          () => beginEdit(panelId),
          'inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50',
          editingPanel !== null
        )
      ))}
      {collapsible && panelToggle(panelId)}
    </div>
  );

  const cs = compute(project, holidaysSet);
  const co = costOf(project);
  const s = summ(project, cs, co, holidaysSet);

  const update = (partial: Partial<Project>) => {
    if (!editingPanel || isViewOnly) return;
    setDraftProject((current) =>
      current
        ? {
            ...current,
            ...partial,
            updatedAt: Date.now(),
            rev: (current.rev || 0) + 1,
          }
        : current
    );
  };

  const updateImmediately = (partial: Partial<Project>) => {
    if (isViewOnly) return;
    const base = draftProject || savedProject;
    const updated = {
      ...base,
      ...partial,
      updatedAt: Date.now(),
      rev: (base.rev || 0) + 1,
    };
    if (draftProject) {
      setDraftProject(updated);
    }
    onUpdateProject(updated);
  };

  const updateSinglePackage = (pkgId: string, partialPkg: Partial<PackagingItem>) => {
    if (isViewOnly) return;
    const basePackages = (draftProject || savedProject).packaging || [];
    const nextPackaging = basePackages.map((x) =>
      x.id === pkgId ? { ...x, ...partialPkg } : x
    );
    updateImmediately({ packaging: nextPackaging });
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
      if (canEdit(`formula-${itemId}`)) {
        update({ formulas: newFormulas });
      } else {
        updateImmediately({ formulas: newFormulas });
      }
    } else {
      const basePackages = (draftProject || savedProject).packaging || [];
      const newPackaging = basePackages.map((p) => {
        if (p.id !== itemId) return p;
        const newSteps = [...p.steps];
        newSteps[stepIdx] = { ...newSteps[stepIdx], [field]: val };
        return { ...p, steps: newSteps };
      });
      updateImmediately({ packaging: newPackaging });
    }
  };

  const addStep = (listType: 'formulas' | 'packaging', itemId: string) => {
    if (listType === 'formulas') {
      const newFormulas = project.formulas.map((f) => {
        if (f.id !== itemId) return f;
        return { ...f, steps: [...f.steps, { qty: '', price: '' }] };
      });
      if (canEdit(`formula-${itemId}`)) {
        update({ formulas: newFormulas });
      } else {
        updateImmediately({ formulas: newFormulas });
      }
    } else {
      const basePackages = (draftProject || savedProject).packaging || [];
      const newPackaging = basePackages.map((p) => {
        if (p.id !== itemId) return p;
        return { ...p, steps: [...p.steps, { qty: '', price: '' }] };
      });
      updateImmediately({ packaging: newPackaging });
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
      if (canEdit(`formula-${itemId}`)) {
        update({ formulas: newFormulas });
      } else {
        updateImmediately({ formulas: newFormulas });
      }
    } else {
      const basePackages = (draftProject || savedProject).packaging || [];
      const newPackaging = basePackages.map((p) => {
        if (p.id !== itemId) return p;
        const newSteps = p.steps.filter((_, idx) => idx !== stepIdx);
        return {
          ...p,
          steps: newSteps.length ? newSteps : [{ qty: '', price: '' }],
        };
      });
      updateImmediately({ packaging: newPackaging });
    }
  };

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

  const handlePasteIngredients = () => {
    if (!ingPasteText.trim()) return;
    const lines = ingPasteText.split(/\r?\n/);
    const newItems = [...project.ingredients];

    lines.forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/\t|,/);
      const { amount, unit } = splitIngredientAmount((parts[1] || '').trim());
      newItems.push({
        id: uid(),
        name: (parts[0] || '').trim(),
        amount,
        unit,
        note: parts.slice(2).join(', ').trim(),
      });
    });

    update({ ingredients: newItems });
    setIngPasteText('');
    setShowPasteArea(false);
  };

  const handleMultipleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    currentImages: string[],
    onSuccess: (newImages: string[]) => void
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedUrls: string[] = [];

      for (const file of files) {
        try {
          const comp = await compressImageFile(file, 600, 600, 0.65);
          compressedUrls.push(comp);
        } catch (err) {
          console.error('Image compression failed:', err);
        }
      }

      if (compressedUrls.length > 0) {
        onSuccess([...currentImages, ...compressedUrls]);
      }
      e.target.value = '';
    }
  };

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

    updateImmediately({
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
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div
        className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
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
          {!isSharedProjectView && (
            <button
              onClick={onBack}
              disabled={editingPanel !== null}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Projects</span>
            </button>
          )}

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
              disabled={!canEdit('project-info')}
              placeholder=""
              className="w-full text-lg sm:text-2xl font-extrabold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-amber-400 focus:outline-hidden bg-transparent px-1 py-1 rounded-sm resize-none overflow-hidden leading-snug whitespace-normal break-words transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">
                Lot:
              </span>
              <input
                type="text"
                disabled={!canEdit('project-info')}
                value={project.lotNo || ''}
                onChange={(e) => update({ lotNo: e.target.value })}
                placeholder=""
                className="w-20 sm:w-24 text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
              />
            </div>

            <select
              disabled={!canEdit('project-info')}
              value={project.category === 'อาหารเสริม' ? 'Dietary Supplement' : project.category === 'สกินแคร์' ? 'Skincare' : project.category}
              onChange={(e) => update({ category: e.target.value as any })}
              className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 shadow-2xs cursor-pointer disabled:opacity-70"
            >
              <option value="Dietary Supplement">Dietary Supplement</option>
              <option value="Skincare">Skincare</option>
            </select>

            <select
              disabled={!canEdit('project-info')}
              value={project.status === 'กำลังดำเนินการ' ? 'In Progress' : project.status === 'เสร็จสิ้น' ? 'Completed' : project.status === 'พักไว้' ? 'On Hold' : project.status === 'ยกเลิก' ? 'Cancelled' : project.status}
              onChange={(e) => update({ status: e.target.value as any })}
              className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold shadow-2xs cursor-pointer disabled:opacity-70 ${
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

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {!isViewOnly && panelActions('project-info', false)}
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
            <span>{copiedViewLink ? 'Copied!' : 'Share View'}</span>
          </button>

          {!isViewOnly && (
            <>
              <button
                onClick={handleDuplicate}
                disabled={editingPanel !== null}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={editingPanel !== null}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  armDelete
                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                    : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{armDelete ? 'Confirm' : 'Delete'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-[#eee8ff] p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#ded5fc] shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#4d3b94] block mb-1">
            Current Stage
          </span>
          <div className="flex items-center gap-1.5">
            {s.stage.k > 0 && (
              <span
                className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: phaseColors[s.stage.k] || '#0d9488',
                }}
              />
            )}
            <b className="text-xs sm:text-base font-black text-[#2a1b63] truncate">
              {s.stage.name}
            </b>
          </div>
          <span className="text-[10px] sm:text-[11px] text-[#6954b8] mt-1 block truncate font-semibold">
            {s.currentTaskName ? `${s.currentTaskName}` : 'Phases 1 to 6'}
          </span>
        </div>

        <div className="bg-[#cbf7df] p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#b1f1ce] shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#0e5c36] block mb-1">
            Progress
          </span>
          <b className="text-xl sm:text-3xl font-black text-[#084225]">{s.pct}%</b>
          <span className="text-[10px] sm:text-[11px] text-[#1b7a48] mt-1 block font-semibold truncate">
            {s.done}/{s.total} completed
          </span>
        </div>

        <div className="bg-[#daf0ff] p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#c4e5ff] shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#124d91] block mb-1">
            Est. Arrival
          </span>
          <b className="text-xs sm:text-base font-black text-[#0f3d73] truncate">
            {fmt(s.last)}
          </b>
          <span className="text-[10px] sm:text-[11px] text-[#2467b6] mt-1 block truncate font-semibold">
            {s.vs || 'No launch target'}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            Total Unit Cost
          </span>
          {costPrivacy ? (
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
              <EyeOff className="w-3.5 h-3.5" />
              <span>••••••</span>
            </div>
          ) : (
            <div>
              <b className="text-base sm:text-2xl font-black text-slate-900 truncate block">
                {co.unit > 0 ? `${baht(co.unit)} ฿` : '-'}
              </b>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate font-medium">
                {co.q
                  ? `Lot: ${baht(co.batch)} ฿`
                  : 'Enter Qty in Specs'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200/80 overflow-x-auto scrollbar-none pb-1">
        <nav className="flex space-x-1 sm:space-x-2 min-w-max p-1 bg-slate-200/60 rounded-xl sm:rounded-2xl">
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
              disabled={editingPanel !== null}
              onClick={() => handleTabChange(t.key as TabKey)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
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
        <div className="space-y-4 sm:space-y-6">
          <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <fieldset disabled={!canEdit('overview-specifications')} className="contents">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 truncate">
                  <Info className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="truncate">Project Specifications & Regulatory Registration</span>
                </h3>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {panelActions('overview-specifications')}
                </div>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                hidden={collapsedPanels.has('overview-specifications')}
              >
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-emerald-800 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>FDA / License No.</span>
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
                    Net Volume / Packaging Spec
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
            </fieldset>
          </section>

          {/* Section 2: Product Reference & Benchmark */}
          <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <fieldset disabled={!canEdit('overview-benchmark')} className="contents">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Product Reference & Benchmark</span>
                </h3>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {panelActions('overview-benchmark')}
                </div>
              </div>

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5"
                hidden={collapsedPanels.has('overview-benchmark')}
              >
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
                      placeholder=""
                      className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Images ({project.benchmark?.images?.length || 0})
                    </label>
                    {!isViewOnly && (
                      <label className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          multiple
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) =>
                            handleMultipleImageUpload(
                              e,
                              project.benchmark?.images || [],
                              (newImages) =>
                                updateImmediately({
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
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 min-h-[80px]">
                    {(!project.benchmark?.images || project.benchmark.images.length === 0) ? (
                      <div className="col-span-3 py-3 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-slate-300 mb-1" />
                        <span>No images</span>
                      </div>
                    ) : (
                      project.benchmark.images.map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          className="relative rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square flex items-center justify-center group"
                        >
                          <img
                            src={imgUrl}
                            alt={`Benchmark ${imgIdx + 1}`}
                            onClick={() =>
                              setPreviewImage({
                                src: imgUrl,
                                alt: `Benchmark ${imgIdx + 1}`,
                              })
                            }
                            className="h-full w-full cursor-zoom-in object-cover"
                          />
                          {!isViewOnly && (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedImages = (project.benchmark?.images || []).filter(
                                  (_, idx) => idx !== imgIdx
                                );
                                updateImmediately({
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
                              className="absolute top-1 right-1 p-0.5 rounded-md bg-rose-600 text-white cursor-pointer"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </fieldset>
          </section>

          {/* Section 3: USP & Marketing Claims */}
          <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <fieldset disabled={!canEdit('overview-usp')} className="contents">
              <h3 className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1 truncate">Unique Selling Proposition (USP) & Marketing Claims</span>
                {panelActions('overview-usp')}
              </h3>
              <textarea
                hidden={collapsedPanels.has('overview-usp')}
                rows={3}
                value={project.uspClaims || ''}
                onChange={(e) => update({ uspClaims: e.target.value })}
                placeholder=""
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </fieldset>
          </section>
        </div>
      )}

      {/* TAB 2: FORMULATION */}
      {activeTab === 'formula' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                Formulation Development & Iterations
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {project.formulas.length} iterations tracked · Active costing formula:{' '}
                <strong>
                  {
                    project.formulas.find((f) => f.id === project.chosenFormula)
                      ?.ver
                  }
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const last = project.formulas[project.formulas.length - 1];
                    const newF: Formula = {
                      id: uid(),
                      ver: `V${project.formulas.length + 1}`,
                      code: '',
                      date: todayISO(),
                      changes: '',
                      steps: last ? JSON.parse(JSON.stringify(last.steps)) : [{ qty: '', price: '' }],
                      note: '',
                      images: [],
                      imageNote: '',
                      isConfirmed: false,
                      vatIncluded: false,
                    };
                    updateImmediately({
                      formulas: [...project.formulas, newF],
                      chosenFormula: newF.id,
                    });
                  }}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Formula</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {project.formulas
              .slice()
              .reverse()
              .map((f) => {
                const isChosen = f.id === project.chosenFormula;
                const formulaPriceRes = lookup(f.steps, Number(project.qty) || 0);

                return (
                  <div
                    key={f.id}
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all ${
                      f.isConfirmed
                        ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                        : isChosen
                        ? 'bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <strong className="text-xs sm:text-sm font-extrabold text-slate-800">
                        {f.ver} {f.code ? `(${f.code})` : ''}
                      </strong>
                      <div className="flex items-center gap-2">
                        {panelActions(`formula-${f.id}`)}
                      </div>
                    </div>

                    <div hidden={collapsedPanels.has(`formula-${f.id}`)} className="pt-3 space-y-4">
                      <fieldset disabled={!canEdit(`formula-${f.id}`)} className="contents">
                        {/* Control actions for single formula */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={f.ver}
                              onChange={(e) => {
                                const newFs = project.formulas.map((x) =>
                                  x.id === f.id ? { ...x, ver: e.target.value } : x
                                );
                                update({ formulas: newFs });
                              }}
                              className="w-14 sm:w-16 font-extrabold text-slate-900 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm text-center"
                            />

                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400">Code:</span>
                              <input
                                type="text"
                                value={f.code || ''}
                                onChange={(e) => {
                                  const newFs = project.formulas.map((x) =>
                                    x.id === f.id ? { ...x, code: e.target.value } : x
                                  );
                                  update({ formulas: newFs });
                                }}
                                className="w-20 sm:w-24 text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
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
                              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => handleIterateFromFormula(f)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#ccf835]/30 hover:bg-[#ccf835]/60 text-slate-950 border border-[#b2e61e] cursor-pointer"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Version</span>
                              </button>
                            )}

                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                              <input
                                type="radio"
                                disabled={isViewOnly}
                                name="chosenFormula"
                                checked={isChosen}
                                onChange={() => update({ chosenFormula: f.id })}
                                className="accent-amber-500"
                              />
                              <span>Use Costing</span>
                            </label>

                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete formula iteration ${f.ver}?`)) {
                                    const newFs = project.formulas.filter((x) => x.id !== f.id);
                                    let newChosen = project.chosenFormula;
                                    if (newChosen === f.id && newFs.length > 0) {
                                      newChosen = newFs[newFs.length - 1].id;
                                    }
                                    updateImmediately({ formulas: newFs, chosenFormula: newChosen });
                                  }
                                }}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-slate-200 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Changes note */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Changes & Formulation Notes
                          </label>
                          <textarea
                            rows={2}
                            value={f.changes}
                            onChange={(e) => {
                              const newFs = project.formulas.map((x) =>
                                x.id === f.id ? { ...x, changes: e.target.value } : x
                              );
                              update({ formulas: newFs });
                            }}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                      </fieldset>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGING (Responsive + Instant Update) */}
      {activeTab === 'packaging' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                Packaging & Materials Specifications
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {project.packaging.length} packaging components tracked
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isViewOnly && (
                <button
                  type="button"
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
                      vatIncluded: false,
                    };
                    const basePackages = (draftProject || savedProject).packaging || [];
                    updateImmediately({ packaging: [...basePackages, newItem] });
                  }}
                  className="flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#ccf835] hover:bg-[#bced28] text-slate-950 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add Package</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {project.packaging.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 text-xs">
                No packaging components added yet. Click "+ Add Package" above.
              </div>
            ) : (
              project.packaging.map((it) => {
                const pkgPriceRes = lookup(it.steps, Number(project.qty) || 0);
                const packagePanelId = `packaging-${it.id}`;

                return (
                  <div
                    key={it.id}
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border bg-white shadow-2xs space-y-4 transition-all ${
                      it.selectedForCost !== false
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50/60 opacity-80'
                    }`}
                  >
                    {/* Packaging Item Header - Fully Responsive Layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
                        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          <input
                            type="checkbox"
                            disabled={isViewOnly}
                            checked={it.selectedForCost !== false}
                            onChange={(e) => {
                              updateSinglePackage(it.id, { selectedForCost: e.target.checked });
                            }}
                            className="w-4 h-4 accent-teal-600 rounded-sm cursor-pointer"
                          />
                          <span className="text-[11px] sm:text-xs font-bold text-slate-800">
                            Include Cost
                          </span>
                        </label>

                        <select
                          disabled={isViewOnly}
                          value={it.type}
                          onChange={(e) => {
                            updateSinglePackage(it.id, { type: e.target.value as any });
                          }}
                          className="text-[11px] sm:text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-bold bg-white"
                        >
                          {PKG_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>

                        <select
                          disabled={isViewOnly}
                          value={it.status || 'Not Started'}
                          onChange={(e) => {
                            updateSinglePackage(it.id, { status: e.target.value as PackagingStatus });
                          }}
                          className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-xl border font-bold ${
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

                        {costPrivacy ? (
                          <span className="text-xs text-slate-400 font-mono">••••••</span>
                        ) : (
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {pkgPriceRes.has
                              ? `${baht(pkgPriceRes.price * (it.vatIncluded ? 1 : 1 + VAT_RATE))} ฿/pc`
                              : 'Price not set'}
                          </span>
                        )}
                      </div>

                      {/* Right controls: Collapse & Delete (Always aligned neatly) */}
                      <div className="flex items-center justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        {panelToggle(packagePanelId)}

                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete ${it.name || 'this packaging'}?`)) {
                                const basePackages = (draftProject || savedProject).packaging || [];
                                const copy = basePackages.filter((x) => x.id !== it.id);
                                updateImmediately({ packaging: copy });
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div hidden={collapsedPanels.has(packagePanelId)} className="space-y-4">
                      {/* Name, Supplier, MOQ */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Item Name
                          </label>
                          <input
                            type="text"
                            disabled={isViewOnly}
                            value={it.name}
                            onChange={(e) => updateSinglePackage(it.id, { name: e.target.value })}
                            placeholder=""
                            className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Supplier / Printer
                          </label>
                          <input
                            type="text"
                            disabled={isViewOnly}
                            value={it.supplier}
                            onChange={(e) => updateSinglePackage(it.id, { supplier: e.target.value })}
                            placeholder=""
                            className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            MOQ (Units)
                          </label>
                          <input
                            type="number"
                            disabled={isViewOnly}
                            value={it.moq}
                            onChange={(e) => updateSinglePackage(it.id, { moq: e.target.value })}
                            placeholder=""
                            className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                          />
                        </div>
                      </div>

                      {/* Spec */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Specifications, Dimensions & Dieline
                        </label>
                        <textarea
                          rows={2}
                          disabled={isViewOnly}
                          value={it.spec}
                          onChange={(e) => updateSinglePackage(it.id, { spec: e.target.value })}
                          placeholder=""
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                        />
                      </div>

                      {/* Commercial Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 sm:p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
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
                              onChange={(e) => updateSinglePackage(it.id, { plateCost: e.target.value })}
                              placeholder=""
                              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Production Lead Time
                          </label>
                          <input
                            type="text"
                            disabled={isViewOnly}
                            value={it.leadTime || ''}
                            onChange={(e) => updateSinglePackage(it.id, { leadTime: e.target.value })}
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
                            disabled={isViewOnly}
                            value={it.paymentTerm || ''}
                            onChange={(e) => updateSinglePackage(it.id, { paymentTerm: e.target.value })}
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
                            disabled={isViewOnly}
                            value={it.warrantyTerms || ''}
                            onChange={(e) => updateSinglePackage(it.id, { warrantyTerms: e.target.value })}
                            placeholder=""
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                      </div>

                      {/* Pricing ladder & Images */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
                          <span className="text-xs font-bold text-slate-800 block">
                            Tiered Pricing Ladder
                          </span>

                          <div className="space-y-1.5">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="text-slate-500 font-bold border-b border-slate-200 text-[10px] sm:text-[11px]">
                                  <th className="py-1">From Qty</th>
                                  <th className="py-1">Price (THB/pc)</th>
                                  <th className="py-1 w-6"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {it.steps.map((st, sidx) => (
                                  <tr key={sidx}>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={isViewOnly}
                                        value={st.qty}
                                        onChange={(e) => updateStep('packaging', it.id, sidx, 'qty', e.target.value)}
                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>
                                    <td className="py-1 pr-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        disabled={isViewOnly}
                                        value={st.price}
                                        onChange={(e) => updateStep('packaging', it.id, sidx, 'price', e.target.value)}
                                        className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>
                                    <td className="py-1 text-center">
                                      {!isViewOnly && (
                                        <button
                                          type="button"
                                          onClick={() => deleteStep('packaging', it.id, sidx)}
                                          className="text-slate-400 hover:text-rose-600 text-sm cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => addStep('packaging', it.id)}
                                className="text-xs text-teal-700 hover:underline font-bold cursor-pointer block pt-1"
                              >
                                + Add Price Tier
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700">
                              Mockup & Dieline Images ({it.images?.length || 0})
                            </label>
                            {!isViewOnly && (
                              <label className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/png, image/jpeg, image/jpg, image/webp"
                                  onClick={(e) => {
                                    (e.target as HTMLInputElement).value = '';
                                  }}
                                  onChange={(e) =>
                                    handleMultipleImageUpload(e, it.images || [], (newImgs) => {
                                      updateSinglePackage(it.id, { images: newImgs });
                                    })
                                  }
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 min-h-[80px]">
                            {(!it.images || it.images.length === 0) ? (
                              <div className="col-span-3 py-3 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-300 mb-1" />
                                <span>No images</span>
                              </div>
                            ) : (
                              it.images.map((imgUrl, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  className="relative rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square flex items-center justify-center group"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Packaging ${imgIdx + 1}`}
                                    onClick={() =>
                                      setPreviewImage({
                                        src: imgUrl,
                                        alt: `Packaging ${imgIdx + 1}`,
                                      })
                                    }
                                    className="h-full w-full cursor-zoom-in object-cover"
                                  />
                                  {!isViewOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newImgs = (it.images || []).filter((_, idx) => idx !== imgIdx);
                                        updateSinglePackage(it.id, { images: newImgs });
                                      }}
                                      className="absolute top-1 right-1 p-0.5 rounded-md bg-rose-600 text-white cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
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
          <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 font-heading">
              Cost & Budget Restricted
            </h4>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2 font-heading">
                <span>Cost & Budget Analysis</span>
                <span className="ml-auto flex items-center gap-2">
                  {panelToggle('cost-summary')}
                </span>
              </h3>

              <div hidden={collapsedPanels.has('cost-summary')}>
                <CostSummary project={project} costSummary={co} costPrivacy={costPrivacy} />
              </div>
            </section>
          </div>
        )
      )}

      {/* TAB 5: TIMELINE & GANTT */}
      {activeTab === 'timeline' && (
        <div className="space-y-4 sm:space-y-6">
          <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 font-heading">
              <span className="min-w-0 flex-1">Weekly Gantt Chart</span>
              {panelToggle('timeline-gantt')}
            </h3>
            <div hidden={collapsedPanels.has('timeline-gantt')}>
              <GanttChart project={project} computedTasks={cs} />
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: DOCUMENTS */}
      {activeTab === 'docs' && (
        <div className="space-y-4 sm:space-y-6">
          <section className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Attached Documents ({project.docs.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left min-w-[500px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Link</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.docs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No documents attached.
                      </td>
                    </tr>
                  ) : (
                    project.docs.map((d) => (
                      <tr key={d.id}>
                        <td className="p-2.5 font-bold text-slate-800">{d.title}</td>
                        <td className="p-2.5 text-slate-600">{d.type}</td>
                        <td className="p-2.5">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </a>
                        </td>
                        <td className="p-2.5 text-center">
                          {!isViewOnly && (
                            <button
                              onClick={() => {
                                const copy = project.docs.filter((x) => x.id !== d.id);
                                updateImmediately({ docs: copy });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              ×
                            </button>
                          )}
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

      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};