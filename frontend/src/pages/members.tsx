import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { activity } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, ArrowUp, ArrowDown, Minus, Clock } from 'lucide-react'
import { useState } from 'react'
import { ClickablePlayerName } from '@/components/clickable-player-name'
import { PlayerCard } from '@/components/player-card'
import { getProxiedImageUrl } from '@/utils/image-proxy'

type SortField = 'name' | 'trophies' | 'donations' | 'townHallLevel' | 'leagueTier' | 'lastActive'
type SortDirection = 'asc' | 'desc'

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

// Format activity type for display
function formatActivityType(activityType: string): string {
  const typeMap: Record<string, string> = {
    'donation': 'Donation',
    'received': 'Received',
    'attack': 'Attack',
    'builder_base_attack': 'Builder Base',
    'clan_games': 'Clan Games'
  }
  return typeMap[activityType] || activityType
}

export function Members() {
  const [sortField, setSortField] = useState<SortField>('leagueTier')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlayerTag, setSelectedPlayerTag] = useState<string | null>(null)
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'

  const { data: clan, isLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const { data: activityData } = useQuery({
    queryKey: ['activity', 'all'],
    queryFn: () => activity.getAllActivities(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })

  if (isLoading || !clan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    )
  }

  const activities = activityData?.activities || {}

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedMembers = [...clan.memberList]
    .filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.tag.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const modifier = sortDirection === 'asc' ? 1 : -1
      if (sortField === 'name') {
        return modifier * a.name.localeCompare(b.name)
      }
      if (sortField === 'leagueTier') {
        const aLeague = a.leagueTier?.id || 0
        const bLeague = b.leagueTier?.id || 0
        return modifier * (aLeague - bLeague)
      }
      if (sortField === 'lastActive') {
        const aActivity = activities[a.tag]
        const bActivity = activities[b.tag]
        if (!aActivity && !bActivity) return 0
        if (!aActivity) return 1
        if (!bActivity) return -1
        const aTime = new Date(aActivity.last_active).getTime()
        const bTime = new Date(bActivity.last_active).getTime()
        return modifier * (aTime - bTime)
      }
      return modifier * (a[sortField] - b[sortField])
    })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'leader':
        return 'bg-yellow-500'
      case 'coLeader':
        return 'bg-orange-500'
      case 'admin':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRankChange = (member: typeof clan.memberList[0]) => {
    const change = member.previousClanRank - member.clanRank
    if (change > 0) {
      return <ArrowUp className="h-4 w-4 text-green-500" />
    } else if (change < 0) {
      return <ArrowDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">View and manage all clan members</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clan.members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clan.memberList.reduce((sum, m) => sum + m.donations, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Town Hall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(clan.memberList.reduce((sum, m) => sum + m.townHallLevel, 0) / clan.members).toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Trophies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(clan.memberList.reduce((sum, m) => sum + m.trophies, 0) / clan.members).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members ({sortedMembers.length})</CardTitle>
          <CardDescription>Complete list of clan members with statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('trophies')}
                  >
                    Trophies {sortField === 'trophies' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('donations')}
                  >
                    Donations {sortField === 'donations' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('townHallLevel')}
                  >
                    TH {sortField === 'townHallLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('leagueTier')}
                  >
                    League {sortField === 'leagueTier' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                    onClick={() => handleSort('lastActive')}
                  >
                    Last Active {sortField === 'lastActive' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member) => (
                  <tr key={member.tag} className="border-b hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">#{member.clanRank}</span>
                        {getRankChange(member)}
                      </div>
                    </td>
                    <td className="p-3">
                      <ClickablePlayerName
                        tag={member.tag}
                        name={member.name}
                        onClick={setSelectedPlayerTag}
                      />
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={getRoleColor(member.role)}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {member.league.name === 'Unranked' ? '0' : member.trophies.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="font-medium">{member.donations}</span>
                        <span className="text-muted-foreground"> / {member.donationsReceived}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">TH {member.townHallLevel}</Badge>
                    </td>
                    <td className="p-3">
                      {member.leagueTier && (
                        <div className="flex items-center gap-2">
                          <img
                            src={getProxiedImageUrl(member.leagueTier.iconUrls.small)}
                            alt={member.leagueTier.name}
                            className="h-6 w-6"
                          />
                          <span className="text-sm">{member.leagueTier.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {activities[member.tag] ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">{formatTimeAgo(new Date(activities[member.tag].last_active))}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatActivityType(activities[member.tag].last_activity_type)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No activity</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PlayerCard
        playerTag={selectedPlayerTag}
        open={!!selectedPlayerTag}
        onClose={() => setSelectedPlayerTag(null)}
      />
    </div>
  )
}
