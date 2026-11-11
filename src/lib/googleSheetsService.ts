import { Holiday, Project } from './types';
import { norm } from './trackerLogic';

// นำ URL ที่ลงท้ายด้วย /exec จาก Google Apps Script มาวางในเครื่องหมายคำพูดนี้
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

  static async loadProjects(_accessToken?: string, _sheetId?: string): Promise<Project[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=projects`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        const normalized = json.data.map(norm);
        localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(normalized));
        return normalized;
      }
      return this.getLocalProjects() || [];
    } catch {
      return this.getLocalProjects() || [];
    }
  }

  static async loadHolidays(_accessToken?: string, _sheetId?: string): Promise<Holiday[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=holidays`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(json.data));
        return json.data;
      }
      return this.getLocalHolidays() || [];
    } catch {
      return this.getLocalHolidays() || [];
    }
  }

  static async saveAllProjects(
    _accessToken?: string,
    _sheetId?: string,
    projects: Project[] = [],
    _holidaysSet?: Set<string>
  ): Promise<void> {
    localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(projects));

    // ส่งแบบ text/plain เพื่อเลี่ยงการตรวจ CORS Preflight
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ type: 'projects', data: projects }),
    });

    if (!res.ok) {
      throw new Error(`Server status: ${res.status}`);
    }

    const json = await res.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'Failed to save to Google Sheets');
    }
  }

  static async saveHolidays(
    _accessToken?: string,
    _sheetId?: string,
    holidays: Holiday[] = []
  ): Promise<void> {
    localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ type: 'holidays', data: holidays }),
    });

    if (!res.ok) {
      throw new Error(`Server status: ${res.status}`);
    }

    const json = await res.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'Failed to save holidays to Google Sheets');
    }
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