export interface CWLGroup {
  state: 'preparation' | 'inWar' | 'ended' | 'notInWar'
  season: string
  clans: Array<{
    tag: string
    name: string
    clanLevel: number
    badgeUrls: {
      small: string
      large: string
      medium: string
    }
    members: Array<{
      tag: string
      name: string
      townHallLevel: number
    }>
  }>
  rounds: Array<{
    warTags: string[]
  }>
}

export interface MemberWarStats {
  tag: string
  name: string
  townHallLevel: number
  expLevel: number
  trophies: number
  warStars: number
  attackWins: number
  defenseWins: number
  warPreference: 'in' | 'out'
  leagueTier?: {
    id: number
    name: string
  }
  donations: number
  donationsReceived: number
  role: 'leader' | 'coLeader' | 'admin' | 'member'
}
