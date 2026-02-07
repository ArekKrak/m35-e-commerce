const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Ecommerce REST API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'connect.sid' }
      }
    }
  },
  apis: [path.join(__dirname, './*.routes.js')], // scans all route files for JSDoc @openapi blocks
});

module.exports = swaggerSpec;
