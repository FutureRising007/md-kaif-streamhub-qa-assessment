-- Made-up IPL-style data (fictional players, real team codes). 4 teams play each other 3 times
-- in the 2024 season = 18 matches, 9 per team, every 2 days from 22 Mar 2024.
-- Plus 2 matches from 2023 to check the season filter. Expected result = 5 streaks.

INSERT INTO players (player_id, name, team) VALUES
  (1, 'Mohammad Kaif Ahmed',   'MI'),   -- exactly 3 in a row, first score is exactly 30      -> 1 streak
  (2, 'Rohan Kale',    'MI'),   -- two separate streaks (3, then 4)                    -> 2 streaks
  (3, 'Vikram Iyer',   'CSK'),  -- 30, 40, 29, ... - 29 breaks it, never 3 in a row    -> none
  (4, 'Sanjay Rao',    'CSK'),  -- only pairs                                          -> none
  (5, 'Kabir Singh',   'RCB'),  -- 70, 65 at the end of 2023 + 48 in 2024 = 3 only if
                                --   the season filter is missing                       -> none
  (6, 'Dev Malhotra',  'RCB'),  -- 35, did not bat, 40, 45 - DNB doesn't break it       -> 1 streak
  (7, 'Nikhil Bose',   'KKR'),  -- 5 in a row                                          -> 1 streak
  (8, 'Aakash Verma',  'KKR');  -- 29 then 30 - near misses                             -> none

INSERT INTO matches (match_id, season, match_date, team1, team2) VALUES
  (101, 2023, '2023-05-18', 'RCB', 'MI'),
  (102, 2023, '2023-05-21', 'RCB', 'CSK'),
  (1,  2024, '2024-03-22', 'MI',  'CSK'),
  (2,  2024, '2024-03-24', 'RCB', 'KKR'),
  (3,  2024, '2024-03-26', 'MI',  'RCB'),
  (4,  2024, '2024-03-28', 'CSK', 'KKR'),
  (5,  2024, '2024-03-30', 'MI',  'KKR'),
  (6,  2024, '2024-04-01', 'CSK', 'RCB'),
  (7,  2024, '2024-04-03', 'MI',  'CSK'),
  (8,  2024, '2024-04-05', 'RCB', 'KKR'),
  (9,  2024, '2024-04-07', 'MI',  'RCB'),
  (10, 2024, '2024-04-09', 'CSK', 'KKR'),
  (11, 2024, '2024-04-11', 'MI',  'KKR'),
  (12, 2024, '2024-04-13', 'CSK', 'RCB'),
  (13, 2024, '2024-04-15', 'MI',  'CSK'),
  (14, 2024, '2024-04-17', 'RCB', 'KKR'),
  (15, 2024, '2024-04-19', 'MI',  'RCB'),
  (16, 2024, '2024-04-21', 'CSK', 'KKR'),
  (17, 2024, '2024-04-23', 'MI',  'KKR'),
  (18, 2024, '2024-04-25', 'CSK', 'RCB');

-- MI play matches 1,3,5,7,9,11,13,15,17   CSK: 1,4,6,7,10,12,13,16,18
-- RCB: 2,3,6,8,9,12,14,15,18              KKR: 2,4,5,8,10,11,14,16,17
INSERT INTO batting_scores (match_id, player_id, runs) VALUES
  -- Mohammad Kaif Ahmed (MI): 30, 45, 31 | 12 ...
  (1,1,30), (3,1,45), (5,1,31), (7,1,12), (9,1,8), (11,1,22), (13,1,5), (15,1,17), (17,1,40),
  -- Rohan Kale (MI): 55, 62, 34 | 10 | 41, 38, 77, 90 | 3
  (1,2,55), (3,2,62), (5,2,34), (7,2,10), (9,2,41), (11,2,38), (13,2,77), (15,2,90), (17,2,3),
  -- Vikram Iyer (CSK): 30, 40 | 29 | 50, 60 | 15 | 33, 31 | 8
  (1,3,30), (4,3,40), (6,3,29), (7,3,50), (10,3,60), (12,3,15), (13,3,33), (16,3,31), (18,3,8),
  -- Sanjay Rao (CSK): 44, 52 | 2, 6, 18 | 31, 35 | 0, 11
  (1,4,44), (4,4,52), (6,4,2), (7,4,6), (10,4,18), (12,4,31), (13,4,35), (16,4,0), (18,4,11),
  -- Kabir Singh (RCB): 2023: 70, 65 / 2024: 48 | 9 | 33, 30 | 12 | 64 | 25, 19 | 36
  (101,5,70), (102,5,65),
  (2,5,48), (3,5,9), (6,5,33), (8,5,30), (9,5,12), (12,5,64), (14,5,25), (15,5,19), (18,5,36),
  -- Dev Malhotra (RCB): 35, (did not bat in match 3), 40, 45 | 7 ...
  (2,6,35), (6,6,40), (8,6,45), (9,6,7), (12,6,21), (14,6,13), (15,6,2), (18,6,30),
  -- Nikhil Bose (KKR): 31, 56, 88, 42, 39 | 4 ...
  (2,7,31), (4,7,56), (5,7,88), (8,7,42), (10,7,39), (11,7,4), (14,7,27), (16,7,60), (17,7,12),
  -- Aakash Verma (KKR): 0, 12, 29, 30, 1 ...
  (2,8,0), (4,8,12), (5,8,29), (8,8,30), (10,8,1), (11,8,14), (14,8,22), (16,8,9), (17,8,11);
