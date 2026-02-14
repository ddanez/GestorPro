
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
// En Termux, la base de datos se guardará en la misma carpeta del proyecto
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Prioridad: Servir la app web compilada (Carpeta dist)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log("✅ Carpeta 'dist' detectada. Sirviendo interfaz web.");
} else {
    console.warn("⚠️ Advertencia: No se encontró la carpeta 'dist'. ¿Olvidaste ejecutar 'npm run build'?");
}

// 2. Conexión a Base de Datos SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error fatal al abrir base de datos:', err);
    process.exit(1);
  }
  else console.log('🗄️  SQLite activo en:', DB_PATH);
});

// Inicialización de Tablas
db.serialize(() => {
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
  stores.forEach(store => {
    db.run(`CREATE TABLE IF NOT EXISTS ${store} (id TEXT PRIMARY KEY, data TEXT)`, (err) => {
        if(err) console.error(`Error creando tabla ${store}:`, err);
    });
  });
});

// --- API ROUTES ---

app.get('/api/:store', (req, res) => {
  const { store } = req.params;
  const validStores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
  if (!validStores.includes(store)) return res.status(400).json({ message: 'Almacén no válido' });

  db.all(`SELECT data FROM ${store}`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows.map(row => JSON.parse(row.data)));
  });
});

app.post('/api/:store', (req, res) => {
  const { store } = req.params;
  const item = req.body;
  if (!item.id) return res.status(400).json({ message: 'El objeto debe tener un ID' });
  
  const data = JSON.stringify(item);
  db.run(`INSERT OR REPLACE INTO ${store} (id, data) VALUES (?, ?)`, [item.id, data], (err) => {
    if (err) return res.status(500).json({ message: err.message });
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
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    stores.forEach(store => db.run(`DELETE FROM ${store}`));
    db.run('COMMIT', (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ success: true, message: "Base de datos vaciada con éxito" });
    });
  });
});

app.get('/api/system/backup', async (req, res) => {
  const stores = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'settings'];
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

// Manejar navegación de React (Single Page Application)
app.get('*', (req, res) => {
  const indexFile = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("Error: Interfaz no compilada. Ejecuta 'npm run build' en la terminal.");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 SISTEMA INICIADO CORRECTAMENTE
  ----------------------------------------------
  Puerto local:  3001
  Acceso local:  http://localhost:${PORT}
  Acceso WiFi:   Usa la IP de tu celular con :${PORT}
  ----------------------------------------------
  Presiona Ctrl+C para apagar.
  `);
});
