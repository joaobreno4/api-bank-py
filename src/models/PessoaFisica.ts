import { ICliente, Categoria } from '../interfaces/ICliente';
import { ValidationError } from '../errors/AppError';

export interface PessoaFisicaData {
  id?: number;
  nome_completo: string;
  email: string;
  celular: string;
  idade: number;
  renda_mensal: number;
  categoria: Categoria;
  saldo: number;
}

export class PessoaFisica implements ICliente {
  readonly id: number | null;
  readonly nomeCompleto: string;
  readonly email: string;
  readonly celular: string;
  readonly idade: number;
  readonly rendaMensal: number;
  readonly categoria: Categoria;
  saldo: number;

  constructor(data: PessoaFisicaData) {
    this.id = data.id ?? null;
    this.nomeCompleto = data.nome_completo;
    this.email = data.email;
    this.celular = data.celular;
    this.idade = data.idade;
    this.rendaMensal = data.renda_mensal;
    this.categoria = data.categoria;
    this.saldo = data.saldo;
  }

  static fromDatabase(row: PessoaFisicaData): PessoaFisica {
    return new PessoaFisica(row);
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
      `Titular  : ${this.nomeCompleto}`,
      `Email    : ${this.email}`,
      `Celular  : ${this.celular}`,
      `Categoria: ${this.categoria.toUpperCase()}`,
      `Saldo    : R$ ${this.saldo.toFixed(2)}`,
      '================================',
    ].join('\n');
  }

  toDatabase(): Omit<PessoaFisicaData, 'id'> {
    return {
      nome_completo: this.nomeCompleto,
      email: this.email,
      celular: this.celular,
      idade: this.idade,
      renda_mensal: this.rendaMensal,
      categoria: this.categoria,
      saldo: this.saldo,
    };
  }
}
