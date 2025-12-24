// Trophy League data for Clash of Clans
// Based on the new trophy road system

export interface TrophyLeague {
  id: number
  name: string
  minTrophies: number
  maxTrophies: number
  iconUrl: string
  color: string
}

// Complete list of all trophy leagues (34 total)
export const TROPHY_LEAGUES: TrophyLeague[] = [
  { id: 29000000, name: 'Unranked', minTrophies: 0, maxTrophies: 399, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/unranked.png', color: '#9CA3AF' },

  // Bronze (400-799)
  { id: 29000001, name: 'Bronze League III', minTrophies: 400, maxTrophies: 499, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league01.png', color: '#CD7F32' },
  { id: 29000002, name: 'Bronze League II', minTrophies: 500, maxTrophies: 599, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league02.png', color: '#CD7F32' },
  { id: 29000003, name: 'Bronze League I', minTrophies: 600, maxTrophies: 799, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league03.png', color: '#CD7F32' },

  // Silver (800-1399)
  { id: 29000004, name: 'Silver League III', minTrophies: 800, maxTrophies: 999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league04.png', color: '#C0C0C0' },
  { id: 29000005, name: 'Silver League II', minTrophies: 1000, maxTrophies: 1199, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league05.png', color: '#C0C0C0' },
  { id: 29000006, name: 'Silver League I', minTrophies: 1200, maxTrophies: 1399, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league06.png', color: '#C0C0C0' },

  // Gold (1400-1999)
  { id: 29000007, name: 'Gold League III', minTrophies: 1400, maxTrophies: 1599, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league07.png', color: '#FFD700' },
  { id: 29000008, name: 'Gold League II', minTrophies: 1600, maxTrophies: 1799, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league08.png', color: '#FFD700' },
  { id: 29000009, name: 'Gold League I', minTrophies: 1800, maxTrophies: 1999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league09.png', color: '#FFD700' },

  // Crystal (2000-2599)
  { id: 29000010, name: 'Crystal League III', minTrophies: 2000, maxTrophies: 2199, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league10.png', color: '#E8ADF0' },
  { id: 29000011, name: 'Crystal League II', minTrophies: 2200, maxTrophies: 2399, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league11.png', color: '#E8ADF0' },
  { id: 29000012, name: 'Crystal League I', minTrophies: 2400, maxTrophies: 2599, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league12.png', color: '#E8ADF0' },

  // Master (2600-3199)
  { id: 29000013, name: 'Master League III', minTrophies: 2600, maxTrophies: 2799, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league13.png', color: '#1E293B' },
  { id: 29000014, name: 'Master League II', minTrophies: 2800, maxTrophies: 2999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league14.png', color: '#1E293B' },
  { id: 29000015, name: 'Master League I', minTrophies: 3000, maxTrophies: 3199, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league15.png', color: '#1E293B' },

  // Champion (3200-3999)
  { id: 29000016, name: 'Champion League III', minTrophies: 3200, maxTrophies: 3499, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league16.png', color: '#F59E0B' },
  { id: 29000017, name: 'Champion League II', minTrophies: 3500, maxTrophies: 3799, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league17.png', color: '#F59E0B' },
  { id: 29000018, name: 'Champion League I', minTrophies: 3800, maxTrophies: 3999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league18.png', color: '#F59E0B' },

  // Titan (4000-4999)
  { id: 29000019, name: 'Titan League III', minTrophies: 4000, maxTrophies: 4299, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league19.png', color: '#8B5CF6' },
  { id: 29000020, name: 'Titan League II', minTrophies: 4300, maxTrophies: 4599, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league20.png', color: '#8B5CF6' },
  { id: 29000021, name: 'Titan League I', minTrophies: 4600, maxTrophies: 4999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/league21.png', color: '#8B5CF6' },

  // Legend (5000+)
  { id: 29000022, name: 'Legend League', minTrophies: 5000, maxTrophies: 999999, iconUrl: 'https://api-assets.clashofclans.com/leagues/72/R2zmhyqQ0_lKcDR5EyghXCxgyC9mm_mVMIjAbmGoZtw.png', color: '#EF4444' },
]

// Helper to get league by trophy count
export function getLeagueByTrophies(trophies: number): TrophyLeague {
  for (const league of TROPHY_LEAGUES) {
    if (trophies >= league.minTrophies && trophies <= league.maxTrophies) {
      return league
    }
  }
  return TROPHY_LEAGUES[0] // Unranked
}

// Helper to get league by ID
export function getLeagueById(id: number): TrophyLeague | undefined {
  return TROPHY_LEAGUES.find(l => l.id === id)
}

// Helper to get league by name
export function getLeagueByName(name: string): TrophyLeague | undefined {
  return TROPHY_LEAGUES.find(l => l.name === name)
}

// Calculate distribution of members across leagues
export interface LeagueDistribution {
  league: TrophyLeague
  count: number
  percentage: number
  members: Array<{ name: string; tag: string; trophies: number }>
}

export function calculateLeagueDistribution(
  members: Array<{ name: string; tag: string; trophies: number; league?: { id: number; name: string } }>
): LeagueDistribution[] {
  const distribution = new Map<number, LeagueDistribution>()

  // Initialize all leagues with 0 count
  TROPHY_LEAGUES.forEach(league => {
    distribution.set(league.id, {
      league,
      count: 0,
      percentage: 0,
      members: [],
    })
  })

  // Count members in each league
  members.forEach(member => {
    const league = member.league
      ? getLeagueById(member.league.id) || getLeagueByTrophies(member.trophies)
      : getLeagueByTrophies(member.trophies)

    const dist = distribution.get(league.id)
    if (dist) {
      dist.count++
      dist.members.push({
        name: member.name,
        tag: member.tag,
        trophies: member.trophies,
      })
    }
  })

  // Calculate percentages
  const total = members.length
  distribution.forEach(dist => {
    dist.percentage = total > 0 ? (dist.count / total) * 100 : 0
  })

  // Return only leagues with members, sorted by trophy range (descending)
  return Array.from(distribution.values())
    .filter(dist => dist.count > 0)
    .sort((a, b) => b.league.minTrophies - a.league.minTrophies)
}
