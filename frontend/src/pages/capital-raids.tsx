import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Swords,
  Shield,
  Users,
  Target
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useState } from 'react'
import { getProxiedImageUrl } from '@/utils/image-proxy'

type SortField = 'name' | 'attacks' | 'capitalResourcesLooted' | 'avgPerAttack'
type SortDirection = 'asc' | 'desc'

export function CapitalRaids() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'
  const [sortField, setSortField] = useState<SortField>('capitalResourcesLooted')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  // Calculate trend data if we have multiple seasons
  const trendData = seasons.items.slice(0, 5).reverse().map(season => ({
    date: new Date(season.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    medals: season.offensiveReward + season.defensiveReward,
    loot: Math.round(season.capitalTotalLoot / 1000), // In thousands
    raids: season.raidsCompleted,
  }))

  // Top attackers for chart
  const topAttackers = membersWithMetrics.slice(0, 10).map(m => ({
    name: m.name.length > 10 ? m.name.substring(0, 10) + '...' : m.name,
    loot: m.capitalResourcesLooted,
    avgPerAttack: m.avgPerAttack,
  }))

  // Calculate participation rate
  const activeMembers = latestSeason.members.filter(m => m.attacks > 0).length
  const participationRate = Math.round((activeMembers / latestSeason.members.length) * 100)

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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              Capital Trophies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{currentCapitalTrophies}</div>
            <p className="text-xs text-muted-foreground">Current clan capital</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Capital Gold Looted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSeason.capitalTotalLoot.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg {avgGoldPerAttack} per attack
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Raids Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{latestSeason.raidsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {latestSeason.enemyDistrictsDestroyed} districts destroyed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{participationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {activeMembers} of {latestSeason.members.length} members
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

      {/* Charts */}
      {seasons.items.length > 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Raid Medal Trends</CardTitle>
              <CardDescription>Last 5 raid weekends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="medals" stroke="hsl(var(--primary))" strokeWidth={2} name="Medals" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capital Gold Trends</CardTitle>
              <CardDescription>Total loot in thousands</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="loot" fill="hsl(var(--primary))" name="Gold (k)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers - Capital Gold Looted</CardTitle>
          <CardDescription>Top 10 raiders by total capital gold</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topAttackers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} />
              <Tooltip />
              <Bar dataKey="loot" fill="hsl(var(--primary))" name="Capital Gold" />
            </BarChart>
          </ResponsiveContainer>
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
            <CardTitle>Raid Targets</CardTitle>
            <CardDescription>Clans attacked during this raid weekend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestSeason.attackLog.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {log.defender.badgeUrls?.small && (
                      <img
                        src={getProxiedImageUrl(log.defender.badgeUrls.small)}
                        alt={log.defender.name}
                        className="h-12 w-12 rounded"
                      />
                    )}
                    <div>
                      <div className="font-medium">{log.defender.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Level {log.defender.level} • {log.defender.tag}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Districts</div>
                    <div className="font-bold">
                      {log.districtsDestroyed}/{log.districtCount}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({log.attackCount} attacks)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
