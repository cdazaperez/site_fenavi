import { Router } from 'express';
import { query, validationResult } from 'express-validator';

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, '').trim().slice(0, 200);
}

export function apiRoutes(db) {
  const router = Router();

  // GET /api/productos - List products with optional search
  router.get('/productos',
    query('buscar').optional().isString().trim().escape(),
    query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Parámetros inválidos', details: errors.array() });
      }

      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;
      const buscar = req.query.buscar ? sanitizeInput(req.query.buscar) : null;

      let stmt;
      let countStmt;
      let params;

      if (buscar) {
        stmt = db.prepare(`
          SELECT * FROM productos
          WHERE activo = 1 AND (subpartida LIKE ? OR descripcion LIKE ?)
          ORDER BY subpartida ASC
          LIMIT ? OFFSET ?
        `);
        countStmt = db.prepare(`
          SELECT COUNT(*) as total FROM productos
          WHERE activo = 1 AND (subpartida LIKE ? OR descripcion LIKE ?)
        `);
        const searchTerm = `%${buscar}%`;
        params = [searchTerm, searchTerm, limit, offset];
        const { total } = countStmt.get(searchTerm, searchTerm);
        const items = stmt.all(...params);
        return res.json({ data: items, total, page, limit });
      }

      stmt = db.prepare(`
        SELECT * FROM productos WHERE activo = 1
        ORDER BY subpartida ASC LIMIT ? OFFSET ?
      `);
      countStmt = db.prepare('SELECT COUNT(*) as total FROM productos WHERE activo = 1');
      const { total } = countStmt.get();
      const items = stmt.all(limit, offset);
      res.json({ data: items, total, page, limit });
    }
  );

  // GET /api/productos/:id - Get single product
  router.get('/productos/:id',
    (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id < 1) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const stmt = db.prepare('SELECT * FROM productos WHERE id = ? AND activo = 1');
      const producto = stmt.get(id);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(producto);
    }
  );

  // GET /api/normatividad - List regulations
  router.get('/normatividad',
    query('tipo').optional().isIn(['decreto', 'resolucion', 'circular', 'ley', 'otro']),
    query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Parámetros inválidos', details: errors.array() });
      }

      const page = req.query.page || 1;
      const limit = 20;
      const offset = (page - 1) * limit;
      const tipo = req.query.tipo || null;

      if (tipo) {
        const stmt = db.prepare(`
          SELECT * FROM normatividad WHERE activo = 1 AND tipo = ?
          ORDER BY fecha DESC LIMIT ? OFFSET ?
        `);
        const countStmt = db.prepare('SELECT COUNT(*) as total FROM normatividad WHERE activo = 1 AND tipo = ?');
        const { total } = countStmt.get(tipo);
        const items = stmt.all(tipo, limit, offset);
        return res.json({ data: items, total, page, limit });
      }

      const stmt = db.prepare('SELECT * FROM normatividad WHERE activo = 1 ORDER BY fecha DESC LIMIT ? OFFSET ?');
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM normatividad WHERE activo = 1');
      const { total } = countStmt.get();
      const items = stmt.all(limit, offset);
      res.json({ data: items, total, page, limit });
    }
  );

  // GET /api/pasos - Get import steps
  router.get('/pasos', (_req, res) => {
    const stmt = db.prepare('SELECT * FROM pasos_importacion WHERE activo = 1 ORDER BY orden ASC');
    const items = stmt.all();
    res.json({ data: items });
  });

  // GET /api/tlc - Get TLC info
  router.get('/tlc',
    query('seccion').optional().isString().trim(),
    (req, res) => {
      const seccion = req.query.seccion ? sanitizeInput(req.query.seccion) : null;

      if (seccion) {
        const stmt = db.prepare('SELECT * FROM tlc_info WHERE activo = 1 AND seccion = ? ORDER BY orden ASC');
        const items = stmt.all(seccion);
        return res.json({ data: items });
      }

      const stmt = db.prepare('SELECT * FROM tlc_info WHERE activo = 1 ORDER BY orden ASC');
      const items = stmt.all();
      res.json({ data: items });
    }
  );

  // GET /api/documentos - List documents
  router.get('/documentos',
    query('categoria').optional().isIn(['guia', 'manual', 'normativa', 'formato', 'general']),
    (req, res) => {
      const categoria = req.query.categoria || null;
      if (categoria) {
        const items = db.prepare('SELECT * FROM documentos WHERE activo = 1 AND categoria = ? ORDER BY created_at DESC').all(categoria);
        return res.json({ data: items });
      }
      const items = db.prepare('SELECT * FROM documentos WHERE activo = 1 ORDER BY categoria, created_at DESC').all();
      res.json({ data: items });
    }
  );

  // GET /api/calcular-tributos - Calculate import taxes
  router.get('/calcular-tributos',
    query('subpartida').notEmpty().isString().trim(),
    query('valor_cif').notEmpty().isFloat({ min: 0 }),
    query('peso_kg').optional().isFloat({ min: 0 }),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Parámetros inválidos', details: errors.array() });
      }

      const subpartida = sanitizeInput(req.query.subpartida);
      const valorCif = parseFloat(req.query.valor_cif);

      const producto = db.prepare('SELECT * FROM productos WHERE subpartida = ? AND activo = 1').get(subpartida);
      if (!producto) {
        return res.status(404).json({ error: 'Subpartida no encontrada' });
      }

      const arancelTlc = valorCif * (producto.arancel_tlc / 100);
      const baseIva = valorCif + arancelTlc;
      const iva = baseIva * (producto.iva / 100);
      const totalTributos = arancelTlc + iva;

      res.json({
        producto: producto.descripcion,
        subpartida: producto.subpartida,
        valor_cif: valorCif,
        arancel_base_pct: producto.arancel_base,
        arancel_tlc_pct: producto.arancel_tlc,
        arancel_tlc_valor: Math.round(arancelTlc * 100) / 100,
        iva_pct: producto.iva,
        iva_valor: Math.round(iva * 100) / 100,
        total_tributos: Math.round(totalTributos * 100) / 100,
        total_importacion: Math.round((valorCif + totalTributos) * 100) / 100,
        categoria_desgravacion: producto.categoria_desgravacion,
        contingente: producto.contingente,
        notas: producto.notas,
      });
    }
  );

  return router;
}
