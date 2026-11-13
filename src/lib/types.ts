export interface StepPrice {
  qty: string | number;
  price: string | number;
}

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  failedAttempts: number;
  isLocked: boolean;
  createdAt: number;
}

export type CostBasisLevel = 'unit' | 'pack';

export interface Formula {
  id: string;
  ver: string;
  code?: string;
  date: string;
  changes: string;
  steps: StepPrice[];
  selectedStepIdx?: number | null;
  note: string;
  ingredients?: Ingredient[];
  images?: string[];
  imageNote?: string;
  isConfirmed?: boolean;
  vatIncluded?: boolean;
}

export type PackagingStatus =
  | 'Not Started'
  | 'In Design'
  | 'Design Approved'
  | 'In Production'
  | 'Completed';

export interface PackagingItem {
  id: string;
  type: 'Primary Package' | 'Secondary Package' | 'อุปกรณ์อื่นๆ';
  name: string;
  spec: string;
  supplier: string;
  moq: string | number;
  steps: StepPrice[];
  selectedStepIdx?: number | null;
  costBasis?: CostBasisLevel; // 'unit' = ต่อหน่วยย่อย (ซอง/เม็ด), 'pack' = ต่อแพ็กขาย (ห่อ/กระปุก)
  note: string;
  images?: string[];
  plateCost?: string | number;
  leadTime?: string;
  paymentTerm?: string;
  warrantyTerms?: string;
  selectedForCost?: boolean;
  status?: PackagingStatus;
  vatIncluded?: boolean;
}

export interface OtherCostItem {
  id: string;
  name: string;
  unit: string;
  amount: string | number;
  perQty?: string | number;
  times?: string | number;
  note: string;
  vatIncluded?: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit?: string;
  note: string;
}

export interface LabTest {
  id: string;
  name: string;
  lab: string;
  date: string;
  status: 'ยังไม่ส่ง' | 'ส่งแล้ว / รอผล' | 'ผ่าน' | 'ไม่ผ่าน / ต้องแก้' | 'ไม่จำเป็น';
  note: string;
}

export interface RegulatoryItem {
  id: string;
  name: string;
  agency: string;
  submissionDate: string;
  licenseNo: string;
  status: 'รอเตรียมเอกสาร' | 'ยื่นแล้ว / รอพิจารณา' | 'อนุมัติแล้ว' | 'ต้องแก้ไขเอกสาร' | 'ไม่จำเป็น';
  note: string;
}

export interface ProductBenchmark {
  name: string;
  description: string;
  images?: string[];
  targetPrice?: string;
}

export interface Task {
  id: string;
  name: string;
  days: number;
  dep: string;
  start: string;
  done: boolean;
}

export interface Phase {
  k: number;
  name: string;
  tasks: Task[];
}

export interface ProjectDocument {
  id: string;
  title: string;
  type: 'ผลตรวจ / รายงานแล็บ' | 'ใบอนุญาต / เลขจดแจ้ง' | 'อาร์ตเวิร์ก / ไฟล์ออกแบบ' | 'สัญญา / ใบเสนอราคา' | 'อื่นๆ';
  kind: 'file' | 'link' | 'gdrive';
  url?: string;
  driveFileId?: string;
  webViewLink?: string;
  fileName?: string;
  size?: number;
  note: string;
  added: string;
}

export type ProjectCategory = 'Dietary Supplement' | 'Skincare' | 'อาหารเสริม' | 'สกินแคร์';
export type ProjectStatus = 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled' | 'กำลังดำเนินการ' | 'พักไว้' | 'เสร็จสิ้น' | 'ยกเลิก';

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  lotNo?: string;
  fdaNo?: string;
  owner: string;
  factory: string;
  startDate: string;
  launchTarget: string;
  qty: string | number; // จำนวนหน่วยย่อยทั้งหมด (เช่น 30,000 ซอง)
  baseUnitName?: string; // ชื่อหน่วยย่อย (เช่น ซอง, เม็ด, ชิ้น)
  packUnitName?: string; // ชื่อแพ็กขาย (เช่น ห่อ, กล่อง, กระปุก)
  unitsPerPack?: string | number; // อัตราบรรจุต่อแพ็ก (เช่น 7 ซอง/ห่อ, 30 เม็ด/กระปุก)
  pack: string;
  packNote: string;
  benefit: string;
  uspClaims?: string;
  benchmark?: ProductBenchmark;
  ingredients: Ingredient[];
  tests: LabTest[];
  regulatory?: RegulatoryItem[];
  formulas: Formula[];
  chosenFormula: string;
  packaging: PackagingItem[];
  other: OtherCostItem[];
  docs: ProjectDocument[];
  collapsedPanels?: string[];
  phases: Phase[];
  createdAt: number;
  updatedAt?: number;
  rev: number;
  pnl?: ProjectPnL;
}

export interface PnLLineItem {
  id: string;
  description: string;
  amount: string | number;
}

export interface ProjectPnL {
  grossSale: string | number;
  distributionFee: string | number;
  atlItems: PnLLineItem[];
  btlItems: PnLLineItem[];
  otherMktItems: PnLLineItem[];
  fixedCostItems: PnLLineItem[];
  otherExpenseItems: PnLLineItem[];
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface TaskComputeResult {
  s: string;
  e: string;
  raw?: string;
}

export interface CostSummaryResult {
  q: number; // จำนวนหน่วยย่อยทั้งหมด
  unitsPerPack: number; // อัตราบรรจุต่อแพ็ก (เช่น 7)
  fullPacks: number; // จำนวนแพ็กเต็มที่ขายได้จริง (Math.floor)
  remainderUnits: number; // จำนวนเศษคงเหลือ (%)
  baseUnitName: string;
  packUnitName: string;
  f: Formula;
  fp: number; // ค่าสูตรต่อหน่วยย่อย (รวม VAT)
  fhas: boolean;
  pk: number; // ค่าบรรจุภัณฑ์รวมเฉลี่ยต่อหน่วยย่อย (รวม VAT)
  ot: number; // ค่าใช้จ่ายอื่นๆ เฉลี่ยต่อหน่วยย่อย (รวม VAT)
  additionalCost: number; // ค่าใช้จ่ายเหมาต่อครั้ง/รอบ
  subtotal: number;
  vat: number;
  plateTotal: number;
  platePerUnit: number;
  unit: number; // ต้นทุนต่อหน่วยย่อย (ซอง/เม็ด) รวม VAT
  packCost: number; // ต้นทุนต่อ 1 แพ็กขายจริง (ห่อ/กระปุก) รวม VAT
  sellableBatchCost: number; // ต้นทุนรวมเฉพาะแพ็กเต็มที่ขายได้จริง
  remainderCost: number; // มูลค่าต้นทุนของเศษคงเหลือ
  batch: number; // ต้นทุนรวมทั้งหมดทั้งล็อต
  below: string[];
}

export interface ProjectSummaryResult {
  total: number;
  done: number;
  pct: number;
  first: string | null;
  last: string | null;
  wd: number;
  stage: { k: number; name: string };
  currentTaskName?: string;
  vs: string;
  vc: 'ok' | 'late' | 'wait' | '';
}