# api-bank-py

API REST para um sistema bancário construída com Node.js, TypeScript e SQLite. O projeto segue o padrão MVC e os princípios SOLID, com uma arquitetura em camadas que separa roteamento, regras de negócio, acesso a dados e contratos.

---

## Autor

**João Breno**

---

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Regras de Negócio](#regras-de-negócio)
- [Referência da API](#referência-da-api)
- [Como Executar](#como-executar)
- [Testes](#testes)

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24 |
| Linguagem | TypeScript 6 (modo strict) |
| Framework | Express 5 |
| Banco de dados | SQLite via better-sqlite3 |
| Testes | Vitest + @vitest/coverage-v8 |
| Servidor de dev | ts-node + nodemon |

---

## Arquitetura

O projeto é organizado em quatro camadas, cada uma com uma única responsabilidade:

**Interfaces** definem os contratos que as entidades de domínio devem implementar (`ICliente`) e os tipos de retorno compartilhados entre as camadas (`IResultadoSaque`).

**Models** representam as entidades de domínio (`PessoaFisica`, `PessoaJuridica`). Cada model mantém o estado, aplica validações de baixo nível (valores positivos) e expõe um método `toDatabase()` que converte as propriedades em camelCase de volta para o schema snake_case esperado pelo SQLite.

**Services** contêm toda a lógica de negócio: atribuição de categoria na criação, cálculo de taxa de saque por categoria, validação de limites e persistência via prepared statements. Os services lançam erros tipados (`NotFoundError`, `LimitExceededError`, `SaldoInsuficienteError`) que os controllers traduzem em status HTTP.

**Controllers** são adaptadores HTTP. Fazem o parse e a validação dos parâmetros da requisição, delegam ao service correspondente e retornam respostas JSON estruturadas. Um utilitário compartilhado `handleError` centraliza o mapeamento de tipos de erro para status HTTP.

```
Requisição
  └── Router (routes.ts)
        └── Controller  — parse do input, resposta HTTP
              └── Service — regras de negócio, persistência
                    └── Model — estado da entidade, validações de baixo nível
```

---

## Estrutura de Pastas

```
src/
├── __tests__/
│   └── sacar.spec.ts          # Testes unitários das regras de saque
├── controllers/
│   ├── PessoaFisicaController.ts
│   └── PessoaJuridicaController.ts
├── database/
│   └── connection.ts          # Singleton SQLite, modo WAL, criação das tabelas
├── errors/
│   └── AppError.ts            # Classes de erro tipadas
├── interfaces/
│   ├── ICliente.ts            # Contrato de cliente e tipo Categoria
│   └── IResultadoSaque.ts     # Formato de retorno do saque
├── models/
│   ├── PessoaFisica.ts
│   └── PessoaJuridica.ts
├── services/
│   ├── PessoaFisicaService.ts
│   └── PessoaJuridicaService.ts
├── utils/
│   └── handleError.ts         # Mapeamento erro -> status HTTP
├── routes.ts
└── server.ts
```

---

## Regras de Negócio

### Categorização

A categoria é atribuída automaticamente no momento do cadastro com base na renda ou receita mensal. Não pode ser definida manualmente.

| Categoria | Pessoa Física (renda_mensal) | Pessoa Jurídica (receita_mensal) |
|---|---|---|
| comum | até R$ 2.000,00 | até R$ 10.000,00 |
| super | R$ 2.000,01 a R$ 5.000,00 | R$ 10.000,01 a R$ 50.000,00 |
| premium | acima de R$ 5.000,00 | acima de R$ 50.000,00 |

### Saque

Duas validações ocorrem em sequência antes de qualquer débito:

1. **Limite por operação** — o valor solicitado não pode ultrapassar o teto definido para o tipo de cliente.
2. **Saldo suficiente** — a conta deve ter saldo para cobrir o valor total, incluindo a taxa.

| Regra | Pessoa Física | Pessoa Jurídica |
|---|---|---|
| Limite máximo por saque | R$ 1.000,00 | R$ 10.000,00 |
| Taxa — comum | 0,4% | 0,4% |
| Taxa — super | 0,1% | 0,1% |
| Taxa — premium | isento | isento |

A taxa é cobrada sobre o valor solicitado e somada ao débito. Por exemplo, um saque de R$ 500,00 por um cliente `comum` debita R$ 502,00 do saldo.

### Respostas de Erro

| Situação | Status HTTP |
|---|---|
| Valor acima do limite permitido | 400 |
| Parâmetro inválido (não numérico, negativo) | 400 |
| Saldo insuficiente | 422 |
| ID do cliente não encontrado | 404 |
| Erro inesperado no servidor | 500 |

---

## Referência da API

Todas as rotas possuem o prefixo `/api`.

### Pessoa Física

| Método | Caminho | Descrição |
|---|---|---|
| POST | `/clientes/pf` | Cadastrar um novo cliente pessoa física |
| GET | `/clientes/pf` | Listar todos os clientes pessoa física |
| POST | `/clientes/pf/:id/sacar` | Realizar saque em conta pessoa física |
| GET | `/clientes/pf/:id/extrato` | Consultar extrato da conta |

#### POST /clientes/pf

Corpo da requisição:

```json
{
  "nome_completo": "Carlos Silva",
  "email": "carlos@email.com",
  "celular": "11900000001",
  "idade": 28,
  "renda_mensal": 1500
}
```

Resposta `201`:

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

Corpo da requisição:

```json
{ "valor": 500 }
```

Resposta `200`:

```json
{
  "valorSolicitado": 500,
  "taxa": 2,
  "totalDebitado": 502,
  "saldoAnterior": 800,
  "saldoAtual": 298
}
```

Resposta `400` (limite excedido):

```json
{
  "erro": "Limite máximo por saque para Pessoa Física é R$ 1000.00."
}
```

Resposta `422` (saldo insuficiente):

```json
{
  "erro": "Saldo insuficiente. Saldo atual: R$ 298.00, total a debitar (com taxa de 0.4%): R$ 803.20."
}
```

---

### Pessoa Jurídica

| Método | Caminho | Descrição |
|---|---|---|
| POST | `/clientes/pj` | Cadastrar um novo cliente pessoa jurídica |
| GET | `/clientes/pj` | Listar todos os clientes pessoa jurídica |
| POST | `/clientes/pj/:id/sacar` | Realizar saque em conta pessoa jurídica |
| GET | `/clientes/pj/:id/extrato` | Consultar extrato da conta |

#### POST /clientes/pj

Corpo da requisição:

```json
{
  "razao_social": "Tech Media LTDA",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@techmedia.com",
  "celular": "11988880001",
  "receita_mensal": 30000
}
```

Resposta `201`:

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

## Como Executar

**Pré-requisitos:** Node.js 18 ou superior, npm.

```bash
# Clonar o repositório
git clone https://github.com/joaobreno4/api-bank-py.git
cd api-bank-py

# Instalar as dependências
npm install

# Iniciar o servidor de desenvolvimento (com hot reload)
npm run dev

# Ou compilar e executar em modo de produção
npm run build
npm start
```

O servidor inicia na porta `3000` por padrão. Defina a variável de ambiente `PORT` para alterar.

O arquivo do banco de dados SQLite é criado automaticamente em `data/bank.db` na primeira execução. As tabelas são criadas com `CREATE TABLE IF NOT EXISTS`, portanto a inicialização é segura para execuções repetidas.

---

## Testes

```bash
# Executar todos os testes uma vez
npm test

# Modo watch durante o desenvolvimento
npm run test:watch

# Relatório de cobertura
npm run test:coverage
```

A suíte de testes utiliza Vitest com `vi.hoisted` para mockar o módulo de conexão com o SQLite. Isso mantém os testes como testes unitários puros — nenhum arquivo de banco de dados é criado ou lido durante a execução.

### Cenários Cobertos

| Cenário | Verificação |
|---|---|
| Saque de R$ 500 — comum | taxa de R$ 2,00 aplicada (0,4%), R$ 502,00 debitados |
| Saque de R$ 1.500 — PF | `LimitExceededError` lançado antes de qualquer chamada ao banco |
| Saque de R$ 5.000 — PJ com saldo de R$ 2.000 | `SaldoInsuficienteError` lançado, nenhum UPDATE executado |
| Saque de R$ 500 — premium | taxa zero, exatamente R$ 500,00 debitados |
