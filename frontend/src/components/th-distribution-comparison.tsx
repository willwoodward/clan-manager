import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { compareClanToLeague, getTHCounts, LEAGUE_NAMES } from '@/data/cwl-distributions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

interface THDistributionComparisonProps {
  members: Array<{ townHallLevel: number }>
  leagueName?: string
  compact?: boolean
}

export function THDistributionComparison({ members, leagueName: initialLeagueName, compact = false }: THDistributionComparisonProps) {
  const [selectedLeague, setSelectedLeague] = useState(initialLeagueName || 'Crystal II')
  const [hoveredLeague, setHoveredLeague] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Use hovered league if hovering, otherwise use selected
  const leagueName = hoveredLeague || selectedLeague

  // Handle closing - reset hover state
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setHoveredLeague(null)
    }
  }

  const clanTHCounts = getTHCounts(members)
  const comparison = compareClanToLeague(clanTHCounts, leagueName)

  if (comparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            TH Distribution Comparison
          </CardTitle>
          <CardDescription>Compare your clan's composition to league average</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No comparison data available for {leagueName}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Filter out TH levels with 0 in both your clan and league average
  const relevantComparison = comparison.filter(
    item => item.yourCount > 0 || item.avgCount >= 0.1
  )

  // Calculate overall strength indicators
  const topTHs = comparison.slice(0, 3) // Top 3 TH levels
  const topTHScore = topTHs.reduce((sum, th) => sum + th.difference, 0)
  const isStrongerTop = topTHScore > 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                TH Distribution Comparison
              </CardTitle>
              {isStrongerTop ? (
                <Badge variant="default" className="bg-green-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Above Average
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Below Average
                </Badge>
              )}
            </div>
            <CardDescription>
              Compare your clan's composition to league average
            </CardDescription>
            <div className="text-xs text-muted-foreground mt-2">
              {members.length} members in your clan
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <label className="text-xs font-medium text-muted-foreground">Compare with:</label>
            <Select
              value={selectedLeague}
              onValueChange={setSelectedLeague}
              open={isOpen}
              onOpenChange={handleOpenChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select league..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(LEAGUE_NAMES).map((league) => (
                  <SelectItem
                    key={league}
                    value={league}
                    onMouseEnter={() => setHoveredLeague(league)}
                    onMouseLeave={() => setHoveredLeague(null)}
                  >
                    {league}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {compact ? (
            // Compact view - just key stats
            <div className="grid grid-cols-3 gap-3">
              {relevantComparison.slice(0, 6).map((item) => (
                <div key={item.thLevel} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{item.thLevel}</span>
                    <DiffIndicator difference={item.difference} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.yourCount} vs {item.avgCount.toFixed(1)} avg
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Full table view
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm">
                    <th className="text-left p-2 font-medium">TH Level</th>
                    <th className="text-center p-2 font-medium">Your Clan</th>
                    <th className="text-center p-2 font-medium">League Avg</th>
                    <th className="text-center p-2 font-medium">Difference</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantComparison.map((item) => {
                    const isAbove = item.difference > 0.5
                    const isBelow = item.difference < -0.5
                    const isNeutral = !isAbove && !isBelow

                    return (
                      <tr key={item.thLevel} className="border-b hover:bg-accent/50">
                        <td className="p-2">
                          <Badge variant="secondary">{item.thLevel}</Badge>
                        </td>
                        <td className="text-center p-2 font-medium">{item.yourCount}</td>
                        <td className="text-center p-2 text-muted-foreground">
                          {item.avgCount.toFixed(1)}
                        </td>
                        <td className="text-center p-2">
                          <span
                            className={`font-medium ${
                              isAbove ? 'text-green-500' :
                              isBelow ? 'text-red-500' :
                              'text-muted-foreground'
                            }`}
                          >
                            {item.difference > 0 ? '+' : ''}{item.difference.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <DiffIndicator difference={item.difference} />
                            <span className="text-xs text-muted-foreground">
                              {isAbove ? 'Above avg' : isBelow ? 'Below avg' : 'On par'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">
              <strong>Tip:</strong> Green indicators show where your clan is stronger than average,
              red shows weaker areas. Focus recruitment on red TH levels to balance your roster.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DiffIndicator({ difference }: { difference: number }) {
  if (difference > 0.5) {
    return <TrendingUp className="h-4 w-4 text-green-500" />
  } else if (difference < -0.5) {
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />
}
