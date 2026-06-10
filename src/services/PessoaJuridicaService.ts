import db from '../database/connection';
import { PessoaJuridica, PessoaJuridicaData } from '../models/PessoaJuridica';
import { Categoria } from '../interfaces/ICliente';
import { ResultadoSaque } from '../interfaces/IResultadoSaque';
import { NotFoundError, LimitExceededError, SaldoInsuficienteError } from '../errors/AppError';

// --- Constantes de negócio ---

const LIMITE_SAQUE = 10_000;

const TAXA_SAQUE: Record<Categoria, number> = {
  comum:   0.004, // 0.4%
  super:   0.001, // 0.1%
  premium: 0,     // isento
};

// --- Helpers privados ---

function determinarCategoria(receitaMensal: number): Categoria {
  if (receitaMensal > 50_000) return 'premium';
  if (receitaMensal > 10_000) return 'super';
  return 'comum';
}

// --- Tipos de entrada ---

export type CriarPessoaJuridicaInput = Omit<PessoaJuridicaData, 'id' | 'categoria' | 'saldo'>;

// --- Service ---

class PessoaJuridicaService {
  criar(input: CriarPessoaJuridicaInput): PessoaJuridica {
    const categoria = determinarCategoria(input.receita_mensal);

    const stmt = db.prepare(`
      INSERT INTO pessoa_juridica
        (razao_social, cnpj, email, celular, receita_mensal, categoria, saldo)
      VALUES
        (@razao_social, @cnpj, @email, @celular, @receita_mensal, @categoria, 0)
    `);

    const { lastInsertRowid } = stmt.run({ ...input, categoria });
    return this.buscarPorId(Number(lastInsertRowid));
  }

  listar(): PessoaJuridica[] {
    const rows = db.prepare('SELECT * FROM pessoa_juridica ORDER BY id').all() as PessoaJuridicaData[];
    return rows.map(PessoaJuridica.fromDatabase);
  }

  buscarPorId(id: number): PessoaJuridica {
    const row = db
      .prepare('SELECT * FROM pessoa_juridica WHERE id = ?')
      .get(id) as PessoaJuridicaData | undefined;

    if (!row) throw new NotFoundError(`Pessoa jurídica com id ${id} não encontrada.`);
    return PessoaJuridica.fromDatabase(row);
  }

  depositar(id: number, valor: number): PessoaJuridica {
    const pj = this.buscarPorId(id);
    pj.depositar(valor);
    db.prepare('UPDATE pessoa_juridica SET saldo = ? WHERE id = ?').run(pj.saldo, id);
    return pj;
  }

  sacar(id: number, valor: number): ResultadoSaque {
    if (valor > LIMITE_SAQUE) {
      throw new LimitExceededError(
        `Limite máximo por saque para Pessoa Jurídica é R$ ${LIMITE_SAQUE.toFixed(2)}.`,
      );
    }

    const pj = this.buscarPorId(id);
    const taxa = valor * TAXA_SAQUE[pj.categoria];
    const totalDebitado = valor + taxa;
    const saldoAnterior = pj.saldo;

    const sucesso = pj.sacar(totalDebitado);
    if (!sucesso) {
      throw new SaldoInsuficienteError(
        `Saldo insuficiente. Saldo atual: R$ ${saldoAnterior.toFixed(2)}, ` +
        `total a debitar (com taxa de ${(TAXA_SAQUE[pj.categoria] * 100).toFixed(1)}%): ` +
        `R$ ${totalDebitado.toFixed(2)}.`,
      );
    }

    db.prepare('UPDATE pessoa_juridica SET saldo = ? WHERE id = ?').run(pj.saldo, id);

    return { valorSolicitado: valor, taxa, totalDebitado, saldoAnterior, saldoAtual: pj.saldo };
  }

  gerarExtrato(id: number): string {
    return this.buscarPorId(id).gerarExtrato();
  }
}

export const pessoaJuridicaService = new PessoaJuridicaService();
