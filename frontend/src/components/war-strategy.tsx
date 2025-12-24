/**
 * War Strategy Component
 *
 * Generates and displays optimal attack assignments for war
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Target, Trophy, TrendingUp, Loader2, AlertCircle, Zap } from 'lucide-react'

interface Member {
  tag: string
  name: string
  townhallLevel: number
  heroes?: Array<{ level: number }>
}

interface WarStrategyProps {
  clanMembers: Member[]
  opponentMembers: Member[]
  attacksPerMember?: number
}

interface Suggestion {
  priority: number
  attacker_tag: string
  attacker_name: string
  defender_tag: string
  defender_name: string
  expected_stars: number
  expected_destruction: number
  confidence_range: [number, number]
  reliability: string
}

interface Strategy {
  strategy_type: string
  strategy_description?: string
  suggestions: Suggestion[]
  statistics: {
    total_expected_stars: number
    attacks_assigned: number
    attacks_available: number
    high_confidence_attacks: number
    medium_confidence_attacks: number
    low_confidence_attacks: number
    defenders_targeted: number
    avg_expected_stars_per_attack: number
  }
}

export function WarStrategy({ clanMembers, opponentMembers, attacksPerMember = 2 }: WarStrategyProps) {
  const [strategyType, setStrategyType] = useState<'balanced' | 'aggressive' | 'safe'>('balanced')

  const { mutate: generateStrategy, data: strategy, isPending, error } = useMutation<Strategy>({
    mutationFn: async () => {
      return analytics.generateWarStrategy({
        attackers: clanMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: m.heroes?.map(h => h.level) || []
        })),
        defenders: opponentMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: m.heroes?.map(h => h.level) || []
        })),
        attacks_per_member: attacksPerMember,
        strategy_type: strategyType
      })
    }
  })

  const getReliabilityColor = (reliability: string) => {
    switch (reliability.toLowerCase()) {
      case 'high':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-red-500/10 text-red-500 border-red-500/20'
    }
  }

  const getStrategyDescription = (type: string) => {
    switch (type) {
      case 'aggressive':
        return 'Maximizes expected stars, even with lower reliability'
      case 'safe':
        return 'Prioritizes high-confidence attacks with reliable outcomes'
      default:
        return 'Balances expected stars with prediction reliability'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          War Strategy Optimizer
        </CardTitle>
        <CardDescription>
          Generate optimal attack assignments based on predicted performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Configuration */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Strategy Type</label>
            <Select value={strategyType} onValueChange={(v: any) => setStrategyType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="safe">Safe/Conservative</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getStrategyDescription(strategyType)}
            </p>
          </div>

          <div className="pt-6">
            <Button onClick={() => generateStrategy()} disabled={isPending} size="lg">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Strategy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to generate strategy: {error.message}</span>
          </div>
        )}

        {/* Strategy Results */}
        {strategy && (
          <div className="space-y-6">
            {/* Strategy Description */}
            {strategy.strategy_description && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm uppercase tracking-wide">
                    {strategy.strategy_type} Strategy
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{strategy.strategy_description}</p>
              </div>
            )}

            {/* Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Expected Stars</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {strategy.statistics.total_expected_stars.toFixed(1)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Avg: {strategy.statistics.avg_expected_stars_per_attack.toFixed(2)}/attack
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="text-sm text-green-700 dark:text-green-300 mb-1">High Confidence</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {strategy.statistics.high_confidence_attacks}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {((strategy.statistics.high_confidence_attacks / strategy.statistics.attacks_assigned) * 100).toFixed(0)}% of attacks
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">Bases Targeted</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {strategy.statistics.defenders_targeted}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  of {opponentMembers.length} total
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="text-sm text-orange-700 dark:text-orange-300 mb-1">Attacks Used</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {strategy.statistics.attacks_assigned}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  of {strategy.statistics.attacks_available} available
                </div>
              </div>
            </div>

            {/* Attack Assignments */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommended Attack Order
              </h3>

              <div className="space-y-2">
                {strategy.suggestions.slice(0, 20).map((suggestion) => (
                  <div
                    key={`${suggestion.attacker_tag}-${suggestion.defender_tag}`}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-bold">
                          #{suggestion.priority}
                        </Badge>

                        <div>
                          <div className="font-medium">
                            {suggestion.attacker_name} → {suggestion.defender_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {suggestion.attacker_tag} attacking {suggestion.defender_tag}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-lg">
                              {suggestion.expected_stars.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">stars</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-muted-foreground">
                              {suggestion.expected_destruction.toFixed(1)}% destruction
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className={getReliabilityColor(suggestion.reliability)}>
                          {suggestion.reliability}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      90% confidence: {suggestion.confidence_range[0].toFixed(2)} - {suggestion.confidence_range[1].toFixed(2)} stars
                    </div>
                  </div>
                ))}
              </div>

              {strategy.suggestions.length > 20 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing top 20 of {strategy.suggestions.length} total assignments
                </div>
              )}
            </div>

            {/* Strategy Notes */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Strategy Notes:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Assignments are ordered by priority - follow this order for best results</li>
                <li>• High confidence attacks have more historical data and are more reliable</li>
                <li>• Total expected stars is a statistical estimate - actual results will vary</li>
                <li>• Consider player skill and base complexity when making final decisions</li>
              </ul>
            </div>
          </div>
        )}

        {!strategy && !isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a strategy type and click "Generate Strategy" to see optimal attack assignments</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
