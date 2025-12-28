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

// Saved raid data format (from event monitor - uses snake_case)
export interface SavedRaidMember {
  tag: string
  name: string
  attack_count: number
  attack_limit: number
  bonus_attack_limit: number
  capital_resources_looted: number
}

export interface SavedRaidData {
  raid_id: string
  end_time: string
  start_time?: string
  clan_name: string
  clan_tag: string
  clan_level: number
  capital_hall_level: number
  capital_points?: number
  total_capital_loot: number
  raids_completed: number
  attacks_used: number
  state: 'ongoing' | 'ended'
  offensive_reward: number
  defensive_reward: number
  enemy_districts_destroyed: number
  members: SavedRaidMember[]
}
