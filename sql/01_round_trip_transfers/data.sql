-- Test data: every pair below is there to check one rule. Expected result = 7 rows.

INSERT INTO accounts (account_id, holder_name) VALUES
  ('ACC-A', 'Asha'),   ('ACC-B', 'Bilal'),  ('ACC-C', 'Chen'),   ('ACC-D', 'Divya'),
  ('ACC-E', 'Elena'),  ('ACC-F', 'Farhan'), ('ACC-G', 'Grace'),  ('ACC-H', 'Hari'),
  ('ACC-I', 'Isha'),   ('ACC-J', 'Jonas'),  ('ACC-K', 'Kiran'),  ('ACC-L', 'Leo'),
  ('ACC-M', 'Maya'),   ('ACC-N', 'Nadia'),  ('ACC-O', 'Omar'),   ('ACC-P', 'Priya'),
  ('ACC-Q', 'Quinn'),  ('ACC-R', 'Ravi'),   ('ACC-S', 'Sara'),   ('ACC-U', 'Uma'),
  ('ACC-V', 'Victor'), ('ACC-W', 'Wen'),    ('ACC-X', 'Xavier'), ('ACC-Y', 'Yusuf'),
  ('ACC-Z', 'Zara');

INSERT INTO transactions (txn_id, from_account, to_account, amount, created_at) VALUES
  -- MATCH: 5% less, 2.5 hours later
  (1,  'ACC-A', 'ACC-B', 1000.00, '2024-06-01 10:00:00'),
  (2,  'ACC-B', 'ACC-A',  950.00, '2024-06-01 12:30:00'),

  -- NO: 11% less (outside 10%)
  (3,  'ACC-C', 'ACC-D', 2000.00, '2024-06-02 09:00:00'),
  (4,  'ACC-D', 'ACC-C', 1780.00, '2024-06-02 15:00:00'),

  -- MATCH: exactly 10% less (boundary is inclusive)
  (5,  'ACC-E', 'ACC-F', 5000.00, '2024-06-03 08:00:00'),
  (6,  'ACC-F', 'ACC-E', 4500.00, '2024-06-03 20:00:00'),

  -- NO: same amount but 25 hours later
  (7,  'ACC-G', 'ACC-H',  750.00, '2024-06-04 10:00:00'),
  (8,  'ACC-H', 'ACC-G',  750.00, '2024-06-05 11:00:00'),

  -- MATCH: exactly 24 hours later (boundary is inclusive), 4.2% more
  (9,  'ACC-I', 'ACC-J', 1200.00, '2024-06-06 09:00:00'),
  (10, 'ACC-J', 'ACC-I', 1250.00, '2024-06-07 09:00:00'),

  -- NO: money moves on to a third account, not back
  (11, 'ACC-K', 'ACC-L', 3000.00, '2024-06-08 10:00:00'),
  (12, 'ACC-L', 'ACC-M', 3000.00, '2024-06-08 11:00:00'),

  -- NO: same direction twice
  (13, 'ACC-N', 'ACC-O',  400.00, '2024-06-09 10:00:00'),
  (14, 'ACC-N', 'ACC-O',  400.00, '2024-06-09 11:00:00'),

  -- MATCH: the return is 8% MORE than what was sent (within 10% works both ways)
  (15, 'ACC-P', 'ACC-Q', 10000.00, '2024-06-10 10:00:00'),
  (16, 'ACC-Q', 'ACC-P', 10800.00, '2024-06-10 18:00:00'),

  -- MATCH x2: one transfer, two possible returns - both are reported
  (17, 'ACC-R', 'ACC-S',  600.00, '2024-06-11 10:00:00'),
  (18, 'ACC-S', 'ACC-R',  590.00, '2024-06-11 11:00:00'),
  (19, 'ACC-S', 'ACC-R',  610.00, '2024-06-11 13:00:00'),

  -- MATCH: V sends first, U sends back - so V is "account A" here
  (20, 'ACC-U', 'ACC-V',  820.00, '2024-06-12 09:00:00'),
  (21, 'ACC-V', 'ACC-U',  800.00, '2024-06-12 08:00:00'),

  -- noise
  (22, 'ACC-W', 'ACC-X',   50.00, '2024-06-13 10:00:00'),
  (23, 'ACC-Y', 'ACC-Z', 99999.00, '2024-06-13 10:05:00');
