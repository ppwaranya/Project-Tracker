import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from './auth';
import { Holiday, Project } from './types';
import { norm } from './trackerLogic';

const PROJECTS_COLLECTION = 'projects';
const SETTINGS_COLLECTION = 'settings';
const HOLIDAYS_DOCUMENT = 'holidays';
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
