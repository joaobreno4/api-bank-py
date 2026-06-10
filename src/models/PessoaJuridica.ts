import { ICliente, Categoria } from '../interfaces/ICliente';
import { ValidationError } from '../errors/AppError';

export interface PessoaJuridicaData {
  id?: number;
  razao_social: string;
  cnpj: string;
  email: string;
  celular: string;
  receita_mensal: number;
  categoria: Categoria;
  saldo: number;
}

export class PessoaJuridica implements ICliente {
  readonly id: number | null;
  readonly razaoSocial: string;
  readonly cnpj: string;
  readonly email: string;
  readonly celular: string;
  readonly receitaMensal: number;
  readonly categoria: Categoria;
  saldo: number;

  constructor(data: PessoaJuridicaData) {
    this.id = data.id ?? null;
    this.razaoSocial = data.razao_social;
    this.cnpj = data.cnpj;
    this.email = data.email;
    this.celular = data.celular;
    this.receitaMensal = data.receita_mensal;
    this.categoria = data.categoria;
    this.saldo = data.saldo;
  }

  static fromDatabase(row: PessoaJuridicaData): PessoaJuridica {
    return new PessoaJuridica(row);
  }

  depositar(valor: number): void {
    if (valor <= 0) throw new ValidationError('O valor do depósito deve ser positivo.');
    this.saldo += valor;
  }

  sacar(valor: number): boolean {
    if (valor <= 0) throw new ValidationError('O valor do saque deve ser positivo.');
    if (this.saldo < valor) return false;
    this.saldo -= valor;
    return true;
  }

  gerarExtrato(): string {
    return [
      '================================',
      '        EXTRATO BANCÁRIO        ',
      '================================',
      `Empresa  : ${this.razaoSocial}`,
      `CNPJ     : ${this.cnpj}`,
      `Email    : ${this.email}`,
      `Celular  : ${this.celular}`,
      `Categoria: ${this.categoria.toUpperCase()}`,
      `Saldo    : R$ ${this.saldo.toFixed(2)}`,
      '================================',
    ].join('\n');
  }

  toDatabase(): Omit<PessoaJuridicaData, 'id'> {
    return {
      razao_social: this.razaoSocial,
      cnpj: this.cnpj,
      email: this.email,
      celular: this.celular,
      receita_mensal: this.receitaMensal,
      categoria: this.categoria,
      saldo: this.saldo,
    };
  }
}
