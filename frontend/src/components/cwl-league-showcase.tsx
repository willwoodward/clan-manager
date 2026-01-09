import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Swords } from 'lucide-react'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import { useState, useRef } from 'react'

interface CWLLeagueShowcaseProps {
  leagueInfo?: {
    name: string
    iconUrls?: {
      small: string
      medium: string
      large?: string
    }
  }
  cwlGroup?: {
    season: string
    state: string
    clans: Array<{
      tag: string
      name: string
      clanLevel: number
    }>
  }
  inCWL: boolean
}

export function CWLLeagueShowcase({ leagueInfo, cwlGroup, inCWL }: CWLLeagueShowcaseProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePosition({ x, y })
  }

  if (!leagueInfo) {
    return (
      <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-500/20">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="font-medium">League information unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine gradient colors based on league
  const getLeagueGradient = (leagueName: string) => {
    if (leagueName.includes('Champion')) return 'from-red-500/20 to-orange-500/20 border-red-500/30'
    if (leagueName.includes('Master')) return 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
    if (leagueName.includes('Crystal')) return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'
    if (leagueName.includes('Gold')) return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30'
    if (leagueName.includes('Silver')) return 'from-gray-400/20 to-slate-500/20 border-gray-400/30'
    if (leagueName.includes('Bronze')) return 'from-orange-700/20 to-amber-700/20 border-orange-700/30'
    return 'from-slate-500/20 to-slate-600/20 border-slate-500/30'
  }

  const gradient = getLeagueGradient(leagueInfo.name)

  return (
    <Card
      ref={cardRef}
      className={`bg-gradient-to-br ${gradient} overflow-hidden relative cursor-default`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Mouse spotlight effect */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
          style={{
            background: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.15), transparent 40%)`,
            opacity: 1,
          }}
        />
      )}

      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
        }} />
      </div>

      <CardContent className="pt-8 pb-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: League Badge */}
          <div className="flex items-center gap-6">
            {leagueInfo.iconUrls && (
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 blur-2xl opacity-60">
                  <img
                    src={getProxiedImageUrl(leagueInfo.iconUrls.medium)}
                    alt=""
                    className="h-32 w-32"
                  />
                </div>
                {/* Actual badge with bounce animation */}
                <img
                  src={getProxiedImageUrl(leagueInfo.iconUrls.medium)}
                  alt={leagueInfo.name}
                  className="h-32 w-32 relative z-10 animate-float"
                  style={{
                    animation: 'float 3s ease-in-out infinite',
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Current League
                </h3>
              </div>
              <p className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                {leagueInfo.name}
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Higher leagues earn more medals per war win
              </p>
            </div>
          </div>

          {/* Right: CWL Status */}
          <div className="flex flex-col gap-3">
            {inCWL && cwlGroup ? (
              <>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-base">
                  <Swords className="h-4 w-4 mr-2" />
                  Active CWL Season
                </Badge>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 text-center border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Season</div>
                    <div className="text-lg font-bold">{cwlGroup.season}</div>
                  </div>

                  <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 text-center border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <div className="text-lg font-bold capitalize">{cwlGroup.state}</div>
                  </div>

                  <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 text-center border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Clans</div>
                    <div className="text-lg font-bold">{cwlGroup.clans.length}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 text-center border border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Not in CWL</div>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Prepare your roster for the next Clan War League season
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Add floating animation keyframes via style tag */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
      `}</style>
    </Card>
  )
}
