import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'bank.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initialize(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pessoa_fisica (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      renda_mensal  REAL    NOT NULL DEFAULT 0,
      idade         INTEGER NOT NULL,
      nome_completo TEXT    NOT NULL,
      celular       TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      categoria     TEXT    NOT NULL DEFAULT 'comum'
                            CHECK(categoria IN ('comum', 'super', 'premium')),
      saldo         REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pessoa_juridica (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      receita_mensal  REAL    NOT NULL DEFAULT 0,
      cnpj            TEXT    NOT NULL UNIQUE,
      razao_social    TEXT    NOT NULL,
      celular         TEXT    NOT NULL,
      email           TEXT    NOT NULL UNIQUE,
      categoria       TEXT    NOT NULL DEFAULT 'comum'
                              CHECK(categoria IN ('comum', 'super', 'premium')),
      saldo           REAL    NOT NULL DEFAULT 0
    );
  `);
}

initialize();

export default db;
