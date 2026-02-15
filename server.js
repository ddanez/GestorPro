import express from 'express';
import sqlite3Lib from 'sqlite3';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configuración de rutas para ES Modules (__dirname no existe por defecto)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite3 = sqlite3Lib.verbose();
const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir la carpeta de producción (dist) si existe
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Conexión a Base de Datos SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err);
  } else {
    console.log('🗄️ Base de datos SQLite conectada correctamente');
  }
});

// Inicialización de Tablas (Asegura que todas existan, incluyendo sellers)
db.serialize(() => {
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings', 'sellers'];
  stores.forEach(store => {
    db.run(`CREATE TABLE IF NOT EXISTS ${store} (id TEXT PRIMARY KEY, data TEXT)`);
  });
});

// --- API ROUTES ---

app.get('/api/:store', (req, res) => {
  const { store } = req.params;
  db.all(`SELECT data FROM ${store}`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows.map(row => JSON.parse(row.data)));
  });
});

app.post('/api/:store', (req, res) => {
  const { store } = req.params;
  const item = req.body;
  if (!item.id) return res.status(400).json({ message: 'El campo ID es obligatorio' });
  
  db.run(`INSERT OR REPLACE INTO ${store} (id, data) VALUES (?, ?)`, [item.id, JSON.stringify(item)], (err) => {
    if (err) {
      console.error(`Error al guardar en ${store}:`, err);
      return res.status(500).json({ message: err.message });
    }
    res.json({ success: true });
  });
});

app.delete('/api/:store/:id', (req, res) => {
  const { store, id } = req.params;
  db.run(`DELETE FROM ${store} WHERE id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true });
  });
});

// --- SYSTEM ROUTES ---

app.post('/api/system/reset', (req, res) => {
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings', 'sellers'];
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    stores.forEach(store => db.run(`DELETE FROM ${store}`));
    db.run('COMMIT', (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ success: true });
    });
  });
});

app.get('/api/system/backup', async (req, res) => {
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings', 'sellers'];
  const backup = {};
  try {
    for (const store of stores) {
      const rows = await new Promise((resolve, reject) => {
        db.all(`SELECT data FROM ${store}`, [], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
      backup[store] = rows.map(r => JSON.parse(r.data));
    }
    res.json(backup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/system/restore', (req, res) => {
  const backupData = req.body;
  const stores = Object.keys(backupData);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      stores.forEach(store => {
        db.run(`DELETE FROM ${store}`);
        if (backupData[store]) {
          backupData[store].forEach(item => {
            db.run(`INSERT INTO ${store} (id, data) VALUES (?, ?)`, [item.id, JSON.stringify(item)]);
          });
        }
      });
      db.run('COMMIT');
      res.json({ success: true });
    } catch (err) {
      db.run('ROLLBACK');
      res.status(500).json({ message: err.message });
    }
  });
});

// Redirección para Single Page Application (React)
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('Frontend no encontrado. Asegúrate de ejecutar: npm run build');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVIDOR GESTORPRO INICIADO`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`📡 Red: http://0.0.0.0:${PORT}`);
  console.log(`📝 Modo: ES Modules (Node v25+)`);
});