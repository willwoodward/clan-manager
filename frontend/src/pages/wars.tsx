import { useQuery } from '@tanstack/react-query'
import { clashApi, analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swords, Trophy, Target, TrendingUp, AlertCircle, Users, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { WarMatchupPredictions } from '@/components/war-matchup-predictions'
import { WarStrategy } from '@/components/war-strategy'
import { PlayerStats } from '@/components/player-stats'
import { WarNetworkGraph } from '@/components/war-network-graph'
import { ClickablePlayerName } from '@/components/clickable-player-name'
import { PlayerCard } from '@/components/player-card'

type MemberSortField = 'name' | 'attacks' | 'townhallLevel'
type SortDirection = 'asc' | 'desc'

export function Wars() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'
  const [memberSortField, setMemberSortField] = useState<MemberSortField>('attacks')
  const [memberSortDirection, setMemberSortDirection] = useState<SortDirection>('asc')
  const [selectedPlayerTag, setSelectedPlayerTag] = useState<string | null>(null)

  // Fetch current war
  const { data: currentWar, isLoading: warLoading, error: warError } = useQuery({
    queryKey: ['currentWar', clanTag],
    queryFn: () => clashApi.getCurrentWar(clanTag),
    refetchInterval: 60 * 1000, // Refetch every minute during war
    retry: 1,
  })

  // Fetch war history from our backend (stored wars with attack data)
  const { data: warHistory, isLoading: logLoading } = useQuery({
    queryKey: ['warHistory'],
    queryFn: () => analytics.getWarHistory({ limit: 20 }),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  })

  const isLoading = warLoading || logLoading

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading war data...</p>
        </div>
      </div>
    )
  }

  const getResultBadge = (result: string) => {
    return result === 'win' ? (
      <Badge className="bg-green-500">Victory</Badge>
    ) : result === 'loss' ? (
      <Badge className="bg-red-500">Defeat</Badge>
    ) : (
      <Badge className="bg-gray-500">Draw</Badge>
    )
  }

  const timeRemaining = () => {
    if (!currentWar || !currentWar.endTime) return '0h 0m'
    const end = new Date(currentWar.endTime)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return 'War Ended'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getWarState = (state: string) => {
    switch (state) {
      case 'preparation':
        return 'Preparation Day'
      case 'inWar':
        return 'Battle Day'
      case 'warEnded':
        return 'War Ended'
      default:
        return 'Unknown'
    }
  }

  // Calculate war statistics from war history (stored war data)
  const wars = warHistory?.wars?.map((w: any) => ({ ...w.data, _id: w.id })) || []

  // Debug logging
  if (wars.length > 0) {
    console.log('War History:', wars.map((w: any) => ({
      id: w._id,
      opponent: w.opponent_name,
      date: w.end_time
    })))
  }

  const warStats = wars.length > 0 ? {
    total: wars.length,
    wins: wars.filter((w: any) => {
      const clanStars = w.clan_stars || 0
      const oppStars = w.opponent_stars || 0
      const clanDest = w.clan_destruction || 0
      const oppDest = w.opponent_destruction || 0
      return clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
    }).length,
    losses: wars.filter((w: any) => {
      const clanStars = w.clan_stars || 0
      const oppStars = w.opponent_stars || 0
      const clanDest = w.clan_destruction || 0
      const oppDest = w.opponent_destruction || 0
      return clanStars < oppStars || (clanStars === oppStars && clanDest < oppDest)
    }).length,
    avgStars: wars.reduce((acc: number, w: any) => acc + (w.clan_stars || 0), 0) / wars.length || 0,
  } : { total: 0, wins: 0, losses: 0, avgStars: 0 }

  const winRate = warStats.total > 0 ? ((warStats.wins / warStats.total) * 100).toFixed(1) : '0.0'

  // Calculate current streak from most recent wars
  const calculateStreak = () => {
    if (wars.length === 0) return 0
    let streak = 0

    for (const war of wars) {
      const clanStars = war.clan_stars || 0
      const oppStars = war.opponent_stars || 0
      const clanDest = war.clan_destruction || 0
      const oppDest = war.opponent_destruction || 0
      const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)

      if (isWin) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const currentStreak = calculateStreak()

  const notInWar = !currentWar || currentWar.state === 'notInWar' || warError

  // Member attack statistics (from current war)
  const handleMemberSort = (field: MemberSortField) => {
    if (memberSortField === field) {
      setMemberSortDirection(memberSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setMemberSortField(field)
      setMemberSortDirection('asc')
    }
  }

  const memberStats = !notInWar && currentWar.clan?.members ? currentWar.clan.members.map((member: any) => {
    const attacksUsed = member.attacks?.length || 0
    const attacksAvailable = currentWar.attacksPerMember || 2
    const participationRate = (attacksUsed / attacksAvailable) * 100

    return {
      tag: member.tag,
      name: member.name,
      townhallLevel: member.townhallLevel,
      attacks: attacksUsed,
      attacksAvailable,
      participationRate,
      hasAttacked: attacksUsed > 0,
      allAttacksUsed: attacksUsed >= attacksAvailable,
    }
  }) : []

  const sortedMemberStats = [...memberStats].sort((a, b) => {
    const modifier = memberSortDirection === 'asc' ? 1 : -1
    if (memberSortField === 'name') {
      return modifier * a.name.localeCompare(b.name)
    }
    return modifier * (a[memberSortField] - b[memberSortField])
  })

  const totalMembers = memberStats.length
  const membersWithAllAttacks = memberStats.filter((m: any) => m.allAttacksUsed).length
  const membersWithNoAttacks = memberStats.filter((m: any) => !m.hasAttacked).length
  const overallParticipation = totalMembers > 0
    ? ((memberStats.reduce((sum: number, m: any) => sum + m.attacks, 0) / (totalMembers * (currentWar?.attacksPerMember || 2))) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clan Wars</h1>
        <p className="text-muted-foreground">Track your clan's war performance</p>
      </div>

      {/* Current War */}
      {notInWar ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Not in War</h3>
            <p className="text-muted-foreground text-center">
              Your clan is not currently participating in a war.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current War</CardTitle>
                <CardDescription>{getWarState(currentWar.state)} - {timeRemaining()} remaining</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10">
                {currentWar.teamSize}v{currentWar.teamSize}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Our Clan */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  {currentWar.clan.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stars:</span>
                    <span className="font-bold text-yellow-500 flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {currentWar.clan.stars}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destruction:</span>
                    <span className="font-bold">{currentWar.clan.destructionPercentage?.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attacks:</span>
                    <span className="font-bold">
                      {currentWar.clan.attacks}/{currentWar.teamSize * 2}
                    </span>
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">VS</div>
                  <div className={`text-2xl font-bold ${
                    currentWar.clan.stars > currentWar.opponent.stars
                      ? 'text-green-500'
                      : currentWar.clan.stars < currentWar.opponent.stars
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}>
                    {currentWar.clan.stars > currentWar.opponent.stars
                      ? 'Winning'
                      : currentWar.clan.stars < currentWar.opponent.stars
                      ? 'Losing'
                      : 'Tied'}
                  </div>
                </div>
              </div>

              {/* Opponent */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-destructive" />
                  {currentWar.opponent.name}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stars:</span>
                    <span className="font-bold text-yellow-500 flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {currentWar.opponent.stars}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destruction:</span>
                    <span className="font-bold">{currentWar.opponent.destructionPercentage?.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attacks:</span>
                    <span className="font-bold">
                      {currentWar.opponent.attacks}/{currentWar.teamSize * 2}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* War Strategy Optimizer */}
      {!notInWar && currentWar.clan?.members && currentWar.opponent?.members && (
        <WarStrategy
          clanMembers={currentWar.clan.members}
          opponentMembers={currentWar.opponent.members}
          attacksPerMember={currentWar.attacksPerMember || 2}
        />
      )}

      {/* War Network Graph - Combined visualization */}
      {!notInWar && currentWar.clan?.members && currentWar.opponent?.members && (
        <WarNetworkGraph
          clanMembers={currentWar.clan.members}
          opponentMembers={currentWar.opponent.members}
          attacksPerMember={currentWar.attacksPerMember || 2}
        />
      )}

      {/* Legacy Member Attack Statistics - Keep as fallback */}
      {false && !notInWar && currentWar.clan?.members && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Attack Statistics
                </CardTitle>
                <CardDescription>
                  Track who has used their attacks in the current war
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {membersWithAllAttacks} completed
                </Badge>
                <Badge variant="outline" className="bg-red-500/10 text-red-500">
                  <XCircle className="h-3 w-3 mr-1" />
                  {membersWithNoAttacks} no attacks
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Participation Summary */}
            <div className="mb-6 p-4 rounded-lg bg-accent/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Overall Participation</div>
                  <div className="text-2xl font-bold text-primary">{overallParticipation}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Attacks Used</div>
                  <div className="text-2xl font-bold">
                    {memberStats.reduce((sum: number, m: any) => sum + m.attacks, 0)} / {totalMembers * (currentWar?.attacksPerMember || 2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Member Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Status</th>
                    <th
                      className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleMemberSort('name')}
                    >
                      Name {memberSortField === 'name' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleMemberSort('townhallLevel')}
                    >
                      TH {memberSortField === 'townhallLevel' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left p-3 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleMemberSort('attacks')}
                    >
                      Attacks Used {memberSortField === 'attacks' && (memberSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left p-3 font-medium">Participation</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMemberStats.map((member: any) => (
                    <tr key={member.tag} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        {member.allAttacksUsed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : member.hasAttacked ? (
                          <div className="h-5 w-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          </div>
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                      <td className="p-3">
                        <ClickablePlayerName
                          tag={member.tag}
                          name={member.name}
                          onClick={setSelectedPlayerTag}
                        />
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">TH {member.townhallLevel}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={member.allAttacksUsed ? 'default' : member.hasAttacked ? 'outline' : 'secondary'}>
                          {member.attacks}/{member.attacksAvailable}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                member.participationRate === 100
                                  ? 'bg-green-500'
                                  : member.participationRate > 0
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${member.participationRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium min-w-[3rem]">
                            {member.participationRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <strong>Note:</strong> This shows current war data only. Historical attack statistics will be available once war history tracking is implemented.
            </div>
          </CardContent>
        </Card>
      )}

      {/* War Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Wars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warStats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{winRate}%</div>
            <p className="text-xs text-muted-foreground">{warStats.wins} wins, {warStats.losses} losses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{currentStreak}</div>
            <p className="text-xs text-muted-foreground">Consecutive wins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Stars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warStats.avgStars.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Per war</p>
          </CardContent>
        </Card>
      </div>

      {/* War History */}
      {wars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Wars</CardTitle>
            <CardDescription>
              Saved war history with detailed attack data ({wars.length} wars total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wars.slice(0, 10).map((war: any) => {
                const clanStars = war.clan_stars || 0
                const oppStars = war.opponent_stars || 0
                const clanDest = war.clan_destruction || 0
                const oppDest = war.opponent_destruction || 0

                const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
                const isTie = clanStars === oppStars && clanDest === oppDest
                const result = isWin ? 'win' : isTie ? 'tie' : 'loss'

                return (
                  <div
                    key={war._id || war.opponent_name}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-sm text-muted-foreground min-w-[100px]">
                        {war.end_time ? new Date(war.end_time).toLocaleDateString() : 'Unknown date'}
                      </div>
                      <div>
                        <div className="font-medium">{war.opponent_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {war.team_size}v{war.team_size} • {war.attacks?.length || 0} attacks recorded
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getResultBadge(result)}
                      <div className="text-right min-w-[120px]">
                        <div className="flex items-center gap-2 justify-end">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{clanStars}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-bold">{oppStars}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {clanDest.toFixed(1)}% - {oppDest.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {wars.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No war history data available yet.</p>
                <p className="text-sm mt-2">War data will appear here once wars are completed and saved.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Performance Stats */}
      <PlayerStats />

      <PlayerCard
        playerTag={selectedPlayerTag}
        open={!!selectedPlayerTag}
        onClose={() => setSelectedPlayerTag(null)}
      />
    </div>
  )
}
