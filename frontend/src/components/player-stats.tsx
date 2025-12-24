/**
 * Player Performance Stats Component
 *
 * Displays historical war attack statistics for a player
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trophy, TrendingUp, Target, BarChart3, Loader2, AlertCircle, Search, Users } from 'lucide-react'

export function PlayerStats() {
  const [searchInput, setSearchInput] = useState('')
  const [searchTag, setSearchTag] = useState('')

  // Fetch list of known players
  const { data: knownPlayers } = useQuery({
    queryKey: ['knownPlayers'],
    queryFn: () => analytics.getKnownPlayers(),
  })

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['playerStats', searchTag],
    queryFn: () => analytics.getPlayerStats(searchTag),
    enabled: !!searchTag,
  })

  // Filter players based on search input
  const filteredPlayers = useMemo(() => {
    if (!knownPlayers?.players) return []
    if (!searchInput.trim()) return []

    const search = searchInput.toLowerCase()
    return knownPlayers.players.filter((p: any) =>
      p.name.toLowerCase().includes(search) ||
      p.tag.toLowerCase().includes(search)
    )
  }, [knownPlayers, searchInput])

  const handlePlayerSelect = (tag: string, name: string) => {
    setSearchTag(tag)
    setSearchInput(name) // Show the selected player name in the input
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Player Performance History
        </CardTitle>
        <CardDescription>
          View historical war attack statistics for any player
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Player List - Only shown when typing */}
          {searchInput.trim() && (
            <div className="max-h-60 overflow-y-auto border rounded-lg shadow-lg">
              {filteredPlayers.length > 0 ? (
                <div className="divide-y">
                  {filteredPlayers.slice(0, 20).map((player: any) => (
                    <button
                      key={player.tag}
                      onClick={() => handlePlayerSelect(player.tag, player.name)}
                      className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{player.tag}</span>
                          {player.is_clan_member && (
                            <Badge variant="secondary" className="text-xs">Clan</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.attack_count} attacks
                      </div>
                    </button>
                  ))}
                </div>
              ) : knownPlayers?.players?.length > 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No players found matching "{searchInput}"
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading players...
                </div>
              )}
            </div>
          )}

          {knownPlayers?.count && searchInput.trim() && filteredPlayers.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Showing {filteredPlayers.length} of {knownPlayers.count} players
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load player stats: {(error as any).message}</span>
          </div>
        )}

        {/* Stats Display */}
        {stats && !stats.error && (
          <div className="space-y-6">
            {/* Player Header */}
            <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
              <div>
                <h3 className="text-lg font-semibold">{stats.player_name}</h3>
                <p className="text-sm text-muted-foreground">{stats.player_tag}</p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                TH {stats.current_th}
              </Badge>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Attacks</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.total_attacks}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Avg Stars
                </div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.avg_stars.toFixed(2)}
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="text-sm text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Avg Destruction
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.avg_destruction.toFixed(1)}%
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="text-sm text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  3-Star Rate
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.three_star_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Performance by TH Difference */}
            <div>
              <h4 className="font-semibold mb-3">Performance by Town Hall Difference</h4>
              <div className="space-y-2">
                {Object.entries(stats.performance_by_th_diff || {}).map(([thDiff, data]: [string, any]) => {
                  const diff = parseInt(thDiff)
                  // Positive diff = attacker TH > defender TH = attacking down
                  // Negative diff = attacker TH < defender TH = attacking up
                  const label = diff > 0 ? `+${diff} (Attacking Down)` : diff < 0 ? `${diff} (Attacking Up)` : 'Same TH'
                  const color = diff > 0 ? 'text-green-600 dark:text-green-400' : diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'

                  return (
                    <div key={thDiff} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className={`font-medium ${color}`}>{label}</div>
                        <div className="text-xs text-muted-foreground">{data.attacks} attacks</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{data.avg_stars.toFixed(2)} stars</div>
                          <div className="text-xs text-muted-foreground">average</div>
                        </div>
                        <div className="w-20">
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${(data.avg_stars / 3) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <strong>Note:</strong> Statistics are calculated from {stats.total_attacks} war attacks
              recorded in our database. Performance may vary based on base difficulty and attack strategy.
            </div>
          </div>
        )}

        {stats?.error && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{stats.error}</p>
            <p className="text-sm mt-2">This player may not have participated in any recorded wars yet.</p>
          </div>
        )}

        {!searchTag && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">Search for a player to view their statistics</p>
            <p className="text-sm">Start typing a player name to see suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
