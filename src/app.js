const variavelInutilizadaParaQuebrarLint = 123;
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
const repo = require('./repositories/routeRepository');
const gatewayService = require('./services/gatewayService');
const { IntegrationError } = require('./domain/payloadTransformer');

const app = express();
app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'MES.SI - Seamless Integration Gateway',
    status: 'UP'
  });
});

app.get('/admin/routes', async (req, res) => {
  const routes = await repo.listRoutes();
  res.status(200).json(routes);
});

app.post('/admin/routes', async (req, res) => {
  try {
    const route = await gatewayService.configureRoute(req.body);
    res.status(201).json(route);
  } catch (err) {
    const status = err instanceof IntegrationError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

app.post('/gateway/:slug', async (req, res) => {
  try {
    const result = await gatewayService.dispatchToMes(req.params.slug, req.body);
    res.status(200).json(result);
  } catch (err) {
    const status = err instanceof IntegrationError ? err.statusCode : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = app;