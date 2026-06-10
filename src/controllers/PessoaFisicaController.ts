import { Request, Response } from 'express';
import { pessoaFisicaService } from '../services/PessoaFisicaService';
import { handleError } from '../utils/handleError';

class PessoaFisicaController {
  criar(req: Request, res: Response): void {
    try {
      const pf = pessoaFisicaService.criar(req.body);
      res.status(201).json(pf);
    } catch (err) {
      handleError(err, res);
    }
  }

  listar(_req: Request, res: Response): void {
    try {
      const lista = pessoaFisicaService.listar();
      res.status(200).json(lista);
    } catch (err) {
      handleError(err, res);
    }
  }

  sacar(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id as string, 10);
      const valor = Number(req.body.valor);

      if (isNaN(id) || isNaN(valor)) {
        res.status(400).json({ erro: 'Parâmetros inválidos: id e valor devem ser numéricos.' });
        return;
      }

      const resultado = pessoaFisicaService.sacar(id, valor);
      res.status(200).json(resultado);
    } catch (err) {
      handleError(err, res);
    }
  }

  extrato(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ erro: 'Parâmetro id inválido.' });
        return;
      }
      const extrato = pessoaFisicaService.gerarExtrato(id);
      res.status(200).json({ extrato });
    } catch (err) {
      handleError(err, res);
    }
  }
}

export const pfController = new PessoaFisicaController();
