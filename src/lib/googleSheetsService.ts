import { Holiday, Project } from './types';
import { costOf, norm, summ, compute } from './trackerLogic';

const SPREADSHEET_TITLE = 'Launch Tracker Database';
const CACHE_KEY_PROJECTS = 'launch_tracker_projects_cache';
const CACHE_KEY_HOLIDAYS = 'launch_tracker_holidays_cache';
const CACHE_KEY_SHEET_ID = 'launch_tracker_sheet_id';

export interface SyncState {
  isSynced: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  error: string | null;
}

const PROJECT_HEADERS = [
  'ID',
  'Project Name',
  'Category',
  'Status',
  'Owner',
  'Factory',
  'Start Date',
  'Launch Target',
  'Quantity',
  'Pack Spec',
  'Pack Note',
  'Benefit Brief',
  'Formula Version',
  'Unit Cost (THB)',
  'Total Batch Cost (THB)',
  'Progress %',
  'Est. Delivery',
  'Raw Data JSON',
  'Updated At',
  'Rev',
];

const HOLIDAY_HEADERS = ['ID', 'Date', 'Name'];

export class GoogleSheetsService {
  private static cachedSpreadsheetId: string | null =
    localStorage.getItem(CACHE_KEY_SHEET_ID) || null;

  static getSpreadsheetId(): string | null {
    return this.cachedSpreadsheetId;
  }

  static getSpreadsheetUrl(): string | null {
    return this.cachedSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${this.cachedSpreadsheetId}/edit`
      : null;
  }

  // Find existing spreadsheet or create a new one
  static async getOrCreateSpreadsheet(accessToken: string): Promise<string> {
    if (this.cachedSpreadsheetId) {
      try {
        const verifyRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.cachedSpreadsheetId}?fields=spreadsheetId,properties.title`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (verifyRes.ok) {
          return this.cachedSpreadsheetId;
        }
      } catch {
        // Fall back to searching
      }
    }

    // Search Google Drive for spreadsheet with title
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        SPREADSHEET_TITLE
      )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id, name, webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const sheetId = data.files[0].id;
        this.cachedSpreadsheetId = sheetId;
        localStorage.setItem(CACHE_KEY_SHEET_ID, sheetId);
        return sheetId;
      }
    }

    // Create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: SPREADSHEET_TITLE },
        sheets: [
          {
            properties: {
              title: 'Projects',
              gridProperties: { frozenRowCount: 1 },
            },
          },
          {
            properties: {
              title: 'Holidays',
              gridProperties: { frozenRowCount: 1 },
            },
          },
          {
            properties: {
              title: 'Meta',
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
    }

    const newSheet = await createRes.json();
    const sheetId = newSheet.spreadsheetId;
    this.cachedSpreadsheetId = sheetId;
    localStorage.setItem(CACHE_KEY_SHEET_ID, sheetId);

    // Set Header rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Projects!A1:T1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [PROJECT_HEADERS] }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Holidays!A1:C1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [HOLIDAY_HEADERS] }),
      }
    );

    return sheetId;
  }

  // Load all projects from Google Sheets
  static async loadProjects(
    accessToken: string,
    sheetId: string
  ): Promise<Project[]> {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Projects!A2:T`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to read projects from Google Sheets');
    }

    const data = await res.json();
    const rows = data.values || [];
    const projects: Project[] = [];

    for (const row of rows) {
      if (!row || !row[0]) continue;
      const rawJson = row[17];
      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          // Sync any direct sheet modifications back to properties
          if (row[1]) parsed.name = row[1];
          if (row[2]) parsed.category = row[2];
          if (row[3]) parsed.status = row[3];
          if (row[4]) parsed.owner = row[4];
          if (row[5]) parsed.factory = row[5];
          if (row[6]) parsed.startDate = row[6];
          if (row[7]) parsed.launchTarget = row[7];
          if (row[8]) parsed.qty = row[8];
          if (row[9]) parsed.pack = row[9];
          if (row[10]) parsed.packNote = row[10];
          if (row[11]) parsed.benefit = row[11];
          projects.push(norm(parsed));
          continue;
        } catch {
          // JSON parse failed, fall through to minimal object
        }
      }

      // Minimal project fallback if raw JSON wasn't present
      const p = norm({
        id: row[0],
        name: row[1] || 'Untitled Project',
        category: (row[2] as any) || 'อาหารเสริม',
        status: (row[3] as any) || 'กำลังดำเนินการ',
        owner: row[4] || '',
        factory: row[5] || '',
        startDate: row[6] || '',
        launchTarget: row[7] || '',
        qty: row[8] || '',
        pack: row[9] || '',
        packNote: row[10] || '',
        benefit: row[11] || '',
        ingredients: [],
        tests: [],
        formulas: [],
        chosenFormula: '',
        packaging: [],
        other: [],
        docs: [],
        phases: [],
        createdAt: Date.now(),
        rev: Number(row[19]) || 0,
      });
      projects.push(p);
    }

    // Cache locally
    localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(projects));
    return projects;
  }

  // Load holidays from Google Sheets
  static async loadHolidays(
    accessToken: string,
    sheetId: string
  ): Promise<Holiday[]> {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Holidays!A2:C`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const rows = data.values || [];
    const holidays: Holiday[] = rows
      .filter((r: string[]) => r && r[0] && r[1])
      .map((r: string[]) => ({
        id: r[0],
        date: r[1],
        name: r[2] || '',
      }));

    localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));
    return holidays;
  }

  // Save all projects to Google Sheets
  static async saveAllProjects(
    accessToken: string,
    sheetId: string,
    projects: Project[],
    holidaysSet?: Set<string>
  ): Promise<void> {
    // Format rows
    const rows = projects.map((p) => {
      const co = costOf(p);
      const cs = compute(p, holidaysSet);
      const s = summ(p, cs, co, holidaysSet);

      const f =
        p.formulas.find((x) => x.id === p.chosenFormula) ||
        p.formulas[p.formulas.length - 1];

      return [
        p.id,
        p.name,
        p.category,
        p.status,
        p.owner,
        p.factory,
        p.startDate,
        p.launchTarget,
        p.qty,
        p.pack,
        p.packNote,
        p.benefit,
        f?.ver || '',
        co.unit ? Number(co.unit.toFixed(2)) : '',
        co.batch ? Number(co.batch.toFixed(2)) : '',
        s.pct,
        s.last || '',
        JSON.stringify(p),
        new Date().toISOString(),
        p.rev || 0,
      ];
    });

    // Clear old project values up to row 500 to keep clean
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Projects!A2:T500:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (rows.length > 0) {
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Projects!A2:T${
          rows.length + 1
        }?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error?.message || 'Failed to write projects to Google Sheets');
      }
    }

    localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(projects));
  }

  // Save holidays to Google Sheets
  static async saveHolidays(
    accessToken: string,
    sheetId: string,
    holidays: Holiday[]
  ): Promise<void> {
    const rows = holidays.map((h) => [h.id, h.date, h.name]);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Holidays!A2:C200:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (rows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Holidays!A2:C${
          rows.length + 1
        }?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }
      );
    }

    localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));
  }

  // Local storage cache readers
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
