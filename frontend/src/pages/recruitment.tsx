import { useQuery } from '@tanstack/react-query'
import { clashApi } from '@/services/clash-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserPlus, TrendingUp, AlertCircle, Trophy, Activity, Target } from 'lucide-react'
import { THDistributionChart } from '@/components/th-distribution-chart'
import { TrophyLeagueColumnChart } from '@/components/trophy-league-column-chart'
import { getTHCounts, compareClanToLeague, getTop15Members } from '@/data/cwl-distributions'

export function Recruitment() {
  const clanTag = import.meta.env.VITE_CLAN_TAG || '#2PP'

  const { data: clan, isLoading: clanLoading } = useQuery({
    queryKey: ['clan', clanTag],
    queryFn: () => clashApi.getClan(clanTag),
  })

  if (clanLoading || !clan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recruitment data...</p>
        </div>
      </div>
    )
  }

  // Calculate activity metrics
  const avgDonations = clan.memberList.reduce((sum, m) => sum + m.donations, 0) / clan.memberList.length
  const avgTrophies = clan.memberList.reduce((sum, m) => sum + m.trophies, 0) / clan.memberList.length
  const avgTH = clan.memberList.reduce((sum, m) => sum + m.townHallLevel, 0) / clan.memberList.length

  // Analyze what TH levels to recruit based on CWL comparison (top 15 for 15v15)
  const top15 = getTop15Members(clan.memberList)
  const thCounts = getTHCounts(top15)
  const cwlComparison = clan.warLeague ? compareClanToLeague(thCounts, clan.warLeague.name) : []

  // Find TH levels where we're below average, considering surplus at higher levels
  // If you have extra high TH players, you don't need as many lower ones
  const weakTHLevels = cwlComparison
    .map((th, index) => {
      // Calculate cumulative surplus from higher TH levels
      const higherTHSurplus = cwlComparison
        .slice(0, index) // All TH levels higher than current
        .reduce((sum, higher) => sum + Math.max(0, higher.difference), 0)

      // Adjusted deficit: actual deficit minus what higher TH surplus can cover
      const adjustedDeficit = th.difference + higherTHSurplus

      return {
        ...th,
        adjustedDeficit,
        higherTHSurplus
      }
    })
    .filter(th =>
      // Only flag as weak if:
      // 1. Still below average after considering higher TH surplus
      // 2. The league average expects at least 0.5 of this TH level
      // 3. The adjusted deficit is significant (< -0.3)
      th.adjustedDeficit < -0.3 && th.avgCount >= 0.5
    )
    .sort((a, b) => a.adjustedDeficit - b.adjustedDeficit)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recruitment</h1>
        <p className="text-muted-foreground">Strategic recruitment guidance based on clan analytics</p>
      </div>

      {/* Recruitment Status */}
      <Card className="border-blue-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-500" />
                Recruitment Status
              </CardTitle>
              <CardDescription>Current clan capacity and openings</CardDescription>
            </div>
            {clan.members < 50 ? (
              <Badge variant="default" className="bg-green-500">
                {50 - clan.members} Open Spots
              </Badge>
            ) : (
              <Badge variant="secondary">Full Capacity</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Current Members</div>
              <div className="text-3xl font-bold">{clan.members}/50</div>
              <div className="mt-2 bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(clan.members / 50) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Town Hall</div>
              <div className="text-3xl font-bold">TH {avgTH.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">Target: Higher TH players</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Trophies</div>
              <div className="text-3xl font-bold">{Math.round(avgTrophies).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Clan requirement: {clan.requiredTrophies}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Recruitment Targets */}
      {weakTHLevels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Priority Recruitment Targets
            </CardTitle>
            <CardDescription>
              TH levels where your clan is below the {clan.warLeague?.name} average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weakTHLevels.map((th, index) => (
                <div
                  key={th.thLevel}
                  className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/50"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {th.thLevel}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        Priority #{index + 1} - Need more {th.thLevel} players
                      </div>
                      <div className="text-sm text-muted-foreground">
                        You have {th.yourCount}, league avg is {th.avgCount.toFixed(1)} ({th.difference.toFixed(1)} below)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-orange-500">
                      Recruit {Math.ceil(Math.abs(th.difference))}+ players
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TH Distribution Comparison */}
      {clan.warLeague && (
        <THDistributionChart
          members={clan.memberList}
          leagueName={clan.warLeague.name}
        />
      )}

      {/* Trophy League Distribution */}
      <TrophyLeagueColumnChart
        members={clan.memberList}
        showGlobalRank={false}
        // To enable rankings, implement these API endpoints in clash-api.ts:
        // - Global: GET /locations/global/rankings/clans
        // - Local: GET /locations/{locationId}/rankings/clans
        // Then pass the rank values here:
        // globalRank={clanGlobalRank}
        // localRank={clanLocalRank}
        location={clan.location?.name}
        clanRequiredTrophies={clan.requiredTrophies}
        clanTotalTrophies={clan.clanPoints}
        minRequiredLeague="Archer 8"
      />

      {/* Activity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Clan Activity Benchmarks
          </CardTitle>
          <CardDescription>Use these metrics when evaluating potential recruits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Donations</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(avgDonations)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clan average per season
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Trophies</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(avgTrophies).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clan average trophies
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Experience</span>
              </div>
              <div className="text-2xl font-bold">
                {Math.round(clan.memberList.reduce((sum, m) => sum + m.expLevel, 0) / clan.members)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg experience level
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-500">Ideal Recruit Profile</div>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Town Hall level in your weak areas (see Priority Targets above)</li>
                    <li>• Donations: {Math.round(avgDonations * 0.8)}+ per season (80% of clan avg)</li>
                    <li>• Trophies: {Math.round(avgTrophies * 0.9)}+ (90% of clan avg or higher)</li>
                    <li>• War preference: Opted IN</li>
                    <li>• Active in last 7 days</li>
                    <li>• War stars: High participation rate</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-500">Recruitment Strategy Tips</div>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Focus on filling gaps in your TH distribution first</li>
                    <li>• Prioritize active war participants over trophy pushers</li>
                    <li>• Look for players with good donation ratios</li>
                    <li>• Check their clan history - frequent clan hoppers may not stay long</li>
                    <li>• Consider trial periods for new recruits before promoting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
