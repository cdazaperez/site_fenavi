import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(process.env.DB_PATH || './data/importaciones.db');

export function initDatabase() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables with proper schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subpartida TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      arancel_base REAL NOT NULL DEFAULT 0,
      arancel_tlc REAL NOT NULL DEFAULT 0,
      iva REAL NOT NULL DEFAULT 0,
      categoria_desgravacion TEXT,
      contingente TEXT,
      notas TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS normatividad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('decreto', 'resolucion', 'circular', 'ley', 'otro')),
      numero TEXT NOT NULL,
      fecha TEXT NOT NULL,
      entidad TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      url_documento TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pasos_importacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      entidad_responsable TEXT,
      documentos_requeridos TEXT,
      tiempo_estimado TEXT,
      icono TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tlc_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seccion TEXT NOT NULL,
      titulo TEXT NOT NULL,
      contenido TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_productos_subpartida ON productos(subpartida);
    CREATE INDEX IF NOT EXISTS idx_normatividad_tipo ON normatividad(tipo);
    CREATE INDEX IF NOT EXISTS idx_normatividad_fecha ON normatividad(fecha);
    CREATE INDEX IF NOT EXISTS idx_pasos_orden ON pasos_importacion(orden);
  `);

  console.log('Database initialized successfully');
  return db;
}

// Run directly if called as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase();
}
