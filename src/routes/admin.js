import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, param, validationResult } from 'express-validator';
import { generateToken, requireAuth, requireAdmin } from '../middleware/auth.js';

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
    return false;
  }
  return true;
}

function auditLog(db, userId, accion, tabla, registroId, datosAnteriores, datosNuevos) {
  db.prepare(`
    INSERT INTO audit_log (usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, accion, tabla, registroId,
    datosAnteriores ? JSON.stringify(datosAnteriores) : null,
    datosNuevos ? JSON.stringify(datosNuevos) : null
  );
}

export function adminRoutes(db) {
  const router = Router();

  // ──────────── AUTH ────────────

  router.post('/login',
    body('username').isString().trim().notEmpty(),
    body('password').isString().notEmpty(),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { username, password } = req.body;
      const user = db.prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1').get(username);

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      db.prepare('UPDATE usuarios SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

      const token = generateToken(user);
      res.json({
        token,
        user: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
      });
    }
  );

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, nombre, rol, last_login FROM usuarios WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  });

  // ──────────── PRODUCTOS CRUD ────────────

  router.get('/productos', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM productos ORDER BY subpartida ASC').all();
    res.json({ data: items });
  });

  router.post('/productos', requireAuth,
    body('subpartida').isString().trim().notEmpty(),
    body('descripcion').isString().trim().notEmpty(),
    body('arancel_base').isFloat({ min: 0 }),
    body('arancel_tlc').isFloat({ min: 0 }),
    body('iva').isFloat({ min: 0 }),
    body('categoria_desgravacion').optional().isString().trim(),
    body('contingente').optional().isString().trim(),
    body('notas').optional().isString().trim(),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { subpartida, descripcion, arancel_base, arancel_tlc, iva, categoria_desgravacion, contingente, notas } = req.body;
      const result = db.prepare(`
        INSERT INTO productos (subpartida, descripcion, arancel_base, arancel_tlc, iva, categoria_desgravacion, contingente, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(subpartida, descripcion, arancel_base, arancel_tlc, iva,
        categoria_desgravacion || null, contingente || null, notas || null);

      auditLog(db, req.user.id, 'crear', 'productos', result.lastInsertRowid, null, req.body);
      const created = db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(created);
    }
  );

  router.put('/productos/:id', requireAuth,
    param('id').isInt({ min: 1 }),
    body('subpartida').isString().trim().notEmpty(),
    body('descripcion').isString().trim().notEmpty(),
    body('arancel_base').isFloat({ min: 0 }),
    body('arancel_tlc').isFloat({ min: 0 }),
    body('iva').isFloat({ min: 0 }),
    body('categoria_desgravacion').optional({ values: 'null' }).isString().trim(),
    body('contingente').optional({ values: 'null' }).isString().trim(),
    body('notas').optional({ values: 'null' }).isString().trim(),
    body('activo').optional().isInt({ min: 0, max: 1 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      const existing = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

      const { subpartida, descripcion, arancel_base, arancel_tlc, iva, categoria_desgravacion, contingente, notas, activo } = req.body;
      db.prepare(`
        UPDATE productos SET subpartida=?, descripcion=?, arancel_base=?, arancel_tlc=?, iva=?,
          categoria_desgravacion=?, contingente=?, notas=?, activo=?, updated_at=datetime('now')
        WHERE id=?
      `).run(subpartida, descripcion, arancel_base, arancel_tlc, iva,
        categoria_desgravacion || null, contingente || null, notas || null,
        activo !== undefined ? activo : existing.activo, id);

      auditLog(db, req.user.id, 'actualizar', 'productos', id, existing, req.body);
      const updated = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
      res.json(updated);
    }
  );

  router.delete('/productos/:id', requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

    const existing = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

    db.prepare('DELETE FROM productos WHERE id = ?').run(id);
    auditLog(db, req.user.id, 'eliminar', 'productos', id, existing, null);
    res.json({ message: 'Producto eliminado' });
  });

  // ──────────── NORMATIVIDAD CRUD ────────────

  router.get('/normatividad', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM normatividad ORDER BY fecha DESC').all();
    res.json({ data: items });
  });

  router.post('/normatividad', requireAuth,
    body('tipo').isIn(['decreto', 'resolucion', 'circular', 'ley', 'otro']),
    body('numero').isString().trim().notEmpty(),
    body('fecha').isISO8601(),
    body('entidad').isString().trim().notEmpty(),
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').optional().isString().trim(),
    body('url_documento').optional().isString().trim(),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { tipo, numero, fecha, entidad, titulo, descripcion, url_documento } = req.body;
      const result = db.prepare(`
        INSERT INTO normatividad (tipo, numero, fecha, entidad, titulo, descripcion, url_documento)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tipo, numero, fecha, entidad, titulo, descripcion || null, url_documento || null);

      auditLog(db, req.user.id, 'crear', 'normatividad', result.lastInsertRowid, null, req.body);
      const created = db.prepare('SELECT * FROM normatividad WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(created);
    }
  );

  router.put('/normatividad/:id', requireAuth,
    param('id').isInt({ min: 1 }),
    body('tipo').isIn(['decreto', 'resolucion', 'circular', 'ley', 'otro']),
    body('numero').isString().trim().notEmpty(),
    body('fecha').isISO8601(),
    body('entidad').isString().trim().notEmpty(),
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').optional({ values: 'null' }).isString().trim(),
    body('url_documento').optional({ values: 'null' }).isString().trim(),
    body('activo').optional().isInt({ min: 0, max: 1 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      const existing = db.prepare('SELECT * FROM normatividad WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Norma no encontrada' });

      const { tipo, numero, fecha, entidad, titulo, descripcion, url_documento, activo } = req.body;
      db.prepare(`
        UPDATE normatividad SET tipo=?, numero=?, fecha=?, entidad=?, titulo=?, descripcion=?, url_documento=?, activo=?
        WHERE id=?
      `).run(tipo, numero, fecha, entidad, titulo, descripcion || null, url_documento || null,
        activo !== undefined ? activo : existing.activo, id);

      auditLog(db, req.user.id, 'actualizar', 'normatividad', id, existing, req.body);
      const updated = db.prepare('SELECT * FROM normatividad WHERE id = ?').get(id);
      res.json(updated);
    }
  );

  router.delete('/normatividad/:id', requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

    const existing = db.prepare('SELECT * FROM normatividad WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Norma no encontrada' });

    db.prepare('DELETE FROM normatividad WHERE id = ?').run(id);
    auditLog(db, req.user.id, 'eliminar', 'normatividad', id, existing, null);
    res.json({ message: 'Norma eliminada' });
  });

  // ──────────── PASOS CRUD ────────────

  router.get('/pasos', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM pasos_importacion ORDER BY orden ASC').all();
    res.json({ data: items });
  });

  router.post('/pasos', requireAuth,
    body('orden').isInt({ min: 1 }),
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').isString().trim().notEmpty(),
    body('entidad_responsable').optional().isString().trim(),
    body('documentos_requeridos').optional().isString().trim(),
    body('tiempo_estimado').optional().isString().trim(),
    body('icono').optional().isString().trim(),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { orden, titulo, descripcion, entidad_responsable, documentos_requeridos, tiempo_estimado, icono } = req.body;
      const result = db.prepare(`
        INSERT INTO pasos_importacion (orden, titulo, descripcion, entidad_responsable, documentos_requeridos, tiempo_estimado, icono)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orden, titulo, descripcion, entidad_responsable || null,
        documentos_requeridos || null, tiempo_estimado || null, icono || null);

      auditLog(db, req.user.id, 'crear', 'pasos_importacion', result.lastInsertRowid, null, req.body);
      const created = db.prepare('SELECT * FROM pasos_importacion WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(created);
    }
  );

  router.put('/pasos/:id', requireAuth,
    param('id').isInt({ min: 1 }),
    body('orden').isInt({ min: 1 }),
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').isString().trim().notEmpty(),
    body('entidad_responsable').optional({ values: 'null' }).isString().trim(),
    body('documentos_requeridos').optional({ values: 'null' }).isString().trim(),
    body('tiempo_estimado').optional({ values: 'null' }).isString().trim(),
    body('icono').optional({ values: 'null' }).isString().trim(),
    body('activo').optional().isInt({ min: 0, max: 1 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      const existing = db.prepare('SELECT * FROM pasos_importacion WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Paso no encontrado' });

      const { orden, titulo, descripcion, entidad_responsable, documentos_requeridos, tiempo_estimado, icono, activo } = req.body;
      db.prepare(`
        UPDATE pasos_importacion SET orden=?, titulo=?, descripcion=?, entidad_responsable=?,
          documentos_requeridos=?, tiempo_estimado=?, icono=?, activo=?
        WHERE id=?
      `).run(orden, titulo, descripcion, entidad_responsable || null,
        documentos_requeridos || null, tiempo_estimado || null, icono || null,
        activo !== undefined ? activo : existing.activo, id);

      auditLog(db, req.user.id, 'actualizar', 'pasos_importacion', id, existing, req.body);
      const updated = db.prepare('SELECT * FROM pasos_importacion WHERE id = ?').get(id);
      res.json(updated);
    }
  );

  router.delete('/pasos/:id', requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

    const existing = db.prepare('SELECT * FROM pasos_importacion WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Paso no encontrado' });

    db.prepare('DELETE FROM pasos_importacion WHERE id = ?').run(id);
    auditLog(db, req.user.id, 'eliminar', 'pasos_importacion', id, existing, null);
    res.json({ message: 'Paso eliminado' });
  });

  // ──────────── TLC CRUD ────────────

  router.get('/tlc', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM tlc_info ORDER BY orden ASC').all();
    res.json({ data: items });
  });

  router.post('/tlc', requireAuth,
    body('seccion').isString().trim().notEmpty(),
    body('titulo').isString().trim().notEmpty(),
    body('contenido').isString().trim().notEmpty(),
    body('orden').isInt({ min: 0 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { seccion, titulo, contenido, orden } = req.body;
      const result = db.prepare(`
        INSERT INTO tlc_info (seccion, titulo, contenido, orden) VALUES (?, ?, ?, ?)
      `).run(seccion, titulo, contenido, orden);

      auditLog(db, req.user.id, 'crear', 'tlc_info', result.lastInsertRowid, null, req.body);
      const created = db.prepare('SELECT * FROM tlc_info WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(created);
    }
  );

  router.put('/tlc/:id', requireAuth,
    param('id').isInt({ min: 1 }),
    body('seccion').isString().trim().notEmpty(),
    body('titulo').isString().trim().notEmpty(),
    body('contenido').isString().trim().notEmpty(),
    body('orden').isInt({ min: 0 }),
    body('activo').optional().isInt({ min: 0, max: 1 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      const existing = db.prepare('SELECT * FROM tlc_info WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Registro TLC no encontrado' });

      const { seccion, titulo, contenido, orden, activo } = req.body;
      db.prepare('UPDATE tlc_info SET seccion=?, titulo=?, contenido=?, orden=?, activo=? WHERE id=?')
        .run(seccion, titulo, contenido, orden, activo !== undefined ? activo : existing.activo, id);

      auditLog(db, req.user.id, 'actualizar', 'tlc_info', id, existing, req.body);
      const updated = db.prepare('SELECT * FROM tlc_info WHERE id = ?').get(id);
      res.json(updated);
    }
  );

  router.delete('/tlc/:id', requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

    const existing = db.prepare('SELECT * FROM tlc_info WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Registro TLC no encontrado' });

    db.prepare('DELETE FROM tlc_info WHERE id = ?').run(id);
    auditLog(db, req.user.id, 'eliminar', 'tlc_info', id, existing, null);
    res.json({ message: 'Registro TLC eliminado' });
  });

  // ──────────── DOCUMENTOS CRUD ────────────

  router.get('/documentos', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM documentos ORDER BY categoria, created_at DESC').all();
    res.json({ data: items });
  });

  router.post('/documentos', requireAuth,
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').optional().isString().trim(),
    body('categoria').isIn(['guia', 'manual', 'normativa', 'formato', 'general']),
    body('nombre_archivo').isString().trim().notEmpty(),
    body('url_archivo').isString().trim().notEmpty(),
    body('tamano').optional().isString().trim(),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { titulo, descripcion, categoria, nombre_archivo, url_archivo, tamano } = req.body;
      const result = db.prepare(`
        INSERT INTO documentos (titulo, descripcion, categoria, nombre_archivo, url_archivo, tamano)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(titulo, descripcion || null, categoria, nombre_archivo, url_archivo, tamano || null);

      auditLog(db, req.user.id, 'crear', 'documentos', result.lastInsertRowid, null, req.body);
      const created = db.prepare('SELECT * FROM documentos WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(created);
    }
  );

  router.put('/documentos/:id', requireAuth,
    param('id').isInt({ min: 1 }),
    body('titulo').isString().trim().notEmpty(),
    body('descripcion').optional({ values: 'null' }).isString().trim(),
    body('categoria').isIn(['guia', 'manual', 'normativa', 'formato', 'general']),
    body('nombre_archivo').isString().trim().notEmpty(),
    body('url_archivo').isString().trim().notEmpty(),
    body('tamano').optional({ values: 'null' }).isString().trim(),
    body('activo').optional().isInt({ min: 0, max: 1 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      const existing = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Documento no encontrado' });

      const { titulo, descripcion, categoria, nombre_archivo, url_archivo, tamano, activo } = req.body;
      db.prepare(`
        UPDATE documentos SET titulo=?, descripcion=?, categoria=?, nombre_archivo=?, url_archivo=?, tamano=?, activo=?
        WHERE id=?
      `).run(titulo, descripcion || null, categoria, nombre_archivo, url_archivo, tamano || null,
        activo !== undefined ? activo : existing.activo, id);

      auditLog(db, req.user.id, 'actualizar', 'documentos', id, existing, req.body);
      const updated = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id);
      res.json(updated);
    }
  );

  router.delete('/documentos/:id', requireAuth, requireAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

    const existing = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Documento no encontrado' });

    db.prepare('DELETE FROM documentos WHERE id = ?').run(id);
    auditLog(db, req.user.id, 'eliminar', 'documentos', id, existing, null);
    res.json({ message: 'Documento eliminado' });
  });

  // ──────────── USUARIOS (admin only) ────────────

  router.get('/usuarios', requireAuth, requireAdmin, (req, res) => {
    const items = db.prepare('SELECT id, username, nombre, rol, activo, created_at, last_login FROM usuarios ORDER BY id ASC').all();
    res.json({ data: items });
  });

  router.post('/usuarios', requireAuth, requireAdmin,
    body('username').isString().trim().isLength({ min: 3, max: 50 }),
    body('password').isString().isLength({ min: 8 }),
    body('nombre').isString().trim().notEmpty(),
    body('rol').isIn(['admin', 'editor']),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const { username, password, nombre, rol } = req.body;
      const exists = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
      if (exists) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

      const passwordHash = bcrypt.hashSync(password, 12);
      const result = db.prepare('INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
        .run(username, passwordHash, nombre, rol);

      auditLog(db, req.user.id, 'crear', 'usuarios', result.lastInsertRowid, null, { username, nombre, rol });
      res.status(201).json({ id: result.lastInsertRowid, username, nombre, rol });
    }
  );

  router.put('/usuarios/:id/password', requireAuth,
    param('id').isInt({ min: 1 }),
    body('password').isString().isLength({ min: 8 }),
    (req, res) => {
      if (!handleValidation(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (req.user.rol !== 'admin' && req.user.id !== id) {
        return res.status(403).json({ error: 'Solo puede cambiar su propia contraseña' });
      }

      const user = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const passwordHash = bcrypt.hashSync(req.body.password, 12);
      db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, id);
      auditLog(db, req.user.id, 'cambiar_password', 'usuarios', id, null, null);
      res.json({ message: 'Contraseña actualizada' });
    }
  );

  // ──────────── AUDIT LOG (admin only) ────────────

  router.get('/audit', requireAuth, requireAdmin, (req, res) => {
    const items = db.prepare(`
      SELECT a.*, u.username, u.nombre as usuario_nombre
      FROM audit_log a
      JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();
    res.json({ data: items });
  });

  return router;
}
