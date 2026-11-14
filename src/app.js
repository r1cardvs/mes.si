// src/app.js
const express = require('express');
const repo = require('./repositories/routeRepository');
const gatewayService = require('./services/gatewayService');
const { IntegrationError } = require('./domain/payloadTransformer');

const app = express();
app.use(express.json());

// Healthcheck para Teste de Sistema e Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'MES.SI - Seamless Integration Gateway',
    status: 'UP'
  });
});

// Administração de Rotas (Configuração estilo Apigee)
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

// Gateway Dinâmico: acolhe payload externo, adapta e envia para o MES
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