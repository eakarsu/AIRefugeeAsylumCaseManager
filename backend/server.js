const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');
const pool = require('./config/database');
const { fireWebhook } = require('./services/webhooks');

const app = express();
const PORT = process.env.BACKEND_PORT || 3085;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3084,http://localhost:3085,http://localhost:3000')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth (public)
app.use('/api/auth', require('./routes/auth'));

// Everything below requires a Bearer token
app.use('/api', authenticateToken);

// 18 CRUD entity routes — refugee/asylum domain
app.use('/api/clients',                require('./routes/clients'));
app.use('/api/cases',                  require('./routes/cases'));
app.use('/api/hearings',               require('./routes/hearings'));
app.use('/api/dossiers',               require('./routes/dossiers'));
app.use('/api/country-of-origin-info', require('./routes/countryOfOriginInfo'));
app.use('/api/immigration-forms',      require('./routes/immigrationForms'));
app.use('/api/evidence-docs',          require('./routes/evidenceDocs'));
app.use('/api/expert-witnesses',       require('./routes/expertWitnesses'));
app.use('/api/interpreters',           require('./routes/interpreters'));
app.use('/api/attorneys',              require('./routes/attorneys'));
app.use('/api/paralegals',             require('./routes/paralegals'));
app.use('/api/partner-orgs',           require('./routes/partnerOrgs'));
app.use('/api/asylum-grants',          require('./routes/asylumGrants'));
app.use('/api/deportation-orders',     require('./routes/deportationOrders'));
app.use('/api/family-members',         require('./routes/familyMembers'));
app.use('/api/sponsors',               require('./routes/sponsors'));
app.use('/api/court-calendars',        require('./routes/courtCalendars'));
app.use('/api/audit-log',              require('./routes/auditLog'));

// AI routes (16 sub-endpoints + history under /api/ai)
app.use('/api/ai', require('./routes/ai'));

// Cross-cutting
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments',   require('./routes/attachments'));
app.use('/api/webhooks',      require('./routes/webhooks'));

// Dashboard stats
app.use('/api/dashboard', require('./routes/dashboard'));

// Custom analytics views (Case Analytics)
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => {
  console.log(`\nAI Refugee/Asylum Case Manager API running on http://localhost:${PORT}\n`);
});
