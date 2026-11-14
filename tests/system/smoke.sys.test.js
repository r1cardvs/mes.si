const axios = require('axios');

const BASE_URL = process.env.SYSTEM_TEST_URL || 'http://localhost:3000';

describe('MES.SI - System / E2E Tests (Live Docker Environment)', () => {
  test('Healthcheck e Swagger UI devem responder no container ativo', async () => {
    const healthRes = await axios.get(`${BASE_URL}/health`);
    expect(healthRes.status).toBe(200);
    expect(healthRes.data).toEqual({
      service: 'MES.SI - Seamless Integration Gateway',
      status: 'UP'
    });

    const docsRes = await axios.get(`${BASE_URL}/docs/`);
    expect(docsRes.status).toBe(200);
    expect(docsRes.data).toContain('Swagger UI');
  });

  test('Fluxo ponta a ponta com extração por caminho e template de resposta', async () => {
    const uniqueSlug = `sys-e2e-${Date.now()}`;

    const createRes = await axios.post(`${BASE_URL}/admin/routes`, {
      slug: uniqueSlug,
      name: 'System E2E Route',
      targetUrl: `${BASE_URL}/health`,
      httpMethod: 'GET',
      variables: {
        ordem: 'header.id'
      },
      responseTemplate: {
        orderId: '{{ordem}}'
      },
      outputVariables: {
        serviceStatus: 'status'
      },
      outputTemplate: {
        gatewayHealth: '{{serviceStatus}}'
      }
    });

    expect(createRes.status).toBe(201);

    const execRes = await axios.post(`${BASE_URL}/gateway/${uniqueSlug}`, {
      header: { id: 'E2E-10' }
    });

    expect(execRes.status).toBe(200);
    expect(execRes.data.gatewayStatus).toBe('DELIVERED');
    expect(execRes.data.adaptedRequest).toEqual({ orderId: 'E2E-10' });
    expect(execRes.data.adaptedResponse).toEqual({ gatewayHealth: 'UP' });
  });
});