
// db.ts - Versión Cliente para Servidor Termux
// Si la app se sirve desde el mismo puerto que la API, usamos rutas relativas
const isSameHost = window.location.port === '3001' || window.location.port === '';
const API_BASE_URL = isSameHost ? '/api' : `http://${window.location.hostname}:3001/api`;

export class DBService {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en la petición');
      }
      return response.json();
    } catch (err) {
      console.error("Error en DBService:", err);
      throw err;
    }
  }

  async init(): Promise<void> {
    console.log("Conectado al servidor de datos en Termux mediante:", API_BASE_URL);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.request(`/${storeName}`);
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    return this.request(`/${storeName}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return this.request(`/${storeName}/${id}`, {
      method: 'DELETE',
    });
  }

  async clearAllData(): Promise<void> {
    return this.request('/system/reset', {
      method: 'POST',
    });
  }

  async exportBackup(): Promise<string> {
    const data = await this.request('/system/backup');
    return JSON.stringify(data);
  }

  async importBackup(jsonString: string): Promise<void> {
    return this.request('/system/restore', {
      method: 'POST',
      body: jsonString,
    });
  }
}

export const dbService = new DBService();
