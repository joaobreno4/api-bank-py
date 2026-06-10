import db from '../database/connection';
import { PessoaFisica, PessoaFisicaData } from '../models/PessoaFisica';
import { Categoria } from '../interfaces/ICliente';
import { ResultadoSaque } from '../interfaces/IResultadoSaque';
import { NotFoundError, LimitExceededError, SaldoInsuficienteError } from '../errors/AppError';

// --- Constantes de negócio ---

const LIMITE_SAQUE = 1_000;

const TAXA_SAQUE: Record<Categoria, number> = {
  comum:   0.004, // 0.4%
  super:   0.001, // 0.1%
  premium: 0,     // isento
};

// --- Helpers privados ---

function determinarCategoria(rendaMensal: number): Categoria {
  if (rendaMensal > 5_000) return 'premium';
  if (rendaMensal > 2_000) return 'super';
  return 'comum';
}

// --- Tipos de entrada ---

export type CriarPessoaFisicaInput = Omit<PessoaFisicaData, 'id' | 'categoria' | 'saldo'>;

// --- Service ---

class PessoaFisicaService {
  criar(input: CriarPessoaFisicaInput): PessoaFisica {
    const categoria = determinarCategoria(input.renda_mensal);

    const stmt = db.prepare(`
      INSERT INTO pessoa_fisica
        (nome_completo, email, celular, idade, renda_mensal, categoria, saldo)
      VALUES
        (@nome_completo, @email, @celular, @idade, @renda_mensal, @categoria, 0)
    `);

    const { lastInsertRowid } = stmt.run({ ...input, categoria });
    return this.buscarPorId(Number(lastInsertRowid));
  }

  listar(): PessoaFisica[] {
    const rows = db.prepare('SELECT * FROM pessoa_fisica ORDER BY id').all() as PessoaFisicaData[];
    return rows.map(PessoaFisica.fromDatabase);
  }

  buscarPorId(id: number): PessoaFisica {
    const row = db
      .prepare('SELECT * FROM pessoa_fisica WHERE id = ?')
      .get(id) as PessoaFisicaData | undefined;

    if (!row) throw new NotFoundError(`Pessoa física com id ${id} não encontrada.`);
    return PessoaFisica.fromDatabase(row);
  }

  depositar(id: number, valor: number): PessoaFisica {
    const pf = this.buscarPorId(id);
    pf.depositar(valor);
    db.prepare('UPDATE pessoa_fisica SET saldo = ? WHERE id = ?').run(pf.saldo, id);
    return pf;
  }

  sacar(id: number, valor: number): ResultadoSaque {
    if (valor > LIMITE_SAQUE) {
      throw new LimitExceededError(
        `Limite máximo por saque para Pessoa Física é R$ ${LIMITE_SAQUE.toFixed(2)}.`,
      );
    }

    const pf = this.buscarPorId(id);
    const taxa = valor * TAXA_SAQUE[pf.categoria];
    const totalDebitado = valor + taxa;
    const saldoAnterior = pf.saldo;

    const sucesso = pf.sacar(totalDebitado);
    if (!sucesso) {
      throw new SaldoInsuficienteError(
        `Saldo insuficiente. Saldo atual: R$ ${saldoAnterior.toFixed(2)}, ` +
        `total a debitar (com taxa de ${(TAXA_SAQUE[pf.categoria] * 100).toFixed(1)}%): ` +
        `R$ ${totalDebitado.toFixed(2)}.`,
      );
    }

    db.prepare('UPDATE pessoa_fisica SET saldo = ? WHERE id = ?').run(pf.saldo, id);

    return { valorSolicitado: valor, taxa, totalDebitado, saldoAnterior, saldoAtual: pf.saldo };
  }

  gerarExtrato(id: number): string {
    return this.buscarPorId(id).gerarExtrato();
  }
}

export const pessoaFisicaService = new PessoaFisicaService();
