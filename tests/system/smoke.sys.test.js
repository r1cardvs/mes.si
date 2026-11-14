const axios = require('axios');

const BASE_URL = process.env.SYSTEM_TEST_URL || 'http://localhost:3000';

describe('MES.SI - System Tests (End-to-End Environment Verification)', () => {
  test('Healthcheck do ambiente deve responder UP com status 200', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      service: 'MES.SI - Seamless Integration Gateway',
      status: 'UP'
    });
  });

  test('Deve cadastrar e listar uma rota de telemetria ponta a ponta no ambiente ativo', async () => {
    const uniqueSlug = `sensor-temp-${Date.now()}`;

    const createRes = await axios.post(`${BASE_URL}/admin/routes`, {
      slug: uniqueSlug,
      name: 'Telemetria Linha Envase',
      targetUrl: 'https://httpbin.org/post',
      httpMethod: 'POST',
      fieldMapping: {
        temp_c: 'temperatureCelsius'
      }
    });

    expect(createRes.status).toBe(201);

    const listRes = await axios.get(`${BASE_URL}/admin/routes`);
    const found = listRes.data.some((r) => r.slug === uniqueSlug);
    expect(found).toBe(true);
  });
});