const { Router } = require('express');
const { body } = require('express-validator');
const { login, register } = require('../services/authService');
const { validate } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and registration
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:  { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      res.json(login(req.body.email, req.body.password));
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string }
 *               password: { type: string, minLength: 6 }
 *               role:     { type: string, enum: [viewer, analyst, admin] }
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already registered }
 */
router.post('/register',
  authenticate,
  authorize('admin'),
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const user = register(name, email, password, role);
      res.status(201).json(user);
    } catch (e) { next(e); }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200: { description: Current user object }
 *       401: { description: Unauthenticated }
 */
router.get('/me', authenticate, (req, res) => res.json(req.user));

module.exports = router;
