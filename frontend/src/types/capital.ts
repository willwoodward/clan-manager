export interface CapitalRaidMember {
  tag: string
  name: string
  attacks: number
  attackLimit: number
  bonusAttackLimit: number
  capitalResourcesLooted: number
}

export interface CapitalAttack {
  attacker: {
    tag: string
    name: string
  }
  destructionPercent: number
  stars: number
}

export interface CapitalDistrict {
  id: number
  name: string
  districtHallLevel: number
  destructionPercent: number
  stars: number
  attackCount: number
  totalLooted: number
  attacks?: CapitalAttack[]
}

export interface CapitalRaidAttackLog {
  defender: {
    tag: string
    name: string
    level: number
    badgeUrls: {
      small: string
      large: string
      medium: string
    }
  }
  attackCount: number
  districtCount: number
  districtsDestroyed: number
  districts: CapitalDistrict[]
}

export interface CapitalRaidDefenseLog {
  attacker: {
    tag: string
    name: string
    level: number
    badgeUrls: {
      small: string
      large: string
      medium: string
    }
  }
  attackCount: number
  districtCount: number
  districtsDestroyed: number
  districts: CapitalDistrict[]
}

export interface CapitalRaidSeason {
  state: 'ongoing' | 'ended'
  startTime: string
  endTime: string
  capitalTotalLoot: number
  raidsCompleted: number
  totalAttacks: number
  enemyDistrictsDestroyed: number
  offensiveReward: number
  defensiveReward: number
  members: CapitalRaidMember[]
  attackLog: CapitalRaidAttackLog[]
  defenseLog: CapitalRaidDefenseLog[]
}

export interface CapitalRaidSeasons {
  items: CapitalRaidSeason[]
  paging?: {
    cursors: {
      after?: string
      before?: string
    }
  }
}
