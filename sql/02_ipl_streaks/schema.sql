-- Scenario 2: IPL-style player performance streaks
-- SQLite (also runs on PostgreSQL with DATE instead of TEXT for match_date)

DROP TABLE IF EXISTS batting_scores;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  player_id  INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  team       TEXT NOT NULL
);

CREATE TABLE matches (
  match_id    INTEGER PRIMARY KEY,
  season      INTEGER NOT NULL,
  match_date  TEXT NOT NULL,               -- 'YYYY-MM-DD'
  team1       TEXT NOT NULL,
  team2       TEXT NOT NULL
);

-- one row per player per match they BATTED in. Did-not-bat = no row.
CREATE TABLE batting_scores (
  match_id   INTEGER NOT NULL REFERENCES matches(match_id),
  player_id  INTEGER NOT NULL REFERENCES players(player_id),
  runs       INTEGER NOT NULL CHECK (runs >= 0),
  PRIMARY KEY (match_id, player_id)
);
