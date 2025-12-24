import { useQuery } from '@tanstack/react-query'
import { events } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  UserPlus,
  UserMinus,
  Swords,
  Trophy,
  TrendingUp,
  Gift,
  Shield,
  ChevronDown,
  Hammer,
  Gamepad2
} from 'lucide-react'
import { useState } from 'react'

// Simple time ago formatter
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface EventLogProps {
  limit?: number
  compact?: boolean
}

const EVENT_ICONS: Record<string, any> = {
  member_join: UserPlus,
  member_leave: UserMinus,
  war_start: Swords,
  war_end: Shield,
  war_won: Trophy,
  war_lost: Swords,
  donation_milestone: Gift,
  promotion: TrendingUp,
  demotion: ChevronDown,
  clan_level_up: TrendingUp,
  ATTACK: Swords,
  BUILDER_BASE_ATTACK: Hammer,
  CLAN_GAMES: Gamepad2,
}

const EVENT_COLORS: Record<string, string> = {
  member_join: 'text-green-500 bg-green-500/10',
  member_leave: 'text-red-500 bg-red-500/10',
  war_start: 'text-blue-500 bg-blue-500/10',
  war_end: 'text-purple-500 bg-purple-500/10',
  war_won: 'text-yellow-500 bg-yellow-500/10',
  war_lost: 'text-gray-500 bg-gray-500/10',
  donation_milestone: 'text-pink-500 bg-pink-500/10',
  promotion: 'text-green-500 bg-green-500/10',
  demotion: 'text-orange-500 bg-orange-500/10',
  clan_level_up: 'text-purple-500 bg-purple-500/10',
  ATTACK: 'text-red-500 bg-red-500/10',
  BUILDER_BASE_ATTACK: 'text-amber-500 bg-amber-500/10',
  CLAN_GAMES: 'text-violet-500 bg-violet-500/10',
}

const EVENT_LABELS: Record<string, string> = {
  member_join: 'Join',
  member_leave: 'Leave',
  war_start: 'War',
  war_end: 'War',
  war_won: 'Victory',
  war_lost: 'Defeat',
  donation_milestone: 'Donations',
  promotion: 'Promotion',
  demotion: 'Demotion',
  clan_level_up: 'Level Up',
  ATTACK: 'Attack',
  BUILDER_BASE_ATTACK: 'Builder Base',
  CLAN_GAMES: 'Clan Games',
}

export function EventLog({ limit = 20, compact = false }: EventLogProps) {
  const [showAll, setShowAll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['events', limit],
    queryFn: () => events.getRecentEvents(limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const eventList = data?.events || []
  const displayEvents = showAll || compact ? eventList : eventList.slice(0, 10)

  if (eventList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Track clan events and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recent events</p>
            <p className="text-sm">Events will appear here as they happen</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          {eventList.length} event{eventList.length !== 1 ? 's' : ''} in the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-500">
          {displayEvents.map((event: any) => {
            const Icon = EVENT_ICONS[event.type] || Activity
            const colorClass = EVENT_COLORS[event.type] || 'text-gray-500 bg-gray-500/10'
            const label = EVENT_LABELS[event.type] || event.type

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(new Date(event.timestamp))}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {!compact && eventList.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {showAll ? 'Show less' : `Show ${eventList.length - 10} more events`}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
