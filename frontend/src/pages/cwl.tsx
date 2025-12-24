import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Users, Star, Swords, TrendingUp, AlertCircle, CheckCircle, XCircle, Settings } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { MemberWarStats } from '@/types/cwl'
import { THDistributionChart } from '@/components/th-distribution-chart'
import { CWLGroupTHDistribution } from '@/components/cwl-group-th-distribution'
import { PlayerCard } from '@/components/player-card'
import { ClickablePlayerName } from '@/components/clickable-player-name'
import { getProxiedImageUrl } from '@/utils/image-proxy'
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

export function CWL() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [memberStats, setMemberStats] = useState<Array<MemberWarStats & { score: number }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [allCWLClans, setAllCWLClans] = useState<Array<{ clanTag: string; clanName: string; members: Array<{ townHallLevel: number }> }>>([])
  const [loadingCWLClans, setLoadingCWLClans] = useState(false)
  const [selectedPlayerTag, setSelectedPlayerTag] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>(loadScoringWeights())

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
            try {
              const playerData = await clashApi.getPlayer(member.tag)

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
              const thScore = playerData.townHallLevel * scoringWeights.thLevel
              const starScore = playerData.warStars * scoringWeights.warStars
              const donationScore = (playerData.donations / 100) * scoringWeights.donations
              const prefScore = playerData.warPreference === 'in' ? scoringWeights.warPreference : 0
              const leagueScore = playerData.leagueTier?.id ? (playerData.leagueTier.id / 1000000) * scoringWeights.leagueTier : 0

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
                ...playerData,
                historicalStats,
                participationRate,
                score: Math.round(score),
              }
            } catch (error) {
              console.error(`Error fetching stats for ${member.name}:`, error)
              return null
            }
          })
        )

        setMemberStats(stats.filter((s): s is MemberWarStats & { score: number } => s !== null))
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

  // Calculate statistics
  const totalOptedIn = memberStats.filter(m => m.warPreference === 'in').length
  const totalOptedOut = memberStats.filter(m => m.warPreference === 'out').length
  const avgTH = memberStats.length > 0
    ? (memberStats.reduce((sum, m) => sum + m.townHallLevel, 0) / memberStats.length).toFixed(1)
    : '0'
  const avgWarStars = memberStats.length > 0
    ? (memberStats.reduce((sum, m) => sum + m.warStars, 0) / memberStats.length).toFixed(0)
    : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clan War League</h1>
        <p className="text-muted-foreground">Manage CWL participation and track league medals</p>
      </div>

      {/* Current League Info */}
      <Card className="border-yellow-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Current War League
              </CardTitle>
              <CardDescription>Your clan's current CWL standing</CardDescription>
            </div>
            {inCWL && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active CWL
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {leagueInfo?.iconUrls && (
              <img
                src={getProxiedImageUrl(leagueInfo.iconUrls.medium)}
                alt={leagueInfo.name}
                className="h-24 w-24"
              />
            )}
            <div className="flex-1">
              <div className="text-3xl font-bold text-yellow-500">
                {leagueInfo?.name || 'Unranked'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Higher leagues = More league medals per war win
              </p>
              {inCWL && cwlGroup && (
                <div className="mt-4 space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Season:</span>{' '}
                    <span className="font-medium">{cwlGroup.season}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge variant="outline">{cwlGroup.state}</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              War Preference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Opted In:</span>
                <span className="font-bold text-green-500">{totalOptedIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Opted Out:</span>
                <span className="font-bold text-red-500">{totalOptedOut}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Town Hall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTH}</div>
            <p className="text-xs text-muted-foreground">Clan average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Avg War Stars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{avgWarStars}</div>
            <p className="text-xs text-muted-foreground">Per member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ready for CWL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalOptedIn}</div>
            <p className="text-xs text-muted-foreground">Members opted in</p>
          </CardContent>
        </Card>
      </div>

      {/* TH Distribution Comparison */}
      {inCWL && allCWLClans.length > 0 ? (
        <CWLGroupTHDistribution
          clans={allCWLClans}
          ourClanTag={clan?.tag || clanTag}
        />
      ) : leagueInfo && memberStats.length > 0 ? (
        <THDistributionChart
          members={memberStats}
          leagueName={leagueInfo.name}
        />
      ) : null}

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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Status</th>
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

                  return (
                    <tr
                      key={member.tag}
                      className={`border-b hover:bg-accent/50 transition-colors ${
                        isRecommended ? 'bg-green-500/5' : ''
                      }`}
                    >
                      <td className="p-3">
                        {member.warPreference === 'in' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
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
                        {member.leagueTier && (
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
