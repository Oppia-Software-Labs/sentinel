-- Add lifecycle timestamp columns to mpp_sessions
-- opened_at: when the session was created (explicit, not relying on created_at auto)
-- closed_at: when the session was closed or killed

alter table mpp_sessions
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz;
