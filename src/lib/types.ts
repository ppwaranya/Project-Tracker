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

export interface Formula {
  id: string;
  ver: string;
  code?: string;
  date: string;
  changes: string;
  steps: StepPrice[];
  note: string;
  ingredients?: Ingredient[]; // Formula-specific ingredient breakdown
  images?: string[]; // Multiple sample images
  imageNote?: string;
  isConfirmed?: boolean; // Confirmed formulation for commercial production
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
  note: string;
  images?: string[]; // Multiple packaging images/mockups
  plateCost?: string | number; // Color plate / mold cost (amortized per unit)
  leadTime?: string; // Production lead time
  paymentTerm?: string; // Payment terms
  warrantyTerms?: string; // Warranty / claims terms
  selectedForCost?: boolean; // Selected for cost calculation
  status?: PackagingStatus;
}

export interface OtherCostItem {
  id: string;
  name: string;
  unit: string; // Custom allocation unit e.g. Per Piece, Per Trip, Per Lot, Per Kg, Per Box
  amount: string | number;
  times?: string | number;
  note: string;
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
  images?: string[]; // Multiple benchmark reference images
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
  lotNo?: string; // Production Lot #
  fdaNo?: string; // FDA / Regulatory Registration Number (เลขที่ อย. / เลขจดแจ้ง)
  owner: string;
  factory: string;
  startDate: string;
  launchTarget: string;
  qty: string | number;
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
  phases: Phase[];
  createdAt: number;
  updatedAt?: number;
  rev: number;
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
  q: number;
  f: Formula;
  fp: number;
  fhas: boolean;
  pk: number;
  ot: number;
  plateTotal: number;
  platePerUnit: number;
  unit: number;
  batch: number;
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
