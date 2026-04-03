const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const { listUsers, getUser, updateUser, deleteUser } = require('../services/userService');

const router = Router();

// All user routes require auth
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users with optional filters (admin only)
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:       { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/',
  authorize('admin'),
  async (req, res, next) => {
    try { res.json(listUsers(req.query)); }
    catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID (admin, or own profile)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User object }
 *       404: { description: User not found }
 */
router.get('/:id',
  param('id').isInt({ min: 1 }), validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (req.user.role !== 'admin' && req.user.id !== id)
        return res.status(403).json({ error: 'Cannot access other users\' profiles' });
      res.json(getUser(id));
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin can change role/status; users can update own name/password)
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
 *               name:     { type: string }
 *               password: { type: string, minLength: 6 }
 *               role:     { type: string, enum: [viewer, analyst, admin] }
 *               status:   { type: string, enum: [active, inactive] }
 *     responses:
 *       200: { description: Updated user }
 */
router.patch('/:id',
  param('id').isInt({ min: 1 }),
  body('name').optional().trim().notEmpty(),
  body('password').optional().isLength({ min: 6 }),
  body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  body('status').optional().isIn(['active', 'inactive']),
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (req.user.role !== 'admin' && req.user.id !== id)
        return res.status(403).json({ error: 'Cannot modify other users' });
      res.json(updateUser(id, req.body, req.user));
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (admin only, soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User deactivated }
 */
router.delete('/:id',
  authorize('admin'),
  param('id').isInt({ min: 1 }), validate,
  async (req, res, next) => {
    try { res.json(deleteUser(parseInt(req.params.id))); }
    catch (e) { next(e); }
  }
);

module.exports = router;
