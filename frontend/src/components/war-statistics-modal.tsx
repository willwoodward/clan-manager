import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface WarStatisticsModalProps {
  open: boolean
  onClose: () => void
  type: 'winRate' | 'streak' | 'participation'
  wars: any[]
}

export function WarStatisticsModal({ open, onClose, type, wars }: WarStatisticsModalProps) {
  const getTitle = () => {
    switch (type) {
      case 'winRate':
        return 'Win Rate Over Time'
      case 'streak':
        return 'Win Streak History'
      case 'participation':
        return 'Attack Participation History'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'winRate':
        return 'Rolling win rate percentage over recent wars'
      case 'streak':
        return 'Consecutive wins streak history'
      case 'participation':
        return 'Percentage of attacks used in each war'
    }
  }

  const renderChart = () => {
    if (!wars || wars.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No war data available</p>
        </div>
      )
    }

    if (type === 'winRate') {
      // Calculate rolling win rate (last 10 wars at each point)
      const reversedWars = [...wars].reverse()
      const chartData = reversedWars.map((war: any, index: number) => {
        // Look at last 10 wars up to this point
        const start = Math.max(0, index - 9)
        const recentWars = reversedWars.slice(start, index + 1)

        const wins = recentWars.filter((w: any) => {
          const clanStars = w.clan_stars || 0
          const oppStars = w.opponent_stars || 0
          const clanDest = w.clan_destruction || 0
          const oppDest = w.opponent_destruction || 0
          return clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
        }).length

        const winRate = (wins / recentWars.length) * 100

        return {
          date: war.end_time ? new Date(war.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
          winRate: parseFloat(winRate.toFixed(1)),
          opponent: war.opponent_name
        }
      })

      return (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
                label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                content={(props) => {
                  const { active, payload } = props
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div
                      className="bg-background border border-border rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="text-sm font-medium mb-1">{data.date}</div>
                      <div className="text-xs text-muted-foreground mb-2">vs {data.opponent}</div>
                      <div className="text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="font-medium">{data.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'streak') {
      // Calculate streak at each point
      const reversedWars = [...wars].reverse()
      let currentStreak = 0
      const chartData = reversedWars.map((war: any) => {
        const clanStars = war.clan_stars || 0
        const oppStars = war.opponent_stars || 0
        const clanDest = war.clan_destruction || 0
        const oppDest = war.opponent_destruction || 0
        const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)

        if (isWin) {
          currentStreak++
        } else {
          currentStreak = 0
        }

        return {
          date: war.end_time ? new Date(war.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
          streak: currentStreak,
          opponent: war.opponent_name,
          result: isWin ? 'Win' : 'Loss'
        }
      })

      return (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 'auto']}
                label={{ value: 'Win Streak', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                content={(props) => {
                  const { active, payload } = props
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div
                      className="bg-background border border-border rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="text-sm font-medium mb-1">{data.date}</div>
                      <div className="text-xs text-muted-foreground mb-2">vs {data.opponent}</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Result:</span>
                          <span className={`font-medium ${data.result === 'Win' ? 'text-green-500' : 'text-red-500'}`}>
                            {data.result}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Streak:</span>
                          <span className="font-medium">{data.streak}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Line
                type="stepAfter"
                dataKey="streak"
                stroke="#f97316"
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.result === 'Win' ? '#22c55e' : '#ef4444'}
                      strokeWidth={0}
                    />
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'participation') {
      const reversedWars = [...wars].reverse().slice(0, 20) // Last 20 wars
      const chartData = reversedWars.map((war: any) => {
        const teamSize = war.team_size || 0
        const attacksUsed = war.attacks?.length || 0

        // Determine attacks per member: CWL = 1, Regular = 2
        let attacksPerMember = war.attacks_per_member
        if (!attacksPerMember) {
          attacksPerMember = war.is_cwl ? 1 : 2
        }

        const totalPossible = teamSize * attacksPerMember
        const participation = totalPossible > 0 ? (attacksUsed / totalPossible) * 100 : 0

        return {
          date: war.end_time ? new Date(war.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
          participation: parseFloat(participation.toFixed(1)),
          attacksUsed,
          totalPossible,
          opponent: war.opponent_name
        }
      })

      return (
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
                label={{ value: 'Participation (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                content={(props) => {
                  const { active, payload } = props
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div
                      className="bg-background border border-border rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="text-sm font-medium mb-1">{data.date}</div>
                      <div className="text-xs text-muted-foreground mb-2">vs {data.opponent}</div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Attacks:</span>
                          <span className="font-medium">{data.attacksUsed}/{data.totalPossible}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Participation:</span>
                          <span className="font-medium">{data.participation}%</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" opacity={0.3} label={{ value: 'Good', position: 'right', fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={75} stroke="#eab308" strokeDasharray="5 5" opacity={0.3} label={{ value: 'Fair', position: 'right', fill: '#eab308', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="participation"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const color = payload.participation >= 90 ? '#22c55e' : payload.participation >= 75 ? '#eab308' : '#ef4444'
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      strokeWidth={0}
                    />
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {renderChart()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
