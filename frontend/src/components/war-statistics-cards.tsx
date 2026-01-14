import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Flame, Users } from 'lucide-react'
import { analytics } from '@/services/api'
import { WarStatisticsModal } from './war-statistics-modal'

export function WarStatisticsCards() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'winRate' | 'streak' | 'participation'>('winRate')

  // Fetch war history
  const { data: warHistory, isLoading } = useQuery({
    queryKey: ['warHistory'],
    queryFn: () => analytics.getWarHistory({ limit: 50 }),
    refetchInterval: 5 * 60 * 1000,
  })

  const wars = warHistory?.wars?.map((w: any) => ({ ...w.data, _id: w.id })) || []

  // Calculate statistics
  const calculateStats = () => {
    if (wars.length === 0) {
      return {
        winRate: 0,
        recentWinRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        participation: 0,
        missedAttacks: 0,
        threeStarRate: 0
      }
    }

    // Overall win rate
    const wins = wars.filter((w: any) => {
      const clanStars = w.clan_stars || 0
      const oppStars = w.opponent_stars || 0
      const clanDest = w.clan_destruction || 0
      const oppDest = w.opponent_destruction || 0
      return clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
    }).length

    const winRate = (wins / wars.length) * 100

    // Recent win rate (last 10 wars)
    const recentWars = wars.slice(0, 10)
    const recentWins = recentWars.filter((w: any) => {
      const clanStars = w.clan_stars || 0
      const oppStars = w.opponent_stars || 0
      const clanDest = w.clan_destruction || 0
      const oppDest = w.opponent_destruction || 0
      return clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
    }).length
    const recentWinRate = recentWars.length > 0 ? (recentWins / recentWars.length) * 100 : 0

    // Current streak
    let currentStreak = 0
    for (const war of wars) {
      const clanStars = war.clan_stars || 0
      const oppStars = war.opponent_stars || 0
      const clanDest = war.clan_destruction || 0
      const oppDest = war.opponent_destruction || 0
      const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
      if (isWin) {
        currentStreak++
      } else {
        break
      }
    }

    // Best streak
    let bestStreak = 0
    let tempStreak = 0
    for (const war of [...wars].reverse()) {
      const clanStars = war.clan_stars || 0
      const oppStars = war.opponent_stars || 0
      const clanDest = war.clan_destruction || 0
      const oppDest = war.opponent_destruction || 0
      const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
      if (isWin) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Participation and missed attacks (last 10 wars)
    let totalPossibleAttacks = 0
    let totalUsedAttacks = 0
    recentWars.forEach((war: any) => {
      const teamSize = war.team_size || 0
      const attacksUsed = war.attacks?.length || 0

      // Determine attacks per member: CWL = 1, Regular = 2
      let attacksPerMember = war.attacks_per_member
      if (!attacksPerMember) {
        // Use is_cwl field if available, otherwise default to 2
        attacksPerMember = war.is_cwl ? 1 : 2
      }

      totalPossibleAttacks += teamSize * attacksPerMember
      totalUsedAttacks += attacksUsed
    })
    const participation = totalPossibleAttacks > 0 ? (totalUsedAttacks / totalPossibleAttacks) * 100 : 0
    const missedAttacks = totalPossibleAttacks - totalUsedAttacks

    // 3-star rate
    const allAttacks = recentWars.flatMap((w: any) => w.attacks || [])
    const threeStars = allAttacks.filter((a: any) => a.stars === 3).length
    const threeStarRate = allAttacks.length > 0 ? (threeStars / allAttacks.length) * 100 : 0

    return {
      winRate,
      recentWinRate,
      currentStreak,
      bestStreak,
      participation,
      missedAttacks,
      threeStarRate
    }
  }

  const stats = calculateStats()

  const handleCardClick = (type: 'winRate' | 'streak' | 'participation') => {
    setModalType(type)
    setModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      id: 'winRate' as const,
      title: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      subtitle: `${stats.recentWinRate.toFixed(0)}% last 10 wars`,
      icon: TrendingUp,
      color: stats.winRate >= 50 ? 'text-green-500' : 'text-red-500',
      hoverColor: stats.winRate >= 50 ? 'hover:border-green-500' : 'hover:border-red-500',
    },
    {
      id: 'streak' as const,
      title: 'Current Streak',
      value: `${stats.currentStreak}`,
      subtitle: `Best: ${stats.bestStreak} wins`,
      icon: Flame,
      color: stats.currentStreak > 0 ? 'text-orange-500' : 'text-gray-500',
      hoverColor: 'hover:border-orange-500',
    },
    {
      id: 'participation' as const,
      title: 'Participation',
      value: `${stats.participation.toFixed(1)}%`,
      subtitle: `${stats.missedAttacks} missed attacks (last 10)`,
      icon: Users,
      color: stats.participation >= 90 ? 'text-green-500' : stats.participation >= 75 ? 'text-yellow-500' : 'text-red-500',
      hoverColor: 'hover:border-blue-500',
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.id}
            className={`cursor-pointer transition-all ${card.hoverColor} hover:shadow-lg`}
            onClick={() => handleCardClick(card.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <WarStatisticsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        wars={wars}
      />
    </>
  )
}
