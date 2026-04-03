const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../services/recordService');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial record management
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: List financial records with filtering and pagination (all roles)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: min_amount
 *         schema: { type: number }
 *       - in: query
 *         name: max_amount
 *         schema: { type: number }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Full-text search in notes and category
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated financial records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:       { type: array, items: { $ref: '#/components/schemas/FinancialRecord' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/', async (req, res, next) => {
  try { res.json(listRecords(req.query, req.user)); }
  catch (e) { next(e); }
});

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a single record by ID (all roles)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Financial record }
 *       404: { description: Not found }
 */
router.get('/:id',
  param('id').isInt({ min: 1 }), validate,
  async (req, res, next) => {
    try { res.json(getRecord(parseInt(req.params.id))); }
    catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/records:
 *   post:
 *     tags: [Records]
 *     summary: Create a financial record (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:   { type: number, example: 1500.00 }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string, example: Salary }
 *               date:     { type: string, format: date, example: "2024-06-01" }
 *               notes:    { type: string }
 *     responses:
 *       201: { description: Created record }
 */
router.post('/',
  authorize('admin'),
  body('amount').isFloat({ gt: 0 }),
  body('type').isIn(['income', 'expense']),
  body('category').trim().notEmpty(),
  body('date').isDate(),
  body('notes').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const record = createRecord(req.body, req.user.id);
      res.status(201).json(record);
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:   { type: number }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date:     { type: string, format: date }
 *               notes:    { type: string }
 *     responses:
 *       200: { description: Updated record }
 */
router.patch('/:id',
  authorize('admin'),
  param('id').isInt({ min: 1 }),
  body('amount').optional().isFloat({ gt: 0 }),
  body('type').optional().isIn(['income', 'expense']),
  body('category').optional().trim().notEmpty(),
  body('date').optional().isDate(),
  body('notes').optional().trim(),
  validate,
  async (req, res, next) => {
    try { res.json(updateRecord(parseInt(req.params.id), req.body)); }
    catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft-delete a financial record (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Record deleted (soft) }
 */
router.delete('/:id',
  authorize('admin'),
  param('id').isInt({ min: 1 }), validate,
  async (req, res, next) => {
    try { res.json(deleteRecord(parseInt(req.params.id))); }
    catch (e) { next(e); }
  }
);

module.exports = router;
