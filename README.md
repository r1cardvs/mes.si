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
  <img src="https://img.shields.io/badge/Docker-GHCR-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker GHCR" />
</p>

> **API Gateway & Integration Broker** dedicado ao ecossistema **MES (Manufacturing Execution System)** — inspirado no modelo de roteamento e transformação dinâmica de contratos estilo Apigee, projetado para conectar ERPs (ex: SAP), sensores e sistemas de chão de fábrica sem atritos (*Seamless Integration*).

---

## Arquitetura da Solução

O **MES.SI** atua como camada intermediária configurável: recebe payloads brutos de sistemas externos via endpoints dinâmicos (`/gateway/:slug`), valida e traduz os campos conforme o contrato mapeado no PostgreSQL (`field_mapping`) e encaminha a requisição adaptada ao endpoint destino do MES, registrando telemetria e auditoria.

```mermaid
flowchart LR
    ERP["ERP / SAP / CLP\n(Payload Bruto)"] -->|POST /gateway/:slug| GW["MES.SI Gateway\n(Node.js + Express)"]
    GW <-->|Busca Rota & Grava Log| DB[("PostgreSQL 15\nintegration_routes\nintegration_logs")]
    GW -->|Payload Adaptado\nDe -> Para| MES["MES Core\n(Target Endpoint)"]

    style GW fill:#75AADB,stroke:#1D3557,stroke-width:2px,color:#0B132B
    style ERP fill:#FFFFFF,stroke:#75AADB,stroke-width:2px,color:#0B132B
    style MES fill:#FFFFFF,stroke:#75AADB,stroke-width:2px,color:#0B132B
    style DB fill:#EBF5FB,stroke:#1D3557,stroke-width:2px,color:#0B132B