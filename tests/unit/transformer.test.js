const { transformPayload, validateRouteConfig, IntegrationError } = require('../../src/domain/payloadTransformer');

describe('MES.SI - Unit Tests (Payload Transformer & Route Rules)', () => {
  test('Deve traduzir payload bruto do SAP para o contrato padrão do MES', () => {
    const sapPayload = {
      AUFNR: 'OP-2026-10',
      MATNR: 'MALBEC-100ML',
      GAMNG: 500,
      CAMPO_EXTRA_IGNORADO: 'xyz'
    };

    const mapping = {
      AUFNR: 'orderCode',
      MATNR: 'materialCode',
      GAMNG: 'plannedQty'
    };

    const result = transformPayload(sapPayload, mapping);

    expect(result).toEqual({
      orderCode: 'OP-2026-10',
      materialCode: 'MALBEC-100ML',
      plannedQty: 500
    });
  });

  test('Deve lançar erro 422 quando campo obrigatório mapeado estiver ausente', () => {
    const incompletePayload = { AUFNR: 'OP-2026-10' };
    const mapping = { AUFNR: 'orderCode', GAMNG: 'plannedQty' };

    expect(() => transformPayload(incompletePayload, mapping)).toThrow(IntegrationError);
    expect(() => transformPayload(incompletePayload, mapping)).toThrow(
      "Campo obrigatório ausente no payload de origem: 'GAMNG'"
    );
  });

  test('Deve repassar o payload original intacto se nenhum mapeamento for definido', () => {
    const raw = { sensorId: 'TEMP-01', value: 23.5 };
    expect(transformPayload(raw, {})).toEqual(raw);
  });

  test('Deve bloquear criação de rota com slug inválido (caracteres especiais/maiúsculas)', () => {
    expect(() =>
      validateRouteConfig({
        slug: 'Rota Inválida!',
        targetUrl: 'http://mes-core:4000/api/orders',
        httpMethod: 'POST'
      })
    ).toThrow('Slug inválido');
  });

  test('Deve bloquear criação de rota com URL sem protocolo http/https', () => {
    expect(() =>
      validateRouteConfig({
        slug: 'sap-to-mes',
        targetUrl: 'ftp://servidor-antigo/orders',
        httpMethod: 'POST'
      })
    ).toThrow('targetUrl inválida');
  });
});