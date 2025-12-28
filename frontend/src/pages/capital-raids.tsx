import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Swords,
  Shield,
  Users,
  Medal,
  Coins
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import { CapitalRaidsModal } from '@/components/capital-raids-modal'
import { UnifiedLineChart } from '@/components/ui/chart'

type SortField = 'name' | 'attacks' | 'capitalResourcesLooted' | 'avgPerAttack'
type SortDirection = 'asc' | 'desc'
type MetricType = 'medals' | 'gold' | 'trophies' | 'participation'

export function CapitalRaids() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'
  const [sortField, setSortField] = useState<SortField>('capitalResourcesLooted')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<MetricType>('medals')

  const { data: seasons, isLoading } = useQuery({
    queryKey: ['capitalRaidSeasons', clanTag],
    queryFn: () => clashApi.getCapitalRaidSeasons(clanTag, 10),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  // Fetch clan data for capital trophies
  const { data: clanData } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
  })

  if (isLoading || !seasons) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading capital raid data...</p>
        </div>
      </div>
    )
  }

  if (!seasons.items || seasons.items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Raid Data</h3>
          <p className="text-muted-foreground">No capital raid seasons found for this clan</p>
        </div>
      </div>
    )
  }

  const latestSeason = seasons.items[0]
  const avgGoldPerAttack = latestSeason.totalAttacks > 0
    ? Math.round(latestSeason.capitalTotalLoot / latestSeason.totalAttacks)
    : 0

  // Handler for metric card clicks
  const handleMetricClick = (type: MetricType) => {
    setModalType(type)
    setModalOpen(true)
  }

  // Calculate total raid medals
  // Use previous season for medals if current season is ongoing (medals are 0 until weekend ends)
  const currentSeasonMedals = latestSeason.offensiveReward + latestSeason.defensiveReward
  const isOngoing = latestSeason.state === 'ongoing'
  const previousSeason = seasons.items.length > 1 ? seasons.items[1] : null

  // Display medals: use previous season if current is ongoing with 0 medals
  const displaySeason = isOngoing && currentSeasonMedals === 0 && previousSeason ? previousSeason : latestSeason
  // Offensive medals are per player (for 6 attacks), multiply by 6 to get total clan medals
  const offensiveMedals = displaySeason.offensiveReward * 6
  const defensiveMedals = displaySeason.defensiveReward
  const totalMedals = offensiveMedals + defensiveMedals

  // For comparison, use the season before the display season
  const comparisonSeason = displaySeason === latestSeason && previousSeason
    ? previousSeason
    : seasons.items.length > 2 ? seasons.items[2] : null
  const previousMedals = comparisonSeason
    ? (comparisonSeason.offensiveReward * 6) + comparisonSeason.defensiveReward
    : 0
  const medalsDiff = totalMedals - previousMedals

  // Calculate participation based on clan members (use current season)
  const totalClanMembers = clanData?.members || latestSeason.members.length
  const activeMembers = latestSeason.members.filter(m => m.attacks > 0).length
  const participationRate = totalClanMembers > 0 ? Math.round((activeMembers / totalClanMembers) * 100) : 0
  const goldDiff = previousSeason ? latestSeason.capitalTotalLoot - previousSeason.capitalTotalLoot : 0
  const prevParticipation = previousSeason
    ? Math.round((previousSeason.members.filter(m => m.attacks > 0).length / totalClanMembers) * 100)
    : 0
  const participationDiff = participationRate - prevParticipation

  // Calculate member metrics
  const membersWithMetrics = latestSeason.members.map(member => ({
    ...member,
    avgPerAttack: member.attacks > 0 ? Math.round(member.capitalResourcesLooted / member.attacks) : 0,
    attacksUsed: `${member.attacks}/${member.attackLimit + member.bonusAttackLimit}`,
  }))

  // Sort members
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedMembers = [...membersWithMetrics].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    if (sortField === 'name') {
      return modifier * a.name.localeCompare(b.name)
    }
    return modifier * (a[sortField] - b[sortField])
  })

  const currentCapitalTrophies = clanData?.clanCapitalPoints || 0

  // Defense stats
  const totalDefenseAttacks = latestSeason.defenseLog?.reduce((sum, log) => sum + log.attackCount, 0) ?? 0
  const districtsDefended = latestSeason.defenseLog?.reduce((sum, log) =>
    sum + (log.districtCount - log.districtsDestroyed), 0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Capital Raids</h1>
        <p className="text-muted-foreground">Track raid weekend performance and raid medals</p>
      </div>

      {/* Season Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Latest Raid Weekend</CardTitle>
              <CardDescription>
                {new Date(latestSeason.startTime).toLocaleDateString()} - {new Date(latestSeason.endTime).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge variant={latestSeason.state === 'ongoing' ? 'default' : 'secondary'}>
              {latestSeason.state === 'ongoing' ? 'Ongoing' : 'Ended'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics - Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Raid Medals */}
        <Card
          className="cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg"
          onClick={() => handleMetricClick('medals')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Medal className="h-4 w-4 text-purple-500" />
              Raid Medals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{totalMedals}</div>
            <p className="text-xs text-muted-foreground">
              {medalsDiff !== 0 && (
                <span className={medalsDiff > 0 ? 'text-green-500' : 'text-red-500'}>
                  {medalsDiff > 0 ? '↑' : '↓'} {Math.abs(medalsDiff)} vs last •{' '}
                </span>
              )}
              Off: {offensiveMedals} | Def: {defensiveMedals}
            </p>
          </CardContent>
        </Card>

        {/* Capital Gold */}
        <Card
          className="cursor-pointer transition-all hover:border-yellow-500 hover:shadow-lg"
          onClick={() => handleMetricClick('gold')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              Capital Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{latestSeason.capitalTotalLoot.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {goldDiff !== 0 && (
                <span className={goldDiff > 0 ? 'text-green-500' : 'text-red-500'}>
                  {goldDiff > 0 ? '↑' : '↓'} {Math.abs(goldDiff).toLocaleString()} vs last •{' '}
                </span>
              )}
              Avg: {avgGoldPerAttack}/attack
            </p>
          </CardContent>
        </Card>

        {/* Capital Trophies */}
        <Card
          className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg"
          onClick={() => handleMetricClick('trophies')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-500" />
              Capital Trophies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{currentCapitalTrophies}</div>
            <p className="text-xs text-muted-foreground">
              Current clan capital points
            </p>
          </CardContent>
        </Card>

        {/* Participation */}
        <Card
          className="cursor-pointer transition-all hover:border-green-500 hover:shadow-lg"
          onClick={() => handleMetricClick('participation')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{participationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {participationDiff !== 0 && (
                <span className={participationDiff > 0 ? 'text-green-500' : 'text-red-500'}>
                  {participationDiff > 0 ? '↑' : '↓'} {Math.abs(participationDiff)}% vs last •{' '}
                </span>
              )}
              {activeMembers}/{totalClanMembers} members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attack & Defense Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-red-500" />
              Offensive Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Attacks:</span>
              <span className="font-semibold">{latestSeason.totalAttacks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Raids Completed:</span>
              <span className="font-semibold">{latestSeason.raidsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Districts Destroyed:</span>
              <span className="font-semibold">{latestSeason.enemyDistrictsDestroyed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Gold per Attack:</span>
              <span className="font-semibold text-yellow-500">{avgGoldPerAttack}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Defensive Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Defenses:</span>
              <span className="font-semibold">{latestSeason.defenseLog?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attacks Defended:</span>
              <span className="font-semibold">{totalDefenseAttacks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Districts Defended:</span>
              <span className="font-semibold">{districtsDefended}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Defensive Medals:</span>
              <span className="font-semibold text-blue-500">{latestSeason.defensiveReward}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attacks per District Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Attacks per District Trend</CardTitle>
          <CardDescription>Average attacks needed per district over last 10 raid weekends (lower is more efficient)</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const chartData = seasons.items
              .slice()
              .reverse()
              .map((season) => {
                const totalDistricts = season.attackLog?.reduce((sum, log) => sum + log.districtCount, 0) ?? 0
                const attacksPerDistrict = totalDistricts > 0 ? season.totalAttacks / totalDistricts : 0

                return {
                  date: new Date(season.endTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }),
                  attacksPerDistrict: parseFloat(attacksPerDistrict.toFixed(2)),
                }
              })

            return (
              <UnifiedLineChart
                data={chartData}
                dataKey="attacksPerDistrict"
                stroke="#3b82f6"
                strokeWidth={2}
                height={300}
                showDots={true}
              />
            )
          })()}
        </CardContent>
      </Card>

      {/* Member Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Performance</CardTitle>
          <CardDescription>Detailed breakdown of all participants ({latestSeason.members.length} members)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('attacks')}
                  >
                    Attacks {sortField === 'attacks' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('capitalResourcesLooted')}
                  >
                    Capital Gold {sortField === 'capitalResourcesLooted' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('avgPerAttack')}
                  >
                    Avg/Attack {sortField === 'avgPerAttack' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, index) => (
                  <tr key={member.tag} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {index + 1 <= 3 ? (
                          <Trophy className={`h-4 w-4 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            'text-orange-600'
                          }`} />
                        ) : (
                          <span className="font-medium">#{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.tag}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant={member.attacks >= member.attackLimit ? 'default' : 'secondary'}>
                        {member.attacksUsed}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-yellow-500">
                        {member.capitalResourcesLooted.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{member.avgPerAttack}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Raid Targets */}
      {latestSeason.attackLog && latestSeason.attackLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raid Attacks Overview</CardTitle>
            <CardDescription>
              {latestSeason.raidsCompleted} {latestSeason.raidsCompleted === 1 ? 'raid' : 'raids'} completed • {latestSeason.totalAttacks} total attacks • {latestSeason.enemyDistrictsDestroyed} districts destroyed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestSeason.attackLog.map((log, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="text-center mb-4">
                      <div className="text-lg font-semibold text-muted-foreground mb-1">
                        Raid #{index + 1}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Swords className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          vs {log.districtCount} district{log.districtCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Attacks</span>
                        <span className="font-bold text-lg">{log.attackCount}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg per District</span>
                        <span className="font-semibold">
                          {log.districtCount > 0 ? (log.attackCount / log.districtCount).toFixed(1) : 0}
                        </span>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground text-center">
                          Efficiency: {log.districtCount > 0
                            ? `${(2 / (log.attackCount / log.districtCount) * 100).toFixed(0)}%`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {latestSeason.totalAttacks}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Attacks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {latestSeason.raidsCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">Raids</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {latestSeason.totalAttacks > 0
                      ? (latestSeason.totalAttacks / (latestSeason.raidsCompleted || 1)).toFixed(1)
                      : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Attacks/Raid</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal for viewing trends */}
      <CapitalRaidsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        clanTag={clanTag}
      />
    </div>
  )
}
