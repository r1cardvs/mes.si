const http = require('node:http');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/repositories/routeRepository');

describe('MES.SI - Integration Tests (API + PostgreSQL + HTTP Proxy)', () => {
  let mockMesServer;
  let mockMesPort;
  let lastReceivedByMes = null;

  beforeAll((done) => {
    // Sobe um servidor HTTP real simulando o MES Core destino
    mockMesServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        lastReceivedByMes = {
          method: req.method,
          url: req.url,
          body: body ? JSON.parse(body) : null
        };
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true, mesOrderId: 9010 }));
      });
    });

    mockMesServer.listen(0, '127.0.0.1', () => {
      mockMesPort = mockMesServer.address().port;
      done();
    });
  });

  beforeEach(async () => {
    lastReceivedByMes = null;
    await pool.query('TRUNCATE TABLE integration_logs, integration_routes RESTART IDENTITY CASCADE;');
  });

  afterAll(async () => {
    await pool.end();
    await new Promise((resolve) => mockMesServer.close(resolve));
  });

  test('Deve configurar rota no Postgres, acolher payload ERP, transformar e entregar ao MES', async () => {
    // 1. Configura rota estilo Apigee via API Admin apontando para o MES simulado
    const routeRes = await request(app)
      .post('/admin/routes')
      .send({
        slug: 'sap-order-in',
        name: 'Integração Ordem SAP -> MES Core',
        targetUrl: `http://127.0.0.1:${mockMesPort}/api/v1/orders`,
        httpMethod: 'POST',
        fieldMapping: {
          AUFNR: 'orderCode',
          GAMNG: 'plannedQty'
        }
      });

    expect(routeRes.statusCode).toBe(201);
    expect(routeRes.body.slug).toBe('sap-order-in');

    // 2. Dispara requisição bruta no Gateway (/gateway/sap-order-in)
    const gatewayRes = await request(app)
      .post('/gateway/sap-order-in')
      .send({
        AUFNR: 'OP-10',
        GAMNG: 250,
        EXTRA_SAP_FIELD: 'IGNORAR'
      });

    expect(gatewayRes.statusCode).toBe(200);
    expect(gatewayRes.body.gatewayStatus).toBe('DELIVERED');
    expect(gatewayRes.body.adaptedPayload).toEqual({
      orderCode: 'OP-10',
      plannedQty: 250
    });
    expect(gatewayRes.body.mesResponse).toEqual({ accepted: true, mesOrderId: 9010 });

    // 3. Confirma que o MES destino recebeu o contrato exato
    expect(lastReceivedByMes).toEqual({
      method: 'POST',
      url: '/api/v1/orders',
      body: {
        orderCode: 'OP-10',
        plannedQty: 250
      }
    });

    // 4. Verifica se o log de auditoria foi gravado no PostgreSQL
    const logsResult = await pool.query('SELECT * FROM integration_logs WHERE route_slug = $1', ['sap-order-in']);
    expect(logsResult.rows.length).toBe(1);
    expect(logsResult.rows[0].status_code).toBe(201);
  });

  test('Deve retornar 404 ao chamar slug não configurado', async () => {
    const res = await request(app)
      .post('/gateway/rota-fantasma')
      .send({ teste: 123 });

    expect(res.statusCode).toBe(404);
  });
});