# MES.SI — Manufacturing Execution System: Seamless Integration

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:75AADB,50:FFFFFF,100:75AADB&height=140&section=header&text=MES.SI%20%E2%9A%BD%20%2310&fontSize=38&fontColor=1D3557&fontAlignY=40" alt="MES.SI Header" />
</p>

<p align="center">
  <a href="https://github.com/r1cardvs/mes.si/actions/workflows/ci-cd.yml">
    <img src="https://github.com/r1cardvs/mes.si/actions/workflows/ci-cd.yml/badge.svg" alt="MES.SI - CI/CD Pipeline" />
  </a>
  <img src="https://img.shields.io/badge/Nº-10-75AADB?style=flat&logoColor=white" alt="Número 10" />
  <img src="https://img.shields.io/badge/Node.js-24-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js 24" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/Swagger-UI-85EA2D?style=flat&logo=swagger&logoColor=black" alt="Swagger UI" />
  <img src="https://img.shields.io/badge/Docker-GHCR-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker GHCR" />
</p>

> **API Gateway & Integration Broker** dedicado ao ecossistema **MES (Manufacturing Execution System)** — inspirado no modelo de políticas e roteamento dinâmico estilo Apigee, projetado para conectar ERPs (ex: SAP), sensores e sistemas de chão de fábrica com transformação bidirecional de contratos (*Seamless Integration*).

---

## Arquitetura da Solução (Fluxo Bidirecional)

O **MES.SI** atua como camada intermediária configurável entre sistemas corporativos e o chão de fábrica:

1. **Inbound (ERP -> MES):** Recebe payloads brutos em `/gateway/:slug`, extrai variáveis por caminhos JSONPath (`variables`) e monta o contrato esperado pelo MES (`responseTemplate`).
2. **Outbound (MES -> ERP):** Recebe a resposta do MES destino, extrai variáveis de retorno (`outputVariables`) e reconstrói a resposta no formato esperado pelo chamador (`outputTemplate`), gravando auditoria e latência no PostgreSQL.

```mermaid
flowchart LR
    ERP["ERP / SAP / CLP\n(Payload Bruto)"] -->|1. POST /gateway/:slug| GW["MES.SI Gateway\n(Node.js + Express)"]
    GW <-->|2. Busca Rota & Grava Log| DB[("PostgreSQL 15\nintegration_routes\nintegration_logs")]
    GW -->|3. Inbound: adaptedRequest\nvariables + responseTemplate| MES["MES Core\n(Target Endpoint)"]
    MES -->|4. Retorno Bruto do MES| GW
    GW -->|5. Outbound: adaptedResponse\noutputVariables + outputTemplate| ERP

    style GW fill:#75AADB,stroke:#1D3557,stroke-width:2px,color:#0B132B
    style ERP fill:#FFFFFF,stroke:#75AADB,stroke-width:2px,color:#0B132B
    style MES fill:#FFFFFF,stroke:#75AADB,stroke-width:2px,color:#0B132B
    style DB fill:#EBF5FB,stroke:#1D3557,stroke-width:2px,color:#0B132B