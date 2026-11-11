import {
  CostSummaryResult,
  Formula,
  Holiday,
  PackagingItem,
  PackagingStatus,
  Phase,
  Project,
  ProjectCategory,
  ProjectStatus,
  ProjectSummaryResult,
  RegulatoryItem,
  StepPrice,
  Task,
  TaskComputeResult,
} from './types';

export const VAT_RATE = 0.07;

export const TM = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const STATUS_LIST: ProjectStatus[] = [
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
];

export const CATEGORIES_LIST: ProjectCategory[] = [
  'Dietary Supplement',
  'Skincare',
];

export const displayStatus = (s: string | undefined): 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled' => {
  if (!s) return 'In Progress';
  if (s === 'เสร็จสิ้น' || s === 'Completed') return 'Completed';
  if (s === 'พักไว้' || s === 'On Hold') return 'On Hold';
  if (s === 'ยกเลิก' || s === 'Cancelled') return 'Cancelled';
  return 'In Progress';
};

export const displayCategory = (c: string | undefined): 'Dietary Supplement' | 'Skincare' => {
  if (c === 'สกินแคร์' || c === 'Skincare') return 'Skincare';
  return 'Dietary Supplement';
};

export const TEST_STATUS_LIST = [
  'ยังไม่ส่ง',
  'ส่งแล้ว / รอผล',
  'ผ่าน',
  'ไม่ผ่าน / ต้องแก้',
  'ไม่จำเป็น',
] as const;

export const REGULATORY_STATUS_LIST = [
  'รอเตรียมเอกสาร',
  'ยื่นแล้ว / รอพิจารณา',
  'อนุมัติแล้ว',
  'ต้องแก้ไขเอกสาร',
  'ไม่จำเป็น',
] as const;

export const PACKAGING_STATUS_LIST: PackagingStatus[] = [
  'Not Started',
  'In Design',
  'Design Approved',
  'In Production',
  'Completed',
];

export const DOC_TYPES = [
  'ผลตรวจ / รายงานแล็บ',
  'ใบอนุญาต / เลขจดแจ้ง',
  'อาร์ตเวิร์ก / ไฟล์ออกแบบ',
  'สัญญา / ใบเสนอราคา',
  'อื่นๆ',
] as const;

export const DEFAULT_UNITS = [
  'ชิ้น',
  'เที่ยว',
  'ล็อต',
  'กิโลกรัม',
  'ลัง',
  'ครั้ง',
] as const;

export const PKG_TYPES = [
  'Primary Package',
  'Secondary Package',
  'อุปกรณ์อื่นๆ',
] as const;

export const PHASE_NAMES_EN: Record<number, string> = {
  1: 'Formula Development',
  2: 'Lab Testing',
  3: 'Product Registration/FDA',
  4: 'Packaging Development',
  5: 'Production',
  6: 'Delivery',
};

export const PHASES_DEF = [
  { k: 1, name: 'Formula Development', en: 'Formula Development' },
  { k: 2, name: 'Lab Testing', en: 'Lab Testing' },
  { k: 3, name: 'Product Registration/FDA', en: 'Product Registration/FDA' },
  { k: 4, name: 'Packaging Development', en: 'Packaging Development' },
  { k: 5, name: 'Production', en: 'Production' },
  { k: 6, name: 'Delivery', en: 'Delivery' },
];

export const uid = (): string =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export const pad = (n: number): string => String(n).padStart(2, '0');

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const pd = (s: string): Date => {
  const a = s.split('-').map(Number);
  return new Date(Date.UTC(a[0], a[1] - 1, a[2]));
};

export const fd = (d: Date): string => d.toISOString().slice(0, 10);

export const addD = (s: string, n: number): string =>
  fd(new Date(pd(s).getTime() + n * 864e5));

export const dow = (s: string): number => pd(s).getUTCDay();

export const diffD = (a: string, b: string): number =>
  Math.round((pd(b).getTime() - pd(a).getTime()) / 864e5);

// Dates in English and CE (ค.ศ.), e.g. "15 Jan 2026"
export const fmt = (s: string | null | undefined): string => {
  if (!s) return '-';
  const a = s.split('-').map(Number);
  if (isNaN(a[0]) || isNaN(a[1]) || isNaN(a[2])) return s;
  return `${a[2]} ${TM[a[1] - 1]} ${a[0]}`;
};

export const fmtShort = (s: string | null | undefined): string => {
  if (!s) return '-';
  const a = s.split('-').map(Number);
  if (isNaN(a[0]) || isNaN(a[1]) || isNaN(a[2])) return s;
  return `${a[2]} ${TM[a[1] - 1]}`;
};

export const baht = (n: number | string | null | undefined): string =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const isWork = (s: string, holidaysSet?: Set<string>): boolean => {
  const w = dow(s);
  return w !== 0 && w !== 6 && (!holidaysSet || !holidaysSet.has(s));
};

export const nextWork = (s: string, holidaysSet?: Set<string>): string => {
  let x = s;
  let g = 0;
  while (!isWork(x, holidaysSet) && g++ < 400) {
    x = addD(x, 1);
  }
  return x;
};

export const addWork = (
  s: string,
  n: number,
  holidaysSet?: Set<string>
): string => {
  let x = nextWork(s, holidaysSet);
  let left = Math.max(1, Math.round(n) || 1) - 1;
  while (left > 0) {
    x = nextWork(addD(x, 1), holidaysSet);
    left--;
  }
  return x;
};

export const wdBetween = (
  a: string,
  b: string,
  holidaysSet?: Set<string>
): number => {
  let c = 0;
  let x = a;
  let g = 0;
  while (x <= b && g++ < 4000) {
    if (isWork(x, holidaysSet)) c++;
    x = addD(x, 1);
  }
  return c;
};

export const monday = (s: string): string => addD(s, -((dow(s) + 6) % 7));

export function makeTimeline(cat: string): Phase[] {
  const T = (name: string, days: number, dep: string): Task => ({
    id: uid(),
    name,
    days,
    dep,
    start: '',
    done: false,
  });
  const skin = cat === 'สกินแคร์';
  const f1 = T('ปรับสูตรและทำตัวอย่างรอบแรก', 10, '@start');
  const f2 = T('ทดสอบตัวอย่างและปรับสูตร', 10, '');
  const f3 = T('อนุมัติสูตรสุดท้าย', 2, '');
  f2.dep = f1.id;
  f3.dep = f2.id;

  const t1 = T('ส่งตัวอย่างเข้าห้องแล็บ', 3, f3.id);
  const t2 = T('Stability test', skin ? 20 : 15, t1.id);
  const t3 = T('Compatibility test', 10, t1.id);
  const t4 = T(
    skin
      ? 'ทดสอบความปลอดภัย / การระคายเคือง'
      : 'Nutrition / คุณค่าทางโภชนาการ',
    10,
    t1.id
  );
  const t5 = T('รับและตรวจสอบผลทดสอบทั้งหมด', 3, '@all');

  const r1 = T('เตรียมเอกสารและข้อมูลสำหรับขออนุญาต', 5, f3.id);
  const r2 = T(skin ? 'จดแจ้งเครื่องสำอาง (อย.)' : 'ขออนุญาต อย.', 15, r1.id);
  const r3 = T('ขอ ฆอ. / ฮาลาล (ถ้ามี)', 10, r1.id);
  const r4 = T('รับเลขจดแจ้ง / ใบอนุญาต', 2, '@all');

  const k1 = T('ออกแบบอาร์ตเวิร์กและแพ็คเกจจิ้ง', 10, f3.id);
  const k2 = T('อนุมัติอาร์ตเวิร์ก', 3, k1.id);
  const k3 = T('ผลิตแพ็คเกจจิ้ง', 15, k2.id);

  const m1 = T('เตรียมวัตถุดิบและส่งแพ็คเกจเข้าโรงงาน', 3, '@all');
  const m2 = T('ผลิตสินค้า (โรงงาน 14–30 วัน)', 20, m1.id);
  const m3 = T('QC และจัดส่งออกจากโรงงาน', 2, m2.id);

  const s1 = T('ขนส่งสินค้ามาถึงเรา', 3, m3.id);
  const s2 = T('ตรวจรับสินค้า พร้อม Launch', 2, s1.id);

  const groups = [
    [f1, f2, f3],
    [t1, t2, t3, t4, t5],
    [r1, r2, r3, r4],
    [k1, k2, k3],
    [m1, m2, m3],
    [s1, s2],
  ];

  return PHASES_DEF.map((p, i) => ({
    k: p.k,
    name: p.name,
    tasks: groups[i],
  }));
}

export function makeProject(cat?: 'อาหารเสริม' | 'สกินแคร์'): Project {
  const fid = uid();
  const selectedCat = cat || 'อาหารเสริม';
  return {
    id: uid(),
    name: '',
    category: selectedCat,
    status: 'กำลังดำเนินการ',
    lotNo: 'Lot 01',
    fdaNo: '',
    owner: '',
    factory: '',
    startDate: todayISO(),
    launchTarget: '',
    qty: '',
    pack: '',
    packNote: '',
    benefit: '',
    uspClaims: '',
    benchmark: {
      name: '',
      description: '',
      images: [],
      targetPrice: '',
    },
    ingredients: [],
    tests: [],
    regulatory: [],
    formulas: [
      {
        id: fid,
        ver: 'V1',
        code: '',
        date: todayISO(),
        changes: 'สูตรตั้งต้น',
        steps: [{ qty: '', price: '' }],
        note: '',
        images: [],
        imageNote: '',
        isConfirmed: false,
      },
    ],
    chosenFormula: fid,
    packaging: [],
    other: [],
    docs: [],
    phases: makeTimeline(selectedCat),
    createdAt: Date.now(),
    rev: 0,
  };
}

export function norm(p: Project): Project {
  p.category = displayCategory(p.category);
  p.status = displayStatus(p.status);
  p.ingredients = p.ingredients || [];
  p.tests = p.tests || [];
  p.regulatory = p.regulatory || [];
  p.packaging = p.packaging || [];
  p.other = p.other || [];
  p.docs = p.docs || [];
  p.lotNo = p.lotNo || '';
  p.fdaNo = p.fdaNo || '';
  p.uspClaims = p.uspClaims || '';
  p.benchmark = p.benchmark || { name: '', description: '', images: [], targetPrice: '' };
  if (!p.benchmark.images) {
    p.benchmark.images = (p.benchmark as any).imageUrl ? [(p.benchmark as any).imageUrl] : [];
  }

  if (!p.formulas || !p.formulas.length) {
    const f = makeProject().formulas;
    p.formulas = f;
    p.chosenFormula = f[0].id;
  }
  p.formulas.forEach((f) => {
    f.steps = f.steps && f.steps.length ? f.steps : [{ qty: '', price: '' }];
    f.ingredients = f.ingredients || [];
    if (!f.images) {
      f.images = (f as any).imageUrl ? [(f as any).imageUrl] : [];
    }
  });
  p.packaging.forEach((x) => {
    x.steps = x.steps && x.steps.length ? x.steps : [{ qty: '', price: '' }];
    if (x.selectedForCost === undefined) x.selectedForCost = true;
    if (!x.status) x.status = 'Not Started';
    if (!x.images) {
      x.images = (x as any).imageUrl ? [(x as any).imageUrl] : [];
    }
  });
  if (!p.formulas.some((f) => f.id === p.chosenFormula)) {
    p.chosenFormula = p.formulas[p.formulas.length - 1].id;
  }
  if (!p.phases || p.phases.length !== 6) {
    p.phases = makeTimeline(p.category);
  }
  p.phases.forEach((ph) => {
    if (PHASE_NAMES_EN[ph.k]) {
      ph.name = PHASE_NAMES_EN[ph.k];
    }
  });
  p.startDate = p.startDate || todayISO();
  return p;
}

export function flatTasks(p: Project): Task[] {
  const a: Task[] = [];
  p.phases.forEach((ph) => {
    ph.tasks.forEach((t) => {
      a.push(t);
    });
  });
  return a;
}

export function findTask(p: Project, id: string): Task | undefined {
  return flatTasks(p).find((t) => t.id === id);
}

export function compute(
  p: Project,
  holidaysSet?: Set<string>
): Record<string, TaskComputeResult> {
  const fl = flatTasks(p);
  const res: Record<string, TaskComputeResult> = {};
  fl.forEach((t, i) => {
    let s: string;
    if (t.dep === '@start') {
      s = p.startDate;
    } else if (t.dep === '@all') {
      let m: string | null = null;
      for (let j = 0; j < i; j++) {
        const e = res[fl[j].id].e;
        if (!m || e > m) m = e;
      }
      s = m ? addD(m, 1) : p.startDate;
    } else if (t.dep && res[t.dep]) {
      s = addD(res[t.dep].e, 1);
    } else {
      s = t.start || p.startDate;
    }
    const raw = s;
    s = nextWork(s, holidaysSet);
    res[t.id] = { s: s, e: addWork(s, t.days, holidaysSet), raw: raw };
  });
  return res;
}

export function lookup(
  steps: StepPrice[],
  q: number
): { price: number; has: boolean; step?: number; below?: boolean } {
  const st = (steps || [])
    .filter(
      (s) =>
        s.qty !== '' &&
        s.price !== '' &&
        !isNaN(+s.qty) &&
        !isNaN(+s.price)
    )
    .map((s) => ({ q: +s.qty, p: +s.price }))
    .sort((a, b) => a.q - b.q);

  if (!st.length) return { price: 0, has: false };
  let pick: { q: number; p: number } | null = null;
  for (const s of st) {
    if (s.q <= q) pick = s;
  }
  if (!pick) return { price: st[0].p, has: true, below: true };
  return { price: pick.p, has: true, step: pick.q };
}

export function depOpts(
  earlier: Task[]
): [string, string][] {
  const o: [string, string][] = [
    ['@start', 'วันเริ่มโปรเจค'],
    ['@all', 'หลังงานก่อนหน้าทั้งหมด'],
  ];
  earlier.forEach((x) => {
    o.push([x.id, `หลัง: ${x.name || '(ไม่มีชื่อ)'}`]);
  });
  o.push(['', 'กำหนดวันเอง']);
  return o;
}

export function otherPer(
  o: { amount: string | number; unit: string; times?: string | number },
  q: number
): number {
  const a = Number(o.amount) || 0;
  if (o.unit === 'ชิ้น') return a;
  if (!q) return 0;
  if (o.unit === 'เที่ยว') return (a * (Number(o.times) || 0)) / q;
  if (o.unit === 'ล็อต') return a / q;
  if (o.times && Number(o.times) > 0) {
    return (a * Number(o.times)) / q;
  }
  return a / q;
}

export function costOf(p: Project): CostSummaryResult {
  const q = Number(p.qty) || 0;
  const f =
    p.formulas.find((x) => x.id === p.chosenFormula) ||
    p.formulas[p.formulas.length - 1];
  const fr = lookup(f.steps, q);
  let packagingSubtotal = 0;
  let packagingVat = 0;
  let otherSubtotal = 0;
  let otherVat = 0;
  let plateTotal = 0;
  const below: string[] = [];

  const activePackaging = p.packaging.filter((it) => it.selectedForCost !== false);

  activePackaging.forEach((it) => {
    const r = lookup(it.steps, q);
    packagingSubtotal += r.price;
    if (it.plateCost && Number(it.plateCost) > 0) {
      plateTotal += Number(it.plateCost);
    }
    const platePerItem = q > 0 ? (Number(it.plateCost) || 0) / q : 0;
    if (!it.vatIncluded) {
      packagingVat += (r.price + platePerItem) * VAT_RATE;
    }
    if (q && Number(it.moq) && q < Number(it.moq)) {
      below.push(it.name || '(ไม่มีชื่อ)');
    }
  });

  const platePerUnit = q > 0 ? plateTotal / q : 0;
  packagingSubtotal += platePerUnit;

  p.other.forEach((o) => {
    const amount = otherPer(o, q);
    otherSubtotal += amount;
    if (!o.vatIncluded) otherVat += amount * VAT_RATE;
  });
  const formulaVat = f.vatIncluded ? 0 : fr.price * VAT_RATE;
  const subtotal = fr.price + packagingSubtotal + otherSubtotal;
  const vat = formulaVat + packagingVat + otherVat;
  const fp = fr.price + formulaVat;
  const pk = packagingSubtotal + packagingVat;
  const ot = otherSubtotal + otherVat;
  const unit = subtotal + vat;
  return {
    q,
    f,
    fp,
    fhas: fr.has,
    pk,
    ot,
    subtotal,
    vat,
    plateTotal,
    platePerUnit,
    unit,
    batch: unit * q,
    below,
  };
}

export function summ(
  p: Project,
  cs: Record<string, TaskComputeResult>,
  _co: CostSummaryResult,
  holidaysSet?: Set<string>
): ProjectSummaryResult {
  const fl = flatTasks(p);
  const total = fl.length;
  const done = fl.filter((t) => t.done).length;
  let first: string | null = null;
  let last: string | null = null;
  fl.forEach((t) => {
    const r = cs[t.id];
    if (r) {
      if (!first || r.s < first) first = r.s;
      if (!last || r.e > last) last = r.e;
    }
  });

  let si = -1;
  let currentTaskName = '';
  for (let i = 0; i < p.phases.length; i++) {
    const ph = p.phases[i];
    const unfinished = ph.tasks.find((t) => !t.done);
    if (unfinished) {
      if (si < 0) {
        si = i;
        currentTaskName = unfinished.name;
      }
    }
  }

  const stage =
    si < 0
      ? { k: 0, name: 'Completed / Ready to Launch' }
      : {
          k: p.phases[si].k,
          name: PHASE_NAMES_EN[p.phases[si].k] || p.phases[si].name,
        };

  let vs = '';
  let vc: 'ok' | 'late' | 'wait' | '' = '';
  if (p.launchTarget && last) {
    const d = diffD(last, p.launchTarget);
    if (d > 0) {
      vs = `${d}d ahead of launch target`;
      vc = 'ok';
    } else if (d < 0) {
      vs = `${-d}d behind launch target`;
      vc = 'late';
    } else {
      vs = 'On schedule';
      vc = 'ok';
    }
  }

  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0,
    first,
    last,
    wd: first && last ? wdBetween(first, last, holidaysSet) : 0,
    stage,
    currentTaskName: currentTaskName || (stage.k === 0 ? 'สินค้าพร้อมเปิดตัว' : ''),
    vs,
    vc,
  };
}

export const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 'h1', date: '2026-12-07', name: 'ชดเชยวันคล้ายวันพระบรมราชสมภพ' },
  { id: 'h2', date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
  { id: 'h3', date: '2026-12-31', name: 'วันสิ้นปี' },
  { id: 'h4', date: '2027-01-01', name: 'วันขึ้นปีใหม่' },
];

// ฟังก์ชันบีบอัดรูปภาพให้ขนาดกะทัดรัดก่อนบันทึกลง Google Sheets (ประกาศเพียงรอบเดียว)
export const compressImageFile = (
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.65
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (e) {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};