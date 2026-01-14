import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Star, Target, Users, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WarDetailModalProps {
  open: boolean
  onClose: () => void
  war: any
}

export function WarDetailModal({ open, onClose, war }: WarDetailModalProps) {
  if (!war) return null

  const clanStars = war.clan_stars || 0
  const oppStars = war.opponent_stars || 0
  const clanDest = war.clan_destruction || 0
  const oppDest = war.opponent_destruction || 0

  const isWin = clanStars > oppStars || (clanStars === oppStars && clanDest > oppDest)
  const isTie = clanStars === oppStars && clanDest === oppDest
  const result = isWin ? 'Victory' : isTie ? 'Draw' : 'Defeat'

  const teamSize = war.team_size || 0
  const attacksUsed = war.attacks?.length || 0

  // Try to infer attacks_per_member if not present
  let attacksPerMember = war.attacks_per_member
  if (!attacksPerMember) {
    const ratio = attacksUsed / teamSize
    attacksPerMember = ratio < 1.5 ? 1 : 2
  }

  const totalPossibleAttacks = teamSize * attacksPerMember
  const missedAttacks = totalPossibleAttacks - attacksUsed
  const participationRate = totalPossibleAttacks > 0 ? (attacksUsed / totalPossibleAttacks) * 100 : 0

  // Stars distribution
  const attacks = war.attacks || []
  const threeStars = attacks.filter((a: any) => a.stars === 3).length
  const twoStars = attacks.filter((a: any) => a.stars === 2).length
  const oneStars = attacks.filter((a: any) => a.stars === 1).length
  const zeroStars = attacks.filter((a: any) => a.stars === 0).length

  const starsData = [
    { name: '3★', count: threeStars, color: '#22c55e' },
    { name: '2★', count: twoStars, color: '#eab308' },
    { name: '1★', count: oneStars, color: '#f97316' },
    { name: '0★', count: zeroStars, color: '#ef4444' },
  ]

  const avgDestruction = attacks.length > 0
    ? attacks.reduce((sum: number, a: any) => sum + (a.destruction_percentage || 0), 0) / attacks.length
    : 0

  // Group attacks by player
  const playerAttacks: Record<string, any[]> = {}
  attacks.forEach((attack: any) => {
    const tag = attack.attacker_tag
    if (!playerAttacks[tag]) {
      playerAttacks[tag] = []
    }
    playerAttacks[tag].push(attack)
  })

  // Find players who didn't attack
  const allMembers = war.members || []
  const membersWhoAttacked = new Set(Object.keys(playerAttacks))
  const membersWhoDidntAttack = allMembers.filter((m: any) => !membersWhoAttacked.has(m.tag))

  const isPerfectWar = attacksUsed === totalPossibleAttacks && missedAttacks === 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                vs {war.opponent_name}
                {isPerfectWar && <Badge className="ml-2 bg-purple-500">Perfect War</Badge>}
              </DialogTitle>
              <DialogDescription>
                {war.end_time ? new Date(war.end_time).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Date unknown'} • {teamSize}v{teamSize}
              </DialogDescription>
            </div>
            <Badge
              className={
                isWin
                  ? 'bg-green-500 text-lg px-4 py-2'
                  : isTie
                  ? 'bg-gray-500 text-lg px-4 py-2'
                  : 'bg-red-500 text-lg px-4 py-2'
              }
            >
              {result}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Score Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Our Clan</div>
              <div className="text-3xl font-bold flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                {clanStars}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{clanDest.toFixed(1)}%</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-4xl font-bold text-muted-foreground">VS</div>
            </div>
            <div className="bg-destructive/10 rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Opponent</div>
              <div className="text-3xl font-bold flex items-center justify-center gap-2">
                <Target className="h-6 w-6 text-red-500" />
                {oppStars}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{oppDest.toFixed(1)}%</div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Attacks Used</div>
              <div className="text-xl font-bold">{attacksUsed}/{totalPossibleAttacks}</div>
            </div>
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Participation</div>
              <div className={`text-xl font-bold ${
                participationRate >= 90 ? 'text-green-500' : participationRate >= 75 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {participationRate.toFixed(0)}%
              </div>
            </div>
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Avg Destruction</div>
              <div className="text-xl font-bold">{avgDestruction.toFixed(1)}%</div>
            </div>
            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">3-Star Rate</div>
              <div className="text-xl font-bold text-green-500">
                {attacks.length > 0 ? ((threeStars / attacks.length) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>

          {/* Stars Distribution */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5" />
              Stars Distribution
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={starsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={(props) => {
                    const { active, payload } = props
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                        <div className="text-sm font-medium">{data.name}: {data.count} attacks</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {starsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Missed Attacks */}
          {missedAttacks > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                Missed Attacks ({missedAttacks})
              </h3>
              <div className="space-y-2">
                {membersWhoDidntAttack.map((member: any) => (
                  <div key={member.tag} className="flex items-center justify-between p-2 bg-background/50 rounded">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <Badge variant="secondary">TH {member.townhall_level}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Performance ({Object.keys(playerAttacks).length} players)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(playerAttacks)
                .sort(([, attacksA], [, attacksB]) => {
                  const starsA = (attacksA as any[]).reduce((sum, a) => sum + a.stars, 0)
                  const starsB = (attacksB as any[]).reduce((sum, a) => sum + a.stars, 0)
                  return starsB - starsA
                })
                .map(([tag, playerAttacksList]) => {
                  const totalStars = (playerAttacksList as any[]).reduce((sum, a) => sum + a.stars, 0)
                  const avgDest = (playerAttacksList as any[]).reduce((sum, a) => sum + (a.destruction_percentage || 0), 0) / playerAttacksList.length

                  return (
                    <div key={tag} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">{playerAttacksList[0].attacker_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {playerAttacksList.length} {playerAttacksList.length === 1 ? 'attack' : 'attacks'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-yellow-500">{totalStars}⭐</div>
                          <div className="text-xs text-muted-foreground">{avgDest.toFixed(1)}%</div>
                        </div>
                        <div className="flex gap-1">
                          {(playerAttacksList as any[]).map((attack, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${
                                attack.stars === 3 ? 'bg-green-500' :
                                attack.stars === 2 ? 'bg-yellow-500' :
                                attack.stars === 1 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                            >
                              {attack.stars}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
