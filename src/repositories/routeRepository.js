const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://mes_user:mes_pass@localhost:5432/mes_si'
});

async function createRoute({
  slug,
  name,
  targetUrl,
  httpMethod = 'POST',
  fieldMapping = {},
  variables = {},
  responseTemplate = null,
  outputVariables = {},
  outputTemplate = null
}) {
  const { rows } = await pool.query(
    `INSERT INTO integration_routes (
      slug, name, target_url, http_method, field_mapping,
      variables, response_template, output_variables, output_template
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      slug,
      name,
      targetUrl,
      httpMethod.toUpperCase(),
      JSON.stringify(fieldMapping),
      JSON.stringify(variables),
      responseTemplate ? JSON.stringify(responseTemplate) : null,
      JSON.stringify(outputVariables),
      outputTemplate ? JSON.stringify(outputTemplate) : null
    ]
  );
  return rows[0];
}

async function listRoutes() {
  const { rows } = await pool.query('SELECT * FROM integration_routes ORDER BY id ASC');
  return rows;
}

async function findRouteBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM integration_routes WHERE slug = $1',
    [slug]
  );
  return rows[0];
}

async function saveIntegrationLog({ routeSlug, requestPayload, transformedPayload, statusCode, durationMs }) {
  await pool.query(
    `INSERT INTO integration_logs (route_slug, request_payload, transformed_payload, status_code, duration_ms)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      routeSlug,
      JSON.stringify(requestPayload),
      JSON.stringify(transformedPayload),
      statusCode,
      durationMs
    ]
  );
}

module.exports = {
  pool,
  createRoute,
  listRoutes,
  findRouteBySlug,
  saveIntegrationLog
};