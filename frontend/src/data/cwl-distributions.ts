// CWL Town Hall Distribution Data (March 2026)
// 15v15 data covers Bronze III through Champion I
// 30v30 data covers Bronze III through Master I (no Champion data available)

export interface THDistribution {
  [key: string]: number // TH level (e.g., "TH18", "TH17") -> average count per clan
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

export const CWL_TH_DISTRIBUTIONS: Record<string, CWLDistributionData> = {
  'Bronze III': {
    league: 'Bronze III',
    clansSampled: 1718,
    distribution: {
      TH18: 0.1412, TH17: 0.1161, TH16: 0.1630, TH15: 0.1578, TH14: 0.2530, TH13: 0.4909,
      TH12: 0.6635, TH11: 0.8220, TH10: 0.8184, TH9: 1.0348, TH8: 1.0404, TH7: 1.0812,
      TH6: 1.5587, TH5: 2.4430, TH4: 2.2063, TH3: 1.7592, TH2: 0.2031, TH1: 0.0477,
    },
  },
  'Bronze II': {
    league: 'Bronze II',
    clansSampled: 4014,
    distribution: {
      TH18: 0.1602, TH17: 0.1565, TH16: 0.2114, TH15: 0.2861, TH14: 0.3971, TH13: 0.8365,
      TH12: 1.0491, TH11: 1.2166, TH10: 1.1314, TH9: 1.4915, TH8: 1.4964, TH7: 1.4285,
      TH6: 1.5738, TH5: 1.6429, TH4: 1.1084, TH3: 0.7501, TH2: 0.0539, TH1: 0.0095,
    },
  },
  'Bronze I': {
    league: 'Bronze I',
    clansSampled: 11872,
    distribution: {
      TH18: 0.2053, TH17: 0.2228, TH16: 0.3197, TH15: 0.4499, TH14: 0.6481, TH13: 1.2089,
      TH12: 1.4612, TH11: 1.5545, TH10: 1.4096, TH9: 1.8061, TH8: 1.6532, TH7: 1.3291,
      TH6: 0.9238, TH5: 0.7870, TH4: 0.5664, TH3: 0.4260, TH2: 0.0240, TH1: 0.0045,
    },
  },
  'Silver III': {
    league: 'Silver III',
    clansSampled: 47424,
    distribution: {
      TH18: 0.2310, TH17: 0.2812, TH16: 0.4096, TH15: 0.5682, TH14: 0.8014, TH13: 1.3867,
      TH12: 1.5548, TH11: 1.7366, TH10: 1.7309, TH9: 2.3153, TH8: 1.6420, TH7: 0.8747,
      TH6: 0.4836, TH5: 0.3934, TH4: 0.2850, TH3: 0.2949, TH2: 0.0101, TH1: 0.0007,
    },
  },
  'Silver II': {
    league: 'Silver II',
    clansSampled: 50972,
    distribution: {
      TH18: 0.2815, TH17: 0.3863, TH16: 0.5602, TH15: 0.7889, TH14: 1.1191, TH13: 1.8694,
      TH12: 2.0387, TH11: 2.3007, TH10: 1.9946, TH9: 1.7268, TH8: 0.8493, TH7: 0.4012,
      TH6: 0.2275, TH5: 0.1742, TH4: 0.1274, TH3: 0.1480, TH2: 0.0058, TH1: 0.0003,
    },
  },
  'Silver I': {
    league: 'Silver I',
    clansSampled: 67616,
    distribution: {
      TH18: 0.3425, TH17: 0.4811, TH16: 0.7047, TH15: 1.0066, TH14: 1.4416, TH13: 2.3373,
      TH12: 2.4296, TH11: 2.3778, TH10: 1.5138, TH9: 1.1255, TH8: 0.5502, TH7: 0.2621,
      TH6: 0.1454, TH5: 0.1057, TH4: 0.0786, TH3: 0.0936, TH2: 0.0036, TH1: 0.0002,
    },
  },
  'Gold III': {
    league: 'Gold III',
    clansSampled: 79568,
    distribution: {
      TH18: 0.4663, TH17: 0.6795, TH16: 0.9654, TH15: 1.3816, TH14: 1.9424, TH13: 2.8867,
      TH12: 2.5606, TH11: 1.8383, TH10: 0.9862, TH9: 0.6713, TH8: 0.2959, TH7: 0.1283,
      TH6: 0.0704, TH5: 0.0495, TH4: 0.0364, TH3: 0.0395, TH2: 0.0016, TH1: 0.0001,
    },
  },
  'Gold II': {
    league: 'Gold II',
    clansSampled: 86630,
    distribution: {
      TH18: 0.7290, TH17: 0.9931, TH16: 1.3469, TH15: 1.8674, TH14: 2.4686, TH13: 3.1004,
      TH12: 2.0603, TH11: 1.2255, TH10: 0.5723, TH9: 0.3479, TH8: 0.1406, TH7: 0.0599,
      TH6: 0.0347, TH5: 0.0218, TH4: 0.0147, TH3: 0.0163, TH2: 0.0007, TH1: 0.0000,
    },
  },
  'Gold I': {
    league: 'Gold I',
    clansSampled: 89446,
    distribution: {
      TH18: 1.1316, TH17: 1.4486, TH16: 1.8560, TH15: 2.4404, TH14: 2.8435, TH13: 2.6835,
      TH12: 1.3487, TH11: 0.6847, TH10: 0.2785, TH9: 0.1561, TH8: 0.0619, TH7: 0.0258,
      TH6: 0.0159, TH5: 0.0095, TH4: 0.0069, TH3: 0.0078, TH2: 0.0007, TH1: 0.0000,
    },
  },
  'Crystal III': {
    league: 'Crystal III',
    clansSampled: 87342,
    distribution: {
      TH18: 1.8298, TH17: 2.1555, TH16: 2.4861, TH15: 2.9330, TH14: 2.6804, TH13: 1.7624,
      TH12: 0.6648, TH11: 0.2773, TH10: 0.1039, TH9: 0.0579, TH8: 0.0232, TH7: 0.0098,
      TH6: 0.0064, TH5: 0.0032, TH4: 0.0023, TH3: 0.0036, TH2: 0.0003, TH1: 0.0000,
    },
  },
  'Crystal II': {
    league: 'Crystal II',
    clansSampled: 80830,
    distribution: {
      TH18: 3.1306, TH17: 3.1213, TH16: 3.0006, TH15: 2.7855, TH14: 1.7675, TH13: 0.7854,
      TH12: 0.2324, TH11: 0.0944, TH10: 0.0368, TH9: 0.0227, TH8: 0.0092, TH7: 0.0047,
      TH6: 0.0037, TH5: 0.0016, TH4: 0.0011, TH3: 0.0023, TH2: 0.0002, TH1: 0.0000,
    },
  },
  'Crystal I': {
    league: 'Crystal I',
    clansSampled: 74432,
    distribution: {
      TH18: 5.4537, TH17: 4.0195, TH16: 2.7757, TH15: 1.7224, TH14: 0.6752, TH13: 0.2280,
      TH12: 0.0623, TH11: 0.0301, TH10: 0.0138, TH9: 0.0087, TH8: 0.0044, TH7: 0.0022,
      TH6: 0.0014, TH5: 0.0006, TH4: 0.0007, TH3: 0.0012, TH2: 0.0001, TH1: 0.0000,
    },
  },
  'Master III': {
    league: 'Master III',
    clansSampled: 33726,
    distribution: {
      TH18: 8.7827, TH17: 3.9611, TH16: 1.4961, TH15: 0.5175, TH14: 0.1354, TH13: 0.0539,
      TH12: 0.0206, TH11: 0.0130, TH10: 0.0061, TH9: 0.0049, TH8: 0.0025, TH7: 0.0015,
      TH6: 0.0017, TH5: 0.0007, TH4: 0.0003, TH3: 0.0017, TH2: 0.0001, TH1: 0.0000,
    },
  },
  'Master II': {
    league: 'Master II',
    clansSampled: 15814,
    distribution: {
      TH18: 11.8194, TH17: 2.5147, TH16: 0.4468, TH15: 0.1126, TH14: 0.0403, TH13: 0.0253,
      TH12: 0.0122, TH11: 0.0113, TH10: 0.0050, TH9: 0.0042, TH8: 0.0026, TH7: 0.0011,
      TH6: 0.0011, TH5: 0.0007, TH4: 0.0011, TH3: 0.0015, TH2: 0.0001, TH1: 0.0000,
    },
  },
  'Master I': {
    league: 'Master I',
    clansSampled: 8264,
    distribution: {
      TH18: 14.0083, TH17: 0.8138, TH16: 0.0835, TH15: 0.0318, TH14: 0.0166, TH13: 0.0145,
      TH12: 0.0070, TH11: 0.0053, TH10: 0.0039, TH9: 0.0041, TH8: 0.0038, TH7: 0.0018,
      TH6: 0.0019, TH5: 0.0004, TH4: 0.0005, TH3: 0.0027, TH2: 0.0002, TH1: 0.0000,
    },
  },
  'Champion III': {
    league: 'Champion III',
    clansSampled: 4446,
    distribution: {
      TH18: 14.6645, TH17: 0.1828, TH16: 0.0500, TH15: 0.0354, TH14: 0.0169, TH13: 0.0196,
      TH12: 0.0108, TH11: 0.0072, TH10: 0.0046, TH9: 0.0018, TH8: 0.0022, TH7: 0.0004,
      TH6: 0.0008, TH5: 0.0002, TH4: 0.0005, TH3: 0.0021, TH2: 0.0000, TH1: 0.0002,
    },
  },
  'Champion II': {
    league: 'Champion II',
    clansSampled: 1782,
    distribution: {
      TH18: 14.8112, TH17: 0.0817, TH16: 0.0348, TH15: 0.0201, TH14: 0.0177, TH13: 0.0103,
      TH12: 0.0042, TH11: 0.0051, TH10: 0.0028, TH9: 0.0025, TH8: 0.0030, TH7: 0.0010,
      TH6: 0.0048, TH5: 0.0005, TH4: 0.0002, TH3: 0.0000, TH2: 0.0000, TH1: 0.0000,
    },
  },
  'Champion I': {
    league: 'Champion I',
    clansSampled: 468,
    distribution: {
      TH18: 14.5095, TH17: 0.1886, TH16: 0.1181, TH15: 0.0556, TH14: 0.0150, TH13: 0.0348,
      TH12: 0.0150, TH11: 0.0284, TH10: 0.0137, TH9: 0.0107, TH8: 0.0021, TH7: 0.0000,
      TH6: 0.0021, TH5: 0.0043, TH4: 0.0000, TH3: 0.0021, TH2: 0.0000, TH1: 0.0000,
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

  const allTHLevels = new Set([
    ...Object.keys(clanTHCounts),
    ...Object.keys(leagueData.distribution),
  ])

  for (const thLevel of Array.from(allTHLevels).sort((a, b) => {
    const numA = parseInt(a.replace('TH', ''))
    const numB = parseInt(b.replace('TH', ''))
    return numB - numA
  })) {
    const yourCount = clanTHCounts[thLevel] || 0
    const avgCount = leagueData.distribution[thLevel] || 0
    const difference = yourCount - avgCount
    const percentDiff = avgCount > 0 ? ((difference / avgCount) * 100) : 0

    results.push({ thLevel, yourCount, avgCount, difference, percentDiff })
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
  return [...members].sort((a, b) => b.townHallLevel - a.townHallLevel).slice(0, 15)
}

export function getTop30Members(members: Array<{ townHallLevel: number }>): Array<{ townHallLevel: number }> {
  return [...members].sort((a, b) => b.townHallLevel - a.townHallLevel).slice(0, 30)
}

// 30v30 CWL Distribution Data (March 2026)
// Covers Bronze III through Master I only — Champion league 30v30 data not available
export const CWL_TH_DISTRIBUTIONS_30v30: Record<string, CWLDistributionData> = {
  'Bronze III': {
    league: 'Bronze III',
    clansSampled: 668,
    distribution: {
      TH18: 0.1595, TH17: 0.1414, TH16: 0.2949, TH15: 0.2748, TH14: 0.3856, TH13: 0.7783,
      TH12: 1.2524, TH11: 1.7874, TH10: 1.5923, TH9: 2.0225, TH8: 1.6719, TH7: 2.2151,
      TH6: 3.4615, TH5: 5.8411, TH4: 5.2195, TH3: 2.2223, TH2: 0.6491, TH1: 0.0304,
    },
  },
  'Bronze II': {
    league: 'Bronze II',
    clansSampled: 930,
    distribution: {
      TH18: 0.1510, TH17: 0.1673, TH16: 0.3171, TH15: 0.3959, TH14: 0.5253, TH13: 1.0507,
      TH12: 1.3828, TH11: 1.9532, TH10: 1.8625, TH9: 2.8501, TH8: 3.3920, TH7: 3.3249,
      TH6: 4.2172, TH5: 4.3664, TH4: 2.6762, TH3: 1.2439, TH2: 0.1009, TH1: 0.0226,
    },
  },
  'Bronze I': {
    league: 'Bronze I',
    clansSampled: 2310,
    distribution: {
      TH18: 0.1940, TH17: 0.2371, TH16: 0.3543, TH15: 0.4198, TH14: 0.5832, TH13: 1.3183,
      TH12: 1.6448, TH11: 2.1445, TH10: 2.2686, TH9: 4.0227, TH8: 4.4985, TH7: 4.0466,
      TH6: 3.1997, TH5: 2.6784, TH4: 1.6361, TH3: 0.7045, TH2: 0.0382, TH1: 0.0108,
    },
  },
  'Silver III': {
    league: 'Silver III',
    clansSampled: 8700,
    distribution: {
      TH18: 0.1635, TH17: 0.2353, TH16: 0.3981, TH15: 0.5337, TH14: 0.7536, TH13: 1.5305,
      TH12: 1.8642, TH11: 2.8919, TH10: 4.0539, TH9: 6.7701, TH8: 5.1719, TH7: 2.5792,
      TH6: 1.3200, TH5: 0.9110, TH4: 0.5611, TH3: 0.2436, TH2: 0.0141, TH1: 0.0041,
    },
  },
  'Silver II': {
    league: 'Silver II',
    clansSampled: 8296,
    distribution: {
      TH18: 0.2502, TH17: 0.3629, TH16: 0.7024, TH15: 0.9311, TH14: 1.2876, TH13: 2.4902,
      TH12: 3.4379, TH11: 6.0772, TH10: 6.4383, TH9: 4.9310, TH8: 1.7851, TH7: 0.6404,
      TH6: 0.2858, TH5: 0.1967, TH4: 0.1178, TH3: 0.0610, TH2: 0.0040, TH1: 0.0005,
    },
  },
  'Silver I': {
    league: 'Silver I',
    clansSampled: 9088,
    distribution: {
      TH18: 0.3587, TH17: 0.5810, TH16: 0.9851, TH15: 1.4326, TH14: 2.0226, TH13: 4.1461,
      TH12: 5.7867, TH11: 6.9787, TH10: 3.8442, TH9: 2.2582, TH8: 0.8953, TH7: 0.3466,
      TH6: 0.1673, TH5: 0.0988, TH4: 0.0620, TH3: 0.0347, TH2: 0.0010, TH1: 0.0003,
    },
  },
  'Gold III': {
    league: 'Gold III',
    clansSampled: 10400,
    distribution: {
      TH18: 0.5618, TH17: 0.8877, TH16: 1.5182, TH15: 2.0115, TH14: 3.1620, TH13: 6.2720,
      TH12: 6.7876, TH11: 4.5646, TH10: 2.0332, TH9: 1.2468, TH8: 0.5209, TH7: 0.2116,
      TH6: 0.1025, TH5: 0.0636, TH4: 0.0352, TH3: 0.0194, TH2: 0.0013, TH1: 0.0002,
    },
  },
  'Gold II': {
    league: 'Gold II',
    clansSampled: 11372,
    distribution: {
      TH18: 0.8922, TH17: 1.4102, TH16: 2.1827, TH15: 3.0442, TH14: 4.6952, TH13: 7.5242,
      TH12: 5.0392, TH11: 2.6572, TH10: 1.2090, TH9: 0.7656, TH8: 0.3153, TH7: 0.1244,
      TH6: 0.0701, TH5: 0.0331, TH4: 0.0216, TH3: 0.0132, TH2: 0.0005, TH1: 0.0019,
    },
  },
  'Gold I': {
    league: 'Gold I',
    clansSampled: 12708,
    distribution: {
      TH18: 1.4686, TH17: 2.1494, TH16: 3.0864, TH15: 4.3497, TH14: 6.2045, TH13: 6.6480,
      TH12: 3.0859, TH11: 1.5774, TH10: 0.6983, TH9: 0.4115, TH8: 0.1693, TH7: 0.0688,
      TH6: 0.0424, TH5: 0.0178, TH4: 0.0112, TH3: 0.0097, TH2: 0.0011, TH1: 0.0000,
    },
  },
  'Crystal III': {
    league: 'Crystal III',
    clansSampled: 14176,
    distribution: {
      TH18: 2.4787, TH17: 3.3190, TH16: 4.3511, TH15: 5.9211, TH14: 6.3240, TH13: 4.4446,
      TH12: 1.7024, TH11: 0.7986, TH10: 0.3249, TH9: 0.1902, TH8: 0.0767, TH7: 0.0311,
      TH6: 0.0209, TH5: 0.0078, TH4: 0.0044, TH3: 0.0039, TH2: 0.0006, TH1: 0.0001,
    },
  },
  'Crystal II': {
    league: 'Crystal II',
    clansSampled: 15638,
    distribution: {
      TH18: 4.3625, TH17: 5.0256, TH16: 5.7605, TH15: 6.3894, TH14: 4.6428, TH13: 2.3802,
      TH12: 0.8134, TH11: 0.3528, TH10: 0.1350, TH9: 0.0794, TH8: 0.0281, TH7: 0.0111,
      TH6: 0.0074, TH5: 0.0042, TH4: 0.0024, TH3: 0.0049, TH2: 0.0002, TH1: 0.0001,
    },
  },
  'Crystal I': {
    league: 'Crystal I',
    clansSampled: 18538,
    distribution: {
      TH18: 7.9862, TH17: 7.3038, TH16: 6.2935, TH15: 4.8071, TH14: 2.2328, TH13: 0.9105,
      TH12: 0.2555, TH11: 0.1127, TH10: 0.0432, TH9: 0.0254, TH8: 0.0143, TH7: 0.0058,
      TH6: 0.0041, TH5: 0.0012, TH4: 0.0007, TH3: 0.0032, TH2: 0.0001, TH1: 0.0000,
    },
  },
  'Master III': {
    league: 'Master III',
    clansSampled: 10314,
    distribution: {
      TH18: 14.0173, TH17: 8.4972, TH16: 4.4704, TH15: 1.9648, TH14: 0.6152, TH13: 0.2393,
      TH12: 0.0757, TH11: 0.0492, TH10: 0.0238, TH9: 0.0180, TH8: 0.0088, TH7: 0.0024,
      TH6: 0.0066, TH5: 0.0006, TH4: 0.0009, TH3: 0.0084, TH2: 0.0013, TH1: 0.0000,
    },
  },
  'Master II': {
    league: 'Master II',
    clansSampled: 5500,
    distribution: {
      TH18: 20.8155, TH17: 6.5588, TH16: 1.7458, TH15: 0.5240, TH14: 0.1553, TH13: 0.0956,
      TH12: 0.0384, TH11: 0.0237, TH10: 0.0118, TH9: 0.0055, TH8: 0.0030, TH7: 0.0026,
      TH6: 0.0044, TH5: 0.0002, TH4: 0.0000, TH3: 0.0150, TH2: 0.0005, TH1: 0.0000,
    },
  },
  'Master I': {
    league: 'Master I',
    clansSampled: 2702,
    distribution: {
      TH18: 25.8720, TH17: 3.1186, TH16: 0.6210, TH15: 0.1766, TH14: 0.0748, TH13: 0.0616,
      TH12: 0.0223, TH11: 0.0225, TH10: 0.0091, TH9: 0.0052, TH8: 0.0023, TH7: 0.0033,
      TH6: 0.0008, TH5: 0.0005, TH4: 0.0011, TH3: 0.0071, TH2: 0.0007, TH1: 0.0004,
    },
  },
}

// Get league distribution for 30v30 format
// Returns null for Champion leagues (no data available)
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

  const allTHLevels = new Set([
    ...Object.keys(clanTHCounts),
    ...Object.keys(leagueData.distribution),
  ])

  for (const thLevel of Array.from(allTHLevels).sort((a, b) => {
    const numA = parseInt(a.replace('TH', ''))
    const numB = parseInt(b.replace('TH', ''))
    return numB - numA
  })) {
    const yourCount = clanTHCounts[thLevel] || 0
    const avgCount = leagueData.distribution[thLevel] || 0
    const difference = yourCount - avgCount
    const percentDiff = avgCount > 0 ? ((difference / avgCount) * 100) : 0

    results.push({ thLevel, yourCount, avgCount, difference, percentDiff })
  }

  return results
}
