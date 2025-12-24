import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import { calculateLeagueDistribution, type LeagueDistribution } from '@/data/trophy-leagues'

interface TrophyLeagueChartProps {
  members: Array<{
    name: string
    tag: string
    trophies: number
    league?: {
      id: number
      name: string
    }
  }>
  showGlobalRank?: boolean
  globalRank?: number
  localRank?: number
  location?: string
}

export function TrophyLeagueChart({
  members,
  showGlobalRank = false,
  globalRank,
  localRank,
  location
}: TrophyLeagueChartProps) {
  const distribution = calculateLeagueDistribution(members)
  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  // Calculate clan stats
  const totalTrophies = members.reduce((sum, m) => sum + m.trophies, 0)
  const avgTrophies = Math.round(totalTrophies / members.length)
  const topPlayer = [...members].sort((a, b) => b.trophies - a.trophies)[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Trophy League Distribution
            </CardTitle>
            <CardDescription>
              Player distribution across {distribution.length} active trophy leagues
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Trophy Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Total Trophies</div>
            <div className="text-2xl font-bold">{totalTrophies.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Average Trophies</div>
            <div className="text-2xl font-bold">{avgTrophies.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Top Player</div>
            <div className="text-lg font-bold truncate">{topPlayer?.name}</div>
            <div className="text-xs text-muted-foreground">{topPlayer?.trophies.toLocaleString()} trophies</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Active Leagues</div>
            <div className="text-2xl font-bold">{distribution.length}</div>
          </div>
        </div>

        {/* Global/Local Rankings */}
        {showGlobalRank && (globalRank || localRank) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {globalRank && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Global Ranking</span>
                </div>
                <div className="text-3xl font-bold text-yellow-500">
                  #{globalRank.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Worldwide</p>
              </div>
            )}
            {localRank && location && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Local Ranking</span>
                </div>
                <div className="text-3xl font-bold text-blue-500">
                  #{localRank.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{location}</p>
              </div>
            )}
          </div>
        )}

        {/* Bar Chart */}
        <div className="space-y-3">
          {distribution.map((dist) => (
            <div key={dist.league.id} className="group">
              <div className="flex items-center gap-3 mb-1">
                <img
                  src={dist.league.iconUrl}
                  alt={dist.league.name}
                  className="h-8 w-8 flex-shrink-0"
                  onError={(e) => {
                    // Fallback if icon fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{dist.league.name}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {dist.count} {dist.count === 1 ? 'member' : 'members'}
                      </span>
                      <span className="font-bold min-w-[3rem] text-right">
                        {dist.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="bg-secondary rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(dist.count / maxCount) * 100}%`,
                          backgroundColor: dist.league.color,
                          opacity: 0.8,
                        }}
                      >
                        {dist.count > 0 && (
                          <span className="text-xs font-bold text-white drop-shadow-md">
                            {dist.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {dist.league.minTrophies.toLocaleString()} - {dist.league.maxTrophies === 999999 ? '∞' : dist.league.maxTrophies.toLocaleString()} trophies
                    </div>
                  </div>
                </div>
              </div>

              {/* Member details (hidden by default, shown on hover) */}
              <div className="hidden group-hover:block ml-11 mt-2 p-3 rounded-lg bg-muted/50 text-xs">
                <div className="font-medium mb-2">Members in {dist.league.name}:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dist.members.map(member => (
                    <div key={member.tag} className="flex items-center justify-between">
                      <span className="truncate">{member.name}</span>
                      <span className="text-muted-foreground ml-2">{member.trophies.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Hover over any league to see which members are in that league.
            Higher league players (Titan, Legend) typically have better attack strategies and more experience.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
