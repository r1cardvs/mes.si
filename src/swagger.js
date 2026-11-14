const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MES.SI — Seamless Integration Gateway',
    version: '1.0.0',
    description: 'API Gateway configurável estilo Apigee para roteamento, extração de variáveis por JSONPath e transformação bidirecional de payloads para o ecossistema MES.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Ambiente Local'
    }
  ],
  tags: [
    { name: 'Health', description: 'Monitoramento e disponibilidade do serviço' },
    { name: 'Admin - Rotas', description: 'Configuração de contratos Inbound e Outbound' },
    { name: 'Gateway', description: 'Recepção de payloads externos, adaptação e retorno traduzido' }
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
        summary: 'Configura uma nova rota de integração bidirecional (Inbound + Outbound)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug', 'name', 'targetUrl'],
                properties: {
                  slug: { type: 'string', example: 'sap-to-mes-full' },
                  name: { type: 'string', example: 'Fluxo Completo SAP <-> MES Core' },
                  targetUrl: { type: 'string', example: 'https://mes-core-sim.free.beeceptor.com/api/v1/orders' },
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
                  },
                  outputVariables: {
                    type: 'object',
                    example: {
                      idMes: 'mesInternalId',
                      situacao: 'executionStatus',
                      tempoEstimado: 'workCenter.estimatedMinutes'
                    }
                  },
                  outputTemplate: {
                    type: 'object',
                    example: {
                      SAP_RETURN: {
                        MES_DOC_NUM: '{{idMes}}',
                        STATUS_TEXT: 'Ordem {{situacao}} com tempo previsto de {{tempoEstimado}} min'
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
        summary: 'Acolhe o payload externo, adapta para o MES, recebe o retorno e traduz a resposta',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'sap-to-mes-full' },
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
          200: { description: 'Fluxo bidirecional executado com sucesso' },
          404: { description: 'Rota não encontrada' },
          422: { description: 'Erro de validação ou variável ausente no payload' },
          502: { description: 'Falha de comunicação com o endpoint destino do MES' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;