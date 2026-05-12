import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
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

    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT NOT NULL DEFAULT 'general' CHECK(categoria IN ('guia', 'manual', 'normativa', 'formato', 'general')),
      nombre_archivo TEXT NOT NULL,
      url_archivo TEXT NOT NULL,
      tamano TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'editor' CHECK(rol IN ('admin', 'editor')),
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      tabla TEXT NOT NULL,
      registro_id INTEGER,
      datos_anteriores TEXT,
      datos_nuevos TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE INDEX IF NOT EXISTS idx_productos_subpartida ON productos(subpartida);
    CREATE INDEX IF NOT EXISTS idx_normatividad_tipo ON normatividad(tipo);
    CREATE INDEX IF NOT EXISTS idx_normatividad_fecha ON normatividad(fecha);
    CREATE INDEX IF NOT EXISTS idx_pasos_orden ON pasos_importacion(orden);
    CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tabla ON audit_log(tabla);
  `);

  // Auto-create default admin user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
  if (userCount.count === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';
    const hash = bcrypt.hashSync(defaultPassword, 12);
    db.prepare('INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
      .run('admin', hash, 'Administrador', 'admin');
    console.log('Default admin user created (user: admin)');
  }

  console.log('Database initialized successfully');
  return db;
}

// Run directly if called as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase();
}
