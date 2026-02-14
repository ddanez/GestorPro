
const DB_NAME = 'DDanezGestorProDB';
const DB_VERSION = 1;

export class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
    });
  }

  private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    return this.db!.transaction(name, mode).objectStore(name);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    try {
      if (!this.db) await this.init();
      if (this.db) {
        const storeNames = Array.from(this.db.objectStoreNames);
        if (storeNames.length > 0) {
          const transaction = this.db.transaction(storeNames, 'readwrite');
          storeNames.forEach(name => {
            transaction.objectStore(name).clear();
          });
          await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          });
        }
        this.db.close();
        this.db = null;
      }
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
      });
    } catch (error) {
      console.error("Error clearing DB:", error);
    }
  }

  async exportBackup(): Promise<string> {
    if (!this.db) await this.init();
    const backup: any = {};
    const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
    
    for (const storeName of stores) {
      backup[storeName] = await this.getAll(storeName);
    }
    
    return JSON.stringify(backup);
  }

  async importBackup(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);
      if (!this.db) await this.init();
      
      const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
      
      for (const storeName of stores) {
        if (data[storeName]) {
          const store = await this.getStore(storeName, 'readwrite');
          for (const item of data[storeName]) {
            store.put(item);
          }
        }
      }
    } catch (error) {
      throw new Error("El archivo de respaldo no es válido.");
    }
  }
}

export const dbService = new DBService();
