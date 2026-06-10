import { Router } from 'express';
import { pfController } from './controllers/PessoaFisicaController';
import { pjController } from './controllers/PessoaJuridicaController';

const router = Router();

// Pessoa Física
router.post('/clientes/pf',             (req, res) => pfController.criar(req, res));
router.get('/clientes/pf',              (req, res) => pfController.listar(req, res));
router.post('/clientes/pf/:id/sacar',   (req, res) => pfController.sacar(req, res));
router.get('/clientes/pf/:id/extrato',  (req, res) => pfController.extrato(req, res));

// Pessoa Jurídica
router.post('/clientes/pj',             (req, res) => pjController.criar(req, res));
router.get('/clientes/pj',              (req, res) => pjController.listar(req, res));
router.post('/clientes/pj/:id/sacar',   (req, res) => pjController.sacar(req, res));
router.get('/clientes/pj/:id/extrato',  (req, res) => pjController.extrato(req, res));

export default router;
