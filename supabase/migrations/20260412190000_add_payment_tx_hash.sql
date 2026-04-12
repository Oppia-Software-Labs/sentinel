-- Add Stellar governance hash and x402 payment hash columns to transactions

alter table transactions
  add column if not exists stellar_tx_hash text,  -- Stellar tx hash from Soroban evaluate (governance on-chain record)
  add column if not exists payment_tx_hash text;  -- Stellar tx hash from x402 USDC payment
