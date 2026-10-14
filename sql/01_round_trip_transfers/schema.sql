-- Scenario 1: round-trip transfers
-- SQLite (also runs on PostgreSQL with TIMESTAMP instead of TEXT for created_at)

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
  account_id   TEXT PRIMARY KEY,
  holder_name  TEXT NOT NULL
);

CREATE TABLE transactions (
  txn_id        INTEGER PRIMARY KEY,
  from_account  TEXT NOT NULL REFERENCES accounts(account_id),
  to_account    TEXT NOT NULL REFERENCES accounts(account_id),
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at    TEXT NOT NULL,            -- 'YYYY-MM-DD HH:MM:SS' (UTC)
  CHECK (from_account <> to_account)
);

-- the self-join looks up "transfers from B to A" so index that direction
CREATE INDEX idx_txn_from_to ON transactions (from_account, to_account, created_at);
