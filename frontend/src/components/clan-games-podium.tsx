import { Trophy, Medal, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PodiumPlayer {
  player_name: string
  player_tag: string
  points_earned: number
}

interface ClanGamesPodiumProps {
  topThree: PodiumPlayer[]
  onClick?: (playerTag: string) => void
}

export function ClanGamesPodium({ topThree, onClick }: ClanGamesPodiumProps) {
  if (topThree.length === 0) {
    return null
  }

  // Arrange for podium display: [2nd, 1st, 3rd]
  const [first, second, third] = topThree
  const podiumOrder = [second, first, third].filter(Boolean)

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-b from-yellow-400 to-yellow-600'
      case 2:
        return 'bg-gradient-to-b from-gray-300 to-gray-500'
      case 3:
        return 'bg-gradient-to-b from-amber-600 to-amber-800'
      default:
        return 'bg-gray-400'
    }
  }

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1:
        return 'h-48'
      case 2:
        return 'h-36'
      case 3:
        return 'h-28'
      default:
        return 'h-24'
    }
  }

  const getIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-12 w-12 text-yellow-400" fill="currentColor" />
      case 2:
        return <Medal className="h-10 w-10 text-gray-400" fill="currentColor" />
      case 3:
        return <Award className="h-9 w-9 text-amber-600" fill="currentColor" />
      default:
        return null
    }
  }

  const getPosition = (index: number) => {
    // For podium display order [2nd, 1st, 3rd]
    if (index === 0) return 2 // Second place (left)
    if (index === 1) return 1 // First place (center)
    if (index === 2) return 3 // Third place (right)
    return 0
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
      <CardContent className="pt-6">
        <div className="flex items-end justify-center gap-4 px-4">
          {podiumOrder.map((player, index) => {
            if (!player) return null

            const position = getPosition(index)
            const heightClass = getPodiumHeight(position)
            const colorClass = getPodiumColor(position)

            return (
              <div
                key={player.player_tag}
                className="flex flex-col items-center gap-2 flex-1 max-w-[200px]"
              >
                {/* Icon */}
                <div className="mb-2 animate-bounce" style={{ animationDuration: `${1 + position * 0.2}s` }}>
                  {getIcon(position)}
                </div>

                {/* Player Card */}
                <button
                  onClick={() => onClick?.(player.player_tag)}
                  className="w-full bg-card hover:bg-accent border rounded-lg p-3 transition-all hover:scale-105 cursor-pointer"
                >
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">
                      #{position}
                    </Badge>
                    <p className="font-bold text-sm mb-1 truncate">{player.player_name}</p>
                    <p className="text-2xl font-black text-primary">
                      {player.points_earned.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </button>

                {/* Podium */}
                <div
                  className={`w-full ${heightClass} ${colorClass} rounded-t-lg shadow-lg flex items-center justify-center transition-all`}
                >
                  <span className="text-4xl font-black text-white/90">
                    {position}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
