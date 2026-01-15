import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { coc, analytics } from '@/services/api'
import { Users, Search, Star, AlertCircle, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { useClanContext } from '@/hooks/use-clan-context'

interface LineupOptimizerModalProps {
  open: boolean
  onClose: () => void
}

interface PlayerScore {
  tag: string
  name: string
  town_hall: number
  strength_score: number
  same_th_3star_rate: number | null
  plus_one_3star_rate: number | null
  overall_3star_rate: number
  avg_destruction: number
  sample_size: number
  reliability: string
  has_data: boolean
  position?: number
  is_critical_position?: boolean
  reason?: string
  priority_reason?: string
}

interface OptimizationResult {
  recommended_lineup: PlayerScore[]
  excluded: PlayerScore[]
  consider_adding: PlayerScore[]
  summary: {
    lineup_size: number
    war_size: number
    avg_strength_score: number
    avg_3star_rate: number
    confidence_level: string
    opted_in_count: number
    excluded_count: number
  }
}

export function LineupOptimizerModal({ open, onClose }: LineupOptimizerModalProps) {
  const { clanTag } = useClanContext()

  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [riskTolerance, setRiskTolerance] = useState(50)
  const [suggestAdditional, setSuggestAdditional] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showExcluded, setShowExcluded] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const resultsRef = useRef<HTMLDivElement>(null)

  // Fetch clan members
  const { data: clanData, isLoading: clanLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => coc.getClan(clanTag),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: (params: {
      opted_in_tags: string[]
      risk_tolerance: number
      suggest_additional: boolean
    }) => analytics.optimizeLineup(params),
  })

  // Scroll to results when optimization completes
  useEffect(() => {
    if (optimizeMutation.isSuccess && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [optimizeMutation.isSuccess])

  const members = useMemo(() => {
    if (!clanData?.memberList) return []
    return [...clanData.memberList].sort((a: any, b: any) => {
      // Sort by TH descending, then by name
      if (b.townHallLevel !== a.townHallLevel) {
        return b.townHallLevel - a.townHallLevel
      }
      return a.name.localeCompare(b.name)
    })
  }, [clanData])

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members
    const query = searchQuery.toLowerCase()
    return members.filter((m: any) =>
      m.name.toLowerCase().includes(query) ||
      m.tag.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  // Group members by TH level
  const membersByTH = useMemo(() => {
    const groups: Record<number, any[]> = {}
    filteredMembers.forEach((m: any) => {
      const th = m.townHallLevel
      if (!groups[th]) groups[th] = []
      groups[th].push(m)
    })
    return Object.entries(groups)
      .map(([th, players]) => ({ th: parseInt(th), players }))
      .sort((a, b) => b.th - a.th)
  }, [filteredMembers])

  const togglePlayer = (tag: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedPlayers(new Set(members.map((m: any) => m.tag)))
  }

  const clearAll = () => {
    setSelectedPlayers(new Set())
  }

  const handleOptimize = () => {
    optimizeMutation.mutate({
      opted_in_tags: Array.from(selectedPlayers),
      risk_tolerance: riskTolerance / 100,
      suggest_additional: suggestAdditional,
    })
  }

  const getReliabilityBadge = (reliability: string) => {
    switch (reliability) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Medium</Badge>
      case 'low':
        return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">Low</Badge>
      default:
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">No Data</Badge>
    }
  }

  const result = optimizeMutation.data as OptimizationResult | undefined

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            War Lineup Optimizer
          </DialogTitle>
          <DialogDescription>
            Select opted-in players and optimize your war lineup based on performance data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Opted-In Players</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>

              {/* Player List */}
              {clanLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {membersByTH.map(({ th, players }) => (
                    <div key={th}>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Town Hall {th} ({players.length})
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {players.map((member: any) => (
                          <div
                            key={member.tag}
                            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                              selectedPlayers.has(member.tag)
                                ? 'bg-primary/10 border-primary/50'
                                : 'hover:bg-muted/50 border-border'
                            }`}
                            onClick={() => togglePlayer(member.tag)}
                          >
                            <Checkbox
                              checked={selectedPlayers.has(member.tag)}
                              onCheckedChange={() => togglePlayer(member.tag)}
                            />
                            <span className="text-sm truncate">{member.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''} selected
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Optimization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk Tolerance Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-medium">
                    {riskTolerance <= 33 ? 'Perfect War' : riskTolerance >= 67 ? 'Max Participation' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  value={[riskTolerance]}
                  onValueChange={(value) => setRiskTolerance(value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Perfect War (Strict)</span>
                  <span>Max Participation</span>
                </div>
              </div>

              {/* Suggest Additional Checkbox */}
              <div
                className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50"
                onClick={() => setSuggestAdditional(!suggestAdditional)}
              >
                <Checkbox
                  checked={suggestAdditional}
                  onCheckedChange={() => setSuggestAdditional(!suggestAdditional)}
                />
                <div>
                  <div className="text-sm font-medium">Suggest additional players</div>
                  <div className="text-xs text-muted-foreground">
                    Show high-performing clan members who haven't opted in
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimize Button */}
          <Button
            className="w-full"
            onClick={handleOptimize}
            disabled={selectedPlayers.size === 0 || optimizeMutation.isPending}
          >
            {optimizeMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Optimizing...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Optimize Lineup
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <div ref={resultsRef} className="space-y-4">
              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{result.summary.war_size}v{result.summary.war_size}</div>
                      <div className="text-xs text-muted-foreground">War Size</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{result.summary.avg_strength_score}</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{result.summary.avg_3star_rate}%</div>
                      <div className="text-xs text-muted-foreground">Avg 3-Star Rate</div>
                    </div>
                    <div>
                      <Badge className={
                        result.summary.confidence_level === 'high' ? 'bg-green-500' :
                        result.summary.confidence_level === 'medium' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }>
                        {result.summary.confidence_level} confidence
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Lineup */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Recommended Lineup ({result.recommended_lineup.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="pb-2 pr-4">#</th>
                          <th className="pb-2 pr-4">Player</th>
                          <th className="pb-2 pr-4">TH</th>
                          <th className="pb-2 pr-4">Score</th>
                          <th className="pb-2 pr-4">3-Star %</th>
                          <th className="pb-2">Reliability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.recommended_lineup.map((player) => (
                          <tr key={player.tag} className={`border-b last:border-0 ${player.is_critical_position ? 'bg-yellow-500/5' : ''}`}>
                            <td className="py-2 pr-4 font-medium">
                              {player.position}
                              {player.is_critical_position && <Star className="h-3 w-3 inline ml-1 text-yellow-500" />}
                            </td>
                            <td className="py-2 pr-4">{player.name}</td>
                            <td className="py-2 pr-4">
                              <Badge variant="outline">TH{player.town_hall}</Badge>
                            </td>
                            <td className="py-2 pr-4 font-medium">{player.strength_score}</td>
                            <td className="py-2 pr-4">{player.overall_3star_rate}%</td>
                            <td className="py-2">{getReliabilityBadge(player.reliability)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Excluded Players */}
              {result.excluded.length > 0 && (
                <Card>
                  <CardHeader
                    className="pb-3 cursor-pointer"
                    onClick={() => setShowExcluded(!showExcluded)}
                  >
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Excluded ({result.excluded.length})
                      </span>
                      {showExcluded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                  {showExcluded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {result.excluded.map((player) => (
                          <div key={player.tag} className="p-3 rounded-md bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{player.name}</span>
                              <Badge variant="outline">TH{player.town_hall}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{player.reason}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Consider Adding */}
              {result.consider_adding.length > 0 && (
                <Card className="border-green-500/30">
                  <CardHeader
                    className="pb-3 cursor-pointer"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                  >
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-green-500" />
                        Consider Adding ({result.consider_adding.length})
                      </span>
                      {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                  {showSuggestions && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {result.consider_adding.map((player) => (
                          <div key={player.tag} className="p-3 rounded-md bg-green-500/5 border border-green-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{player.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">TH{player.town_hall}</Badge>
                                <span className="text-sm font-medium text-green-600">Score: {player.strength_score}</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">{player.priority_reason}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Error State */}
          {optimizeMutation.isError && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Error optimizing lineup: {(optimizeMutation.error as Error)?.message || 'Unknown error'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
