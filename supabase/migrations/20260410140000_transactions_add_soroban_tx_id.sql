-- Add soroban_tx_id to transactions table
-- Required by sentinel-sdk to link Supabase records to on-chain Soroban transactions

alter table transactions
  add column if not exists soroban_tx_id text;

create index if not exists transactions_soroban_tx_id_idx on transactions (soroban_tx_id);
