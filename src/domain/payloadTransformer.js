class IntegrationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'IntegrationError';
    this.statusCode = statusCode;
  }
}

/**
 * Transforma um payload de entrada baseado no dicionário de mapeamento configurado na rota.
 * Ex: mapping = { "AUFNR": "orderCode", "GAMNG": "plannedQty" }
 * input = { "AUFNR": "OP-10", "GAMNG": 500 } -> output = { "orderCode": "OP-10", "plannedQty": 500 }
 */
function transformPayload(rawPayload, fieldMapping) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new IntegrationError('Payload de entrada inválido: esperado um objeto JSON.', 400);
  }

  const mappingEntries = Object.entries(fieldMapping || {});
  if (mappingEntries.length === 0) {
    return { ...rawPayload };
  }

  const transformed = {};
  for (const [sourceKey, targetKey] of mappingEntries) {
    if (rawPayload[sourceKey] === undefined || rawPayload[sourceKey] === null) {
      throw new IntegrationError(`Campo obrigatório ausente no payload de origem: '${sourceKey}'`, 422);
    }
    transformed[targetKey] = rawPayload[sourceKey];
  }

  return transformed;
}

function validateRouteConfig({ slug, targetUrl, httpMethod }) {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw new IntegrationError('Slug inválido: use apenas letras minúsculas, números e hífens.', 400);
  }

  if (!targetUrl || !/^https?:\/\/.+/.test(targetUrl)) {
    throw new IntegrationError('targetUrl inválida: deve iniciar com http:// ou https://.', 400);
  }

  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH'];
  if (httpMethod && !allowedMethods.includes(httpMethod.toUpperCase())) {
    throw new IntegrationError(`Método HTTP não suportado: ${httpMethod}`, 400);
  }
}

module.exports = {
  IntegrationError,
  transformPayload,
  validateRouteConfig
};