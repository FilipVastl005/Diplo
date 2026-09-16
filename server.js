'use strict';

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');

const tenantMiddleware    = require('./middleware/tenant');
const { authenticateToken } = require('./middleware/auth');
const { loginLimiter, apiLimiter } = require('./middleware/security');

const authRouter          = require('./routes/auth');
const dashboardRouter     = require('./routes/dashboard');
const notificationsRouter = require('./routes/notifications');
const gradesRouter        = require('./routes/grades');
const scheduleRouter      = require('./routes/schedule');
const eventsRouter        = require('./routes/events');
const chatRouter          = require('./routes/chat');
const adminRouter         = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// Trust Cloudflare Proxy
app.set('trust proxy', true);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
    }
  }
}));

app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Apply tenant extraction
app.use(tenantMiddleware);

// Apex Domain Routing
app.use((req, res, next) => {
  if (req.isApex) {
    if (req.path === '/') return res.render('apex', { pageTitle: 'Vitejte v Diplo' });
    return res.status(404).send('Stranka nenalezena');
  }
  if (!req.tenant) {
    return res.status(400).send('Neplatna skola (tenant nenalezen)');
  }
  next();
});

// Rate limiting
app.use('/login', loginLimiter);
app.use('/chat/api', apiLimiter);

// Public routes
app.use('/', authRouter);

// Protected routes
app.use('/', authenticateToken, dashboardRouter);
app.use('/notifikace', authenticateToken, notificationsRouter);
app.use('/znamky', authenticateToken, gradesRouter);
app.use('/rozvrh', authenticateToken, scheduleRouter);
app.use('/udalosti', authenticateToken, eventsRouter);
app.use('/chat', authenticateToken, chatRouter);
app.use('/admin', authenticateToken, adminRouter);

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    user: req.user || null,
    todaySubjects: [],
    error: { status: 404, message: 'Stranka nebyla nalezena.' }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    user: req.user || null,
    todaySubjects: [],
    error: { status: err.status || 500, message: 'Interni chyba serveru.' }
  });
});

// Boot
app.listen(PORT, () => {
  console.log(`Diplo is running at http://localhost:${PORT}`);
  console.log(`Apex domain accessible. Tenant databases will be initialized on first access.`);
});
