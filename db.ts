// db.ts - Hybrid DBService with IndexedDB Offline Fallback
const isSameHost = window.location.port === '3001' || window.location.port === '';
const API_BASE_URL = isSameHost ? '/api' : `http://${window.location.hostname}:3001/api`;

const DB_NAME = 'GestorPRO_OfflineDB';
const DB_VERSION = 1;
const STORES = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings', 'sellers'];

export class DBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getIDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB no está soportado en este entorno.'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
        throw new Error(error.message || 'Error en servidor');
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async init(): Promise<void> {
    try {
      await this.getIDB();
      console.log("IndexedDB offline preparado correctamente.");
    } catch (err) {
      console.warn("No se pudo inicializar IndexedDB:", err);
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const data = await this.request(`/${storeName}`);
      // Cache server data locally in IndexedDB
      this.idbSaveAll(storeName, data).catch(() => {});
      return data;
    } catch (serverErr) {
      console.warn(`[Servidor Offline] Cargando ${storeName} desde IndexedDB local.`);
      return this.idbGetAll<T>(storeName);
    }
  }

  async put<T>(storeName: string, item: any): Promise<void> {
    // Save locally first
    await this.idbPut(storeName, item);

    try {
      await this.request(`/${storeName}`, {
        method: 'POST',
        body: JSON.stringify(item),
      });
    } catch (serverErr) {
      console.warn(`[Servidor Offline] Registro guardado únicamente localmente en IndexedDB (${storeName}).`);
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    await this.idbDelete(storeName, id);

    try {
      await this.request(`/${storeName}/${id}`, {
        method: 'DELETE',
      });
    } catch (serverErr) {
      console.warn(`[Servidor Offline] Registro eliminado únicamente localmente en IndexedDB (${storeName}).`);
    }
  }

  async clearAllData(): Promise<void> {
    for (const store of STORES) {
      await this.idbClear(store);
    }

    try {
      await this.request('/system/reset', {
        method: 'POST',
      });
    } catch (serverErr) {
      console.warn("[Servidor Offline] Datos locales limpiados en IndexedDB.");
    }
  }

  async exportBackup(): Promise<string> {
    try {
      const data = await this.request('/system/backup');
      return JSON.stringify(data);
    } catch (serverErr) {
      const backup: Record<string, any[]> = {};
      for (const store of STORES) {
        backup[store] = await this.idbGetAll(store);
      }
      return JSON.stringify(backup);
    }
  }

  async importBackup(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    for (const store of STORES) {
      if (Array.isArray(data[store])) {
        await this.idbClear(store);
        for (const item of data[store]) {
          await this.idbPut(store, item);
        }
      }
    }

    try {
      await this.request('/system/restore', {
        method: 'POST',
        body: jsonString,
      });
    } catch (serverErr) {
      console.warn("[Servidor Offline] Respaldo restaurado en IndexedDB local.");
    }
  }

  // --- Helpers para IndexedDB ---

  private async idbGetAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async idbPut(storeName: string, item: any): Promise<void> {
    const db = await this.getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async idbSaveAll(storeName: string, items: any[]): Promise<void> {
    if (!Array.isArray(items)) return;
    const db = await this.getIDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => {
      if (item && item.id) store.put(item);
    });
  }

  private async idbDelete(storeName: string, id: string): Promise<void> {
    const db = await this.getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async idbClear(storeName: string): Promise<void> {
    const db = await this.getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DBService();
