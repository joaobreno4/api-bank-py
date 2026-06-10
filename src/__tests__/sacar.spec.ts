import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LimitExceededError, SaldoInsuficienteError } from '../errors/AppError';

// vi.hoisted garante que os mocks existem antes do vi.mock ser içado pelo Vitest
const { mockGet, mockRun } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockRun: vi.fn(),
}));

vi.mock('../database/connection', () => ({
  default: {
    prepare: () => ({ get: mockGet, all: vi.fn().mockReturnValue([]), run: mockRun }),
  },
}));

import { pessoaFisicaService } from '../services/PessoaFisicaService';
import { pessoaJuridicaService } from '../services/PessoaJuridicaService';

// ---------------------------------------------------------------------------
// Factories de linhas do banco
// ---------------------------------------------------------------------------

const pfComum = (saldo = 1_000) => ({
  id: 1,
  nome_completo: 'Carlos Comum',
  email: 'carlos@email.com',
  celular: '11900000001',
  idade: 28,
  renda_mensal: 1_500, // ≤ 2.000 → 'comum'
  categoria: 'comum' as const,
  saldo,
});

const pfPremium = (saldo = 1_000) => ({
  id: 2,
  nome_completo: 'Ana Premium',
  email: 'ana@email.com',
  celular: '11900000002',
  idade: 42,
  renda_mensal: 8_000, // > 5.000 → 'premium'
  categoria: 'premium' as const,
  saldo,
});

const pjComum = (saldo = 2_000) => ({
  id: 1,
  razao_social: 'Pequenas Coisas LTDA',
  cnpj: '12.345.678/0001-99',
  email: 'contato@pequenascoisas.com',
  celular: '11900000003',
  receita_mensal: 8_000, // ≤ 10.000 → 'comum'
  categoria: 'comum' as const,
  saldo,
});

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Cenário a) Taxa de 0.4% para PF Comum no saque de R$ 500
// ---------------------------------------------------------------------------
describe('sacar — PF Comum — R$ 500', () => {
  it('aplica taxa de 0.4% e debita R$ 502,00 do saldo', () => {
    mockGet.mockReturnValue(pfComum(1_000));

    const resultado = pessoaFisicaService.sacar(1, 500);

    expect(resultado.valorSolicitado).toBe(500);
    expect(resultado.taxa).toBeCloseTo(2.0);          // 500 × 0.4% = R$ 2,00
    expect(resultado.totalDebitado).toBeCloseTo(502); // 500 + 2
    expect(resultado.saldoAnterior).toBe(1_000);
    expect(resultado.saldoAtual).toBeCloseTo(498);    // 1.000 − 502
    expect(mockRun).toHaveBeenCalledOnce();            // UPDATE executado
  });
});

// ---------------------------------------------------------------------------
// Cenário b) Saque de R$ 1.500 bloqueado pelo limite de PF (R$ 1.000)
// ---------------------------------------------------------------------------
describe('sacar — PF — limite excedido', () => {
  it('lança LimitExceededError sem consultar o banco', () => {
    expect(() => pessoaFisicaService.sacar(1, 1_500))
      .toThrow(LimitExceededError);

    expect(() => pessoaFisicaService.sacar(1, 1_500))
      .toThrowError('Limite máximo por saque para Pessoa Física é R$ 1000.00.');

    // A validação acontece antes de qualquer chamada ao banco
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cenário c) PJ tenta sacar R$ 5.000 com saldo de R$ 2.000
// ---------------------------------------------------------------------------
describe('sacar — PJ — saldo insuficiente', () => {
  it('lança SaldoInsuficienteError quando total a debitar supera o saldo', () => {
    // R$ 5.000 está dentro do limite de PJ (R$ 10.000)
    // taxa comum = 0.4% → total = R$ 5.020 > saldo R$ 2.000
    mockGet.mockReturnValue(pjComum(2_000));

    expect(() => pessoaJuridicaService.sacar(1, 5_000))
      .toThrow(SaldoInsuficienteError);

    expect(() => pessoaJuridicaService.sacar(1, 5_000))
      .toThrowError(/Saldo insuficiente/);

    // Nenhum UPDATE deve ter sido executado
    expect(mockRun).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cenário d) Cliente Premium — isento de taxa
// ---------------------------------------------------------------------------
describe('sacar — PF Premium — R$ 500', () => {
  it('não cobra taxa e debita exatamente R$ 500,00', () => {
    mockGet.mockReturnValue(pfPremium(1_000));

    const resultado = pessoaFisicaService.sacar(2, 500);

    expect(resultado.taxa).toBe(0);
    expect(resultado.totalDebitado).toBe(500);
    expect(resultado.saldoAtual).toBe(500); // 1.000 − 500, sem taxa
    expect(mockRun).toHaveBeenCalledOnce();
  });
});
