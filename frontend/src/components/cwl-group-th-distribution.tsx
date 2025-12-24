import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import { getTHCounts, getTop15Members, getTop30Members } from '@/data/cwl-distributions'
import { useState } from 'react'

interface CWLClanData {
  clanTag: string
  clanName: string
  members: Array<{ townHallLevel: number }>
}

interface CWLGroupTHDistributionProps {
  clans: CWLClanData[]
  ourClanTag: string
}

export function CWLGroupTHDistribution({ clans, ourClanTag }: CWLGroupTHDistributionProps) {
  const [rosterSize, setRosterSize] = useState<15 | 30>(15)

  if (clans.length === 0) {
    return null
  }

  // Color palette for TH levels
  const getTHColor = (thLevel: number) => {
    const colors: Record<number, string> = {
      17: '#8B5CF6', 16: '#6366F1', 15: '#3B82F6', 14: '#0EA5E9', 13: '#06B6D4',
      12: '#14B8A6', 11: '#10B981', 10: '#84CC16', 9: '#EAB308', 8: '#F59E0B',
      7: '#F97316', 6: '#EF4444', 5: '#DC2626',
    }
    return colors[thLevel] || '#64748B'
  }

  // Get top members based on roster size
  const getTopMembers = (members: Array<{ townHallLevel: number }>) => {
    return rosterSize === 30 ? getTop30Members(members) : getTop15Members(members)
  }

  // Get all unique TH levels across all clans
  const allTHLevels = new Set<number>()
  clans.forEach(clan => {
    const topMembers = getTopMembers(clan.members)
    topMembers.forEach(member => allTHLevels.add(member.townHallLevel))
  })
  const sortedTHLevels = Array.from(allTHLevels).sort((a, b) => b - a)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              CWL Group TH Distribution
            </CardTitle>
            <CardDescription>
              Compare Town Hall distribution across all clans in your CWL group
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={rosterSize === 15 ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setRosterSize(15)}
            >
              15v15
            </Badge>
            <Badge
              variant={rosterSize === 30 ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setRosterSize(30)}
            >
              30v30
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex items-stretch justify-center gap-4 h-[500px] min-w-max px-4">
            {clans.map((clan) => {
              const isOurClan = clan.clanTag === ourClanTag
              const topMembers = getTopMembers(clan.members)
              const thCounts = getTHCounts(topMembers)

              return (
                <div key={clan.clanTag} className="flex flex-col items-center gap-2 w-28">
                  <div className={`text-xs font-bold text-center h-12 flex items-center justify-center ${isOurClan ? 'text-primary' : ''}`}>
                    {clan.clanName}
                    {isOurClan && <div className="text-[10px] text-muted-foreground">(You)</div>}
                  </div>
                  <div className={`flex-1 w-full flex flex-col border-2 rounded-lg bg-muted/30 ${isOurClan ? 'border-primary' : 'border-border'}`}>
                    {sortedTHLevels.map((thLevel) => {
                      const count = thCounts[`TH${thLevel}`] || 0
                      if (count === 0) return null
                      const percentage = (count / rosterSize) * 100

                      return (
                        <div
                          key={thLevel}
                          className="w-full flex items-center justify-center border-b border-background/50 last:border-b-0 relative group cursor-pointer transition-all hover:brightness-110"
                          style={{
                            height: `${percentage}%`,
                            backgroundColor: getTHColor(thLevel),
                            minHeight: '15px'
                          }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            {count}
                          </span>
                          <div className="hidden group-hover:block absolute left-full ml-2 p-2 bg-card border-2 rounded-lg shadow-lg z-10 whitespace-nowrap">
                            <div className="text-sm font-bold">TH{thLevel}</div>
                            <div className="text-xs text-muted-foreground">{count} players</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center">
                    Avg: {(topMembers.reduce((s, m) => s + m.townHallLevel, 0) / topMembers.length).toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">
              <strong>How to read:</strong> Each column represents a clan's top {rosterSize} players by Town Hall level.
              Your clan is highlighted. Compare TH distributions to identify strategic matchup advantages.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
