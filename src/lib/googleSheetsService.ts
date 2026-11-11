import { Project, Holiday } from './types';

// วาง Web App URL ที่ได้จากการ Deploy Apps Script ตรงนี้
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbySLdEBAgqzskXBdOKl1Fr5xRupoJqfXpPH2L4V7gWzV7vEgPewCyA36X0rBlKqf6Gs/exec';

const LOCAL_KEY_PROJECTS = 'launch_tracker_projects_cache';
const LOCAL_KEY_HOLIDAYS = 'launch_tracker_holidays_cache';

export interface SyncState {
  isSynced: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  error: string | null;
}

export const GoogleSheetsService = {
  getSpreadsheetId(): string | null {
    return 'google-apps-script';
  },

  getSpreadsheetUrl(): string | null {
    return APPS_SCRIPT_URL;
  },

  getLocalProjects(): Project[] {
    try {
      const data = localStorage.getItem(LOCAL_KEY_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getLocalHolidays(): Holiday[] {
    try {
      const data = localStorage.getItem(LOCAL_KEY_HOLIDAYS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async getOrCreateSpreadsheet(_accessToken?: string): Promise<string> {
    return 'google-apps-script';
  },

  async loadProjects(_accessToken?: string, _sheetId?: string): Promise<Project[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=projects`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(LOCAL_KEY_PROJECTS, JSON.stringify(json.data));
        return json.data;
      }
      return this.getLocalProjects();
    } catch (e) {
      return this.getLocalProjects();
    }
  },

  async loadHolidays(_accessToken?: string, _sheetId?: string): Promise<Holiday[]> {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=holidays`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(LOCAL_KEY_HOLIDAYS, JSON.stringify(json.data));
        return json.data;
      }
      return this.getLocalHolidays();
    } catch (e) {
      return this.getLocalHolidays();
    }
  },

  async saveAllProjects(
    _accessToken: string,
    _sheetId: string,
    projects: Project[],
    _holidaysSet?: Set<string>
  ): Promise<void> {
    localStorage.setItem(LOCAL_KEY_PROJECTS, JSON.stringify(projects));
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'projects', data: projects }),
    });
    const json = await res.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'Failed to save to Google Sheets');
    }
  },

  async saveHolidays(
    _accessToken: string,
    _sheetId: string,
    holidays: Holiday[]
  ): Promise<void> {
    localStorage.setItem(LOCAL_KEY_HOLIDAYS, JSON.stringify(holidays));
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'holidays', data: holidays }),
    });
    const json = await res.json();
    if (json.status !== 'success') {
      throw new Error(json.message || 'Failed to save holidays to Google Sheets');
    }
  },
};