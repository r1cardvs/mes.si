const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MES.SI — Seamless Integration Gateway',
    version: '1.0.0',
    description: 'API Gateway configurável estilo Apigee para roteamento, extração de variáveis por JSONPath e transformação dinâmica de payloads para o ecossistema MES.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Ambiente Local'
    }
  ],
  tags: [
    { name: 'Health', description: 'Monitoramento e disponibilidade do serviço' },
    { name: 'Admin - Rotas', description: 'Configuração de contratos e mapeamentos De -> Para' },
    { name: 'Gateway', description: 'Recepção de payloads externos e envio adaptado ao MES' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica o status da aplicação',
        responses: {
          200: {
            description: 'Serviço operacional',
            content: {
              'application/json': {
                example: {
                  service: 'MES.SI - Seamless Integration Gateway',
                  status: 'UP'
                }
              }
            }
          }
        }
      }
    },
    '/admin/routes': {
      get: {
        tags: ['Admin - Rotas'],
        summary: 'Lista todas as rotas de integração configuradas',
        responses: {
          200: {
            description: 'Lista de rotas cadastradas no PostgreSQL'
          }
        }
      },
      post: {
        tags: ['Admin - Rotas'],
        summary: 'Configura uma nova rota de integração com variáveis e template JSON',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug', 'name', 'targetUrl'],
                properties: {
                  slug: { type: 'string', example: 'sap-order-template' },
                  name: { type: 'string', example: 'Ordem SAP Complexa -> Contrato MES' },
                  targetUrl: { type: 'string', example: 'https://httpbin.org/post' },
                  httpMethod: { type: 'string', example: 'POST' },
                  variables: {
                    type: 'object',
                    example: {
                      codigoOrdem: 'sapHeader.AUFNR',
                      material: 'sapHeader.MATNR',
                      quantidade: 'items[0].GAMNG',
                      linha: 'workCenter.code'
                    }
                  },
                  responseTemplate: {
                    type: 'object',
                    example: {
                      order: {
                        code: '{{codigoOrdem}}',
                        sku: '{{material}}'
                      },
                      production: {
                        targetQty: '{{quantidade}}',
                        workCenterCode: '{{linha}}'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Rota criada com sucesso' },
          400: { description: 'Configuração de rota inválida' }
        }
      }
    },
    '/gateway/{slug}': {
      post: {
        tags: ['Gateway'],
        summary: 'Acolhe o payload externo, aplica a transformação e encaminha ao MES destino',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'sap-order-template' },
            description: 'Identificador único da rota configurada'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                example: {
                  sapHeader: {
                    AUFNR: 'OP-2026-10',
                    MATNR: 'MALBEC-100'
                  },
                  items: [
                    { GAMNG: 1000 }
                  ],
                  workCenter: {
                    code: 'WC-10'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Payload transformado e entregue ao MES destino' },
          404: { description: 'Rota não encontrada' },
          422: { description: 'Erro de validação ou variável ausente no payload' },
          502: { description: 'Falha de comunicação com o endpoint destino do MES' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;