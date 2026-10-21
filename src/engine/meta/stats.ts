// Lifetime counters for quests and achievements. All but `boostersUsed` grow only when a level is
// won, from that run's final state, so Undo, restarts and abandoned runs never inflate them;
// `boostersUsed` grows on every paid booster.
export interface Stats {
  levelsWon: number;
  triplesCleared: number;
  threeStarWins: number;
  // Items taken that had been covered earlier in the run.
  coveredTaken: number;
  boostersUsed: number;
}

// What one won run adds.
export interface RunSummary {
  levelIndex: number;
  triples: number;
  stars: number;
  coveredTaken: number;
}

export function emptyStats(): Stats {
  return { levelsWon: 0, triplesCleared: 0, threeStarWins: 0, coveredTaken: 0, boostersUsed: 0 };
}

export function addRun(stats: Stats, run: RunSummary): Stats {
  return {
    ...stats,
    levelsWon: stats.levelsWon + 1,
    triplesCleared: stats.triplesCleared + run.triples,
    threeStarWins: stats.threeStarWins + (run.stars === 3 ? 1 : 0),
    coveredTaken: stats.coveredTaken + run.coveredTaken,
  };
}
