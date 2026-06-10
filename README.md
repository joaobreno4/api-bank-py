# api-bank-py

REST API for a banking system built with Node.js, TypeScript, and SQLite. The project follows the MVC pattern and SOLID principles, with a layered architecture that separates routing, business logic, data access, and contracts.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Business Rules](#business-rules)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 6 (strict mode) |
| Framework | Express 5 |
| Database | SQLite via better-sqlite3 |
| Testing | Vitest + @vitest/coverage-v8 |
| Dev server | ts-node + nodemon |

---

## Architecture

The project is organized into four layers, each with a single responsibility:

**Interfaces** define the contracts that domain entities must implement (`ICliente`) and the shared return types used across layers (`IResultadoSaque`).

**Models** represent the domain entities (`PessoaFisica`, `PessoaJuridica`). Each model holds state, enforces low-level invariants (positive values), and exposes a `toDatabase()` method that maps camelCase properties back to the snake_case schema expected by SQLite.

**Services** contain all business logic: category assignment on creation, withdrawal fee calculation by category, limit enforcement, and persistence via prepared statements. Services throw typed errors (`NotFoundError`, `LimitExceededError`, `SaldoInsuficienteError`) that controllers translate into HTTP status codes.

**Controllers** are thin HTTP adapters. They parse and validate request parameters, delegate to the corresponding service, and return structured JSON responses. A shared `handleError` utility maps error types to status codes, keeping that logic in one place.

```
Request
  └── Router (routes.ts)
        └── Controller  — parse input, handle HTTP
              └── Service — business rules, DB persistence
                    └── Model — entity state, low-level validation
```

---

## Project Structure

```
src/
├── __tests__/
│   └── sacar.spec.ts          # Unit tests for withdrawal rules
├── controllers/
│   ├── PessoaFisicaController.ts
│   └── PessoaJuridicaController.ts
├── database/
│   └── connection.ts          # SQLite singleton, WAL mode, table initialization
├── errors/
│   └── AppError.ts            # Typed error classes
├── interfaces/
│   ├── ICliente.ts            # Client contract + Categoria type
│   └── IResultadoSaque.ts     # Withdrawal result shape
├── models/
│   ├── PessoaFisica.ts
│   └── PessoaJuridica.ts
├── services/
│   ├── PessoaFisicaService.ts
│   └── PessoaJuridicaService.ts
├── utils/
│   └── handleError.ts         # Error-to-HTTP-status mapping
├── routes.ts
└── server.ts
```

---

## Business Rules

### Category Assignment

Category is determined automatically at creation time based on monthly income or revenue. It cannot be set manually.

| Category | Pessoa Fisica (renda_mensal) | Pessoa Juridica (receita_mensal) |
|---|---|---|
| comum | up to R$ 2,000.00 | up to R$ 10,000.00 |
| super | R$ 2,000.01 to R$ 5,000.00 | R$ 10,000.01 to R$ 50,000.00 |
| premium | above R$ 5,000.00 | above R$ 50,000.00 |

### Withdrawal

Two validations run in order before any debit occurs:

1. **Limit per operation** — the requested amount may not exceed the type-specific cap.
2. **Sufficient balance** — the account must hold enough to cover the full amount including the fee.

| Rule | Pessoa Fisica | Pessoa Juridica |
|---|---|---|
| Max per withdrawal | R$ 1,000.00 | R$ 10,000.00 |
| Fee — comum | 0.4% | 0.4% |
| Fee — super | 0.1% | 0.1% |
| Fee — premium | exempt | exempt |

The fee is applied on top of the requested amount. For example, a R$ 500.00 withdrawal by a `comum` client debits R$ 502.00 from the balance.

### Error Responses

| Situation | HTTP Status |
|---|---|
| Requested amount exceeds limit | 400 |
| Invalid parameter (non-numeric, negative) | 400 |
| Insufficient balance | 422 |
| Client ID not found | 404 |
| Unexpected server error | 500 |

---

## API Reference

All routes are prefixed with `/api`.

### Pessoa Fisica

| Method | Path | Description |
|---|---|---|
| POST | `/clientes/pf` | Create a new individual client |
| GET | `/clientes/pf` | List all individual clients |
| POST | `/clientes/pf/:id/sacar` | Withdraw from an individual account |
| GET | `/clientes/pf/:id/extrato` | Get account statement |

#### POST /clientes/pf

Request body:

```json
{
  "nome_completo": "Carlos Silva",
  "email": "carlos@email.com",
  "celular": "11900000001",
  "idade": 28,
  "renda_mensal": 1500
}
```

Response `201`:

```json
{
  "id": 1,
  "nomeCompleto": "Carlos Silva",
  "email": "carlos@email.com",
  "celular": "11900000001",
  "idade": 28,
  "rendaMensal": 1500,
  "categoria": "comum",
  "saldo": 0
}
```

#### POST /clientes/pf/:id/sacar

Request body:

```json
{ "valor": 500 }
```

Response `200`:

```json
{
  "valorSolicitado": 500,
  "taxa": 2,
  "totalDebitado": 502,
  "saldoAnterior": 800,
  "saldoAtual": 298
}
```

Response `400` (limit exceeded):

```json
{
  "erro": "Limite máximo por saque para Pessoa Física é R$ 1000.00."
}
```

Response `422` (insufficient balance):

```json
{
  "erro": "Saldo insuficiente. Saldo atual: R$ 298.00, total a debitar (com taxa de 0.4%): R$ 803.20."
}
```

---

### Pessoa Juridica

| Method | Path | Description |
|---|---|---|
| POST | `/clientes/pj` | Create a new corporate client |
| GET | `/clientes/pj` | List all corporate clients |
| POST | `/clientes/pj/:id/sacar` | Withdraw from a corporate account |
| GET | `/clientes/pj/:id/extrato` | Get account statement |

#### POST /clientes/pj

Request body:

```json
{
  "razao_social": "Tech Media LTDA",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@techmedia.com",
  "celular": "11988880001",
  "receita_mensal": 30000
}
```

Response `201`:

```json
{
  "id": 1,
  "razaoSocial": "Tech Media LTDA",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@techmedia.com",
  "celular": "11988880001",
  "receitaMensal": 30000,
  "categoria": "super",
  "saldo": 0
}
```

---

## Getting Started

**Prerequisites:** Node.js 18 or higher, npm.

```bash
# Clone the repository
git clone https://github.com/joaobreno4/api-bank-py.git
cd api-bank-py

# Install dependencies
npm install

# Start the development server (hot reload)
npm run dev

# Or compile and run the production build
npm run build
npm start
```

The server starts on port `3000` by default. Set the `PORT` environment variable to override.

The SQLite database file is created automatically at `data/bank.db` on first run. Tables are created with `CREATE TABLE IF NOT EXISTS`, so initialization is safe to run multiple times.

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage
```

The test suite uses Vitest with `vi.hoisted` to mock the SQLite connection module. This keeps the tests pure unit tests — no database file is created or read during the test run.

### Test Coverage

| Scenario | Assertion |
|---|---|
| R$ 500 withdrawal — comum | fee of R$ 2.00 applied (0.4%), R$ 502.00 debited |
| R$ 1,500 withdrawal — PF | `LimitExceededError` thrown before any DB call |
| R$ 5,000 withdrawal — PJ with R$ 2,000 balance | `SaldoInsuficienteError` thrown, no UPDATE executed |
| R$ 500 withdrawal — premium | zero fee, exactly R$ 500.00 debited |
