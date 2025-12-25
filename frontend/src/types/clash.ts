export interface ClanMember {
  tag: string
  name: string
  role: 'leader' | 'coLeader' | 'admin' | 'member'
  expLevel: number
  league: {
    id: number
    name: string
    iconUrls: {
      small: string
      tiny: string
      medium: string
    }
  }
  leagueTier?: {
    id: number
    name: string
    iconUrls: {
      small: string
      large: string
    }
  }
  trophies: number
  clanRank: number
  previousClanRank: number
  donations: number
  donationsReceived: number
  townHallLevel: number
  builderHallLevel: number
  builderBaseTrophies?: number
  builderBaseLeague?: {
    id: number
    name: string
  }
}

export interface Clan {
  tag: string
  name: string
  type: string
  description: string
  location: {
    id: number
    name: string
    isCountry: boolean
  }
  badgeUrls: {
    small: string
    large: string
    medium: string
  }
  clanLevel: number
  clanPoints: number
  clanVersusPoints: number
  clanCapitalPoints: number
  requiredTrophies: number
  warFrequency: string
  warWinStreak: number
  warWins: number
  warTies: number
  warLosses: number
  isWarLogPublic: boolean
  warLeague: {
    id: number
    name: string
    iconUrls?: {
      small: string
      tiny: string
      medium: string
    }
  }
  members: number
  memberList: ClanMember[]
  labels: Array<{
    id: number
    name: string
    iconUrls: {
      small: string
      medium: string
    }
  }>
}

export interface WarClan {
  tag: string
  name: string
  badgeUrls: {
    small: string
    large: string
    medium: string
  }
  clanLevel: number
  attacks: number
  stars: number
  destructionPercentage: number
  members: Array<{
    tag: string
    name: string
    townhallLevel: number
    mapPosition: number
    attacks?: Array<{
      attackerTag: string
      defenderTag: string
      stars: number
      destructionPercentage: number
      order: number
    }>
    bestOpponentAttack?: {
      attackerTag: string
      defenderTag: string
      stars: number
      destructionPercentage: number
      order: number
    }
  }>
}

export interface War {
  state: 'notInWar' | 'preparation' | 'inWar' | 'warEnded'
  teamSize: number
  preparationStartTime: string
  startTime: string
  endTime: string
  clan: WarClan
  opponent: WarClan
  attacksPerMember?: number
}
