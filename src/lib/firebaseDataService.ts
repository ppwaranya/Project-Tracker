import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './auth';
import { Holiday, Project } from './types';
import { norm } from './trackerLogic';
import { GoogleSheetsService } from './googleSheetsService';

const PROJECTS_COLLECTION = 'projects';
const SETTINGS_COLLECTION = 'settings';
const HOLIDAYS_DOCUMENT = 'holidays';
const DATABASE_DOCUMENT = 'database';
const CACHE_KEY_PROJECTS = 'launch_tracker_projects_cache';
const CACHE_KEY_HOLIDAYS = 'launch_tracker_holidays_cache';

const removeUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) clean[key] = removeUndefined(item);
    }
    return clean as T;
  }
  return value;
};

export interface SyncState {
  isSynced: boolean;
  isSyncing: boolean;
  isInitialized: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

export class FirebaseDataService {
  static subscribeToProjects(
    onProjects: (projects: Project[]) => void,
    onError: (error: Error) => void
  ): () => void {
    return onSnapshot(
      collection(db, PROJECTS_COLLECTION),
      (snapshot) => {
        const projects = snapshot.docs
          .map((item) =>
            norm({ ...item.data(), id: item.id } as Project)
          )
          .sort((a, b) => b.createdAt - a.createdAt);
        localStorage.setItem(CACHE_KEY_PROJECTS, JSON.stringify(projects));
        onProjects(projects);
      },
      onError
    );
  }

  static subscribeToHolidays(
    onHolidays: (holidays: Holiday[]) => void,
    onError: (error: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, SETTINGS_COLLECTION, HOLIDAYS_DOCUMENT),
      (snapshot) => {
        const items = snapshot.data()?.items;
        const holidays = Array.isArray(items) ? (items as Holiday[]) : [];
        localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));
        onHolidays(holidays);
      },
      onError
    );
  }

  static subscribeToDatabaseStatus(
    onStatus: (isInitialized: boolean) => void,
    onError: (error: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, SETTINGS_COLLECTION, DATABASE_DOCUMENT),
      (snapshot) => {
        onStatus(snapshot.data()?.initialized === true);
      },
      onError
    );
  }

  static async saveProjectChanges(
    projects: Project[],
    deletedIds: string[]
  ): Promise<void> {
    const operations = [
      ...projects.map((project) => ({ id: project.id, project })),
      ...deletedIds.map((id) => ({ id, project: null })),
    ];

    for (let offset = 0; offset < operations.length; offset += 450) {
      const batch = writeBatch(db);
      for (const operation of operations.slice(offset, offset + 450)) {
        const projectRef = doc(db, PROJECTS_COLLECTION, operation.id);
        if (operation.project) {
          batch.set(
            projectRef,
            removeUndefined(operation.project) as DocumentData
          );
        } else {
          batch.delete(projectRef);
        }
      }
      await batch.commit();
    }
  }

  static async saveHolidays(holidays: Holiday[]): Promise<void> {
    await setDoc(doc(db, SETTINGS_COLLECTION, HOLIDAYS_DOCUMENT), {
      items: holidays,
    });
    localStorage.setItem(CACHE_KEY_HOLIDAYS, JSON.stringify(holidays));
  }

  static async importInitialData(
    projects: Project[],
    holidays: Holiday[]
  ): Promise<boolean> {
    const databaseRef = doc(db, SETTINGS_COLLECTION, DATABASE_DOCUMENT);
    const existingDatabase = await getDoc(databaseRef);
    if (existingDatabase.data()?.initialized === true) return false;

    const failedImport = existingDatabase.data()?.importFailedAt != null;
    if (!failedImport) {
      const existingProjects = await getDocs(collection(db, PROJECTS_COLLECTION));
      if (existingProjects.size > 0) {
        throw new Error(
          'Firebase already contains project data. The Google Sheets import was stopped to avoid overwriting it.'
        );
      }
    }

    const importClaim = await runTransaction(db, async (transaction) => {
      const databaseSnapshot = await transaction.get(databaseRef);
      if (databaseSnapshot.data()?.initialized === true) {
        return { acquired: false, failedImport: false };
      }
      if (databaseSnapshot.exists() && databaseSnapshot.data()?.importing === true) {
        throw new Error('A Google Sheets import is already in progress.');
      }

      transaction.set(databaseRef, {
        initialized: false,
        importing: true,
        importStartedAt: Date.now(),
        importFailedAt: null,
      });
      return { acquired: true, failedImport };
    });

    if (!importClaim.acquired) return false;

    try {
      if (importClaim.failedImport) {
        const partialProjects = await getDocs(collection(db, PROJECTS_COLLECTION));
        await this.saveProjectChanges(
          [],
          partialProjects.docs.map((project) => project.id)
        );
      }

      await this.saveProjectChanges(projects, []);
      await this.saveHolidays(holidays);
      await setDoc(databaseRef, {
        initialized: true,
        importing: false,
        importedAt: Date.now(),
        source: 'google-sheets',
      });
      return true;
    } catch (error) {
      await setDoc(
        databaseRef,
        { initialized: false, importing: false, importFailedAt: Date.now() },
        { merge: true }
      );
      throw error;
    }
  }

  static async importFromGoogleSheets(accessToken: string): Promise<boolean> {
    const spreadsheetId = GoogleSheetsService.getMigrationSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error(
        'Set VITE_GOOGLE_SHEETS_ID to the existing spreadsheet ID before importing.'
      );
    }

    const [projects, holidays] = await Promise.all([
      GoogleSheetsService.loadProjects(accessToken, spreadsheetId),
      GoogleSheetsService.loadHolidays(accessToken, spreadsheetId),
    ]);

    return this.importInitialData(projects, holidays);
  }

  static getLocalProjects(): Project[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEY_PROJECTS);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.map(norm) : null;
    } catch {
      return null;
    }
  }

  static getLocalHolidays(): Holiday[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEY_HOLIDAYS);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
