/**
 * Player Card Modal Component
 *
 * Displays comprehensive player statistics and predictions
 */

import { useQuery } from '@tanstack/react-query'
import { analytics, clashApi, activity } from '@/services/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trophy, Star, Target, TrendingUp, Shield, Swords, AlertCircle, Sparkles, Calendar, Activity } from 'lucide-react'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PlayerCardProps {
  playerTag: string | null
  open: boolean
  onClose: () => void
}

export function PlayerCard({ playerTag, open, onClose }: PlayerCardProps) {
  // Fetch player data from CoC API
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ['player', playerTag],
    queryFn: () => clashApi.getPlayer(playerTag!),
    enabled: !!playerTag && open,
  })

  // Fetch player attack statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['playerStats', playerTag],
    queryFn: () => analytics.getPlayerStats(playerTag!),
    enabled: !!playerTag && open,
  })

  // Fetch predictions for different TH levels
  const playerTH = player?.townHallLevel ?? 0

  const { data: predictionAbove, isLoading: predictionAboveLoading } = useQuery({
    queryKey: ['prediction', playerTag, 'above', playerTH + 1],
    queryFn: () => analytics.predictPerformance({
      playerTag: playerTag!,
      defenderTh: playerTH + 1,
    }),
    enabled: !!playerTag && !!player && open && playerTH > 0,
  })

  const { data: predictionEqual, isLoading: predictionEqualLoading } = useQuery({
    queryKey: ['prediction', playerTag, 'equal', playerTH],
    queryFn: () => analytics.predictPerformance({
      playerTag: playerTag!,
      defenderTh: playerTH,
    }),
    enabled: !!playerTag && !!player && open && playerTH > 0,
  })

  const { data: predictionBelow, isLoading: predictionBelowLoading } = useQuery({
    queryKey: ['prediction', playerTag, 'below', playerTH - 1],
    queryFn: () => analytics.predictPerformance({
      playerTag: playerTag!,
      defenderTh: playerTH - 1,
    }),
    enabled: !!playerTag && !!player && open && playerTH > 1,
  })

  // Fetch player activity history
  const { data: activityHistory, isLoading: activityLoading } = useQuery({
    queryKey: ['activityHistory', playerTag],
    queryFn: () => activity.getPlayerActivityHistory(playerTag!, 30),
    enabled: !!playerTag && open,
  })

  const isLoading = playerLoading || statsLoading
  const predictionsLoading = predictionAboveLoading || predictionEqualLoading || predictionBelowLoading

  if (!playerTag) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {player?.name || 'Loading...'}
            {player && (
              <Badge variant="secondary" className="text-sm">
                TH {player.townHallLevel}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{playerTag}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Player Info */}
            {player && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5" />
                    Player Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Town Hall</div>
                      <div className="text-2xl font-bold">TH {player.townHallLevel}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">War Stars</div>
                      <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
                        <Star className="h-5 w-5" />
                        {player.warStars?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Donations</div>
                      <div className="text-2xl font-bold text-green-500 flex items-center gap-1">
                        <Trophy className="h-5 w-5" />
                        {player.donations?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">War Preference</div>
                      <Badge
                        variant={player.warPreference === 'in' ? 'default' : 'secondary'}
                        className={player.warPreference === 'in' ? 'bg-green-500 mt-2' : 'mt-2'}
                      >
                        {player.warPreference || 'unknown'}
                      </Badge>
                    </div>
                  </div>

                  {/* Heroes */}
                  {player.heroes && player.heroes.length > 0 && (() => {
                    const homeVillageHeroes = player.heroes.filter((hero: any) =>
                      !hero.name.includes('Battle Machine') &&
                      !hero.name.includes('Battle Copter')
                    )
                    return homeVillageHeroes.length > 0 && (
                      <div className="mt-6">
                        <div className="text-sm font-medium mb-3">Heroes</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {homeVillageHeroes.map((hero: any) => (
                            <div key={hero.name} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                              <div className="flex-1">
                                <div className="text-xs text-muted-foreground">{hero.name}</div>
                                <div className="font-medium">Level {hero.level}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* League */}
                  {player.league && (
                    <div className="mt-4 flex items-center gap-2">
                      <img
                        src={getProxiedImageUrl(player.league.iconUrls?.small)}
                        alt={player.league.name}
                        className="h-8 w-8"
                      />
                      <div>
                        <div className="text-xs text-muted-foreground">League</div>
                        <div className="font-medium">{player.league.name}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* War Attack Predictions */}
            {player && !predictionsLoading && (predictionAbove || predictionEqual || predictionBelow) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5" />
                    War Attack Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* TH Above (Attacking Up) */}
                    {predictionAbove && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium text-red-700 dark:text-red-300">
                              TH {playerTH + 1} (Attacking Up)
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Based on {predictionAbove.sample_size || 0} similar attacks
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {predictionAbove.expected_stars?.toFixed(2) ?? '0.00'} ⭐
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {predictionAbove.expected_destruction?.toFixed(1) ?? '0.0'}%
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-red-200 dark:bg-red-900/50 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-red-500 dark:bg-red-600 transition-all"
                            style={{ width: `${((predictionAbove.expected_stars ?? 0) / 3) * 100}%` }}
                          />
                          {predictionAbove.confidence_90_stars && (
                            <>
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-red-800 dark:border-red-300"
                                style={{ left: `${((predictionAbove.confidence_90_stars[0] ?? 0) / 3) * 100}%` }}
                              />
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-red-800 dark:border-red-300"
                                style={{ left: `${((predictionAbove.confidence_90_stars[1] ?? 0) / 3) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TH Equal */}
                    {predictionEqual && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium text-blue-700 dark:text-blue-300">
                              TH {playerTH} (Same Level)
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Based on {predictionEqual.sample_size || 0} similar attacks
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {predictionEqual.expected_stars?.toFixed(2) ?? '0.00'} ⭐
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {predictionEqual.expected_destruction?.toFixed(1) ?? '0.0'}%
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-blue-500 dark:bg-blue-600 transition-all"
                            style={{ width: `${((predictionEqual.expected_stars ?? 0) / 3) * 100}%` }}
                          />
                          {predictionEqual.confidence_90_stars && (
                            <>
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-blue-800 dark:border-blue-300"
                                style={{ left: `${((predictionEqual.confidence_90_stars[0] ?? 0) / 3) * 100}%` }}
                              />
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-blue-800 dark:border-blue-300"
                                style={{ left: `${((predictionEqual.confidence_90_stars[1] ?? 0) / 3) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TH Below (Attacking Down) */}
                    {predictionBelow && playerTH > 1 && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium text-green-700 dark:text-green-300">
                              TH {playerTH - 1} (Attacking Down)
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Based on {predictionBelow.sample_size || 0} similar attacks
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {predictionBelow.expected_stars?.toFixed(2) ?? '0.00'} ⭐
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {predictionBelow.expected_destruction?.toFixed(1) ?? '0.0'}%
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-green-200 dark:bg-green-900/50 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-green-500 dark:bg-green-600 transition-all"
                            style={{ width: `${((predictionBelow.expected_stars ?? 0) / 3) * 100}%` }}
                          />
                          {predictionBelow.confidence_90_stars && (
                            <>
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-green-800 dark:border-green-300"
                                style={{ left: `${((predictionBelow.confidence_90_stars[0] ?? 0) / 3) * 100}%` }}
                              />
                              <div
                                className="absolute top-0 h-full border-l-2 border-dashed border-green-800 dark:border-green-300"
                                style={{ left: `${((predictionBelow.confidence_90_stars[1] ?? 0) / 3) * 100}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* War Attack Statistics */}
            {stats && !stats.error && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Swords className="h-5 w-5" />
                    War Attack History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Attacks</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.total_attacks ?? 0}
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-1 flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Avg Stars
                      </div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {(stats.avg_stars ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="text-sm text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Avg Destruction
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {(stats.avg_destruction ?? 0).toFixed(1)}%
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                      <div className="text-sm text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        3-Star Rate
                      </div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {(stats.three_star_rate ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Individual Attack History */}
                  {stats.attack_history && stats.attack_history.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Recent Attacks
                      </div>
                      <div className="space-y-2 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {stats.attack_history.map((attack: any, idx: number) => {
                          const starColor = attack.stars === 3 ? 'text-yellow-500' : attack.stars === 2 ? 'text-orange-400' : attack.stars === 1 ? 'text-gray-400' : 'text-gray-300'
                          const destructionColor = attack.destruction >= 100 ? 'text-green-600 dark:text-green-400' : attack.destruction >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">vs TH</div>
                                  <div className="text-lg font-bold">{attack.defender_th}</div>
                                </div>
                                <div className="h-8 w-px bg-border" />
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    {[...Array(3)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${i < attack.stars ? starColor : 'text-gray-300 dark:text-gray-700'}`}
                                        fill={i < attack.stars ? 'currentColor' : 'none'}
                                      />
                                    ))}
                                  </div>
                                  <div className={`font-semibold ${destructionColor}`}>
                                    {attack.destruction}%
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(attack.date).toLocaleDateString()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity History Chart */}
            {!activityLoading && activityHistory?.history && activityHistory.history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5" />
                    Activity History (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Total Attacks</div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {activityHistory.history.reduce((sum: number, day: any) => sum + (day.attacks || 0), 0)}
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="text-xs text-green-700 dark:text-green-300 mb-1">Total Donations</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {activityHistory.history.reduce((sum: number, day: any) => sum + (day.donations || 0), 0)}
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                        <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">Avg Activity Score</div>
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {(activityHistory.history.reduce((sum: number, day: any) => sum + (day.activity_score || 0), 0) / activityHistory.history.length).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityHistory.history}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(date) => {
                              const d = new Date(date)
                              return `${d.getMonth() + 1}/${d.getDate()}`
                            }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            formatter={(value: any, name: string) => {
                              const labels: Record<string, string> = {
                                activity_score: 'Activity Score',
                                attacks: 'Attacks',
                                donations: 'Donations',
                                received: 'Received',
                              }
                              return [value, labels[name] || name]
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="activity_score"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No war history */}
            {stats?.error && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{stats.error}</p>
                    <p className="text-sm mt-2">This player may not have participated in any recorded wars yet.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
