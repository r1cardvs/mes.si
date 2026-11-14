class IntegrationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'IntegrationError';
    this.statusCode = statusCode;
  }
}

function getValueByPath(obj, path) {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function extractVariables(rawPayload, variablesConfig) {
  const extracted = {};

  for (const [varName, jsonPath] of Object.entries(variablesConfig || {})) {
    const value = getValueByPath(rawPayload, jsonPath);
    if (value === undefined || value === null) {
      throw new IntegrationError(`Caminho obrigatório não encontrado no JSON de origem: '${jsonPath}' (variável '${varName}')`, 422);
    }
    extracted[varName] = value;
  }

  return extracted;
}

function renderTemplate(template, extractedVars) {
  if (typeof template === 'string') {
    const exactMatch = template.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
    if (exactMatch) {
      const varName = exactMatch[1];
      if (!(varName in extractedVars)) {
        throw new IntegrationError(`Variável '${varName}' usada no template não foi mapeada.`, 422);
      }
      return extractedVars[varName];
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, varName) => {
      if (!(varName in extractedVars)) {
        throw new IntegrationError(`Variável '${varName}' usada no template não foi mapeada.`, 422);
      }
      return String(extractedVars[varName]);
    });
  }

  if (Array.isArray(template)) {
    return template.map((item) => renderTemplate(item, extractedVars));
  }

  if (template !== null && typeof template === 'object') {
    const built = {};
    for (const [key, val] of Object.entries(template)) {
      built[key] = renderTemplate(val, extractedVars);
    }
    return built;
  }

  return template;
}

function transformPayload(rawPayload, routeConfigOrMapping) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw new IntegrationError('Payload de entrada inválido: esperado um objeto JSON.', 400);
  }

  if (routeConfigOrMapping && routeConfigOrMapping.responseTemplate) {
    const extractedVars = extractVariables(rawPayload, routeConfigOrMapping.variables || {});
    return renderTemplate(routeConfigOrMapping.responseTemplate, extractedVars);
  }

  const fieldMapping = routeConfigOrMapping?.fieldMapping || routeConfigOrMapping || {};
  const mappingEntries = Object.entries(fieldMapping);
  if (mappingEntries.length === 0) {
    return { ...rawPayload };
  }

  const transformed = {};
  for (const [sourcePath, targetKey] of mappingEntries) {
    const value = getValueByPath(rawPayload, sourcePath);
    if (value === undefined || value === null) {
      throw new IntegrationError(`Campo obrigatório ausente no payload de origem: '${sourcePath}'`, 422);
    }
    transformed[targetKey] = value;
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
  getValueByPath,
  extractVariables,
  renderTemplate,
  transformPayload,
  validateRouteConfig
};