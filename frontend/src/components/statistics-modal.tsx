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
import { format, parseISO } from 'date-fns'
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

  const { data: cwlHistory } = useQuery({
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
        const chartData = clanGamesHistory.items
          .map((item: any) => ({
            date: item.start_time || 'Current',
            points: item.total_points,
            tier: item.tier_achieved,
          }))
          .reverse()

        return (
          <UnifiedLineChart
            data={chartData}
            dataKey="points"
            stroke="#10b981"
            strokeWidth={2}
            height={300}
            showDots={true}
          >
            <Line
              type="monotone"
              dataKey="tier"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 3 }}
              name="Tier Achieved"
            />
          </UnifiedLineChart>
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
      if (cwlHistory?.items && cwlHistory.items.length > 0) {
        // Map league names to numeric values for charting
        const leagueRanks: Record<string, number> = {
          'Unranked': 0,
          'Bronze League III': 1,
          'Bronze League II': 2,
          'Bronze League I': 3,
          'Silver League III': 4,
          'Silver League II': 5,
          'Silver League I': 6,
          'Gold League III': 7,
          'Gold League II': 8,
          'Gold League I': 9,
          'Crystal League III': 10,
          'Crystal League II': 11,
          'Crystal League I': 12,
          'Master League III': 13,
          'Master League II': 14,
          'Master League I': 15,
          'Champion League III': 16,
          'Champion League II': 17,
          'Champion League I': 18,
        }

        const chartData = cwlHistory.items
          .map((item: any) => ({
            date: item.season_id,
            league_rank: leagueRanks[item.league_end] || 0,
            league_name: item.league_end,
            wins: item.wars_won,
            losses: item.wars_lost,
            stars: item.total_stars,
          }))
          .reverse()

        return (
          <UnifiedLineChart
            data={chartData}
            dataKey="league_rank"
            stroke="#fbbf24"
            strokeWidth={2}
            height={300}
            showDots={true}
          >
            <Line
              type="monotone"
              dataKey="wins"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              name="Wins"
            />
            <Line
              type="monotone"
              dataKey="losses"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
              name="Losses"
            />
          </UnifiedLineChart>
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
