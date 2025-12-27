import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, Swords, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { EventLog } from '@/components/event-log'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import { StatisticsCards } from '@/components/statistics-cards'

export function Dashboard() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'

  const { data: clan, isLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  if (isLoading || !clan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clan data...</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Members',
      value: clan.members,
      icon: Users,
      description: 'Active members',
      color: 'text-blue-500',
    },
    {
      title: 'Clan Points',
      value: clan.clanPoints.toLocaleString(),
      icon: Trophy,
      description: 'Total trophies',
      color: 'text-yellow-500',
    },
    {
      title: 'War Record',
      value: `${clan.warWins}-${clan.warLosses}`,
      icon: Swords,
      description: `${((clan.warWins / (clan.warWins + clan.warLosses + clan.warTies || 1)) * 100).toFixed(1)}% win rate • ${clan.warWinStreak} streak`,
      color: clan.warWins > clan.warLosses ? 'text-green-500' : 'text-red-500',
    },
    {
      title: 'Clan Level',
      value: clan.clanLevel,
      icon: TrendingUp,
      description: `${clan.warLeague.name}`,
      color: 'text-green-500',
    },
  ]

  // Mock data for charts
  const donationData = clan.memberList.slice(0, 10).map(member => ({
    name: member.name.length > 10 ? member.name.substring(0, 10) + '...' : member.name,
    donations: member.donations,
    received: member.donationsReceived,
  }))

  const trophyData = clan.memberList
    .map(member => ({
      name: member.name.length > 10 ? member.name.substring(0, 10) + '...' : member.name,
      trophies: member.league.name === 'Unranked' ? 0 : member.trophies,
    }))
    .sort((a, b) => b.trophies - a.trophies)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          {clan.badgeUrls?.large && (
            <img
              src={getProxiedImageUrl(clan.badgeUrls.large)}
              alt={clan.name}
              className="h-16 w-16 rounded-lg"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">{clan.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{clan.tag}</Badge>
              <Badge variant="outline">Level {clan.clanLevel}</Badge>
              <Badge variant="outline">{clan.type}</Badge>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">{clan.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resource Statistics */}
      <StatisticsCards clanTag={clanTag} />

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Donors</CardTitle>
            <CardDescription>Donations vs Received</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={donationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="donations" fill="hsl(var(--primary))" />
                <Bar dataKey="received" fill="hsl(var(--muted))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Trophy Pushers</CardTitle>
            <CardDescription>Current trophy count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trophyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="trophies"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <EventLog limit={20} />
    </div>
  )
}
