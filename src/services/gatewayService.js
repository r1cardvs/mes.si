const axios = require('axios');
const repo = require('../repositories/routeRepository');
const { transformPayload, validateRouteConfig, IntegrationError } = require('../domain/payloadTransformer');

async function configureRoute(routeData) {
  validateRouteConfig(routeData);
  return repo.createRoute(routeData);
}

async function dispatchToMes(slug, rawPayload) {
  const start = Date.now();
  const route = await repo.findRouteBySlug(slug);

  if (!route) {
    throw new IntegrationError(`Rota de integração '${slug}' não encontrada.`, 404);
  }

  if (!route.active) {
    throw new IntegrationError(`Rota de integração '${slug}' está desativada.`, 403);
  }

  const adaptedPayload = transformPayload(rawPayload, {
    fieldMapping: route.field_mapping,
    variables: route.variables,
    responseTemplate: route.response_template
  });

  try {
    const response = await axios({
      method: route.http_method,
      url: route.target_url,
      data: adaptedPayload,
      timeout: 5000
    });

    const durationMs = Date.now() - start;

    await repo.saveIntegrationLog({
      routeSlug: slug,
      requestPayload: rawPayload,
      transformedPayload: adaptedPayload,
      statusCode: response.status,
      durationMs
    });

    return {
      gatewayStatus: 'DELIVERED',
      route: slug,
      adaptedPayload,
      mesResponse: response.data
    };
  } catch (err) {
    const statusCode = err.response?.status || 502;
    const durationMs = Date.now() - start;

    await repo.saveIntegrationLog({
      routeSlug: slug,
      requestPayload: rawPayload,
      transformedPayload: adaptedPayload,
      statusCode,
      durationMs
    });

    throw new IntegrationError(
      `Falha ao encaminhar para o MES destino (${route.target_url}): ${err.message}`,
      statusCode
    );
  }
}

module.exports = {
  configureRoute,
  dispatchToMes
};