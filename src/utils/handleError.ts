import { Response } from 'express';
import {
  ValidationError,
  NotFoundError,
  LimitExceededError,
  SaldoInsuficienteError,
} from '../errors/AppError';

export function handleError(err: unknown, res: Response): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ erro: err.message });
    return;
  }
  if (err instanceof LimitExceededError || err instanceof ValidationError) {
    res.status(400).json({ erro: err.message });
    return;
  }
  if (err instanceof SaldoInsuficienteError) {
    res.status(422).json({ erro: err.message });
    return;
  }
  console.error('[Erro inesperado]', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}
