import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Holiday, Project, AppUser } from './lib/types';
import {
  DEFAULT_HOLIDAYS,
  makeProject,
  todayISO,
  uid,
} from './lib/trackerLogic';
import { GoogleSheetsService, SyncState } from './lib/googleSheetsService';
import { UserAuthService } from './lib/userAuthService';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { HolidayModal } from './components/HolidayModal';
import { LoginScreen } from './components/LoginScreen';
import { UserManagementModal } from './components/UserManagementModal';

const getSharedProjectId = (hash: string): string | null => {
  return hash.match(/^#?view\/([^&]+)/)?.[1] || null;
};

// ตัวช่วยอ่าน Project ID จาก URL Hash หรือ fallback จาก localStorage
const getInitialProjectId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  const sharedId = getSharedProjectId(window.location.hash);
  if (sharedId) return sharedId;

  const pMatch = hash.match(/p-([^&]+)/);
  if (pMatch) return pMatch[1];
  if (hash.startsWith('p-')) return hash.slice(2);

  // ถ้าใน Hash ไม่มี ให้ดึงจากที่เคยบันทึกไว้ล่าสุด
  return localStorage.getItem('last_active_project_id') || null;
};

// Sample demo project for fresh users
const createSampleProject = (): Project => {
  const p = makeProject('อาหารเสริม');
  p.name = 'คอลลาเจนเปปไทด์ รสพีช (Peach Collagen Peptide)';
  p.owner = 'Waranya (Product Manager)';
  p.factory = 'BioLab OEM Factory';
  p.startDate = todayISO();
  p.launchTarget = '';
  p.qty = 5000;
  p.pack = '30 ซอง / กล่อง (ซองละ 10 กรัม)';
  p.packNote = 'กล่องพิมพ์ฟอยล์สีทอง ซองอะลูมิเนียมพิมพ์ 4 สี บรรจุลังละ 24 กล่อง';
  p.benefit =
    'เครื่องดื่มคอลลาเจนไดเปปไทด์และไตรเปปไทด์ บำรุงผิวพรรณกระจ่างใส รสพีชญี่ปุ่น หอมสดชื่น ทานง่าย ไม่มีกลิ่นคาว เน้นกลุ่มลูกค้าวัยทำงาน 25-40 ปี';

  p.ingredients = [
    {
      id: uid(),
      name: 'Fish Collagen Dipeptide',
      amount: '5,000 mg',
      note: 'โมเลกุลขนาดเล็ก ดูดซึมไว นำเข้าจากญี่ปุ่น',
    },
    {
      id: uid(),
      name: 'Peach Juice Powder',
      amount: '2,500 mg',
      note: 'รสชาติและกลิ่นธรรมชาติ',
    },
    {
      id: uid(),
      name: 'Vitamin C (Ascorbic Acid)',
      amount: '60 mg',
      note: 'ส่งเสริมการสร้างคอลลาเจน',
    },
    {
      id: uid(),
      name: 'Ceramide from Rice Extract',
      amount: '30 mg',
      note: 'กักเก็บความชุ่มชื้นให้ผิว',
    },
  ];

  p.tests = [
    {
      id: uid(),
      name: 'Stability test (Accelerated 3M)',
      lab: 'Central Lab Thai',
      date: todayISO(),
      status: 'ส่งแล้ว / รอผล',
      note: 'ติดตามสี กลิ่น และความชื้น',
    },
    {
      id: uid(),
      name: 'Heavy metals (โลหะหนัก 4 ชนิด)',
      lab: 'ALS Laboratory',
      date: '',
      status: 'ยังไม่ส่ง',
      note: 'ตะกั่ว สารหนู ปรอท แคดเมียม',
    },
    {
      id: uid(),
      name: 'Nutrition facts (คุณค่าทางโภชนาการ)',
      lab: 'สถาบันอาหาร (NFI)',
      date: '',
      status: 'ยังไม่ส่ง',
      note: 'สำหรับพิมพ์ฉลากโภชนาการ',
    },
  ];

  p.lotNo = 'Lot 01/2026';
  p.uspClaims =
    'คอลลาเจนไดเปปไทด์ชนิดพรีเมียม ดูดซึมไวกว่าคอลลาเจนทั่วไป 5 เท่า ผสานเซราไมด์สกัดจากข้าวญี่ปุ่น รสชาติพีชหอมสดชื่น ดื่มง่าย ไม่มีกลิ่นคาว น้ำตาล 0% แคลอรีต่ำ ให้ผลลัพธ์ผิวชุ่มชื้นและยืดหยุ่นใน 14 วัน';
  p.benchmark = {
    name: 'Japanese Peach Collagen Sachet (Brand A)',
    targetPrice: '590 - 690 บาท / กล่อง (30 ซอง)',
    description:
      'สินค้าขายดีอันดับหนึ่งในหมวดผิวพรรณ จุดเด่นคือการละลายในน้ำเย็นได้รวดเร็ว รสชาติหอมพีชธรรมชาติ ไม่มีรสเปรี้ยวแหลม และกล่องดีไซน์พรีเมียมเปิดแบบสไลด์',
  };

  p.regulatory = [
    {
      id: uid(),
      name: 'ขออนุญาตขึ้นทะเบียนผลิตภัณฑ์เสริมอาหาร (อย.)',
      agency: 'สำนักงานคณะกรรมการอาหารและยา (อย.)',
      submissionDate: todayISO(),
      licenseNo: '10-1-04760-5-0021',
      status: 'อนุมัติแล้ว',
      note: 'ได้รับเลขสารบบอาหารเรียบร้อยแล้ว',
    },
    {
      id: uid(),
      name: 'ใบอนุญาตโฆษณาอาหาร (ฆอ.)',
      agency: 'สำนักงานคณะกรรมการอาหารและยา (อย.)',
      submissionDate: todayISO(),
      licenseNo: 'ฆอ. 1284/2569',
      status: 'ยื่นแล้ว / รอพิจารณา',
      note: 'ยื่นตรวจข้อความและภาพสื่อโฆษณาออนไลน์',
    },
    {
      id: uid(),
      name: 'หนังสือรับรองเครื่องหมายฮาลาล (Halal Certification)',
      agency: 'สำนักงานคณะกรรมการกลางอิสลามแห่งประเทศไทย',
      submissionDate: '',
      licenseNo: '',
      status: 'รอเตรียมเอกสาร',
      note: 'เตรียมเอกสารตรวจโรงงานและวัตถุดิบเจลาติน',
    },
  ];

  p.formulas[0].code = 'RD-COLL-2026-V1';
  p.formulas[0].isConfirmed = true;
  p.formulas[0].steps = [
    { qty: 1000, price: 42.0 },
    { qty: 3000, price: 38.5 },
    { qty: 5000, price: 34.0 },
    { qty: 10000, price: 29.5 },
  ];

  p.packaging = [
    {
      id: uid(),
      type: 'Primary Package',
      name: 'ซองอลูมิเนียมฟอยล์ ฟู้ดเกรด พิมพ์ 4 สี',
      supplier: 'Thai Foil Packaging',
      spec: 'กว้าง 4 ซม. ยาว 14 ซม. ฉีกง่าย',
      moq: 5000,
      plateCost: 3500,
      leadTime: '15 วันทำการ',
      paymentTerm: 'มัดจำ 50%, 50% ก่อนส่งมอบ',
      warrantyTerms: 'ตรวจรับใน 7 วัน ชำรุดเกิน 1% เคลมฟรี',
      selectedForCost: true,
      status: 'In Production',
      steps: [
        { qty: 3000, price: 2.2 },
        { qty: 5000, price: 1.8 },
        { qty: 10000, price: 1.4 },
      ],
      note: 'รวมค่าบล็อกสี 3,500 บาท เฉลี่ยในต้นทุน',
    },
    {
      id: uid(),
      type: 'Secondary Package',
      name: 'กล่องกระดาษเคลือบด้าน ปั๊มฟอยล์ทอง',
      supplier: 'Siam Paper Box Co.',
      spec: 'กระดาษอาร์ตการ์ด 350 แกรม',
      moq: 3000,
      plateCost: 4500,
      leadTime: '14 วันทำการหลังอนุมัติแบบ',
      paymentTerm: 'มัดจำ 50%, 50% ในวันส่งสินค้า',
      warrantyTerms: 'รับประกันสีพิมพ์ตรงตามปรู๊ฟดิจิทัล',
      selectedForCost: true,
      status: 'Design Approved',
      steps: [
        { qty: 3000, price: 12.0 },
        { qty: 5000, price: 9.5 },
      ],
      note: 'ค่าบล็อกปั๊มฟอยล์ทอง 4,500 บาท',
    },
  ];

  p.other = [
    {
      id: uid(),
      name: 'ค่าโอเปอเรชั่นและแพ็คกิ้ง',
      unit: 'ชิ้น',
      amount: 3.5,
      note: 'รวมแรงงานบรรจุลงกล่อง',
    },
    {
      id: uid(),
      name: 'ค่าขนส่งสินค้ามาคลังเรา',
      unit: 'เที่ยว',
      amount: 2500,
      times: 1,
      note: 'รถบรรทุก 4 ล้อใหญ่',
    },
  ];

  return p;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    UserAuthService.initDefaultUsers();
    return UserAuthService.getCurrentSession();
  });
  const [isUrlViewOnly, setIsUrlViewOnly] = useState<boolean>(() => {
    return UserAuthService.isUrlViewOnly();
  });
  const [sharedProjectId, setSharedProjectId] = useState<string | null>(() =>
    getSharedProjectId(window.location.hash)
  );
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Cost Privacy Mode
  const [costPrivacy, setCostPrivacy] = useState<boolean>(() => {
    return localStorage.getItem('launch_tracker_cost_privacy') === 'true';
  });

  // Projects & Holidays State
  const [projects, setProjects] = useState<Project[]>(() => {
    const cached = GoogleSheetsService.getLocalProjects();
    if (cached && cached.length > 0) return cached;
    return [createSampleProject()];
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const cached = GoogleSheetsService.getLocalHolidays();
    if (cached && cached.length > 0) return cached;
    return DEFAULT_HOLIDAYS;
  });

  // สถานะเพื่อตรวจว่าดาวน์โหลดข้อมูลครั้งแรกเสร็จหรือยัง ป้องกันหน้าว่างตอนรีเฟรช
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    isSynced: false,
    isSyncing: false,
    lastSyncedAt: null,
    spreadsheetId: GoogleSheetsService.getSpreadsheetId(),
    spreadsheetUrl: GoogleSheetsService.getSpreadsheetUrl(),
    error: null,
  });

  // Navigation state (อ่านค่าหน้าเดิมจาก Hash และ LocalStorage)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(getInitialProjectId);

  // จดจำและซิงก์ Project ID ลง LocalStorage เสมอ เพื่อให้รีเฟรชแล้วอยู่หน้าเดิม 100%
  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('last_active_project_id', currentProjectId);
      const isView = isUrlViewOnly || currentUser?.role === 'Viewer';
      const targetHash = sharedProjectId
        ? `view/${sharedProjectId}`
        : isView
        ? `p-${currentProjectId}&view-only`
        : `p-${currentProjectId}`;
      if (window.location.hash !== `#${targetHash}`) {
        window.location.hash = targetHash;
      }
    } else {
      localStorage.removeItem('last_active_project_id');
      const targetHash = isUrlViewOnly ? 'view-only' : 'all';
      if (window.location.hash !== `#${targetHash}` && !sharedProjectId) {
        window.location.hash = targetHash;
      }
    }
  }, [currentProjectId, isUrlViewOnly, currentUser?.role, sharedProjectId]);

  // Holidays Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3500);
  };

  const holidaysSet = useMemo(() => {
    return new Set(holidays.map((h) => h.date).filter(Boolean));
  }, [holidays]);

  const saveTimerRef = useRef<any>(null);
  const isDirtyRef = useRef(false);

  // ดึงข้อมูลโครงการและวันหยุดจาก Google Sheets
  const syncWithGoogleSheets = async () => {
    if (isDirtyRef.current) return;
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const remoteProjects = await GoogleSheetsService.loadProjects();
      const remoteHolidays = await GoogleSheetsService.loadHolidays();

      if (remoteProjects && remoteProjects.length > 0) {
        setProjects(remoteProjects);
      }
      if (remoteHolidays && remoteHolidays.length > 0) {
        setHolidays(remoteHolidays);
      }

      setSyncState((prev) => ({
        ...prev,
        isSynced: true,
        isSyncing: false,
        lastSyncedAt: new Date(),
        error: null,
      }));
    } catch (err: any) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err?.message || 'Sync failed',
      }));
    } finally {
      setIsInitialLoadDone(true);
    }
  };

  const forcePushToGoogleSheets = async () => {
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      await GoogleSheetsService.saveAllProjects(
        'apps-script',
        'google-apps-script',
        projects,
        holidaysSet
      );
      await GoogleSheetsService.saveHolidays(
        'apps-script',
        'google-apps-script',
        holidays
      );
      setSyncState((prev) => ({
        ...prev,
        isSynced: true,
        isSyncing: false,
        lastSyncedAt: new Date(),
        error: null,
      }));
      showToast('ส่งข้อมูลทั้งหมดขึ้น Google Sheets สำเร็จแล้ว!');
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Push failed';
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        isSynced: false,
        error: message,
      }));
      showToast(`ไม่สามารถบันทึกลง Google Sheets: ${message}`);
    }
  };

  useEffect(() => {
    syncWithGoogleSheets();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      syncWithGoogleSheets();
    }, 3000);

    const onFocus = () => {
      syncWithGoogleSheets();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Hash change listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const sharedId = getSharedProjectId(window.location.hash);
      setIsUrlViewOnly(UserAuthService.isUrlViewOnly());
      if (sharedId) {
        setSharedProjectId(sharedId);
        setCurrentProjectId(sharedId);
      } else if (sharedProjectId) {
        window.location.hash = `view/${sharedProjectId}`;
      } else {
        setSharedProjectId(null);
        const pMatch = hash.match(/p-([^&]+)/);
        if (pMatch) {
          setCurrentProjectId(pMatch[1]);
        } else if (hash.startsWith('p-')) {
          setCurrentProjectId(hash.slice(2));
        } else if (hash === 'all' || hash === 'view-only') {
          setCurrentProjectId(null);
        }
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [sharedProjectId]);

  const queueSave = (newProjects: Project[]) => {
    isDirtyRef.current = true;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      isDirtyRef.current = false;
      setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        await GoogleSheetsService.saveAllProjects(
          'apps-script',
          'google-apps-script',
          newProjects,
          holidaysSet
        );

        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          isSynced: true,
          lastSyncedAt: new Date(),
          error: null,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Google Sheets save failed';
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          isSynced: false,
          error: message,
        }));
        showToast(`Could not save to Google Sheets: ${message}`);
      }
    }, 700);
  };

  const handleToggleCostPrivacy = () => {
    if (isViewOnly) {
      showToast('Cost figures are restricted for Viewer role');
      return;
    }
    const nextVal = !costPrivacy;
    setCostPrivacy(nextVal);
    localStorage.setItem('launch_tracker_cost_privacy', String(nextVal));
    showToast(
      nextVal
        ? 'Presentation Mode Enabled — Unit costs and budgets are now hidden'
        : 'Presentation Mode Disabled — Cost figures are visible'
    );
  };

  const isViewOnly = Boolean(isUrlViewOnly || currentUser?.role === 'Viewer');
  const effectiveCostPrivacy = isViewOnly ? true : costPrivacy;

  const canWrite = () => {
    if (isViewOnly) {
      showToast('Action not allowed in View-Only mode');
      return false;
    }
    return true;
  };

  const handleCreateProject = (
    name: string,
    category: 'อาหารเสริม' | 'สกินแคร์'
  ) => {
    if (!canWrite()) return;
    const newProj = makeProject(category);
    newProj.name = name;
    const updated = [newProj, ...projects];
    setProjects(updated);
    queueSave(updated);
    setCurrentProjectId(newProj.id);
    showToast(`Created project "${name}"`);
  };

  const handleUpdateProject = (updated: Project) => {
    if (!canWrite()) return;
    const next = projects.map((p) => (p.id === updated.id ? updated : p));
    setProjects(next);
    queueSave(next);
  };

  const handleDuplicateProject = (orig: Project) => {
    if (!canWrite()) return;
    const copy = JSON.parse(JSON.stringify(orig)) as Project;
    copy.id = uid();
    copy.name = `${copy.name || 'Project'} (สำเนา)`;
    copy.createdAt = Date.now();
    copy.rev = 0;
    copy.docs = [];
    copy.tests.forEach((t) => {
      t.status = 'ยังไม่ส่ง';
      t.date = '';
    });
    copy.phases.forEach((ph) => {
      ph.tasks.forEach((t) => (t.done = false));
    });

    const updated = [copy, ...projects];
    setProjects(updated);
    queueSave(updated);
    setCurrentProjectId(copy.id);
    showToast('Project duplicated successfully');
  };

  const handleDeleteProject = (id: string) => {
    if (!canWrite()) return;
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    queueSave(updated);
    setCurrentProjectId(null);
    showToast('Project deleted');
  };

  const handleSaveHolidays = async (newHolidays: Holiday[]) => {
    if (!canWrite()) return;
    setHolidays(newHolidays);
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      await GoogleSheetsService.saveHolidays('apps-script', 'google-apps-script', newHolidays);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        isSynced: true,
        lastSyncedAt: new Date(),
        error: null,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Holiday save failed';
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: message,
      }));
      showToast(`Could not save holidays: ${message}`);
      return;
    }
    showToast('Holidays updated');
  };

  if (!currentUser && !isUrlViewOnly) {
    return (
      <LoginScreen
        onBootstrapAdmin={async (username, password, setupSecret) => {
          return UserAuthService.bootstrapAdmin(
            username,
            password,
            setupSecret
          );
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.displayName || user.username}`);
        }}
        onEnterViewOnly={() => {
          setIsUrlViewOnly(true);
        }}
      />
    );
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans">
      <Header
        currentUser={currentUser}
        onAppLogout={async () => {
          await UserAuthService.logout();
          setCurrentUser(null);
          setCurrentProjectId(null);
          showToast('Signed out of Project Tracker');
        }}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        isViewOnly={isViewOnly}
        isSharedProjectView={Boolean(sharedProjectId)}
        costPrivacy={effectiveCostPrivacy}
        onToggleCostPrivacy={handleToggleCostPrivacy}
        syncState={syncState}
        onOpenHolidays={() => setIsHolidayModalOpen(true)}
      />

      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${syncState.isSyncing ? 'bg-amber-400 animate-pulse' : syncState.isSynced ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          <span>
            {syncState.isSyncing
              ? 'กำลังซิงก์ข้อมูลกับ Google Sheets...'
              : syncState.lastSyncedAt
              ? `ซิงก์ล่าสุด: ${new Date(syncState.lastSyncedAt).toLocaleTimeString('th-TH')}`
              : 'พร้อมใช้งาน'}
          </span>
        </div>

        <button
          onClick={forcePushToGoogleSheets}
          disabled={syncState.isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Force Sync (ดันขึ้นชีตทันที)
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentProjectId ? (
          currentProject ? (
            <ProjectDetail
              project={currentProject}
              holidaysSet={holidaysSet}
              costPrivacy={effectiveCostPrivacy}
              isViewOnly={isViewOnly}
              isSharedProjectView={Boolean(sharedProjectId)}
              onBack={() => {
                setCurrentProjectId(null);
              }}
              onUpdateProject={handleUpdateProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
            />
          ) : !isInitialLoadDone ? (
            /* ระหว่างรอโหลดข้อมูลจาก Google Sheets ครั้งแรก ไม่ให้เด้งหลุด */
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-slate-600 font-bold">
                กำลังเปิดโปรเจกต์ของคุณ...
              </p>
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <p className="text-base text-slate-700 font-semibold">
                Project not found or was removed.
              </p>
              {!sharedProjectId && (
                <button
                  onClick={() => {
                    setCurrentProjectId(null);
                  }}
                  className="inline-flex items-center text-xs font-semibold px-4 py-2 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Return to All Projects
                </button>
              )}
            </div>
          )
        ) : (
          <ProjectList
            projects={projects}
            holidaysSet={holidaysSet}
            costPrivacy={effectiveCostPrivacy}
            isViewOnly={isViewOnly}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
            }}
            onCreateProject={handleCreateProject}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Holidays Modal */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        holidays={holidays}
        onSaveHolidays={handleSaveHolidays}
      />

      {/* User Management & Roles Modal */}
      {isUserManagementOpen && currentUser && (
        <UserManagementModal
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}
    </div>
  );
}