/**
 * Player Performance Prediction Component
 *
 * Displays predicted performance for a player against a specific matchup
 */

import { useState } from 'react'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, TrendingUp, Target, Zap } from 'lucide-react'

interface PredictionResult {
  player_tag: string
  player_name: string
  player_th: number
  expected_stars: number
  expected_destruction: number
  confidence_90_stars: [number, number]
  confidence_90_destruction: [number, number]
  sample_size: number
  total_attacks: number
  matchup_difficulty: number
  reliability: string
}

export function PlayerPrediction() {
  const [playerTag, setPlayerTag] = useState('')
  const [defenderTh, setDefenderTh] = useState(14)
  const [defenderHeroes, setDefenderHeroes] = useState('90,90,65,50')
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePredict = async () => {
    if (!playerTag) {
      setError('Please enter a player tag')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const heroes = defenderHeroes
        ? defenderHeroes.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h))
        : []

      const result = await analytics.predictPerformance({
        playerTag,
        defenderTh,
        defenderHeroes: heroes,
      })

      setPrediction(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch prediction')
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  const getReliabilityColor = (reliability: string) => {
    switch (reliability.toLowerCase()) {
      case 'high':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      default:
        return 'text-red-600'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Player Performance Prediction</CardTitle>
          <CardDescription>
            Predict how a player will perform against a specific matchup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="playerTag">Player Tag</Label>
              <Input
                id="playerTag"
                placeholder="#ABC123"
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="defenderTh">Defender TH Level</Label>
              <Input
                id="defenderTh"
                type="number"
                min="1"
                max="16"
                value={defenderTh}
                onChange={(e) => setDefenderTh(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="defenderHeroes">Defender Hero Levels (comma-separated)</Label>
              <Input
                id="defenderHeroes"
                placeholder="90,90,65,50"
                value={defenderHeroes}
                onChange={(e) => setDefenderHeroes(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handlePredict} disabled={loading} className="w-full">
            {loading ? 'Predicting...' : 'Predict Performance'}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle>
              Prediction for {prediction.player_name} (TH{prediction.player_th})
            </CardTitle>
            <CardDescription>
              Based on {prediction.sample_size} similar attacks (Total: {prediction.total_attacks} attacks)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Expected Stars */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Expected Stars</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {prediction.expected_stars.toFixed(2)}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  90% CI: {prediction.confidence_90_stars[0].toFixed(2)} - {prediction.confidence_90_stars[1].toFixed(2)}
                </div>
              </div>

              {/* Expected Destruction */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Expected Destruction</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {prediction.expected_destruction.toFixed(1)}%
                </div>
                <div className="text-xs text-green-700 mt-1">
                  90% CI: {prediction.confidence_90_destruction[0].toFixed(1)}% - {prediction.confidence_90_destruction[1].toFixed(1)}%
                </div>
              </div>

              {/* Matchup Difficulty */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Matchup Difficulty</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {prediction.matchup_difficulty.toFixed(2)}x
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  {prediction.matchup_difficulty > 1 ? 'Easier' : prediction.matchup_difficulty < 1 ? 'Harder' : 'Even'}
                </div>
              </div>

              {/* Reliability */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Reliability</span>
                </div>
                <div className={`text-2xl font-bold ${getReliabilityColor(prediction.reliability)}`}>
                  {prediction.reliability}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Based on {prediction.sample_size} attacks
                </div>
              </div>
            </div>

            {prediction.sample_size < 5 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Limited data available ({prediction.sample_size} attacks).
                  Predictions will improve as more war data is collected.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
