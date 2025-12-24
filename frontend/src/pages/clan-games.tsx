import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gamepad2, Trophy, Users, CheckCircle2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { ClickablePlayerName } from '@/components/clickable-player-name'
import { PlayerCard } from '@/components/player-card'
import { ClanGamesPodium } from '@/components/clan-games-podium'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Clan games API client
const clanGamesApi = axios.create({
  baseURL: `${API_BASE_URL}/api/clan-games`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Simple time ago formatter
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function ClanGames() {
  const [selectedPlayerTag, setSelectedPlayerTag] = useState<string | null>(null)
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'

  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['clan-games-leaderboard'],
    queryFn: async () => {
      const response = await clanGamesApi.get('/leaderboard')
      return response.data
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['clan-games-history'],
    queryFn: async () => {
      const response = await clanGamesApi.get('/sessions/history')
      return response.data
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const { data: currentSessionData } = useQuery({
    queryKey: ['clan-games-current-session'],
    queryFn: async () => {
      const response = await clanGamesApi.get('/session/current')
      return response.data
    },
    refetchInterval: 30 * 1000,
  })

  if (clanLoading || leaderboardLoading || !clan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clan games data...</p>
        </div>
      </div>
    )
  }

  // Get leaderboard from API
  const leaderboard = leaderboardData?.leaderboard || []

  // Calculate stats
  const totalMembers = clan.members
  const participationCount = leaderboard.length
  const participationRate = totalMembers > 0 ? ((participationCount / totalMembers) * 100).toFixed(1) : '0'
  const totalPoints = leaderboard.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)

  // Top 3 for podium
  const topThree = leaderboard.slice(0, 3)

  // Process historical data for charts (including current session)
  const historicalSessions = historyData?.sessions || []

  // Combine historical sessions with current session
  const allSessions = currentSessionData?.session
    ? [...historicalSessions, currentSessionData.session]
    : historicalSessions

  const chartData = allSessions
    .slice(-10) // Last 10 sessions
    .map((session: any) => {
      const sessionPlayers = Object.values(session.players || {})
      // Only count contributors (players with points_earned > 0)
      const contributors = sessionPlayers.filter((p: any) => (p.points_earned || 0) > 0)
      const sessionTotalPoints = sessionPlayers.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)
      const sessionDate = new Date(session.start_time).toLocaleDateString('en-US', { month: 'short' })
      const isCurrent = session.status === 'active'

      return {
        name: isCurrent ? `${sessionDate} (Current)` : sessionDate,
        participationRate: parseFloat(((contributors.length / totalMembers) * 100).toFixed(1)),
        totalPoints: sessionTotalPoints,
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Gamepad2 className="h-8 w-8" />
          Clan Games
        </h1>
        <p className="text-muted-foreground">Track current clan games session progress</p>
      </div>

      {/* Podium - Top 3 */}
      {topThree.length >= 3 && (
        <ClanGamesPodium topThree={topThree} onClick={setSelectedPlayerTag} />
      )}

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {participationCount} / {totalMembers} members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All members combined</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Participating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{participationCount}</div>
            <p className="text-xs text-muted-foreground">Members active</p>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Participants ({participationCount})</CardTitle>
          <CardDescription>
            Complete leaderboard for the current clan games session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No clan games session active</p>
              <p className="text-sm">Waiting for clan games to start</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Rank</th>
                    <th className="text-left p-3 font-medium">Player</th>
                    <th className="text-left p-3 font-medium">Points Earned</th>
                    <th className="text-left p-3 font-medium">Current Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((participant: any, index: number) => (
                    <tr key={participant.player_tag} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <ClickablePlayerName
                          tag={participant.player_tag}
                          name={participant.player_name}
                          onClick={setSelectedPlayerTag}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold text-lg">{participant.points_earned.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">
                          {participant.current_points.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clan Games History */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Clan Games History
            </CardTitle>
            <CardDescription>
              Performance trends across previous clan games sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Participation Rate Chart */}
              <div>
                <h3 className="text-sm font-medium mb-4">Participation Rate (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="participationRate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Participation %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Total Points Chart */}
              <div>
                <h3 className="text-sm font-medium mb-4">Total Points Earned</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => value.toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalPoints"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                      name="Total Points"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PlayerCard
        playerTag={selectedPlayerTag}
        open={!!selectedPlayerTag}
        onClose={() => setSelectedPlayerTag(null)}
      />
    </div>
  )
}
