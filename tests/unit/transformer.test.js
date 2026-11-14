const { transformPayload, validateRouteConfig, IntegrationError } = require('../../src/domain/payloadTransformer');

describe('MES.SI - Unit Tests (Payload Transformer & Route Rules)', () => {
  test('Deve extrair variáveis por caminho aninhado e construir o JSON final via template', () => {
    const sapPayload = {
      sapHeader: {
        AUFNR: 'OP-2026-10',
        MATNR: 'MALBEC-100'
      },
      items: [
        { GAMNG: 1000, UNIT: 'UN' }
      ],
      workCenter: {
        code: 'WC-10'
      }
    };

    const routeConfig = {
      variables: {
        codigoOrdem: 'sapHeader.AUFNR',
        material: 'sapHeader.MATNR',
        quantidade: 'items[0].GAMNG',
        linha: 'workCenter.code'
      },
      responseTemplate: {
        order: {
          code: '{{codigoOrdem}}',
          sku: '{{material}}',
          label: 'Ordem {{codigoOrdem}} - {{material}}'
        },
        production: {
          targetQty: '{{quantidade}}',
          workCenterCode: '{{linha}}'
        }
      }
    };

    const result = transformPayload(sapPayload, routeConfig);

    expect(result).toEqual({
      order: {
        code: 'OP-2026-10',
        sku: 'MALBEC-100',
        label: 'Ordem OP-2026-10 - MALBEC-100'
      },
      production: {
        targetQty: 1000,
        workCenterCode: 'WC-10'
      }
    });
  });

  test('Deve lançar erro 422 se um caminho mapeado nas variáveis não existir no JSON bruto', () => {
    const rawPayload = { sapHeader: { AUFNR: 'OP-10' } };
    const routeConfig = {
      variables: {
        codigoOrdem: 'sapHeader.AUFNR',
        quantidade: 'items[0].GAMNG'
      },
      responseTemplate: {
        code: '{{codigoOrdem}}',
        qty: '{{quantidade}}'
      }
    };

    expect(() => transformPayload(rawPayload, routeConfig)).toThrow(IntegrationError);
    expect(() => transformPayload(rawPayload, routeConfig)).toThrow(
      "Caminho obrigatório não encontrado no JSON de origem: 'items[0].GAMNG'"
    );
  });

  test('Deve lançar erro 422 se o template referenciar uma variável não declarada', () => {
    const rawPayload = { sapHeader: { AUFNR: 'OP-10' } };
    const routeConfig = {
      variables: {
        codigoOrdem: 'sapHeader.AUFNR'
      },
      responseTemplate: {
        code: '{{codigoOrdem}}',
        inexistente: '{{variavelFantasma}}'
      }
    };

    expect(() => transformPayload(rawPayload, routeConfig)).toThrow(
      "Variável 'variavelFantasma' usada no template não foi mapeada."
    );
  });

  test('Deve manter compatibilidade com mapeamento simples De -> Para', () => {
    const sapPayload = { AUFNR: 'OP-2026-10', GAMNG: 500 };
    const mapping = { AUFNR: 'orderCode', GAMNG: 'plannedQty' };

    expect(transformPayload(sapPayload, mapping)).toEqual({
      orderCode: 'OP-2026-10',
      plannedQty: 500
    });
  });

  test('Deve bloquear criação de rota com slug inválido', () => {
    expect(() =>
      validateRouteConfig({
        slug: 'Rota Inválida!',
        targetUrl: 'http://mes-core:4000/api/orders',
        httpMethod: 'POST'
      })
    ).toThrow('Slug inválido');
  });
});