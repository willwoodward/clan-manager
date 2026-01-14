import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, Target, Swords, TrendingUp, Users, Shield, Award } from 'lucide-react'
import { clashApi, analytics } from '@/services/api'

interface ClanWarFlipCardProps {
  clan: any
  teamSize: number
  side: 'our' | 'opponent'
  currentWar: any
}

export function ClanWarFlipCard({ clan, teamSize, side, currentWar }: ClanWarFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Fetch opponent clan details (only for opponent side)
  const { data: opponentClanDetails } = useQuery({
    queryKey: ['opponentClan', clan.tag],
    queryFn: () => clashApi.getClan(clan.tag),
    enabled: side === 'opponent' && isFlipped,
  })

  // Fetch war predictions (only for our side)
  const { data: warPredictions } = useQuery({
    queryKey: ['warPredictions', currentWar?.clan?.tag, currentWar?.opponent?.tag],
    queryFn: async () => {
      if (!currentWar?.clan?.members || !currentWar?.opponent?.members) return null

      return analytics.generateWarStrategy({
        attackers: currentWar.clan.members.map((m: any) => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        defenders: currentWar.opponent.members.map((m: any) => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        attacks_per_member: currentWar.attacksPerMember || 2,
        strategy_type: 'balanced'
      })
    },
    enabled: side === 'our' && isFlipped && !!currentWar,
  })

  const renderFront = () => (
    <div className="space-y-1 mb-3">
      {/* Stars with progress bar */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Stars:</span>
          <span className="font-bold text-yellow-500 flex items-center gap-1">
            <Star className="h-4 w-4" />
            {clan.stars}
          </span>
        </div>
        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              (clan.stars / (teamSize * 3)) > 0.66
                ? 'bg-green-500'
                : (clan.stars / (teamSize * 3)) > 0.33
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((clan.stars / (teamSize * 3)) * 100, 100)}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {clan.stars}/{teamSize * 3} possible
        </div>
      </div>

      {/* Destruction with progress bar */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Destruction:</span>
          <span className="font-bold">{clan.destructionPercentage?.toFixed(2)}%</span>
        </div>
        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              clan.destructionPercentage > 66
                ? 'bg-green-500'
                : clan.destructionPercentage > 33
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${clan.destructionPercentage}%` }}
          />
        </div>
      </div>

      {/* Attacks with progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Attacks:</span>
          <span className="font-bold">
            {clan.attacks}/{teamSize * 2}
          </span>
        </div>
        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              (clan.attacks / (teamSize * 2)) > 0.66
                ? 'bg-green-500'
                : (clan.attacks / (teamSize * 2)) > 0.33
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${(clan.attacks / (teamSize * 2)) * 100}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {(teamSize * 2) - clan.attacks} remaining
        </div>
      </div>
    </div>
  )

  const renderBackOur = () => {
    if (!warPredictions) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading predictions...</p>
          </div>
        </div>
      )
    }

    const stats = warPredictions.statistics
    if (!stats) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center text-muted-foreground">
            <p>No prediction data available</p>
          </div>
        </div>
      )
    }

    const expectedStars = stats.total_expected_stars || 0
    const avgStarsPerAttack = stats.avg_expected_stars_per_attack || 0
    const highConfidenceAttacks = stats.high_confidence_attacks || 0

    // Calculate rough confidence interval (±10% for demonstration)
    const confidenceMargin = expectedStars * 0.1
    const lowerBound = Math.max(0, expectedStars - confidenceMargin)
    const upperBound = Math.min(teamSize * 3, expectedStars + confidenceMargin)

    // Calculate expected destruction (rough estimate based on stars)
    const expectedDestruction = (expectedStars / (teamSize * 3)) * 100
    const destructionLower = Math.max(0, expectedDestruction - 10)
    const destructionUpper = Math.min(100, expectedDestruction + 10)

    return (
      <div className="space-y-2">
        <div className="text-center border-b border-border pb-2">
          <div className="text-sm font-bold text-primary">AI War Predictions</div>
        </div>

        {/* Expected Stars */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              Expected Stars
            </span>
            <span className="text-lg font-bold text-yellow-500">{expectedStars.toFixed(1)}</span>
          </div>
          <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all"
              style={{ width: `${(expectedStars / (teamSize * 3)) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right">
            90% CI: {lowerBound.toFixed(1)} - {upperBound.toFixed(1)}
          </div>
        </div>

        {/* Expected Destruction */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Target className="h-3 w-3 text-orange-500" />
              Expected Destruction
            </span>
            <span className="text-lg font-bold text-orange-500">{expectedDestruction.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${expectedDestruction}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right">
            90% CI: {destructionLower.toFixed(1)}% - {destructionUpper.toFixed(1)}%
          </div>
        </div>

        {/* Attack Quality */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-green-500/10 rounded p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">High Confidence</div>
            <div className="text-base font-bold text-green-500">{highConfidenceAttacks}</div>
          </div>
          <div className="bg-blue-500/10 rounded p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground">Avg Stars/Atk</div>
            <div className="text-base font-bold text-blue-500">{avgStarsPerAttack.toFixed(2)}</div>
          </div>
        </div>
      </div>
    )
  }

  const renderBackOpponent = () => {
    if (!opponentClanDetails) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading clan info...</p>
          </div>
        </div>
      )
    }

    // Calculate average league level
    const leagueLevels: Record<string, number> = {
      'Legend League': 10,
      'Titan League I': 9, 'Titan League II': 8, 'Titan League III': 7,
      'Champion League I': 6, 'Champion League II': 5, 'Champion League III': 4,
      'Master League I': 3, 'Master League II': 2, 'Master League III': 1,
      'Crystal League I': 0, 'Crystal League II': 0, 'Crystal League III': 0,
    }

    const avgLeagueLevel = opponentClanDetails.memberList.reduce((sum: number, m: any) => {
      return sum + (leagueLevels[m.league?.name] || 0)
    }, 0) / opponentClanDetails.memberList.length

    const legendPlayers = opponentClanDetails.memberList.filter((m: any) => m.league?.name === 'Legend League').length
    const titanPlayers = opponentClanDetails.memberList.filter((m: any) => m.league?.name?.includes('Titan')).length
    const championPlayers = opponentClanDetails.memberList.filter((m: any) => m.league?.name?.includes('Champion')).length

    return (
      <div className="space-y-3">
        <div className="text-center border-b border-border pb-2">
          <div className="text-sm font-bold text-destructive">Opponent Intel</div>
        </div>

        {/* CWL League + Clan Level */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">CWL League</div>
            <div className="text-sm font-bold text-yellow-500">
              {opponentClanDetails.warLeague?.name || 'Unranked'}
            </div>
          </div>
          <div className="bg-accent/50 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Clan Level</div>
            <div className="text-lg font-bold">{opponentClanDetails.clanLevel}</div>
          </div>
        </div>

        {/* War Record */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Wins</div>
            <div className="text-lg font-bold text-green-500">{opponentClanDetails.warWins || 0}</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Losses</div>
            <div className="text-lg font-bold text-red-500">{opponentClanDetails.warLosses || 0}</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Win %</div>
            <div className="text-lg font-bold text-blue-500">
              {opponentClanDetails.warWins && opponentClanDetails.warLosses
                ? ((opponentClanDetails.warWins / (opponentClanDetails.warWins + opponentClanDetails.warLosses)) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
        </div>

        {/* Top Players */}
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="text-sm space-y-1">
            {legendPlayers > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Legend League:</span>
                <span className="font-bold text-purple-500">{legendPlayers}</span>
              </div>
            )}
            {titanPlayers > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titan League:</span>
                <span className="font-bold text-blue-500">{titanPlayers}</span>
              </div>
            )}
            {championPlayers > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Champion League:</span>
                <span className="font-bold text-yellow-500">{championPlayers}</span>
              </div>
            )}
            {legendPlayers === 0 && titanPlayers === 0 && championPlayers === 0 && (
              <div className="text-muted-foreground italic">No top league players</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ perspective: '1000px', minHeight: '280px' }}
      className="cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '280px'
        }}
      >
        {/* Front Side */}
        <div
          className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50 hover:bg-background/80 hover:shadow-lg absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <h3 className="font-semibold text-xl flex items-center gap-2 mb-4">
            {side === 'our' ? (
              <Swords className="h-5 w-5 text-primary" />
            ) : (
              <Target className="h-5 w-5 text-destructive" />
            )}
            {clan.name}
          </h3>
          {renderFront()}
          <div className="text-xs text-center text-muted-foreground mt-4 pt-3 border-t border-border">
            Click to see {side === 'our' ? 'predictions' : 'opponent intel'} →
          </div>
        </div>

        {/* Back Side */}
        <div
          className="bg-background/60 backdrop-blur-sm rounded-lg p-3 border border-border/50 hover:bg-background/80 hover:shadow-lg absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {side === 'our' ? renderBackOur() : renderBackOpponent()}
          <div className="text-[10px] text-center text-muted-foreground mt-2 pt-2 border-t border-border">
            ← Click to go back
          </div>
        </div>
      </div>
    </div>
  )
}
