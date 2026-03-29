import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, Star, Swords, AlertCircle, CheckCircle, XCircle, Settings, TrendingUp } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { MemberWarStats } from '@/types/cwl'
import { THDistributionChart } from '@/components/th-distribution-chart'
import { CWLGroupTHDistribution } from '@/components/cwl-group-th-distribution'
import { CWLLeagueShowcase } from '@/components/cwl-league-showcase'
import { PlayerCard } from '@/components/player-card'
import { ClickablePlayerName } from '@/components/clickable-player-name'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import { ChartSkeleton } from '@/components/ui/loading'
import { useClanContext } from '@/hooks/use-clan-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SortField = 'name' | 'townHallLevel' | 'warStars' | 'donations' | 'score'
type SortDirection = 'asc' | 'desc'

interface ScoringWeights {
  thLevel: number
  warStars: number
  donations: number
  warPreference: number
  leagueTier: number
  avgStars: number
  avgDestruction: number
  threeStarRate: number
  attackParticipation: number
}

// Load scoring weights from localStorage or use defaults
const defaultWeights: ScoringWeights = {
  thLevel: 10,
  warStars: 0.5,
  donations: 5, // points per 100 donations
  warPreference: 50,
  leagueTier: 1,
  avgStars: 50,
  avgDestruction: 20,
  threeStarRate: 30,
  attackParticipation: 40,
}

function loadScoringWeights(): ScoringWeights {
  const saved = localStorage.getItem('cwlScoringWeights')
  if (!saved) return defaultWeights

  try {
    const parsed = JSON.parse(saved)
    return { ...defaultWeights, ...parsed }
  } catch {
    return defaultWeights
  }
}

function saveScoringWeights(weights: ScoringWeights) {
  localStorage.setItem('cwlScoringWeights', JSON.stringify(weights))
}

// Load/save lineup selection
function loadLineupSelection(): string[] {
  const saved = localStorage.getItem('cwlLineupSelection')
  if (!saved) return []

  try {
    return JSON.parse(saved)
  } catch {
    return []
  }
}

function saveLineupSelection(selectedTags: string[]) {
  localStorage.setItem('cwlLineupSelection', JSON.stringify(selectedTags))
}

export function CWL() {
  const { clanTag } = useClanContext()
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [memberStats, setMemberStats] = useState<Array<MemberWarStats & { score: number; historicalStats?: any; participationRate?: number }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [allCWLClans, setAllCWLClans] = useState<Array<{ clanTag: string; clanName: string; members: Array<{ townHallLevel: number }> }>>([])
  const [loadingCWLClans, setLoadingCWLClans] = useState(false)
  const [selectedPlayerTag, setSelectedPlayerTag] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>(loadScoringWeights())
  const [selectedLineup, setSelectedLineup] = useState<string[]>(loadLineupSelection())
  const [chartView, setChartView] = useState<'group' | 'league'>('group')
  const [cwlMatchupResults, setCwlMatchupResults] = useState<Map<string, any>>(new Map())
  const [analyzingMatchups, setAnalyzingMatchups] = useState(false)

  // Fetch clan data for league info
  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
  })

  // Fetch CWL group (if in CWL)
  const { data: cwlGroup, isLoading: cwlLoading } = useQuery({
    queryKey: ['cwlGroup', clanTag],
    queryFn: () => clashApi.getCWLGroup(clanTag),
    retry: false,
  })

  // Fetch war history for attack participation stats
  const { data: warHistory } = useQuery({
    queryKey: ['warHistory'],
    queryFn: () => analytics.getWarHistory({ limit: 100 }),
  })

  // Calculate attack participation for each player
  const attackParticipation = useMemo(() => {
    if (!warHistory?.wars) return new Map<string, { used: number; total: number }>()

    const participation = new Map<string, { used: number; total: number }>()

    warHistory.wars.forEach((war: any) => {
      const warData = war.data
      if (!warData?.clan?.members) return

      warData.clan.members.forEach((member: any) => {
        const tag = member.tag
        if (!participation.has(tag)) {
          participation.set(tag, { used: 0, total: 0 })
        }

        const stats = participation.get(tag)!
        // Each war typically allows 2 attacks per member
        stats.total += 2
        stats.used += member.attacks?.length || 0
      })
    })

    return participation
  }, [warHistory])

  // Fetch detailed stats for all members
  useEffect(() => {
    if (!clan?.memberList) return

    const fetchMemberStats = async () => {
      setLoadingMembers(true)
      try {
        const stats = await Promise.all(
          clan.memberList.map(async (member) => {
            // Fetch full player data; fall back to memberList entry if the call fails
            // so no member is silently dropped from the table
            let playerData: any = null
            try {
              playerData = await clashApi.getPlayer(member.tag)
            } catch (error) {
              console.error(`Error fetching stats for ${member.name}:`, error)
            }
            const base = playerData ?? {
              ...member,
              warPreference: 'out' as const,  // unknown — default to out so score isn't inflated
              warStars: 0,
              attackWins: 0,
              defenseWins: 0,
            }

            // Fetch historical war stats
            let historicalStats = null
            try {
              historicalStats = await analytics.getPlayerStats(member.tag)
            } catch (error) {
              // No historical data available
            }

            // Calculate participation rate
            const participation = attackParticipation.get(member.tag)
            const participationRate = participation
              ? participation.used / participation.total
              : 0

            // Calculate recommendation score using configurable weights
            const thScore = base.townHallLevel * scoringWeights.thLevel
            const starScore = base.warStars * scoringWeights.warStars
            const donationScore = (base.donations / 100) * scoringWeights.donations
            const prefScore = base.warPreference === 'in' ? scoringWeights.warPreference : 0
            const leagueScore = base.leagueTier?.id ? (base.leagueTier.id / 1000000) * scoringWeights.leagueTier : 0

            // Add historical performance scores
            let historicalScore = 0
            if (historicalStats && !historicalStats.error) {
              historicalScore =
                (historicalStats.avg_stars || 0) * scoringWeights.avgStars +
                ((historicalStats.avg_destruction || 0) / 100) * scoringWeights.avgDestruction +
                ((historicalStats.three_star_rate || 0) / 100) * scoringWeights.threeStarRate +
                participationRate * scoringWeights.attackParticipation
            }

            const score = thScore + starScore + donationScore + prefScore + leagueScore + historicalScore

            return {
              ...base,
              historicalStats,
              participationRate,
              score: Math.round(score),
            }
          })
        )

        setMemberStats(stats as Array<MemberWarStats & { score: number; historicalStats?: any; participationRate?: number }>)
      } catch (error) {
        console.error('Error fetching member stats:', error)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMemberStats()
  }, [clan?.memberList, scoringWeights, attackParticipation])

  // Fetch all CWL clan members when in CWL
  useEffect(() => {
    if (!cwlGroup || cwlGroup.state === 'notInWar' || !cwlGroup.clans) return

    const fetchAllCWLClans = async () => {
      setLoadingCWLClans(true)
      try {
        const clanDataPromises = cwlGroup.clans.map(async (cwlClan) => {
          try {
            // Get full clan data to access member list
            const clanData = await clashApi.getClan(cwlClan.tag)

            // Fetch TH levels for all members
            const memberTHs = await Promise.all(
              clanData.memberList.map(async (member) => {
                try {
                  const playerData = await clashApi.getPlayer(member.tag)
                  return { townHallLevel: playerData.townHallLevel }
                } catch {
                  return { townHallLevel: member.townHallLevel || 0 }
                }
              })
            )

            return {
              clanTag: cwlClan.tag,
              clanName: cwlClan.name,
              members: memberTHs
            }
          } catch (error) {
            console.error(`Error fetching clan ${cwlClan.name}:`, error)
            return null
          }
        })

        const allClans = await Promise.all(clanDataPromises)
        setAllCWLClans(allClans.filter((c): c is NonNullable<typeof c> => c !== null))
      } catch (error) {
        console.error('Error fetching CWL clans:', error)
      } finally {
        setLoadingCWLClans(false)
      }
    }

    fetchAllCWLClans()
  }, [cwlGroup])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Lineup selection handlers
  const toggleMemberSelection = (playerTag: string) => {
    const newSelection = selectedLineup.includes(playerTag)
      ? selectedLineup.filter(tag => tag !== playerTag)
      : [...selectedLineup, playerTag]

    setSelectedLineup(newSelection)
    saveLineupSelection(newSelection)
  }

  const selectTop15 = () => {
    const top15Tags = sortedMembers.slice(0, 15).map(m => m.tag)
    setSelectedLineup(top15Tags)
    saveLineupSelection(top15Tags)
  }

  const selectTop30 = () => {
    const top30Tags = sortedMembers.slice(0, 30).map(m => m.tag)
    setSelectedLineup(top30Tags)
    saveLineupSelection(top30Tags)
  }

  const selectAllOptedIn = () => {
    const optedInTags = memberStats.filter(m => m.warPreference === 'in').map(m => m.tag)
    setSelectedLineup(optedInTags)
    saveLineupSelection(optedInTags)
  }

  const clearSelection = () => {
    setSelectedLineup([])
    saveLineupSelection([])
  }

  const analyzeMatchups = async () => {
    if (!selectedLineup.length || !allCWLClans.length || !cwlGroup) return
    setAnalyzingMatchups(true)

    // Step 1: Fetch all already-played CWL wars from current season rounds and build
    // per-clan attack maps so we use their real CWL performance instead of TH-level averages
    type AttackRecord = { attacker_th: number; defender_th: number; stars: number; destruction: number }
    const clanAttackMap = new Map<string, AttackRecord[]>()

    try {
      const rounds: Array<{ warTags: string[] }> = cwlGroup.rounds || []
      const warTagSet = new Set<string>()
      rounds.forEach(round => {
        ;(round.warTags || []).forEach(tag => {
          if (tag && tag !== '#0') warTagSet.add(tag)
        })
      })

      await Promise.all(Array.from(warTagSet).map(async (warTag) => {
        try {
          const war = await clashApi.getCWLWar(warTag)
          if (!war || war.state === 'preparation') return

          // Build tag -> TH lookup across both sides
          const memberTH = new Map<string, number>()
          const indexMembers = (members: any[]) =>
            members?.forEach(m => memberTH.set(m.tag, m.townhallLevel ?? m.townHallLevel ?? 0))
          indexMembers(war.clan?.members ?? [])
          indexMembers(war.opponent?.members ?? [])

          // Extract attacks for a given side into the map
          const extractSide = (sideData: any) => {
            if (!sideData?.members) return
            const tag: string = sideData.tag
            const attacks: AttackRecord[] = []
            sideData.members.forEach((member: any) => {
              const attackerTh: number = member.townhallLevel ?? member.townHallLevel ?? 0
              ;(member.attacks ?? []).forEach((atk: any) => {
                const defenderTh = memberTH.get(atk.defenderTag) ?? 0
                if (attackerTh && defenderTh) {
                  attacks.push({
                    attacker_th: attackerTh,
                    defender_th: defenderTh,
                    stars: atk.stars ?? 0,
                    destruction: atk.destructionPercentage ?? 0,
                  })
                }
              })
            })
            if (attacks.length) {
              const existing = clanAttackMap.get(tag) ?? []
              clanAttackMap.set(tag, [...existing, ...attacks])
            }
          }

          extractSide(war.clan)
          extractSide(war.opponent)
        } catch {
          // skip individual war fetch failures
        }
      }))
    } catch (e) {
      console.warn('Could not fetch CWL war history for opponent analysis:', e)
    }

    // Step 2: Analyze each opponent using their actual CWL attacks where available
    const ourTag = clan?.tag || clanTag
    const opponents = allCWLClans.filter(c => c.clanTag !== ourTag)
    const results = new Map<string, any>()

    await Promise.all(opponents.map(async (opp) => {
      try {
        const oppThs = opp.members.map(m => m.townHallLevel)
        const oppAttacks = clanAttackMap.get(opp.clanTag)

        const result = await analytics.cwlMatchup({
          our_lineup_tags: selectedLineup,
          opponent_ths: oppThs,
          opponent_attacks: oppAttacks,
        })
        results.set(opp.clanTag, { ...result, clanName: opp.clanName })
      } catch (e) {
        console.error(`Failed matchup for ${opp.clanName}:`, e)
      }
    }))

    setCwlMatchupResults(results)
    setAnalyzingMatchups(false)
  }

  // Get selected members for charts
  const selectedMembers = memberStats.filter(m => selectedLineup.includes(m.tag))

  const sortedMembers = [...memberStats].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    if (sortField === 'name') {
      return modifier * a.name.localeCompare(b.name)
    }
    return modifier * (a[sortField] - b[sortField])
  })

  const isLoading = clanLoading || cwlLoading || loadingMembers

  if (isLoading && !clan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading CWL data...</p>
        </div>
      </div>
    )
  }

  const leagueInfo = clan?.warLeague
  const inCWL = cwlGroup !== null && cwlGroup?.state !== 'notInWar'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clan War League</h1>
        <p className="text-muted-foreground">Manage CWL participation and track league medals</p>
      </div>

      {/* Current League Showcase */}
      <CWLLeagueShowcase
        leagueInfo={leagueInfo}
        cwlGroup={cwlGroup || undefined}
        inCWL={inCWL}
      />

      {/* TH Distribution Comparison */}
      {cwlLoading || (inCWL && loadingCWLClans) ? (
        <ChartSkeleton height="h-96" />
      ) : inCWL && allCWLClans.length > 0 && chartView === 'group' ? (
        <CWLGroupTHDistribution
          clans={allCWLClans}
          ourClanTag={clan?.tag || clanTag}
          selectedMembers={selectedMembers}
          onViewChange={setChartView}
          showViewToggle={true}
        />
      ) : leagueInfo && memberStats.length > 0 ? (
        <THDistributionChart
          members={memberStats}
          leagueName={leagueInfo.name}
          selectedMembers={selectedMembers}
          onViewChange={inCWL && allCWLClans.length > 0 ? setChartView : undefined}
          showViewToggle={inCWL && allCWLClans.length > 0}
        />
      ) : null}

      {/* CWL Matchup Analysis */}
      {inCWL && selectedLineup.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  CWL Matchup Analysis
                </CardTitle>
                <CardDescription>
                  Predicted outcomes vs each opponent using your selected lineup ({selectedLineup.length} players)
                </CardDescription>
              </div>
              <button
                onClick={analyzeMatchups}
                disabled={analyzingMatchups}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzingMatchups ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Analyze Matchups
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          {cwlMatchupResults.size > 0 && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(cwlMatchupResults.entries())
                  .sort((a, b) => b[1].win_probability - a[1].win_probability)
                  .map(([tag, result]) => {
                    const winPct = Math.round(result.win_probability * 100)
                    const isLikelyWin = winPct > 60
                    const isToClose = winPct >= 40 && winPct <= 60
                    const isLikelyLoss = winPct < 40
                    return (
                      <div
                        key={tag}
                        className={`p-4 rounded-lg border ${
                          isLikelyWin
                            ? 'border-green-500/50 bg-green-500/5'
                            : isToClose
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'border-red-500/50 bg-red-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold truncate max-w-[160px]">{result.clanName}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.war_size}v{result.war_size}
                              {result.opponent_sample_size > 0
                                ? ` · ${result.opponent_sample_size} attacks tracked`
                                : ' · TH avg (no CWL data)'}
                            </div>
                          </div>
                          <Badge
                            className={
                              isLikelyWin
                                ? 'bg-green-500 text-white'
                                : isToClose
                                ? 'bg-yellow-500 text-black'
                                : 'bg-red-500 text-white'
                            }
                          >
                            {isLikelyWin ? 'Likely Win' : isToClose ? 'Too Close' : 'Likely Loss'}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Us</span>
                            <span className="font-medium">
                              {result.our_expected_stars}⭐ &nbsp;{result.our_avg_destruction}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Them</span>
                            <span className="font-medium">
                              {result.their_expected_stars}⭐ &nbsp;{result.their_avg_destruction}%
                            </span>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Win Probability</span>
                              <span
                                className={`font-bold text-base ${
                                  isLikelyWin
                                    ? 'text-green-500'
                                    : isToClose
                                    ? 'text-yellow-500'
                                    : 'text-red-500'
                                }`}
                              >
                                {winPct}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLikelyWin ? 'bg-green-500' : isToClose ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${winPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Member Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                CWL Member Selection Guide
              </CardTitle>
              <CardDescription>
                Sorted by recommendation score - higher score = better for CWL
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {loadingMembers && (
                <Badge variant="outline" className="animate-pulse">
                  Loading stats...
                </Badge>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configure Scoring
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Recommendation Score</strong> is calculated using configurable weights for:
              Town Hall level, War Stars, Donations, War Preference, League tier, and{' '}
              <strong>historical war performance</strong> (avg stars, destruction %, 3-star rate, attack participation).
              Click "Configure Scoring" to customize the weights. Higher scores indicate better CWL candidates.
            </p>
          </div>

          {/* Quick Selection Buttons */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Quick Select:</span>
            <button
              onClick={selectTop15}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors"
            >
              Top 15
            </button>
            <button
              onClick={selectTop30}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors"
            >
              Top 30
            </button>
            <button
              onClick={selectAllOptedIn}
              className="px-3 py-1.5 text-xs border rounded-md hover:bg-accent transition-colors"
            >
              All Opted In ({memberStats.filter(m => m.warPreference === 'in').length})
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs border border-red-500/50 text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
            >
              Clear Selection
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Select</span>
                      <div className="text-xs text-muted-foreground">({selectedLineup.length})</div>
                    </div>
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('townHallLevel')}
                  >
                    TH {sortField === 'townHallLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('warStars')}
                  >
                    War Stars {sortField === 'warStars' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('donations')}
                  >
                    Donations {sortField === 'donations' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-3 font-medium">
                    <div className="flex flex-col">
                      <span>Attack History</span>
                      <span className="text-xs font-normal text-muted-foreground">Participation</span>
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <div className="flex flex-col">
                      <span>War Performance</span>
                      <span className="text-xs font-normal text-muted-foreground">Avg Stars • Destruction • 3⭐ Rate</span>
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium">War Pref</th>
                  <th className="text-left p-3 font-medium">League</th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('score')}
                  >
                    Score {sortField === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, index) => {
                  const isRecommended = member.warPreference === 'in' && member.score > 500
                  const isSelected = selectedLineup.includes(member.tag)

                  return (
                    <tr
                      key={member.tag}
                      className={`border-b hover:bg-accent/50 transition-colors ${
                        isSelected ? 'bg-primary/5' : isRecommended ? 'bg-green-500/5' : ''
                      }`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMemberSelection(member.tag)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <ClickablePlayerName
                              tag={member.tag}
                              name={member.name}
                              onClick={setSelectedPlayerTag}
                              showTag={false}
                            />
                            {isRecommended && index < 15 && (
                              <Badge variant="default" className="text-xs bg-green-500">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{member.tag}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">TH {member.townHallLevel}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{member.warStars.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{member.donations.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {attackParticipation.has(member.tag) ? (
                          <div className="text-sm font-medium">
                            {attackParticipation.get(member.tag)!.used}/{attackParticipation.get(member.tag)!.total}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({Math.round((attackParticipation.get(member.tag)!.used / attackParticipation.get(member.tag)!.total) * 100)}%)
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-muted-foreground">
                            <div className="text-xs">No data</div>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {(member as any).historicalStats && !(member as any).historicalStats.error ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {((member as any).historicalStats.avg_stars || 0).toFixed(2)}⭐
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {((member as any).historicalStats.avg_destruction || 0).toFixed(0)}% •{' '}
                              {((member as any).historicalStats.three_star_rate || 0).toFixed(0)}% 3⭐
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-muted-foreground">
                            <div className="text-xs">No data</div>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={member.warPreference === 'in' ? 'default' : 'secondary'}
                          className={member.warPreference === 'in' ? 'bg-green-500' : ''}
                        >
                          {member.warPreference}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {member.leagueTier && member.leagueTier.iconUrls && (
                          <div className="flex items-center gap-1">
                            <img
                              src={getProxiedImageUrl(member.leagueTier.iconUrls.small)}
                              alt={member.leagueTier.name}
                              className="h-5 w-5"
                            />
                            <span className="text-xs truncate max-w-[100px]">
                              {member.leagueTier.name}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full transition-all ${
                                member.score > 500 ? 'bg-green-500' :
                                member.score > 300 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min((member.score / 800) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold min-w-[3rem]">
                            {member.score}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3">
            {!inCWL && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-500">Not Currently in CWL</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      CWL data will be available when your clan is participating in Clan War League.
                      Use this table to plan your roster based on member statistics.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-500">Attack Participation Data</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>War History</strong> shows attack participation across recent regular wars (e.g., "16/20" means 16 attacks used out of 20 possible attacks).
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>CWL History</strong> will show attack usage in previous CWL seasons - coming soon!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Card Modal */}
      <PlayerCard
        playerTag={selectedPlayerTag}
        open={!!selectedPlayerTag}
        onClose={() => setSelectedPlayerTag(null)}
      />

      {/* Scoring Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CWL Scoring Settings</DialogTitle>
            <DialogDescription>
              Customize the weights used to calculate member recommendation scores.
              Higher weights give more importance to that factor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Base Stats */}
            <div>
              <h3 className="font-medium mb-3">Base Statistics</h3>
              <div className="space-y-3">
                {[
                  { key: 'thLevel', label: 'Town Hall Level', description: 'Points per TH level' },
                  { key: 'warStars', label: 'War Stars', description: 'Points per war star' },
                  { key: 'donations', label: 'Donations', description: 'Points per 100 donations' },
                  { key: 'warPreference', label: 'War Preference', description: 'Bonus points if opted in' },
                  { key: 'leagueTier', label: 'League Tier', description: 'Points based on ranked league' },
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.description}</div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={scoringWeights[field.key as keyof ScoringWeights]}
                      onChange={(e) => {
                        const newWeights = {
                          ...scoringWeights,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }
                        setScoringWeights(newWeights)
                        saveScoringWeights(newWeights)
                      }}
                      className="w-20 px-3 py-2 border rounded-md text-right bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Historical Performance */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Historical War Performance</h3>
              <div className="space-y-3">
                {[
                  { key: 'avgStars', label: 'Avg Stars per Attack', description: 'Weight for average stars earned' },
                  { key: 'avgDestruction', label: 'Avg Destruction %', description: 'Weight for average destruction percentage' },
                  { key: 'threeStarRate', label: '3-Star Rate', description: 'Weight for triple star success rate' },
                  { key: 'attackParticipation', label: 'Attack Participation', description: 'Weight for attack usage rate' },
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.description}</div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={scoringWeights[field.key as keyof ScoringWeights]}
                      onChange={(e) => {
                        const newWeights = {
                          ...scoringWeights,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }
                        setScoringWeights(newWeights)
                        saveScoringWeights(newWeights)
                      }}
                      className="w-20 px-3 py-2 border rounded-md text-right bg-background text-foreground border-input focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  setScoringWeights(defaultWeights)
                  saveScoringWeights(defaultWeights)
                }}
                className="text-sm text-primary hover:underline"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
