import { Holiday, Project } from './types';
import { norm } from './trackerLogic';

// URL ของ Google Apps Script (/exec) ของคุณ
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbySLdEBAgqzskXBdOKl1Fr5xRupoJqfXpPH2L4V7gWzV7vEgPewCyA36X0rBlKqf6Gs/exec';

const CACHE_KEY_PROJECTS = 'launch_tracker_projects_cache';
const CACHE_KEY_HOLIDAYS = 'launch_tracker_holidays_cache';

export interface SyncState {
  isSynced: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  error: string | null;
}

export interface ProjectImageRecord {
  projectId: string;
  module: 'benchmark' | 'formulation' | 'packaging';
  itemId: string;
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
}

export class GoogleSheetsService {
  static getSpreadsheetId(): string | null {
    return 'google-apps-script';
  }

  static getSpreadsheetUrl(): string | null {
    return APPS_SCRIPT_URL;
  }

  static async getOrCreateSpreadsheet(_accessToken?: string): Promise<string> {
    return 'google-apps-script';
  }

  // ดึงข้อมูลรูปภาพทั้งหมดจากแท็บ Project_Images
  static async loadProjectImages(): Promise<ProjectImageRecord[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=images&t=${Date.now()}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (json && json.status === 'success' && Array.isArray(json.data)) {
        return json.data;
      }
      return [];
    } catch (e) {
      console.warn('Load project images failed:', e);
      return [];
    }
  }

// อัปโหลดรูปภาพเข้า Google Drive และบันทึกลงชีต Project_Images
  static async uploadImageToDrive(params: {
    projectId: string;
    module: 'benchmark' | 'formulation' | 'packaging';
    itemId: string;
    base64Data: string;
    fileName: string;
    mimeType?: string;
  }): Promise<string> {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'uploadImage',
        ...params,
      }),
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Apps Script ตอบกลับผิดรูปแบบ (โปรดเช็กการ Deploy New Version)');
    }

    if (json.status !== 'success' || !json.imageUrl) {
      throw new Error(json.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
    }

    return json.imageUrl;
  }

  // ลบรูปภาพออกจาก Google Drive และแท็บ Project_Images
  static async deleteImageFromDrive(imageUrl: string): Promise<void> {
    if (!imageUrl || !imageUrl.startsWith('http')) return;
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteImage',
        imageUrl,
      }),
    });
  }

  // ดึงข้อมูลโครงการ พร้อมรวมรูปภาพจากชีต Project_Images เข้ากับทุกส่วน
  static async loadProjects(_accessToken?: string, _sheetId?: string): Promise<Project[]> {
    try {
      const [projRes, imageRecords] = await Promise.all([
        fetch(`${APPS_SCRIPT_URL}?type=projects&t=${Date.now()}`),
        this.loadProjectImages(),
      ]);

      if (!projRes.ok) throw new Error('Network response was not ok');
      const json = await projRes.json();

      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        const normalized: Project[] = json.data.map(norm);

        // นำรูปภาพจากแท็บ Project_Images มาผูกเข้ากับแต่ละ Project, Formula และ Packaging
        const merged = normalized.map((proj) => {
          const projImgs = imageRecords.filter((r) => r.projectId === proj.id);

          // 1. Benchmark Images
          const bmUrls = projImgs
            .filter((r) => r.module === 'benchmark')
            .map((r) => r.imageUrl);
          if (bmUrls.length > 0) {
            const existingBm = (proj.benchmark?.images || []).filter((u) => !u.startsWith('data:'));
            proj.benchmark = {
              ...(proj.benchmark || { name: '', description: '', images: [] }),
              images: Array.from(new Set([...existingBm, ...bmUrls])),
            };
          }

          // 2. Formulation Images
          proj.formulas = (proj.formulas || []).map((f) => {
            const fUrls = projImgs
              .filter((r) => r.module === 'formulation' && r.itemId === f.id)
              .map((r) => r.imageUrl);
            const existingF = (f.images || []).filter((u) => !u.startsWith('data:'));
            return {
              ...f,
              images: Array.from(new Set([...existingF, ...fUrls])),
            };
          });

          // 3. Packaging Images
          proj.packaging = (proj.packaging || []).map((pkg) => {
            const pUrls = projImgs
              .filter((r) => r.module === 'packaging' && r.itemId === pkg.id)
              .map((r) => r.imageUrl);
            const existingP = (pkg.images || []).filter((u) => !u.startsWith('data:'));
            return {
              ...pkg,
              images: Array.from(new Set([...existingP, ...pUrls])),
            };
          });

          return proj;
        });

        localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(merged));
        return merged;
      }
      return this.getLocalProjects() || [];
    } catch (e) {
      console.warn('Load projects fallback to local:', e);
      return this.getLocalProjects() || [];
    }
  }

  // ดึงข้อมูลวันหยุด
  static async loadHolidays(_accessToken?: string, _sheetId?: string): Promise<Holiday[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=holidays&t=${Date.now()}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const json = await res.json();
      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(json.data));
        return json.data;
      }
      return this.getLocalHolidays() || [];
    } catch (e) {
      console.warn('Load holidays fallback to local:', e);
      return this.getLocalHolidays() || [];
    }
  }

  // บันทึกโครงการลง Google Sheets (ล้าง Base64 ที่ยาวเกินไปออกเพื่อไม่ให้ช่อง A2 พัง)
  static async saveAllProjects(
    _accessToken?: string,
    _sheetId?: string,
    projects: Project[] = [],
    _holidaysSet?: Set<string>
  ): Promise<void> {
    localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(projects));

    // กรองเฉพาะ URL ที่เป็นลิงก์จริงขึ้นช่อง A2 ของชีตหลัก ป้องกันตัวอักษรเกิน 50,000 ตัว
    const sanitizedProjects = projects.map((p) => ({
      ...p,
      benchmark: p.benchmark
        ? {
            ...p.benchmark,
            images: (p.benchmark.images || []).filter((u) => !u.startsWith('data:')),
          }
        : undefined,
      formulas: (p.formulas || []).map((f) => ({
        ...f,
        images: (f.images || []).filter((u) => !u.startsWith('data:')),
      })),
      packaging: (p.packaging || []).map((pkg) => ({
        ...pkg,
        images: (pkg.images || []).filter((u) => !u.startsWith('data:')),
      })),
    }));

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ type: 'projects', data: sanitizedProjects }),
    });
  }

  // บันทึกวันหยุดลง Google Sheets
  static async saveHolidays(
    _accessToken?: string,
    _sheetId?: string,
    holidays: Holiday[] = []
  ): Promise<void> {
    localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ type: 'holidays', data: holidays }),
    });
  }

  static getLocalProjects(): Project[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEY_PROJECTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed.map(norm);
      }
    } catch {}
    return null;
  }

  static getLocalHolidays(): Holiday[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEY_HOLIDAYS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  }
}