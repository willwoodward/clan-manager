import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { TROPHY_ROAD_LEAGUES, DEFAULT_LEAGUE_ICON as DATA_DEFAULT_ICON } from '@/data/trophy-road-leagues'

interface Member {
  name: string
  tag: string
  trophies: number
  league?: {
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
}

interface LeagueData {
  id: number
  name: string
  iconUrl: string
  count: number
  percentage: number
  members: Member[]
  minTrophies: number
}

interface TrophyLeagueColumnChartProps {
  members: Member[]
  showGlobalRank?: boolean
  globalRank?: number
  localRank?: number
  location?: string
  clanRequiredTrophies?: number
  clanTotalTrophies?: number
  minRequiredLeague?: string // e.g., "Archer League 8" or just "Archer 8"
}

export function TrophyLeagueColumnChart({
  members,
  showGlobalRank = false,
  globalRank,
  localRank,
  location,
  clanRequiredTrophies = 0,
  clanTotalTrophies,
  minRequiredLeague
}: TrophyLeagueColumnChartProps) {
  // Default icon URL as fallback
  const DEFAULT_LEAGUE_ICON = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzY0NzQ4QiIvPgogIDxwYXRoIGQ9Ik0zMiAxNkwyNiA0MEwzMiAzNkwzOCA0MEwzMiAxNloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg=='

  // Extract league number from name (e.g., "Archer 10" -> 10, "Unranked" -> 0)
  const getLeagueNumber = (leagueName: string): number => {
    // Check for "Unranked" first
    if (leagueName.toLowerCase().includes('unranked')) {
      return 0
    }
    const match = leagueName.match(/(\d+)$/)
    return match ? parseInt(match[1]) : 0
  }

  // Get color based on league number (0-34 gradient)
  const getLeagueColor = (leagueName: string) => {
    const leagueNum = getLeagueNumber(leagueName)

    // Unranked: Gray
    if (leagueNum === 0) {
      return '#64748B' // gray
    }

    // Color gradient from low to high leagues
    // Low leagues (1-10): Red to Orange
    // Mid leagues (11-20): Orange to Yellow to Green
    // High leagues (21-30): Green to Cyan to Blue
    // Top leagues (31-34): Blue to Purple to Gold

    if (leagueNum >= 31) {
      // Top leagues: Purple to Gold
      const t = (leagueNum - 31) / 3
      return `hsl(${270 - t * 220}, 70%, 55%)` // Purple -> Gold
    } else if (leagueNum >= 21) {
      // High leagues: Cyan to Blue
      const t = (leagueNum - 21) / 10
      return `hsl(${180 + t * 60}, 70%, 50%)` // Cyan -> Blue
    } else if (leagueNum >= 11) {
      // Mid leagues: Yellow to Cyan
      const t = (leagueNum - 11) / 10
      return `hsl(${60 + t * 120}, 70%, 50%)` // Yellow -> Cyan
    } else if (leagueNum >= 1) {
      // Low leagues: Red to Yellow
      const t = (leagueNum - 1) / 10
      return `hsl(${0 + t * 60}, 70%, 50%)` // Red -> Yellow
    }
    return '#64748B' // default gray
  }

  const distribution = useMemo(() => {
    const leagueMap = new Map<number, LeagueData>()

    // Group members by their actual league tier from API (new trophy road system)
    members.forEach(member => {
      // Use leagueTier (new system) if available, fallback to league (old system)
      const league = member.leagueTier || member.league
      if (!league) return

      const leagueNum = getLeagueNumber(league.name)

      if (!leagueMap.has(leagueNum)) {
        leagueMap.set(leagueNum, {
          id: league.id,
          name: league.name,
          iconUrl: league.iconUrls?.small || DEFAULT_LEAGUE_ICON,
          count: 0,
          percentage: 0,
          members: [],
          minTrophies: member.trophies,
        })
      }

      const leagueData = leagueMap.get(leagueNum)!
      leagueData.count++
      leagueData.members.push(member)
      leagueData.minTrophies = Math.min(leagueData.minTrophies, member.trophies)
    })

    // Calculate percentages
    const total = members.length
    leagueMap.forEach(league => {
      league.percentage = total > 0 ? (league.count / total) * 100 : 0
    })

    // Create array with all leagues 0-34 (including gaps)
    // 0 = Unranked, 1-34 = Trophy Road Leagues
    // Use data file if available, otherwise fall back to dynamic data
    const allLeagues: LeagueData[] = []
    for (let i = 0; i <= 34; i++) {
      const memberData = leagueMap.get(i)
      const fileData = TROPHY_ROAD_LEAGUES.find(l => l.number === i)

      if (memberData) {
        // Use file data for name and icon if available, otherwise use member data
        allLeagues.push({
          ...memberData,
          name: fileData?.name || memberData.name,
          iconUrl: fileData?.iconUrl || memberData.iconUrl,
        })
      } else if (fileData) {
        // Use file data for empty leagues
        allLeagues.push({
          id: fileData.id,
          name: fileData.name,
          iconUrl: fileData.iconUrl,
          count: 0,
          percentage: 0,
          members: [],
          minTrophies: fileData.minTrophies,
        })
      } else {
        // Fallback for leagues not in file or members
        allLeagues.push({
          id: i,
          name: `League ${i}`,
          iconUrl: DEFAULT_LEAGUE_ICON,
          count: 0,
          percentage: 0,
          members: [],
          minTrophies: 0,
        })
      }
    }

    return allLeagues
  }, [members])

  // Use clan's actual total trophy points if provided, otherwise sum member trophies
  const totalTrophies = clanTotalTrophies ?? members.reduce((sum, m) => sum + m.trophies, 0)
  const avgTrophies = Math.round(totalTrophies / members.length)

  // Find top player: highest league number, then most trophies within that league
  const topPlayer = [...members].sort((a, b) => {
    const leagueA = a.leagueTier || a.league
    const leagueB = b.leagueTier || b.league
    const leagueNumA = leagueA ? getLeagueNumber(leagueA.name) : -1
    const leagueNumB = leagueB ? getLeagueNumber(leagueB.name) : -1

    // First sort by league number (highest first)
    if (leagueNumB !== leagueNumA) return leagueNumB - leagueNumA
    // Then by trophies within same league
    return b.trophies - a.trophies
  })[0]

  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  // Find which league corresponds to the clan's minimum requirement
  // Prioritize manual minRequiredLeague prop over old trophy system
  let requiredLeagueIndex = -1
  let requiredLeagueName = ''

  if (minRequiredLeague) {
    // Use manually specified league requirement (e.g., "Archer 8" or "Archer League 8")
    const leagueNum = getLeagueNumber(minRequiredLeague)
    const foundLeague = TROPHY_ROAD_LEAGUES.find(l => l.number === leagueNum)
    if (foundLeague) {
      requiredLeagueName = foundLeague.name
      requiredLeagueIndex = foundLeague.number
      console.log(`Min requirement: ${minRequiredLeague} → ${requiredLeagueName} (League ${requiredLeagueIndex})`)
    }
  } else if (clanRequiredTrophies > 0) {
    // Fallback: Try to map old trophy requirement to league (may be inaccurate)
    const eligibleLeagues = TROPHY_ROAD_LEAGUES
      .filter(l => l.number > 0 && l.maxTrophies >= clanRequiredTrophies)
      .sort((a, b) => a.maxTrophies - b.maxTrophies)

    const requiredLeague = eligibleLeagues[0]

    if (requiredLeague) {
      requiredLeagueName = requiredLeague.name
      requiredLeagueIndex = requiredLeague.number
      console.log(`Min requirement: ${clanRequiredTrophies} trophies → ${requiredLeagueName} (League ${requiredLeagueIndex}) [fallback]`)
    }
  }

  // Calculate median league
  const memberLeagues = members
    .map(m => {
      const league = m.leagueTier || m.league
      return league ? getLeagueNumber(league.name) : -1
    })
    .filter(num => num >= 0)
    .sort((a, b) => a - b)

  const medianLeagueNum = memberLeagues.length > 0
    ? memberLeagues[Math.floor(memberLeagues.length / 2)]
    : 0

  const medianLeague = TROPHY_ROAD_LEAGUES.find(l => l.number === medianLeagueNum)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Trophy League Distribution
            </CardTitle>
            <CardDescription>
              Player distribution across {distribution.length} trophy leagues
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Trophy Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Total Trophies</div>
            <div className="text-2xl font-bold">{totalTrophies.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Median League</div>
            <div className="text-lg font-bold">
              {medianLeague ? medianLeague.name.replace(/League\s*/i, '') : 'N/A'}
            </div>
            {medianLeague && (
              <div className="text-xs text-muted-foreground">League {medianLeague.number}</div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Top Player</div>
            <div className="text-lg font-bold truncate">{topPlayer?.name}</div>
            <div className="text-xs text-muted-foreground">
              {topPlayer?.trophies.toLocaleString()} trophies
            </div>
          </div>
        </div>

        {/* Global/Local Rankings by Clan Trophies */}
        {(globalRank || localRank) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {globalRank && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Global Rank</span>
                </div>
                <div className="text-3xl font-bold text-yellow-500">
                  #{globalRank.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">By clan trophies</p>
              </div>
            )}
            {localRank && location && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Local Rank</span>
                </div>
                <div className="text-3xl font-bold text-blue-500">
                  #{localRank.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{location}</p>
              </div>
            )}
          </div>
        )}

        {/* Column Chart */}
        <div className="space-y-4">
          <div className="relative bg-muted/20 rounded-lg p-6">
            {/* Minimum league requirement line */}
            {requiredLeagueIndex >= 0 && requiredLeagueName && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-yellow-500 z-10"
                style={{
                  left: `${((requiredLeagueIndex + 0.25) / distribution.length) * 100}%`,
                }}
              >
                <div className="absolute -top-6 left-0 -translate-x-1/2 text-xs font-medium text-yellow-500 whitespace-nowrap">
                  Min: {requiredLeagueName.replace(/League\s*/i, '')}
                </div>
              </div>
            )}
            <div className="flex items-end justify-around gap-1">
              {distribution.map((league, index) => {
                const heightPercent = maxCount > 0 ? (league.count / maxCount) * 100 : 0
                const leagueColor = getLeagueColor(league.name)

                return (
                  <div
                    key={league.id}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative"
                  >
                    {/* Bar container with fixed height */}
                    <div className="w-full h-[400px] flex flex-col justify-end">
                      <div
                        className="w-full rounded-t-md transition-all cursor-pointer hover:brightness-110 border border-background/50 relative"
                        style={{
                          height: league.count > 0 ? `${Math.max(heightPercent, 2)}%` : '0px',
                          backgroundColor: leagueColor,
                        }}
                      >
                      {/* Show count on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                          {league.count > 0 && league.count}
                        </span>
                      </div>
                      </div>
                    </div>

                    {/* League icon and label */}
                    <div className="flex flex-col items-center gap-0.5 w-full mt-1 h-12">
                      <img
                        src={league.iconUrl}
                        alt={league.name}
                        className={`h-6 w-6 flex-shrink-0 ${league.count > 0 ? 'opacity-70 group-hover:opacity-100' : 'opacity-30'}`}
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_LEAGUE_ICON
                        }}
                      />
                      <span className={`text-[7px] text-center leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5 ${league.count > 0 ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                        {league.name.replace(/League\s*/i, '')}
                      </span>
                    </div>

                    {/* Hover details */}
                    {league.count > 0 && (
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-card border-2 rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto min-w-[200px]">
                        <div className="font-medium mb-2 text-center">{league.name}</div>
                        <div className="text-xs text-muted-foreground mb-2 text-center">
                          {league.count} {league.count === 1 ? 'member' : 'members'} ({league.percentage.toFixed(1)}%)
                        </div>
                        <div className="space-y-1">
                          {league.members.map(member => (
                            <div key={member.tag} className="flex items-center justify-between text-xs">
                              <span className="truncate">{member.name}</span>
                              <span className="text-muted-foreground ml-2">{member.trophies.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Hover over any column to see which members are in that league.
              Higher league players (Titan, Legend) typically have better attack strategies and more experience.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
