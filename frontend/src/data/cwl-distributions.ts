// CWL Town Hall Distribution Data (15v15 format, November 2025)
// This data represents the average number of each TH level per clan in each CWL league

export interface THDistribution {
  [key: string]: number // TH level (e.g., "TH17", "TH16") -> average count
}

export interface CWLDistributionData {
  league: string
  distribution: THDistribution
  clansSampled: number
}

// League names mapping
export const LEAGUE_NAMES = {
  'Bronze III': 'Bronze III',
  'Bronze II': 'Bronze II',
  'Bronze I': 'Bronze I',
  'Silver III': 'Silver III',
  'Silver II': 'Silver II',
  'Silver I': 'Silver I',
  'Gold III': 'Gold III',
  'Gold II': 'Gold II',
  'Gold I': 'Gold I',
  'Crystal III': 'Crystal III',
  'Crystal II': 'Crystal II',
  'Crystal I': 'Crystal I',
  'Master III': 'Master III',
  'Master II': 'Master II',
  'Master I': 'Master I',
  'Champion III': 'Champion III',
  'Champion II': 'Champion II',
  'Champion I': 'Champion I',
} as const

// Data extracted from table-15v15-2511.md
export const CWL_TH_DISTRIBUTIONS: Record<string, CWLDistributionData> = {
  'Bronze III': {
    league: 'Bronze III',
    clansSampled: 1752,
    distribution: {
      TH17: 0.1907, TH16: 0.1233, TH15: 0.1557, TH14: 0.2343, TH13: 0.5095,
      TH12: 0.6239, TH11: 0.7734, TH10: 0.8021, TH9: 1.0726, TH8: 1.1500,
      TH7: 1.4437, TH6: 1.6778, TH5: 2.2281, TH4: 1.8622, TH3: 1.6636,
      TH2: 0.4263, TH1: 0.0629,
    },
  },
  'Bronze II': {
    league: 'Bronze II',
    clansSampled: 4076,
    distribution: {
      TH17: 0.2372, TH16: 0.1565, TH15: 0.2467, TH14: 0.3653, TH13: 0.7478,
      TH12: 0.9520, TH11: 1.1524, TH10: 1.1785, TH9: 1.6077, TH8: 1.6402,
      TH7: 1.6316, TH6: 1.4997, TH5: 1.5675, TH4: 1.1323, TH3: 0.7956,
      TH2: 0.0766, TH1: 0.0124,
    },
  },
  'Bronze I': {
    league: 'Bronze I',
    clansSampled: 10774,
    distribution: {
      TH17: 0.3222, TH16: 0.2751, TH15: 0.4146, TH14: 0.6055, TH13: 1.1765,
      TH12: 1.4890, TH11: 1.6044, TH10: 1.5012, TH9: 1.8951, TH8: 1.7071,
      TH7: 1.3322, TH6: 0.8632, TH5: 0.7768, TH4: 0.5571, TH3: 0.4431,
      TH2: 0.0345, TH1: 0.0024,
    },
  },
  'Silver III': {
    league: 'Silver III',
    clansSampled: 40202,
    distribution: {
      TH17: 0.4144, TH16: 0.3576, TH15: 0.5491, TH14: 0.8303, TH13: 1.4882,
      TH12: 1.7403, TH11: 1.8661, TH10: 1.7488, TH9: 2.1351, TH8: 1.5637,
      TH7: 0.8692, TH6: 0.4585, TH5: 0.4023, TH4: 0.2771, TH3: 0.2718,
      TH2: 0.0263, TH1: 0.0011,
    },
  },
  'Silver II': {
    league: 'Silver II',
    clansSampled: 50826,
    distribution: {
      TH17: 0.4679, TH16: 0.4385, TH15: 0.6858, TH14: 1.0472, TH13: 1.8272,
      TH12: 2.0467, TH11: 2.2182, TH10: 1.9726, TH9: 1.9136, TH8: 1.0693,
      TH7: 0.5151, TH6: 0.2589, TH5: 0.2034, TH4: 0.1462, TH3: 0.1664,
      TH2: 0.0227, TH1: 0.0004,
    },
  },
  'Silver I': {
    league: 'Silver I',
    clansSampled: 65954,
    distribution: {
      TH17: 0.5943, TH16: 0.5648, TH15: 0.8895, TH14: 1.3563, TH13: 2.2823,
      TH12: 2.4480, TH11: 2.3473, TH10: 1.7019, TH9: 1.3549, TH8: 0.6815,
      TH7: 0.3076, TH6: 0.1581, TH5: 0.1174, TH4: 0.0847, TH3: 0.0970,
      TH2: 0.0142, TH1: 0.0002,
    },
  },
  'Gold III': {
    league: 'Gold III',
    clansSampled: 82660,
    distribution: {
      TH17: 0.7784, TH16: 0.7359, TH15: 1.1709, TH14: 1.7617, TH13: 2.7935,
      TH12: 2.6745, TH11: 2.1048, TH10: 1.2486, TH9: 0.8731, TH8: 0.4137,
      TH7: 0.1795, TH6: 0.0927, TH5: 0.0667, TH4: 0.0483, TH3: 0.0508,
      TH2: 0.0067, TH1: 0.0001,
    },
  },
  'Gold II': {
    league: 'Gold II',
    clansSampled: 101238,
    distribution: {
      TH17: 1.1066, TH16: 0.9938, TH15: 1.5822, TH14: 2.2746, TH13: 3.2086,
      TH12: 2.4810, TH11: 1.5964, TH10: 0.7892, TH9: 0.5158, TH8: 0.2255,
      TH7: 0.0954, TH6: 0.0470, TH5: 0.0313, TH4: 0.0225, TH3: 0.0257,
      TH2: 0.0044, TH1: 0.0001,
    },
  },
  'Gold I': {
    league: 'Gold I',
    clansSampled: 103428,
    distribution: {
      TH17: 1.7782, TH16: 1.4721, TH15: 2.2609, TH14: 2.9268, TH13: 3.2090,
      TH12: 1.7883, TH11: 0.8491, TH10: 0.3556, TH9: 0.2047, TH8: 0.0794,
      TH7: 0.0326, TH6: 0.0169, TH5: 0.0098, TH4: 0.0076, TH3: 0.0076,
      TH2: 0.0012, TH1: 0.0000,
    },
  },
  'Crystal III': {
    league: 'Crystal III',
    clansSampled: 92736,
    distribution: {
      TH17: 2.9929, TH16: 2.1982, TH15: 3.0396, TH14: 3.1252, TH13: 2.2410,
      TH12: 0.8471, TH11: 0.3240, TH10: 0.1155, TH9: 0.0655, TH8: 0.0252,
      TH7: 0.0102, TH6: 0.0056, TH5: 0.0032, TH4: 0.0023, TH3: 0.0035,
      TH2: 0.0009, TH1: 0.0001,
    },
  },
  'Crystal II': {
    league: 'Crystal II',
    clansSampled: 81756,
    distribution: {
      TH17: 5.0568, TH16: 2.9280, TH15: 3.2566, TH14: 2.2523, TH13: 1.0330,
      TH12: 0.2857, TH11: 0.1043, TH10: 0.0388, TH9: 0.0236, TH8: 0.0093,
      TH7: 0.0042, TH6: 0.0027, TH5: 0.0017, TH4: 0.0011, TH3: 0.0016,
      TH2: 0.0002, TH1: 0.0000,
    },
  },
  'Crystal I': {
    league: 'Crystal I',
    clansSampled: 73684,
    distribution: {
      TH17: 8.1555, TH16: 3.0802, TH15: 2.3440, TH14: 0.9724, TH13: 0.3046,
      TH12: 0.0781, TH11: 0.0326, TH10: 0.0141, TH9: 0.0087, TH8: 0.0041,
      TH7: 0.0019, TH6: 0.0016, TH5: 0.0007, TH4: 0.0004, TH3: 0.0009,
      TH2: 0.0003, TH1: 0.0000,
    },
  },
  'Master III': {
    league: 'Master III',
    clansSampled: 33544,
    distribution: {
      TH17: 11.6946, TH16: 2.0862, TH15: 0.8762, TH14: 0.2128, TH13: 0.0717,
      TH12: 0.0243, TH11: 0.0139, TH10: 0.0072, TH9: 0.0053, TH8: 0.0026,
      TH7: 0.0012, TH6: 0.0010, TH5: 0.0005, TH4: 0.0002, TH3: 0.0020,
      TH2: 0.0002, TH1: 0.0000,
    },
  },
  'Master II': {
    league: 'Master II',
    clansSampled: 15866,
    distribution: {
      TH17: 13.7979, TH16: 0.8532, TH15: 0.2155, TH14: 0.0571, TH13: 0.0318,
      TH12: 0.0171, TH11: 0.0106, TH10: 0.0066, TH9: 0.0049, TH8: 0.0019,
      TH7: 0.0008, TH6: 0.0010, TH5: 0.0004, TH4: 0.0004, TH3: 0.0007,
      TH2: 0.0001, TH1: 0.0000,
    },
  },
  'Master I': {
    league: 'Master I',
    clansSampled: 8706,
    distribution: {
      TH17: 14.6806, TH16: 0.2078, TH15: 0.0502, TH14: 0.0227, TH13: 0.0161,
      TH12: 0.0088, TH11: 0.0050, TH10: 0.0023, TH9: 0.0027, TH8: 0.0016,
      TH7: 0.0010, TH6: 0.0001, TH5: 0.0001, TH4: 0.0003, TH3: 0.0008,
      TH2: 0.0000, TH1: 0.0000,
    },
  },
  'Champion III': {
    league: 'Champion III',
    clansSampled: 4540,
    distribution: {
      TH17: 14.7614, TH16: 0.0938, TH15: 0.0490, TH14: 0.0312, TH13: 0.0299,
      TH12: 0.0151, TH11: 0.0097, TH10: 0.0030, TH9: 0.0018, TH8: 0.0008,
      TH7: 0.0012, TH6: 0.0003, TH5: 0.0002, TH4: 0.0007, TH3: 0.0019,
      TH2: 0.0002, TH1: 0.0000,
    },
  },
  'Champion II': {
    league: 'Champion II',
    clansSampled: 1820,
    distribution: {
      TH17: 14.8255, TH16: 0.0725, TH15: 0.0364, TH14: 0.0217, TH13: 0.0203,
      TH12: 0.0079, TH11: 0.0080, TH10: 0.0011, TH9: 0.0011, TH8: 0.0000,
      TH7: 0.0005, TH6: 0.0027, TH5: 0.0000, TH4: 0.0005, TH3: 0.0016,
      TH2: 0.0000, TH1: 0.0000,
    },
  },
  'Champion I': {
    league: 'Champion I',
    clansSampled: 470,
    distribution: {
      TH17: 14.4073, TH16: 0.1872, TH15: 0.1562, TH14: 0.0626, TH13: 0.0599,
      TH12: 0.0386, TH11: 0.0146, TH10: 0.0240, TH9: 0.0055, TH8: 0.0292,
      TH7: 0.0064, TH6: 0.0043, TH5: 0.0043, TH4: 0.0000, TH3: 0.0000,
      TH2: 0.0000, TH1: 0.0000,
    },
  },
}

// Helper function to get distribution for a specific league
export function getLeagueDistribution(leagueName: string): CWLDistributionData | null {
  // Normalize league name - remove "League" from the middle
  // e.g., "Gold League III" -> "Gold III"
  const normalizedName = leagueName.replace(' League ', ' ')
  return CWL_TH_DISTRIBUTIONS[normalizedName] || CWL_TH_DISTRIBUTIONS[leagueName] || null
}

// Calculate how your clan compares to the average
export interface THComparisonResult {
  thLevel: string
  yourCount: number
  avgCount: number
  difference: number
  percentDiff: number
}

export function compareClanToLeague(
  clanTHCounts: Record<string, number>,
  leagueName: string
): THComparisonResult[] {
  const leagueData = getLeagueDistribution(leagueName)
  if (!leagueData) return []

  const results: THComparisonResult[] = []

  // Get all TH levels from both clan and league data
  const allTHLevels = new Set([
    ...Object.keys(clanTHCounts),
    ...Object.keys(leagueData.distribution),
  ])

  for (const thLevel of Array.from(allTHLevels).sort((a, b) => {
    // Sort by TH number (descending)
    const numA = parseInt(a.replace('TH', ''))
    const numB = parseInt(b.replace('TH', ''))
    return numB - numA
  })) {
    const yourCount = clanTHCounts[thLevel] || 0
    const avgCount = leagueData.distribution[thLevel] || 0
    const difference = yourCount - avgCount
    const percentDiff = avgCount > 0 ? ((difference / avgCount) * 100) : 0

    results.push({
      thLevel,
      yourCount,
      avgCount,
      difference,
      percentDiff,
    })
  }

  return results
}

// Get TH counts from member list
export function getTHCounts(members: Array<{ townHallLevel: number }>): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const member of members) {
    const thKey = `TH${member.townHallLevel}`
    counts[thKey] = (counts[thKey] || 0) + 1
  }

  return counts
}

// Get top N members by TH level for CWL comparison
export function getTop15Members(members: Array<{ townHallLevel: number }>): Array<{ townHallLevel: number }> {
  return [...members]
    .sort((a, b) => b.townHallLevel - a.townHallLevel)
    .slice(0, 15)
}

export function getTop30Members(members: Array<{ townHallLevel: number }>): Array<{ townHallLevel: number }> {
  return [...members]
    .sort((a, b) => b.townHallLevel - a.townHallLevel)
    .slice(0, 30)
}

// 30v30 CWL Distribution Data
// Using 2x the 15v15 data as approximation (placeholder until actual 30v30 data is collected)
export const CWL_TH_DISTRIBUTIONS_30v30: Record<string, CWLDistributionData> = Object.fromEntries(
  Object.entries(CWL_TH_DISTRIBUTIONS).map(([league, data]) => [
    league,
    {
      league,
      clansSampled: data.clansSampled,
      distribution: Object.fromEntries(
        Object.entries(data.distribution).map(([th, count]) => [th, count * 2])
      )
    }
  ])
)

// Get league distribution for 30v30 format
export function getLeagueDistribution30v30(leagueName: string): CWLDistributionData | null {
  const normalizedName = leagueName.replace(' League ', ' ')
  return CWL_TH_DISTRIBUTIONS_30v30[normalizedName] || CWL_TH_DISTRIBUTIONS_30v30[leagueName] || null
}

// Compare clan's top 30 to league average (30v30)
export function compareClanToLeague30v30(
  clanTHCounts: Record<string, number>,
  leagueName: string
): THComparisonResult[] {
  const leagueData = getLeagueDistribution30v30(leagueName)
  if (!leagueData) return []

  const results: THComparisonResult[] = []

  // Get all TH levels from both clan and league data
  const allTHLevels = new Set([
    ...Object.keys(clanTHCounts),
    ...Object.keys(leagueData.distribution),
  ])

  for (const thLevel of Array.from(allTHLevels).sort((a, b) => {
    // Sort by TH number (descending)
    const numA = parseInt(a.replace('TH', ''))
    const numB = parseInt(b.replace('TH', ''))
    return numB - numA
  })) {
    const yourCount = clanTHCounts[thLevel] || 0
    const avgCount = leagueData.distribution[thLevel] || 0
    const difference = yourCount - avgCount
    const percentDiff = avgCount > 0 ? ((difference / avgCount) * 100) : 0

    results.push({
      thLevel,
      yourCount,
      avgCount,
      difference,
      percentDiff,
    })
  }

  return results
}
