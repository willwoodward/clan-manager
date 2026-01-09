import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { activity as activityApi } from '@/services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { LoadingState } from '@/components/ui/loading'
import { useMemo } from 'react'

interface ActivityGraphProps {
  clanTag: string
  days?: number
}

interface DailyActivity {
  date: string
  totalScore: number
  topPlayers: Array<{ name: string; score: number }>
}

export function ActivityGraph({ clanTag, days = 14 }: ActivityGraphProps) {
  // Fetch all player activities
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['allActivities'],
    queryFn: () => activityApi.getAllActivities(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  // Process activity data to create daily aggregations
  const chartData = useMemo(() => {
    if (!activitiesData?.activities) return []

    // Map to store aggregated data by date
    const dailyMap = new Map<string, Map<string, { name: string; score: number }>>()

    // Process each player's activity
    Object.entries(activitiesData.activities).forEach(([playerTag, playerData]: [string, any]) => {
      const playerName = playerData.player_name || 'Unknown'
      const dailyActivity = playerData.daily_activity || {}

      Object.entries(dailyActivity).forEach(([date, dayData]: [string, any]) => {
        const score = dayData.activity_score || 0

        if (!dailyMap.has(date)) {
          dailyMap.set(date, new Map())
        }

        dailyMap.get(date)!.set(playerTag, { name: playerName, score })
      })
    })

    // Convert to array and calculate totals
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]

    const result: DailyActivity[] = []
    const sortedDates = Array.from(dailyMap.keys()).sort()

    sortedDates.forEach(date => {
      if (date < cutoffStr) return

      const playersMap = dailyMap.get(date)!
      const playerScores = Array.from(playersMap.values())

      // Calculate total score for the day
      const totalScore = playerScores.reduce((sum, p) => sum + p.score, 0)

      // Get top 5 players by score
      const topPlayers = playerScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      result.push({
        date,
        totalScore: Math.round(totalScore * 10) / 10,
        topPlayers
      })
    })

    return result
  }, [activitiesData, days])

  // Custom tooltip to show breakdown by top players
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload as DailyActivity

    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{data.date}</p>
        <p className="text-lg font-bold text-primary mb-2">
          Total: {data.totalScore}
        </p>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Top 5 Players:</p>
          {data.topPlayers.map((player, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="truncate max-w-[120px]">{player.name}</span>
              <span className="font-medium ml-2">{player.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Clan Activity
          </CardTitle>
          <CardDescription>Daily activity score over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingState message="Loading activity data..." size="md" />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Clan Activity
          </CardTitle>
          <CardDescription>Daily activity score over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Clan Activity
        </CardTitle>
        <CardDescription>
          Daily activity score over the last {days} days • Hover to see top 5 contributors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              fontSize={12}
              tickFormatter={(date) => {
                const d = new Date(date)
                return `${d.getMonth() + 1}/${d.getDate()}`
              }}
            />
            <YAxis fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="totalScore"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p>
            <strong>Activity Score:</strong> Based on attacks (1pt each) and donations/received (1pt per ~50 troops).
            Hover over the chart to see the top 5 contributors for each day.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
