const express      = require('express');
const swaggerUi    = require('swagger-ui-express');
const swaggerSpec  = require('./config/swagger');
const { initDb }   = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const recordRoutes    = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Finance Dashboard API',
}));

app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/records',   recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use(errorHandler);

// Initialise DB first, then start listening
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀  Finance Backend running at http://localhost:${PORT}`);
    console.log(`📖  Swagger docs:          http://localhost:${PORT}/api/docs\n`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

module.exports = app;