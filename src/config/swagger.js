const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description: 'Backend API for a finance dashboard with role-based access control.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            name:       { type: 'string' },
            email:      { type: 'string' },
            role:       { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
            status:     { type: 'string', enum: ['active', 'inactive'] },
            created_at: { type: 'string' },
          },
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            amount:     { type: 'number' },
            type:       { type: 'string', enum: ['income', 'expense'] },
            category:   { type: 'string' },
            date:       { type: 'string', format: 'date' },
            notes:      { type: 'string' },
            created_by: { type: 'integer' },
            created_at: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total:       { type: 'integer' },
            page:        { type: 'integer' },
            limit:       { type: 'integer' },
            total_pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
