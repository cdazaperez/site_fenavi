import { Router } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = join(__dirname, '..', '..', 'views', 'pages');

const router = Router();

router.get('/', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'index.html'));
});

router.get('/paso-a-paso', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'paso-a-paso.html'));
});

router.get('/normatividad', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'normatividad.html'));
});

router.get('/tributos', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'tributos.html'));
});

router.get('/tlc', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'tlc.html'));
});

router.get('/admin-panel', (_req, res) => {
  res.sendFile(join(VIEWS_DIR, 'admin.html'));
});

export { router as pageRoutes };
