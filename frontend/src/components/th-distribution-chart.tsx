import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { compareClanToLeague, compareClanToLeague30v30, getTHCounts, getTop15Members, getTop30Members, LEAGUE_NAMES } from '@/data/cwl-distributions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

interface THDistributionChartProps {
  members: Array<{ townHallLevel: number }>
  leagueName?: string
}

export function THDistributionChart({ members, leagueName: initialLeagueName }: THDistributionChartProps) {
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
  // Get top 15 members for CWL comparison (15v15)
  const top15 = getTop15Members(members)
  const clanTHCounts = getTHCounts(top15)
  const comparison = compareClanToLeague(clanTHCounts, leagueName)

  // Get top 30 members for 30v30 CWL
  const top30 = getTop30Members(members)
  const top30THCounts = getTHCounts(top30)
  const comparison30v30 = compareClanToLeague30v30(top30THCounts, leagueName)

  if (comparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            TH Distribution Comparison
          </CardTitle>
          <CardDescription>Compare your top players vs {leagueName} average</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No comparison data available for {leagueName}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Filter to only show relevant TH levels
  const relevantComparison = comparison.filter(
    item => item.yourCount > 0 || item.avgCount >= 0.1
  )

  const relevantComparison30v30 = comparison30v30.filter(
    item => item.yourCount > 0 || item.avgCount >= 0.1
  )

  // Calculate overall strength
  const topTHs = comparison.slice(0, 3)
  const topTHScore = topTHs.reduce((sum, th) => sum + th.difference, 0)
  const isStrongerTop = topTHScore > 1

  const topTHs30 = comparison30v30.slice(0, 3)
  const topTHScore30 = topTHs30.reduce((sum, th) => sum + th.difference, 0)
  const isStrongerTop30 = topTHScore30 > 1

  // Color palette for TH levels
  const getTHColor = (thLevel: string) => {
    const thNum = parseInt(thLevel.replace('TH', ''))
    const colors: Record<number, string> = {
      17: '#8B5CF6', 16: '#6366F1', 15: '#3B82F6', 14: '#0EA5E9', 13: '#06B6D4',
      12: '#14B8A6', 11: '#10B981', 10: '#84CC16', 9: '#EAB308', 8: '#F59E0B',
      7: '#F97316', 6: '#EF4444', 5: '#DC2626',
    }
    return colors[thNum] || '#64748B'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              TH Distribution Comparison
            </CardTitle>
            <CardDescription>
              Compare your top players vs league average for 15v15 and 30v30 CWL
            </CardDescription>
            <div className="text-xs text-muted-foreground mt-2">
              Top 15: {top15.length} • Top 30: {top30.length} members
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
        <div className="space-y-6">
          {/* Side-by-side 15v15 and 30v30 comparisons */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* 15v15 Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">15v15 Format</h3>
                {isStrongerTop ? (
                  <Badge variant="default" className="bg-green-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Above Avg
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Below Avg
                  </Badge>
                )}
              </div>

              {/* 15v15 Stacked Columns */}
              <div className="flex items-stretch justify-center gap-8 h-[400px]">
                {/* Your Clan Top 15 */}
                <div className="flex flex-col items-center gap-2 w-32">
                  <div className="text-xs font-bold">Your Clan</div>
                  <div className="flex-1 w-full flex flex-col border-2 border-border rounded-lg bg-muted/30">
                    {relevantComparison.map((item) => {
                      if (item.yourCount === 0) return null
                      const percentage = (item.yourCount / 15) * 100
                      return (
                        <div
                          key={item.thLevel}
                          className="w-full flex items-center justify-center border-b border-background/50 last:border-b-0 relative group cursor-pointer transition-all hover:brightness-110"
                          style={{
                            height: `${percentage}%`,
                            backgroundColor: getTHColor(item.thLevel),
                            minHeight: '15px'
                          }}
                        >
                          <div className="hidden group-hover:block absolute left-full ml-2 p-2 bg-card border-2 rounded-lg shadow-lg z-10 whitespace-nowrap">
                            <div className="text-sm font-bold">{item.thLevel}</div>
                            <div className="text-xs text-muted-foreground">{item.yourCount} players</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">Top 15</div>
                </div>

                {/* League Average */}
                <div className="flex flex-col items-center gap-2 w-32">
                  <div className="text-xs font-bold">{leagueName}</div>
                  <div className="flex-1 w-full flex flex-col border-2 border-border rounded-lg bg-muted/30">
                    {relevantComparison.map((item) => {
                      if (item.avgCount < 0.1) return null
                      const percentage = (item.avgCount / 15) * 100
                      return (
                        <div
                          key={item.thLevel}
                          className="w-full flex items-center justify-center border-b border-background/50 last:border-b-0 relative group cursor-pointer transition-all hover:brightness-110"
                          style={{
                            height: `${percentage}%`,
                            backgroundColor: getTHColor(item.thLevel),
                            opacity: 0.6,
                            minHeight: item.avgCount >= 0.3 ? '12px' : '0'
                          }}
                        >
                          <div className="hidden group-hover:block absolute right-full mr-2 p-2 bg-card border-2 rounded-lg shadow-lg z-10 whitespace-nowrap">
                            <div className="text-sm font-bold">{item.thLevel}</div>
                            <div className="text-xs text-muted-foreground">{item.avgCount.toFixed(1)} avg</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg</div>
                </div>
              </div>

              {/* 15v15 Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Players</div>
                  <div className="text-lg font-bold">{top15.length}</div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Avg TH</div>
                  <div className="text-lg font-bold">
                    {(top15.reduce((s, m) => s + m.townHallLevel, 0) / top15.length).toFixed(1)}
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-xs text-muted-foreground">Max TH</div>
                  <div className="text-lg font-bold">
                    {Math.max(...top15.map(m => m.townHallLevel))}
                  </div>
                </div>
              </div>
            </div>

            {/* 30v30 Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">30v30 Format</h3>
                {comparison30v30.length > 0 ? (
                  isStrongerTop30 ? (
                    <Badge variant="default" className="bg-green-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Above Avg
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Below Avg
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">No Data</Badge>
                )}
              </div>

              {/* 30v30 Stacked Columns */}
              {comparison30v30.length > 0 ? (
                <>
                  <div className="flex items-stretch justify-center gap-8 h-[400px]">
                    {/* Your Clan Top 30 */}
                    <div className="flex flex-col items-center gap-2 w-32">
                      <div className="text-xs font-bold">Your Clan</div>
                      <div className="flex-1 w-full flex flex-col border-2 border-border rounded-lg bg-muted/30">
                        {relevantComparison30v30.map((item) => {
                          if (item.yourCount === 0) return null
                          const percentage = (item.yourCount / 30) * 100
                          return (
                            <div
                              key={item.thLevel}
                              className="w-full flex items-center justify-center border-b border-background/50 last:border-b-0 relative group cursor-pointer transition-all hover:brightness-110"
                              style={{
                                height: `${percentage}%`,
                                backgroundColor: getTHColor(item.thLevel),
                                minHeight: '15px'
                              }}
                            >
                              <div className="hidden group-hover:block absolute left-full ml-2 p-2 bg-card border-2 rounded-lg shadow-lg z-10 whitespace-nowrap">
                                <div className="text-sm font-bold">{item.thLevel}</div>
                                <div className="text-xs text-muted-foreground">{item.yourCount} players</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">Top 30</div>
                    </div>

                    {/* League Average */}
                    <div className="flex flex-col items-center gap-2 w-32">
                      <div className="text-xs font-bold">{leagueName}</div>
                      <div className="flex-1 w-full flex flex-col border-2 border-border rounded-lg bg-muted/30">
                        {relevantComparison30v30.map((item) => {
                          if (item.avgCount < 0.1) return null
                          const percentage = (item.avgCount / 30) * 100
                          return (
                            <div
                              key={item.thLevel}
                              className="w-full flex items-center justify-center border-b border-background/50 last:border-b-0 relative group cursor-pointer transition-all hover:brightness-110"
                              style={{
                                height: `${percentage}%`,
                                backgroundColor: getTHColor(item.thLevel),
                                opacity: 0.6,
                                minHeight: item.avgCount >= 0.3 ? '12px' : '0'
                              }}
                            >
                              <div className="hidden group-hover:block absolute right-full mr-2 p-2 bg-card border-2 rounded-lg shadow-lg z-10 whitespace-nowrap">
                                <div className="text-sm font-bold">{item.thLevel}</div>
                                <div className="text-xs text-muted-foreground">{item.avgCount.toFixed(1)} avg</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg</div>
                    </div>
                  </div>

                  {/* 30v30 Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Players</div>
                      <div className="text-lg font-bold">{top30.length}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Avg TH</div>
                      <div className="text-lg font-bold">
                        {top30.length > 0 ? (top30.reduce((s, m) => s + m.townHallLevel, 0) / top30.length).toFixed(1) : '0'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">Max TH</div>
                      <div className="text-lg font-bold">
                        {top30.length > 0 ? Math.max(...top30.map(m => m.townHallLevel)) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">No 30v30 league data available for {leagueName}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">
              <strong>How to read:</strong> Compare your top players against {leagueName} averages.
              Having more high TH players (TH17, TH16) provides flexibility in war matchups.
              Focus recruitment on filling gaps in your weakest areas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
