import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UnifiedLineChart, UnifiedBarChart } from '@/components/ui/chart'
import { statistics, cwl } from '@/services/api'
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Target } from 'lucide-react'

interface StatisticsModalProps {
  open: boolean
  onClose: () => void
  type: 'raid' | 'cwl' | 'games' | 'ores'
  clanTag: string
}

export function StatisticsModal({ open, onClose, type, clanTag }: StatisticsModalProps) {
  const { data: raidHistory } = useQuery({
    queryKey: ['raid-medals-history', clanTag],
    queryFn: () => statistics.getRaidMedalsHistory(clanTag, 10),
    enabled: open && type === 'raid',
  })

  const { data: clanGamesHistory } = useQuery({
    queryKey: ['clan-games-history', clanTag],
    queryFn: () => statistics.getClanGamesHistory(clanTag, 10),
    enabled: open && type === 'games',
  })

  const { data: oreHistory } = useQuery({
    queryKey: ['ore-history', clanTag],
    queryFn: () => statistics.getOreHistory(clanTag, 30),
    enabled: open && type === 'ores',
  })

  const { data: cwlHistory, isLoading: cwlLoading, error: cwlError } = useQuery({
    queryKey: ['cwl-history'],
    queryFn: () => cwl.getHistory(12),
    enabled: open && type === 'cwl',
  })

  const getTitle = () => {
    switch (type) {
      case 'raid':
        return 'Raid Medals History'
      case 'cwl':
        return 'CWL Medals History'
      case 'games':
        return 'Clan Games History'
      case 'ores':
        return 'Ore Estimates History'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'raid':
        return 'Total, offensive, and defensive raid medals earned over last 10 raid weekends'
      case 'cwl':
        return 'Clan War League medal earnings'
      case 'games':
        return 'Clan Games tier achievements'
      case 'ores':
        return 'Capital Gold ore estimates over last 30 days (shiny, glowy, and starry ore)'
    }
  }

  const renderChart = () => {
    if (type === 'raid' && raidHistory?.items) {
      const chartData = raidHistory.items
        .map((item: any) => ({
          date: item.end_time || 'Unknown',
          total_medals: item.total_medals,
          offensive_medals: item.offensive_medals,
          defensive_medals: item.defensive_medals,
        }))
        .reverse()

      return (
        <UnifiedLineChart
          data={chartData}
          dataKey="total_medals"
          stroke="#8b5cf6"
          strokeWidth={2}
          height={300}
          showDots={true}
        >
          <Line
            type="monotone"
            dataKey="offensive_medals"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
            name="Offensive Medals"
          />
          <Line
            type="monotone"
            dataKey="defensive_medals"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 3 }}
            name="Defensive Medals"
          />
        </UnifiedLineChart>
      )
    }

    if (type === 'games') {
      // Check if there's any completed clan games history
      if (clanGamesHistory?.items && clanGamesHistory.items.length > 0) {
        // Clan games tier thresholds
        const tierThresholds = [3000, 7500, 12000, 18000, 30000, 50000]

        const chartData = clanGamesHistory.items
          .map((item: any, index: number) => ({
            date: item.start_time || `Session ${index + 1}`,
            points: item.total_points,
            tier: item.tier_achieved,
          }))
          .reverse()

        return (
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => {
                    if (!value) return ''
                    try {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    } catch {
                      return value
                    }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={(props) => {
                    const { active, payload, label } = props
                    if (!active || !payload || !payload.length) return null
                    return (
                      <div
                        className="bg-background border border-border rounded-lg p-3 shadow-lg"
                        style={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >
                        <div className="text-sm font-medium mb-2">
                          {label ? (() => {
                            try {
                              return new Date(label).toLocaleDateString()
                            } catch {
                              return label
                            }
                          })() : ''}
                        </div>
                        <div className="space-y-1">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{entry.name}:</span>
                              <span className="font-medium">
                                {entry.name === 'Points'
                                  ? entry.value.toLocaleString()
                                  : `Tier ${entry.value}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />

                {/* Tier threshold lines */}
                {tierThresholds.map((threshold, index) => (
                  <ReferenceLine
                    key={`tier-${index}`}
                    y={threshold}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    opacity={0.4}
                    label={{
                      value: `Tier ${index + 1}`,
                      position: 'right',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 10,
                      opacity: 0.7,
                    }}
                  />
                ))}

                {/* Main points line */}
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Points"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      } else {
        // No history yet - show placeholder
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Clan Games History Yet</p>
              <p className="text-sm mt-2">Complete a clan games event to start tracking history</p>
            </div>
          </div>
        )
      }
    }

    if (type === 'ores' && oreHistory?.items) {
      const chartData = oreHistory.items.map((item: any) => ({
        date: item.date || 'Unknown',
        shiny_ore: item.shiny_ore,
        glowy_ore: item.glowy_ore,
        starry_ore: item.starry_ore,
        won: item.won,
      }))

      return (
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => {
                  if (!value) return ''
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Shiny Ore', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Glowy/Starry Ore', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
              <Tooltip
                content={(props) => {
                  const { active, payload, label } = props
                  if (!active || !payload || !payload.length) return null
                  return (
                    <div
                      className="bg-background border border-border rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="text-sm font-medium mb-2">
                        {label ? new Date(label).toLocaleDateString() : ''}
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="shiny_ore"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={{ fill: '#fbbf24', r: 3 }}
                name="Shiny Ore"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="glowy_ore"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                name="Glowy Ore"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="starry_ore"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                name="Starry Ore"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'cwl') {
      if (cwlLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading CWL history...</p>
            </div>
          </div>
        )
      }

      if (cwlError) {
        return (
          <div className="flex items-center justify-center h-64 text-red-500">
            <div className="text-center">
              <p className="font-medium">Error loading CWL history</p>
              <p className="text-sm mt-2">{String(cwlError)}</p>
            </div>
          </div>
        )
      }

      if (cwlHistory?.items && cwlHistory.items.length > 0) {
        // Map league names to numeric values and medal ranges
        // Medal ranges match the backend ResourceCalculator (min is 8th place, max is 1st place)
        const leagueData: Record<string, { rank: number; medals: string }> = {
          'Unranked': { rank: 0, medals: '0' },
          'Bronze League III': { rank: 1, medals: '20-34' },
          'Bronze League II': { rank: 2, medals: '32-46' },
          'Bronze League I': { rank: 3, medals: '44-58' },
          'Silver League III': { rank: 4, medals: '55-76' },
          'Silver League II': { rank: 5, medals: '73-94' },
          'Silver League I': { rank: 6, medals: '91-112' },
          'Gold League III': { rank: 7, medals: '108-136' },
          'Gold League II': { rank: 8, medals: '132-160' },
          'Gold League I': { rank: 9, medals: '156-184' },
          'Crystal League III': { rank: 10, medals: '179-214' },
          'Crystal League II': { rank: 11, medals: '209-244' },
          'Crystal League I': { rank: 12, medals: '239-274' },
          'Master League III': { rank: 13, medals: '268-310' },
          'Master League II': { rank: 14, medals: '304-346' },
          'Master League I': { rank: 15, medals: '340-382' },
          'Champion League III': { rank: 16, medals: '375-424' },
          'Champion League II': { rank: 17, medals: '417-466' },
          'Champion League I': { rank: 18, medals: '459-508' },
        }

        // Build chart data with actual and projected points
        const sortedItems = [...cwlHistory.items].reverse()
        const chartData: any[] = []
        const lastItem = sortedItems[sortedItems.length - 1]
        const hasProjection = lastItem && (lastItem.promoted || lastItem.demoted) && lastItem.status === 'complete'

        sortedItems.forEach((item: any, index: number) => {
          const isLastItem = index === sortedItems.length - 1
          const currentRank = leagueData[item.league_start]?.rank || 0

          // Add actual season data point
          chartData.push({
            date: item.season_id,
            league_rank: currentRank,
            // For the last item, also add projected_rank to start the dotted line
            projected_rank: (isLastItem && hasProjection) ? currentRank : undefined,
            league_name: item.league_start,
            medals: leagueData[item.league_start]?.medals || '0',
            isProjected: false,
          })
        })

        // Add projected point only from the last completed season
        if (hasProjection) {
          // Calculate next season ID (e.g., 2026-01 -> 2026-02)
          const [year, month] = lastItem.season_id.split('-').map(Number)
          const nextMonth = month === 12 ? 1 : month + 1
          const nextYear = month === 12 ? year + 1 : year
          const nextSeasonId = `${nextYear}-${String(nextMonth).padStart(2, '0')}`

          chartData.push({
            date: nextSeasonId,
            projected_rank: leagueData[lastItem.league_end]?.rank || 0,
            league_name: lastItem.league_end,
            medals: leagueData[lastItem.league_end]?.medals || '0',
            isProjected: true,
          })
        }

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
                  domain={[1, 18]}
                  ticks={[1, 4, 7, 10, 13, 16]}
                  tickFormatter={(value) => {
                    const leagues: Record<number, string> = {
                      1: 'Bronze III',
                      4: 'Silver III',
                      7: 'Gold III',
                      10: 'Crystal III',
                      13: 'Master III',
                      16: 'Champion III',
                    }
                    return leagues[value] || ''
                  }}
                />
                <Tooltip
                  content={(props) => {
                    const { active, payload } = props
                    if (!active || !payload || !payload.length) return null
                    // Prefer the actual league data over projected when both exist at same point
                    const actualData = payload.find((p: any) => p.dataKey === 'league_rank')
                    const data = actualData ? actualData.payload : payload[0].payload
                    return (
                      <div
                        className="bg-background border border-border rounded-lg p-3 shadow-lg"
                        style={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >
                        <div className="text-sm font-medium mb-1">
                          {data.date}
                          {data.isProjected && <span className="ml-2 text-xs text-muted-foreground">(Based on season result)</span>}
                        </div>
                        <div className={`text-xs font-semibold mb-2 ${data.isProjected ? 'text-gray-400' : 'text-yellow-500'}`}>
                          {data.league_name}
                        </div>
                        <div className="text-xs">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Medal Range:</span>
                            <span className="font-medium">{data.medals}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="projected_rank"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={(props: any) => {
                    // Only show grey dot for projected points, not for the last actual point
                    if (props.payload.isProjected) {
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill="#9ca3af"
                          strokeWidth={0}
                        />
                      )
                    }
                    return null
                  }}
                  name="Projected"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="league_rank"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ fill: '#fbbf24', r: 4, strokeWidth: 0 }}
                  name="League"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      } else {
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No CWL History Yet</p>
              <p className="text-sm mt-2">CWL data will appear after participating in a CWL season</p>
            </div>
          </div>
        )
      }
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <p>No data available</p>
        </div>
      </div>
    )
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
