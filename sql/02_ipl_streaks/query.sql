-- Scenario 2: players who scored 30+ runs in at least 3 consecutive matches in the 2024
-- season. Returns the player and the date the streak started (+ end date and length).
--
-- Rules / assumptions:
--   * "consecutive matches" = consecutive matches the PLAYER BATTED IN that season. A match
--     they didn't bat in (no row) doesn't break the streak. (If it should - i.e. consecutive
--     TEAM matches - number the team's matches instead of the player's innings.)
--   * 30 counts (30+ means >= 30)
--   * only 2024 matches count - a streak can't carry over from 2023
--   * a player with two separate streaks gets two rows
--
-- How it works ("gaps and islands"):
--   rn_all  = 1, 2, 3 ... over ALL the player's innings in date order
--   rn_30   = 1, 2, 3 ... over only the 30+ innings
--   For innings in an unbroken 30+ run both numbers go up by 1 together, so rn_all - rn_30
--   stays the same. Any innings under 30 bumps rn_all but not rn_30, so the next run gets a
--   different value. Group by that value = one group per streak.

WITH innings AS (
  SELECT
    b.player_id,
    p.name,
    m.match_id,
    m.match_date,
    b.runs,
    ROW_NUMBER() OVER (PARTITION BY b.player_id ORDER BY m.match_date, m.match_id) AS rn_all
  FROM batting_scores b
  JOIN matches m ON m.match_id = b.match_id
  JOIN players p ON p.player_id = b.player_id
  WHERE m.season = 2024
),
thirty_plus AS (
  SELECT
    *,
    rn_all - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY match_date, match_id) AS streak_grp
  FROM innings
  WHERE runs >= 30
)
SELECT
  name               AS player_name,
  MIN(match_date)    AS streak_start_date,
  MAX(match_date)    AS streak_end_date,
  COUNT(*)           AS matches_in_streak
FROM thirty_plus
GROUP BY player_id, name, streak_grp
HAVING COUNT(*) >= 3
ORDER BY streak_start_date, player_name;
