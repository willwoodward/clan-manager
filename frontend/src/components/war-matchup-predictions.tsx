/**
 * War Matchup Predictions Component
 *
 * Shows predicted performance for clan members against enemy targets
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'

interface Member {
  tag: string
  name: string
  townhallLevel: number
}

interface WarMatchupPredictionsProps {
  clanMembers: Member[]
  opponentMembers: Member[]
}

export function WarMatchupPredictions({ clanMembers, opponentMembers }: WarMatchupPredictionsProps) {
  const [selectedAttacker, setSelectedAttacker] = useState<string>('')
  const [selectedDefender, setSelectedDefender] = useState<string>('')

  // Fetch prediction when both attacker and defender are selected
  const { data: prediction, isLoading, error } = useQuery({
    queryKey: ['prediction', selectedAttacker, selectedDefender],
    queryFn: async () => {
      if (!selectedAttacker || !selectedDefender) return null

      return analytics.predictPerformance({
        playerTag: selectedAttacker,
        defenderTag: selectedDefender,
      })
    },
    enabled: !!selectedAttacker && !!selectedDefender,
    retry: 1,
  })

  const attacker = clanMembers.find(m => m.tag === selectedAttacker)
  const defender = opponentMembers.find(m => m.tag === selectedDefender)

  const getReliabilityColor = (reliability?: string) => {
    switch (reliability?.toLowerCase()) {
      case 'high':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-red-500/10 text-red-500 border-red-500/20'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Attack Matchup Predictions
        </CardTitle>
        <CardDescription>
          Predict how your members will perform against enemy targets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attacker and Defender Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Attacker (Your Clan)</label>
            <Select value={selectedAttacker} onValueChange={setSelectedAttacker}>
              <SelectTrigger>
                <SelectValue placeholder="Select an attacker" />
              </SelectTrigger>
              <SelectContent>
                {clanMembers.map((member) => (
                  <SelectItem key={member.tag} value={member.tag}>
                    {member.name} (TH{member.townhallLevel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Defender (Enemy)</label>
            <Select value={selectedDefender} onValueChange={setSelectedDefender}>
              <SelectTrigger>
                <SelectValue placeholder="Select a defender" />
              </SelectTrigger>
              <SelectContent>
                {opponentMembers.map((member) => (
                  <SelectItem key={member.tag} value={member.tag}>
                    {member.name} (TH{member.townhallLevel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Matchup Buttons */}
        {selectedAttacker && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Select (Same TH Level)</label>
            <div className="flex gap-2 flex-wrap">
              {opponentMembers
                .filter(m => m.townhallLevel === attacker?.townhallLevel)
                .slice(0, 5)
                .map((member) => (
                  <Button
                    key={member.tag}
                    variant={selectedDefender === member.tag ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDefender(member.tag)}
                  >
                    {member.name}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Prediction Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to fetch prediction</span>
          </div>
        )}

        {prediction && !prediction.error && (
          <div className="space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-muted-foreground">Matchup</div>
                  <div className="font-semibold">
                    {attacker?.name} (TH{attacker?.townhallLevel}) vs {defender?.name} (TH{defender?.townhallLevel})
                  </div>
                </div>
                <Badge variant="outline" className={getReliabilityColor(prediction.reliability)}>
                  {prediction.reliability} reliability
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Expected Stars */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Expected Stars</span>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {prediction.expected_stars.toFixed(2)}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  90% CI: {prediction.confidence_90_stars[0].toFixed(2)} - {prediction.confidence_90_stars[1].toFixed(2)}
                </div>
              </div>

              {/* Expected Destruction */}
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">Expected Destruction</span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {prediction.expected_destruction.toFixed(1)}%
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  90% CI: {prediction.confidence_90_destruction[0].toFixed(1)}% - {prediction.confidence_90_destruction[1].toFixed(1)}%
                </div>
              </div>

              {/* Matchup Difficulty */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Difficulty</span>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {prediction.matchup_difficulty.toFixed(2)}x
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  {prediction.matchup_difficulty > 1.05
                    ? 'Easier matchup'
                    : prediction.matchup_difficulty < 0.95
                    ? 'Harder matchup'
                    : 'Even matchup'}
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Based on:</span>
                <span className="font-medium">{prediction.sample_size} similar attacks</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-muted-foreground">Total attacks analyzed:</span>
                <span className="font-medium">{prediction.total_attacks}</span>
              </div>
            </div>

            {prediction.sample_size < 5 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Limited data available ({prediction.sample_size} attacks).
                  Predictions will improve as more war data is collected.
                </p>
              </div>
            )}
          </div>
        )}

        {prediction?.error && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>No prediction available:</strong> {prediction.error}
            </p>
          </div>
        )}

        {!selectedAttacker || !selectedDefender ? (
          <div className="text-center py-8 text-muted-foreground">
            Select an attacker and defender to see predictions
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
