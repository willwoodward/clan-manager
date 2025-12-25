import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle, XCircle, Trophy, Swords, Users, Save, Gift } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { MemberWarStats } from '@/types/cwl'
import type { War } from '@/types/clash'

// Load donation requirements from localStorage or use defaults
const loadDonationRequirements = () => {
  const saved = localStorage.getItem('donationRequirements')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Check if it's the old format (numbers instead of objects)
      if (typeof parsed.elder === 'number') {
        // Migrate old format to new format
        const migrated = {
          member: { maintenance: 0 },
          elder: { promotion: parsed.elder, maintenance: Math.floor(parsed.elder / 2) },
          coLeader: { promotion: parsed.coLeader, maintenance: Math.floor(parsed.coLeader / 2) },
        }
        // Save migrated data
        localStorage.setItem('donationRequirements', JSON.stringify(migrated))
        return migrated
      }
      // Check if missing member field (intermediate format)
      if (!parsed.member) {
        parsed.member = { maintenance: 0 }
        localStorage.setItem('donationRequirements', JSON.stringify(parsed))
      }
      // New format, return as-is
      return parsed
    } catch {
      // Fall back to defaults if parsing fails
    }
  }
  return {
    member: { maintenance: 0 },
    elder: { promotion: 1000, maintenance: 500 },
    coLeader: { promotion: 2000, maintenance: 1000 },
  }
}

// Save donation requirements to localStorage
const saveDonationRequirements = (requirements: {
  member: { maintenance: number }
  elder: { promotion: number; maintenance: number }
  coLeader: { promotion: number; maintenance: number }
}) => {
  localStorage.setItem('donationRequirements', JSON.stringify(requirements))
}

// Role requirements configuration (leader not included as it's not a promotion target)
const getRoleRequirements = (
  memberMaint: number,
  elderPromo: number,
  elderMaint: number,
  coLeaderPromo: number,
  coLeaderMaint: number
) => ({
  leader: {
    promotion: coLeaderPromo,
    maintenance: coLeaderMaint,
    description: 'Leader',
    color: 'text-purple-500',
    badge: 'bg-purple-500',
  },
  coLeader: {
    promotion: coLeaderPromo,
    maintenance: coLeaderMaint,
    description: 'Co-Leader',
    color: 'text-blue-500',
    badge: 'bg-blue-500',
  },
  admin: {
    promotion: elderPromo,
    maintenance: elderMaint,
    description: 'Elder',
    color: 'text-green-500',
    badge: 'bg-green-500',
  },
  member: {
    promotion: 0,
    maintenance: memberMaint,
    description: 'Member',
    color: 'text-gray-500',
    badge: 'bg-gray-500',
  },
})

type Role = 'leader' | 'coLeader' | 'admin' | 'member'

type DonationRequirements = {
  member: { maintenance: number }
  elder: { promotion: number; maintenance: number }
  coLeader: { promotion: number; maintenance: number }
}

interface MemberAnalysis extends MemberWarStats {
  meetsCurrentRoleDonations: boolean
  meetsNextRoleDonations: boolean
  donationDeficit: number
  recommendation: 'promote' | 'maintain' | 'demote' | 'kick'
  recommendationReason: string
  reasonDetails?: string
  warAttacksUsed: number
  warAttacksTotal: number
}

export function Promotions() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'
  const [memberAnalyses, setMemberAnalyses] = useState<MemberAnalysis[]>([])
  const [playerDataCache, setPlayerDataCache] = useState<MemberWarStats[]>([])
  const [currentWar, setCurrentWar] = useState<War | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [filterRecommendation, setFilterRecommendation] = useState<'all' | 'promote' | 'demote' | 'kick'>('all')

  // Donation requirements state
  const [donationReqs, setDonationReqs] = useState(loadDonationRequirements())
  const [memberMaintInput, setMemberMaintInput] = useState(donationReqs.member.maintenance.toString())
  const [elderPromoInput, setElderPromoInput] = useState(donationReqs.elder.promotion.toString())
  const [elderMaintInput, setElderMaintInput] = useState(donationReqs.elder.maintenance.toString())
  const [coLeaderPromoInput, setCoLeaderPromoInput] = useState(donationReqs.coLeader.promotion.toString())
  const [coLeaderMaintInput, setCoLeaderMaintInput] = useState(donationReqs.coLeader.maintenance.toString())
  const [saveMessage, setSaveMessage] = useState('')

  const ROLE_REQUIREMENTS = getRoleRequirements(
    donationReqs.member.maintenance,
    donationReqs.elder.promotion,
    donationReqs.elder.maintenance,
    donationReqs.coLeader.promotion,
    donationReqs.coLeader.maintenance
  )

  // Handle input changes with real-time recalculation
  const handleMemberMaintChange = (value: string) => {
    setMemberMaintInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setDonationReqs((prev: DonationRequirements) => ({
        ...prev,
        member: { maintenance: num }
      }))
    }
  }

  const handleElderPromoChange = (value: string) => {
    setElderPromoInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setDonationReqs((prev: DonationRequirements) => ({
        ...prev,
        elder: { ...prev.elder, promotion: num }
      }))
    }
  }

  const handleElderMaintChange = (value: string) => {
    setElderMaintInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setDonationReqs((prev: DonationRequirements) => ({
        ...prev,
        elder: { ...prev.elder, maintenance: num }
      }))
    }
  }

  const handleCoLeaderPromoChange = (value: string) => {
    setCoLeaderPromoInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setDonationReqs((prev: DonationRequirements) => ({
        ...prev,
        coLeader: { ...prev.coLeader, promotion: num }
      }))
    }
  }

  const handleCoLeaderMaintChange = (value: string) => {
    setCoLeaderMaintInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0) {
      setDonationReqs((prev: DonationRequirements) => ({
        ...prev,
        coLeader: { ...prev.coLeader, maintenance: num }
      }))
    }
  }

  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
  })

  // Handler to save donation requirements
  const handleSaveRequirements = () => {
    const memberMaint = parseInt(memberMaintInput)
    const elderPromo = parseInt(elderPromoInput)
    const elderMaint = parseInt(elderMaintInput)
    const coLeaderPromo = parseInt(coLeaderPromoInput)
    const coLeaderMaint = parseInt(coLeaderMaintInput)

    if (isNaN(memberMaint) || isNaN(elderPromo) || isNaN(elderMaint) || isNaN(coLeaderPromo) || isNaN(coLeaderMaint) ||
        memberMaint < 0 || elderPromo < 0 || elderMaint < 0 || coLeaderPromo < 0 || coLeaderMaint < 0) {
      setSaveMessage('Invalid values - must be positive numbers')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    if (elderPromo < elderMaint) {
      setSaveMessage('Elder promotion must be >= maintenance')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    if (coLeaderPromo < coLeaderMaint) {
      setSaveMessage('Co-Leader promotion must be >= maintenance')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    if (coLeaderPromo < elderPromo) {
      setSaveMessage('Co-Leader promotion must be >= Elder promotion')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    const requirements = {
      member: { maintenance: memberMaint },
      elder: { promotion: elderPromo, maintenance: elderMaint },
      coLeader: { promotion: coLeaderPromo, maintenance: coLeaderMaint }
    }
    setDonationReqs(requirements)
    saveDonationRequirements(requirements)
    setSaveMessage('Saved successfully!')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  // Analyze a member with given player data and requirements
  const analyzeMemberData = (playerData: MemberWarStats, requirements: ReturnType<typeof getRoleRequirements>, war: War | null): MemberAnalysis => {
    const currentRole = playerData.role
    const currentRoleReq = requirements[currentRole as Role]

    // Safety check: if currentRoleReq is undefined (e.g., for leader role), use safe defaults
    if (!currentRoleReq) {
      return {
        ...playerData,
        meetsCurrentRoleDonations: true,
        meetsNextRoleDonations: true,
        donationDeficit: 0,
        recommendation: 'maintain',
        recommendationReason: 'Leader role - no automatic promotion/demotion',
        reasonDetails: 'Leader role - no automatic promotion/demotion',
        warAttacksUsed: 0,
        warAttacksTotal: 0,
      }
    }

    // Check if meets maintenance requirement (to keep current role)
    const meetsCurrentRoleDonations = playerData.donations >= currentRoleReq.maintenance

    // Calculate next role requirements
    // Leader and Co-Leader cannot be promoted (manual decisions only)
    let nextRole: Role | null = null
    if (currentRole === 'member') nextRole = 'admin'
    else if (currentRole === 'admin') nextRole = 'coLeader'
    // Leader and coLeader cannot be auto-promoted

    // Check if meets promotion requirement (to get promoted to next role)
    const meetsNextRoleDonations = nextRole
      ? playerData.donations >= requirements[nextRole].promotion
      : false

    const donationDeficit = currentRoleReq.maintenance - playerData.donations

    // Get war attack usage
    let warAttacksUsed = 0
    let warAttacksTotal = 0
    if (war && war.state !== 'notInWar') {
      // Check both clan and opponent for the member
      const warMemberClan = war.clan?.members?.find(m => m.tag === playerData.tag)
      const warMemberOpponent = war.opponent?.members?.find(m => m.tag === playerData.tag)
      const warMember = warMemberClan || warMemberOpponent

      if (warMember) {
        warAttacksUsed = warMember.attacks?.length || 0
        // Calculate total based on wars participated (stored in member data during aggregation)
        const warsParticipated = (warMember as any).warsParticipated || 1
        warAttacksTotal = (war.attacksPerMember || 2) * warsParticipated
      }
    }

    // Determine recommendation based on donations
    let recommendation: 'promote' | 'maintain' | 'demote' | 'kick'
    let recommendationReason = ''

    if (!meetsCurrentRoleDonations && currentRole !== 'member') {
      recommendation = 'demote'
      recommendationReason = `Below ${currentRoleReq.description} maintenance requirement (need ${currentRoleReq.maintenance}, has ${playerData.donations})`
    } else if (!meetsCurrentRoleDonations && currentRole === 'member') {
      recommendation = 'kick'
      recommendationReason = `Below Member maintenance requirement (need ${currentRoleReq.maintenance}, has ${playerData.donations}) - consider removal`
    } else if (meetsNextRoleDonations && nextRole) {
      recommendation = 'promote'
      recommendationReason = `Meets ${requirements[nextRole].description} promotion requirement with ${playerData.donations} donations`
    } else if (meetsCurrentRoleDonations) {
      recommendation = 'maintain'
      recommendationReason = 'Meeting maintenance requirements'
    } else {
      recommendation = 'maintain'
      recommendationReason = 'Acceptable performance'
    }

    return {
      ...playerData,
      meetsCurrentRoleDonations,
      meetsNextRoleDonations,
      donationDeficit,
      recommendation,
      recommendationReason,
      warAttacksUsed,
      warAttacksTotal,
    }
  }

  // Fetch all CWL war data from current season
  useEffect(() => {
    if (!clan) return

    const fetchWarData = async () => {
      // Use the clan tag from the fetched clan data to ensure accuracy
      const actualClanTag = clan.tag

      try {
        // Try to get CWL group first
        const cwlGroup = await clashApi.getCWLGroup(actualClanTag)

        if (cwlGroup && cwlGroup.state !== 'notInWar') {
          // Fetch ALL completed wars from all rounds that involve our clan
          const allClanWars: War[] = []

          for (let i = 0; i < cwlGroup.rounds.length; i++) {
            const round = cwlGroup.rounds[i]

            if (round.warTags && round.warTags.length > 0) {
              // Find the war tag for our clan in this round
              for (const warTag of round.warTags) {
                if (warTag !== '#0') { // #0 means no war
                  try {
                    const cwlWar = await clashApi.getCWLWar(warTag)

                    // Check if this war involves our clan AND is completed
                    if ((cwlWar.clan?.tag === actualClanTag || cwlWar.opponent?.tag === actualClanTag) && cwlWar.state === 'warEnded') {
                      allClanWars.push(cwlWar)
                      break // Found our war in this round, move to next round
                    } else if (cwlWar.clan?.tag === actualClanTag || cwlWar.opponent?.tag === actualClanTag) {
                      break
                    }
                  } catch (warError) {
                    // War fetch failed, continue
                  }
                }
              }
            }
          }

          // If we have any completed wars, create an aggregated war object with combined attack stats
          if (allClanWars.length > 0) {
            // Use the most recent war as base, but aggregate member attack data
            const aggregatedWar = { ...allClanWars[allClanWars.length - 1] }

            // Determine attacks per war based on CWL group size
            // 8 clans = 1 attack per war, fewer clans = 2 attacks per war
            const attacksPerCWLWar = cwlGroup.clans.length >= 8 ? 1 : 2

            // Create maps to track: attacks used and wars participated per member
            const memberAttacksMap = new Map<string, number>()
            const memberWarsMap = new Map<string, number>()

            // Go through all completed wars and count attacks and participation
            for (const war of allClanWars) {
              const ourClanData = war.clan?.tag === actualClanTag ? war.clan : war.opponent
              if (ourClanData?.members) {
                for (const member of ourClanData.members) {
                  // Count attacks used
                  const currentAttacks = memberAttacksMap.get(member.tag) || 0
                  const warAttacks = member.attacks?.length || 0
                  memberAttacksMap.set(member.tag, currentAttacks + warAttacks)

                  // Count wars participated
                  const currentWars = memberWarsMap.get(member.tag) || 0
                  memberWarsMap.set(member.tag, currentWars + 1)
                }
              }
            }

            // Build a complete member list from ALL wars (to include everyone who participated)
            const allMemberTags = new Set<string>()
            for (const war of allClanWars) {
              const ourClanData = war.clan?.tag === actualClanTag ? war.clan : war.opponent
              if (ourClanData?.members) {
                ourClanData.members.forEach(m => allMemberTags.add(m.tag))
              }
            }

            // Get the most recent member data for each player
            const latestMemberData = new Map<string, any>()
            for (const war of allClanWars) {
              const ourClanData = war.clan?.tag === actualClanTag ? war.clan : war.opponent
              if (ourClanData?.members) {
                ourClanData.members.forEach(m => {
                  latestMemberData.set(m.tag, m)
                })
              }
            }

            // Create aggregated member list with attack stats
            const aggregatedMembers = Array.from(allMemberTags).map(tag => {
              const memberData = latestMemberData.get(tag)
              const attacksUsed = memberAttacksMap.get(tag) || 0
              const warsParticipated = memberWarsMap.get(tag) || 0

              return {
                ...memberData,
                attacks: Array(attacksUsed).fill({}) as any[],
                // Store wars participated for calculating total possible attacks
                warsParticipated
              }
            })

            // Update the aggregated war with the complete member list
            if (aggregatedWar.clan?.tag === actualClanTag) {
              aggregatedWar.clan.members = aggregatedMembers
              aggregatedWar.attacksPerMember = attacksPerCWLWar
            } else if (aggregatedWar.opponent?.tag === actualClanTag) {
              aggregatedWar.opponent.members = aggregatedMembers
              aggregatedWar.attacksPerMember = attacksPerCWLWar
            }

            setCurrentWar(aggregatedWar)
          } else {
            setCurrentWar(null)
          }
        } else {
          // Not in CWL, try regular war
          try {
            const war = await clashApi.getCurrentWar(actualClanTag)
            if (war.state !== 'notInWar') {
              setCurrentWar(war)
            } else {
              setCurrentWar(null)
            }
          } catch (error) {
            setCurrentWar(null)
          }
        }
      } catch (cwlError) {
        // Not in CWL, try regular war
        try {
          const war = await clashApi.getCurrentWar(actualClanTag)
          if (war.state !== 'notInWar') {
            setCurrentWar(war)
          } else {
            setCurrentWar(null)
          }
        } catch (error) {
          setCurrentWar(null)
        }
      }
    }

    fetchWarData()
  }, [clan])

  // Fetch player data only when clan members change
  useEffect(() => {
    if (!clan?.memberList) return

    const fetchPlayerData = async () => {
      setLoading(true)
      try {
        const playerDataPromises = clan.memberList.map(member =>
          clashApi.getPlayer(member.tag).catch(error => {
            console.error(`Error fetching ${member.name}:`, error)
            return null
          })
        )
        const playerData = await Promise.all(playerDataPromises)
        const validPlayerData = playerData.filter((p): p is MemberWarStats => p !== null)
        setPlayerDataCache(validPlayerData)
      } catch (error) {
        console.error('Error fetching player data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [clan?.memberList])

  // Recalculate analyses when donation requirements change (using cached data)
  useEffect(() => {
    if (playerDataCache.length === 0) return

    const analyses = playerDataCache.map(playerData =>
      analyzeMemberData(playerData, ROLE_REQUIREMENTS, currentWar)
    )
    setMemberAnalyses(analyses)
  }, [donationReqs, playerDataCache, currentWar])

  if (clanLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing member performance...</p>
        </div>
      </div>
    )
  }

  // Filter members
  let filteredMembers = memberAnalyses
  if (filterRole !== 'all') {
    filteredMembers = filteredMembers.filter(m => m.role === filterRole)
  }
  if (filterRecommendation !== 'all') {
    filteredMembers = filteredMembers.filter(m => m.recommendation === filterRecommendation)
  }

  // Calculate statistics
  const promotionCandidates = memberAnalyses.filter(m => m.recommendation === 'promote').length
  const demotionCandidates = memberAnalyses.filter(m => m.recommendation === 'demote').length
  const kickMembers = memberAnalyses.filter(m => m.recommendation === 'kick').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promotions & Demotions</h1>
        <p className="text-muted-foreground">Track member performance and role recommendations</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Promotion Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{promotionCandidates}</div>
            <p className="text-xs text-muted-foreground">Members ready for promotion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Demotion Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{demotionCandidates}</div>
            <p className="text-xs text-muted-foreground">Below role requirements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Kick Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{kickMembers}</div>
            <p className="text-xs text-muted-foreground">Below member requirements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Stable Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {memberAnalyses.filter(m => m.recommendation === 'maintain').length}
            </div>
            <p className="text-xs text-muted-foreground">Meeting expectations</p>
          </CardContent>
        </Card>
      </div>

      {/* Role Requirements Reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Role Requirements
              </CardTitle>
              <CardDescription>Donation requirements for each role (per season)</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                  {saveMessage}
                </span>
              )}
              <button
                onClick={handleSaveRequirements}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Requirements
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Member - Shows what member needs to maintain or get promoted to Elder (Left) */}
            <div className="p-4 rounded-lg bg-muted/50 border-2 border-gray-500/30">
              <Badge className="bg-gray-500 mb-3">Member</Badge>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Maintenance</label>
                  <Input
                    type="number"
                    value={memberMaintInput}
                    onChange={(e) => handleMemberMaintChange(e.target.value)}
                    className="text-lg font-bold h-10"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Promotion → Elder</label>
                  <Input
                    type="number"
                    value={elderPromoInput}
                    onChange={(e) => handleElderPromoChange(e.target.value)}
                    className="text-lg font-bold h-10"
                    min="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">donations/season</p>
            </div>

            {/* Elder - Shows what elder needs to maintain or get promoted to Co-Leader (Middle) */}
            <div className="p-4 rounded-lg bg-muted/50 border-2 border-green-500/30">
              <Badge className="bg-green-500 mb-3">Elder</Badge>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Maintenance</label>
                  <Input
                    type="number"
                    value={elderMaintInput}
                    onChange={(e) => handleElderMaintChange(e.target.value)}
                    className="text-lg font-bold h-10"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Promotion → Co-Leader</label>
                  <Input
                    type="number"
                    value={coLeaderPromoInput}
                    onChange={(e) => handleCoLeaderPromoChange(e.target.value)}
                    className="text-lg font-bold h-10"
                    min="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">donations/season</p>
            </div>

            {/* Co-Leader - Only maintenance (no promotion from here) (Right) */}
            <div className="p-4 rounded-lg bg-muted/50 border-2 border-blue-500/30">
              <Badge className="bg-blue-500 mb-3">Co-Leader</Badge>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Maintenance</label>
                  <Input
                    type="number"
                    value={coLeaderMaintInput}
                    onChange={(e) => handleCoLeaderMaintChange(e.target.value)}
                    className="text-lg font-bold h-10"
                    min="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">donations/season</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Each role box shows requirements from that role's perspective.
              Maintenance = donations needed to keep your current role.
              Promotion = donations needed to advance to the next role.
              Leader promotions are manual decisions only.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as Role | 'all')}
                className="px-3 py-2 rounded-md border bg-background"
              >
                <option value="all">All Roles</option>
                <option value="leader">Leader</option>
                <option value="coLeader">Co-Leader</option>
                <option value="admin">Elder</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recommendation</label>
              <select
                value={filterRecommendation}
                onChange={(e) => setFilterRecommendation(e.target.value as any)}
                className="px-3 py-2 rounded-md border bg-background"
              >
                <option value="all">All</option>
                <option value="promote">Promote</option>
                <option value="demote">Demote</option>
                <option value="kick">Kick</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Performance Analysis
          </CardTitle>
          <CardDescription>
            Showing {filteredMembers.length} of {memberAnalyses.length} members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Current Role</th>
                  <th className="text-left p-3 font-medium">Donations</th>
                  <th className="text-left p-3 font-medium">War Attacks</th>
                  <th className="text-left p-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers
                  .sort((a, b) => {
                    // Sort by recommendation priority: kick > demote > promote > maintain
                    const priority = { kick: 0, demote: 1, promote: 2, maintain: 3 }
                    return priority[a.recommendation] - priority[b.recommendation]
                  })
                  .map((member) => {
                    const roleReq = ROLE_REQUIREMENTS[member.role as Role] || {
                      description: member.role || 'Unknown',
                      badge: 'bg-gray-500',
                      color: 'text-gray-500',
                      promotion: 0,
                      maintenance: 0
                    }
                    const recommendationColor =
                      member.recommendation === 'promote' ? 'text-green-500' :
                      member.recommendation === 'demote' ? 'text-orange-500' :
                      member.recommendation === 'kick' ? 'text-red-500' :
                      'text-blue-500'

                    return (
                      <tr key={member.tag} className="border-b hover:bg-accent/50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">TH {member.townHallLevel}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={roleReq.badge}>{roleReq.description}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium">{member.donations.toLocaleString()}</div>
                              {!member.meetsCurrentRoleDonations && member.role !== 'member' && (
                                <div className="text-xs text-red-500">
                                  {member.donationDeficit} below req
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Swords className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">
                              {member.warAttacksTotal > 0 ? `${member.warAttacksUsed}/${member.warAttacksTotal}` : 'No war'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={recommendationColor}>
                            {member.recommendation.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
