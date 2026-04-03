const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getSummary, getMonthlyTrends, getWeeklyTrends } = require('../services/dashboardService');

const router = Router();
router.use(authenticate);
// Viewers cannot access analytics — analyst and admin only
router.use(authorize('analyst', 'admin'));

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated analytics (analyst + admin)
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get income, expenses, net balance, and category breakdown
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Summary object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_income:   { type: number }
 *                     total_expenses: { type: number }
 *                     net_balance:    { type: number }
 *                     total_records:  { type: integer }
 *                 by_category:     { type: array }
 *                 recent_activity: { type: array }
 */
router.get('/summary', async (req, res, next) => {
  try { res.json(getSummary(req.query)); }
  catch (e) { next(e); }
});

/**
 * @swagger
 * /api/dashboard/trends/monthly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly income vs expenses for a given year
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2024 }
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get('/trends/monthly', async (req, res, next) => {
  try { res.json(getMonthlyTrends(req.query.year)); }
  catch (e) { next(e); }
});

/**
 * @swagger
 * /api/dashboard/trends/weekly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Weekly income vs expenses for the last 12 weeks
 *     responses:
 *       200:
 *         description: Weekly trend data
 */
router.get('/trends/weekly', async (req, res, next) => {
  try { res.json(getWeeklyTrends()); }
  catch (e) { next(e); }
});

module.exports = router;
