-- Scenario 1: A sends money to B, then B sends a similar amount (within 10%) back to A
-- within 24 hours.
--
-- Rules / assumptions:
--   * "within 10%" is measured against the ORIGINAL amount: |returned - sent| <= 10% of sent
--     (written as * 10 <= sent so there's no floating point division)
--   * the return has to come AFTER the original, at most 24 hours later (both limits inclusive)
--   * if one transfer has two returns that both qualify, both rows are reported

SELECT
  t1.from_account                                        AS account_a,
  t1.to_account                                          AS account_b,
  t1.txn_id                                              AS sent_txn,
  t1.amount                                              AS sent_amount,
  t1.created_at                                          AS sent_at,
  t2.txn_id                                              AS returned_txn,
  t2.amount                                              AS returned_amount,
  t2.created_at                                          AS returned_at,
  ROUND((unixepoch(t2.created_at) - unixepoch(t1.created_at)) / 3600.0, 2)  AS hours_between,
  ROUND((t2.amount - t1.amount) * 100.0 / t1.amount, 2)  AS pct_difference
FROM transactions t1
JOIN transactions t2
  ON  t2.from_account = t1.to_account      -- B sends ...
  AND t2.to_account   = t1.from_account    -- ... back to A
  AND unixepoch(t2.created_at) >  unixepoch(t1.created_at)
  AND unixepoch(t2.created_at) <= unixepoch(t1.created_at) + 24 * 3600
  AND ABS(t2.amount - t1.amount) * 10 <= t1.amount
ORDER BY t1.created_at, t2.created_at;

-- PostgreSQL version of the time condition (created_at as TIMESTAMP):
--   AND t2.created_at >  t1.created_at
--   AND t2.created_at <= t1.created_at + INTERVAL '24 hours'
