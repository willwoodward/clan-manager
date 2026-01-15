export type ClanType = 'monitored' | 'default'

export interface ClanInfo {
  tag: string
  name: string
  type: ClanType
  badgeUrl?: string
}

// Features that require historical data (monitored clan only)
export type HistoricalFeature =
  | 'warPredictions'
  | 'lineupOptimizer'
  | 'playerStats'
  | 'warHistory'
  | 'clanGamesHistory'
  | 'cwlHistory'

// Features available for any clan (live API)
export type LiveFeature =
  | 'clanInfo'
  | 'memberList'
  | 'currentWar'
  | 'cwlGroup'
  | 'capitalRaidSeason'
