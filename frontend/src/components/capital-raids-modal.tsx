import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clashApi } from '@/services/clash-api'
import { UnifiedLineChart } from '@/components/ui/chart'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CapitalRaidsModalProps {
  open: boolean
  onClose: () => void
  type: 'medals' | 'gold' | 'trophies' | 'participation'
  clanTag: string
}

export function CapitalRaidsModal({ open, onClose, type, clanTag }: CapitalRaidsModalProps) {
  const { data: seasons, isLoading } = useQuery({
    queryKey: ['capitalRaidSeasons', clanTag],
    queryFn: () => clashApi.getCapitalRaidSeasons(clanTag, 10),
    enabled: open,
  })

  const { data: clanData } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
    enabled: open,
  })

  const getTitle = () => {
    switch (type) {
      case 'medals':
        return 'Raid Medals History'
      case 'gold':
        return 'Capital Gold History'
      case 'trophies':
        return 'Capital Trophies History'
      case 'participation':
        return 'Participation History'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'medals':
        return 'Total, offensive, and defensive raid medals over last 10 weekends'
      case 'gold':
        return 'Capital gold looted and average per attack over last 10 weekends'
      case 'trophies':
        return 'Capital trophy progression (current: ' + (clanData?.clanCapitalPoints || 0) + ')'
      case 'participation':
        return 'Member participation rate over last 10 weekends'
    }
  }

  const renderChart = () => {
    if (isLoading || !seasons?.items) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )
    }

    if (seasons.items.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-muted-foreground">No data available</div>
        </div>
      )
    }

    // For medals chart, filter out ongoing seasons (medals are 0 until weekend ends)
    const seasonsForChart = type === 'medals'
      ? seasons.items.filter(s => s.state !== 'ongoing')
      : seasons.items

    const chartData = seasonsForChart
      .slice()
      .reverse()
      .map((season) => {
        const totalMembers = clanData?.members || season.members.length
        const activeMembers = season.members.filter(m => m.attacks > 0).length
        const participationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0

        // Offensive medals are per player (for 6 attacks), multiply by 6 to get total clan medals
        const offensiveMedals = season.offensiveReward * 6
        const defensiveMedals = season.defensiveReward

        return {
          date: new Date(season.endTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          totalMedals: offensiveMedals + defensiveMedals,
          offensiveMedals: offensiveMedals,
          defensiveMedals: defensiveMedals,
          capitalGold: season.capitalTotalLoot,
          avgPerAttack: season.totalAttacks > 0 ? Math.round(season.capitalTotalLoot / season.totalAttacks) : 0,
          participation: participationRate,
          activeMembers,
          totalMembers,
        }
      })

    switch (type) {
      case 'medals':
        return (
          <UnifiedLineChart
            data={chartData}
            dataKey="totalMedals"
            stroke="#8b5cf6"
            strokeWidth={2}
            height={400}
            showDots={true}
          >
            <Line
              type="monotone"
              dataKey="offensiveMedals"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              name="Offensive Medals"
            />
            <Line
              type="monotone"
              dataKey="defensiveMedals"
              stroke="#ec4899"
              strokeWidth={2}
              dot={{ fill: '#ec4899', r: 3 }}
              name="Defensive Medals"
            />
          </UnifiedLineChart>
        )

      case 'gold':
        return (
          <UnifiedLineChart
            data={chartData}
            dataKey="capitalGold"
            stroke="#eab308"
            strokeWidth={2}
            height={400}
            showDots={true}
            dualAxis={true}
            rightAxisDataKey="avgPerAttack"
          >
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgPerAttack"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              name="Avg/Attack"
            />
          </UnifiedLineChart>
        )

      case 'trophies':
        // Capital trophies will be tracked with saved raid data
        return (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center max-w-md">
              <div className="text-4xl font-bold text-blue-500 mb-4">
                {clanData?.clanCapitalPoints || 0}
              </div>
              <p className="text-lg mb-2">Current Capital Trophies</p>
              <p className="text-sm">
                Capital trophies are now being saved with each raid weekend.
                Historical trophy progression will appear here once we have multiple saved raids.
              </p>
              <p className="text-xs mt-3 text-muted-foreground/70">
                Next raid weekend ends: Check back after raid completion
              </p>
            </div>
          </div>
        )

      case 'participation':
        // Filter to only show seasons with member data (historical tracking not available from API)
        const participationData = chartData.filter((item) => {
          // Find the corresponding season to check if it has member data
          const season = seasonsForChart.find(s =>
            new Date(s.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === item.date
          )
          return season && season.members && season.members.length > 0
        })

        if (participationData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center max-w-md">
                <p className="text-lg mb-2">Participation Data Not Available</p>
                <p className="text-sm">
                  Historical participation data is only available for seasons with member information.
                  The API only provides member data for the current/most recent raid weekend.
                </p>
              </div>
            </div>
          )
        }

        return (
          <UnifiedLineChart
            data={participationData}
            dataKey="participation"
            stroke="#3b82f6"
            strokeWidth={2}
            height={400}
            showDots={true}
          >
            <Line
              type="monotone"
              dataKey="activeMembers"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              name="Active Members"
            />
          </UnifiedLineChart>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
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
