import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Medal, Trophy, Target, Gem } from 'lucide-react'
import { statistics } from '@/services/api'
import { StatisticsModal } from './statistics-modal'

interface StatisticsCardsProps {
  clanTag: string
}

export function StatisticsCards({ clanTag }: StatisticsCardsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'raid' | 'cwl' | 'games' | 'ores'>('raid')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics-summary', clanTag],
    queryFn: () => statistics.getSummary(clanTag),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const handleCardClick = (type: 'raid' | 'cwl' | 'games' | 'ores') => {
    setModalType(type)
    setModalOpen(true)
  }

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
      id: 'raid' as const,
      title: stats.raid_medals?.title || 'Raid Medals',
      value: stats.raid_medals?.display || '0',
      subtitle: `Off: ${stats.raid_medals?.offensive || 0} | Def: ${stats.raid_medals?.defensive || 0}`,
      icon: Medal,
      color: 'text-purple-500',
      hoverColor: 'hover:border-purple-500',
    },
    {
      id: 'cwl' as const,
      title: stats.cwl_medals?.title || 'CWL Medals',
      value: stats.cwl_medals?.range_display || 'Unranked',
      subtitle: stats.cwl_medals?.league || 'Not in league',
      icon: Trophy,
      color: 'text-yellow-500',
      hoverColor: 'hover:border-yellow-500',
    },
    {
      id: 'games' as const,
      title: stats.clan_games?.title || 'Clan Games',
      value: stats.clan_games?.tier_display || '0/6',
      subtitle: stats.clan_games?.active ? 'Active' : 'Not active',
      icon: Target,
      color: 'text-green-500',
      hoverColor: 'hover:border-green-500',
    },
    {
      id: 'ores' as const,
      title: stats.ore_estimate?.title || 'Estimated Ores',
      value: stats.ore_estimate?.display || '0 / 0 / 0',
      subtitle: `${stats.ore_estimate?.win_rate || 0}% win rate in last 30 days`,
      icon: Gem,
      color: 'text-blue-500',
      hoverColor: 'hover:border-blue-500',
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <StatisticsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        clanTag={clanTag}
      />
    </>
  )
}
