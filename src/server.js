import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db/init.js';
import { pageRoutes } from './routes/pages.js';
import { apiRoutes } from './routes/api.js';
import { adminRoutes } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// CORS - restrictive
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://importaciones.fenavi.org']
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, por favor intente más tarde.' },
});
app.use('/api/', limiter);

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Static files with cache control
app.use(express.static(join(ROOT_DIR, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// Initialize database
const db = initDatabase();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login, intente más tarde.' },
});
app.use('/admin/login', authLimiter);

// Routes
app.use('/', pageRoutes);
app.use('/api', apiRoutes(db));
app.use('/admin', adminRoutes(db));

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(join(ROOT_DIR, 'views', 'pages', '404.html'));
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`FENAVI Importaciones running on http://localhost:${PORT}`);
});

export default app;
