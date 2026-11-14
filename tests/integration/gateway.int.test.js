const http = require('node:http');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/repositories/routeRepository');

describe('MES.SI - Integration Tests (API + PostgreSQL + HTTP Proxy)', () => {
  let mockMesServer;
  let mockMesPort;
  let lastReceivedByMes = null;

  beforeAll((done) => {
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
        res.end(
          JSON.stringify({
            mesInternalId: 'MES-9910',
            executionStatus: 'SCHEDULED',
            workCenter: {
              estimatedMinutes: 45
            }
          })
        );
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

  test('Deve executar fluxo bidirecional completo (Inbound + Outbound) e gravar auditoria no Postgres', async () => {
    const routeRes = await request(app)
      .post('/admin/routes')
      .send({
        slug: 'sap-bidirectional-order',
        name: 'Ordem SAP <-> MES Core Bidirecional',
        targetUrl: `http://127.0.0.1:${mockMesPort}/api/v1/orders`,
        httpMethod: 'POST',
        variables: {
          codigoOrdem: 'header.AUFNR',
          quantidade: 'items[0].GAMNG',
          centroTrabalho: 'plant.workCenter'
        },
        responseTemplate: {
          orderCode: '{{codigoOrdem}}',
          metrics: {
            plannedQty: '{{quantidade}}',
            line: '{{centroTrabalho}}'
          }
        },
        outputVariables: {
          idMes: 'mesInternalId',
          situacao: 'executionStatus',
          tempo: 'workCenter.estimatedMinutes'
        },
        outputTemplate: {
          SAP_RETURN: {
            MES_DOC_NUM: '{{idMes}}',
            STATUS_TEXT: 'Ordem {{situacao}} ({{tempo}} min)'
          }
        }
      });

    expect(routeRes.statusCode).toBe(201);

    const gatewayRes = await request(app)
      .post('/gateway/sap-bidirectional-order')
      .send({
        header: { AUFNR: 'OP-10' },
        items: [{ GAMNG: 750 }],
        plant: { workCenter: 'WC-ENV-10' },
        metadataIgnorada: { timestamp: '2026-11-14' }
      });

    expect(gatewayRes.statusCode).toBe(200);
    expect(gatewayRes.body.gatewayStatus).toBe('DELIVERED');
    expect(gatewayRes.body.adaptedRequest).toEqual({
      orderCode: 'OP-10',
      metrics: {
        plannedQty: 750,
        line: 'WC-ENV-10'
      }
    });
    expect(gatewayRes.body.adaptedResponse).toEqual({
      SAP_RETURN: {
        MES_DOC_NUM: 'MES-9910',
        STATUS_TEXT: 'Ordem SCHEDULED (45 min)'
      }
    });
    expect(gatewayRes.body.rawMesResponse).toEqual({
      mesInternalId: 'MES-9910',
      executionStatus: 'SCHEDULED',
      workCenter: {
        estimatedMinutes: 45
      }
    });

    expect(lastReceivedByMes.body).toEqual({
      orderCode: 'OP-10',
      metrics: {
        plannedQty: 750,
        line: 'WC-ENV-10'
      }
    });

    const logsResult = await pool.query('SELECT * FROM integration_logs WHERE route_slug = $1', ['sap-bidirectional-order']);
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