export type Categoria = 'comum' | 'super' | 'premium';

export interface ICliente {
  readonly id: number | null;
  readonly email: string;
  readonly celular: string;
  readonly categoria: Categoria;
  saldo: number;

  depositar(valor: number): void;
  sacar(valor: number): boolean;
  gerarExtrato(): string;
}
