/**
 * War Network Graph Component
 *
 * Interactive visualization showing clan members and opponents with attack connections
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analytics } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Swords, Target, Trophy, TrendingUp, Info, Lightbulb, Loader2 } from 'lucide-react'

interface Member {
  tag: string
  name: string
  townhallLevel: number
  attacks?: Attack[]
}

interface Attack {
  defenderTag: string
  stars: number
  destructionPercentage: number
  order: number
}

interface WarNetworkGraphProps {
  clanMembers: Member[]
  opponentMembers: Member[]
  attacksPerMember?: number
}

interface NodePosition {
  x: number
  y: number
  member: Member
  side: 'clan' | 'opponent'
}

export function WarNetworkGraph({
  clanMembers,
  opponentMembers,
  attacksPerMember = 2
}: WarNetworkGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [showPredictions, setShowPredictions] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  // Fetch war strategy predictions (for "Show Predictions" button)
  const { data: strategy, isLoading: strategyLoading } = useQuery({
    queryKey: ['warStrategy', showPredictions],
    queryFn: async () => {
      if (!showPredictions) return null
      return analytics.generateWarStrategy({
        attackers: clanMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        defenders: opponentMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        attacks_per_member: attacksPerMember,
        strategy_type: 'balanced'
      })
    },
    enabled: showPredictions,
  })

  // Fetch predictions for selected player (for ALL possible targets)
  const { data: playerPredictions, isLoading: playerPredictionsLoading } = useQuery({
    queryKey: ['playerPredictions', selectedPlayer],
    queryFn: async () => {
      if (!selectedPlayer) return null
      const selectedMember = clanMembers.find(m => m.tag === selectedPlayer)
      if (!selectedMember) return null

      return analytics.generateWarStrategy({
        attackers: [selectedMember].map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        defenders: opponentMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          town_hall: m.townhallLevel,
          heroes: []
        })),
        attacks_per_member: opponentMembers.length, // Request predictions for ALL opponents
        strategy_type: 'balanced'
      })
    },
    enabled: !!selectedPlayer,
  })

  const width = 1000
  const height = 600
  const nodeRadius = 25
  const leftX = 100
  const rightX = width - 100

  // Calculate node positions
  const clanNodes = useMemo(() => {
    const spacing = Math.min(height / (clanMembers.length + 1), 80)
    const startY = (height - (clanMembers.length - 1) * spacing) / 2

    return clanMembers.map((member, i) => ({
      x: leftX,
      y: startY + i * spacing,
      member,
      side: 'clan' as const
    }))
  }, [clanMembers, height])

  const opponentNodes = useMemo(() => {
    const spacing = Math.min(height / (opponentMembers.length + 1), 80)
    const startY = (height - (opponentMembers.length - 1) * spacing) / 2

    return opponentMembers.map((member, i) => ({
      x: rightX,
      y: startY + i * spacing,
      member,
      side: 'opponent' as const
    }))
  }, [opponentMembers, height])

  // Build attack connections (actual + predictions)
  const edges = useMemo(() => {
    const connections: Array<{
      from: NodePosition
      to: NodePosition
      stars: number
      destruction: number
      order: number
      isPrediction: boolean
      expectedStars?: number
      isSelectedPlayerPrediction?: boolean
    }> = []

    // Add actual attacks
    clanNodes.forEach(clanNode => {
      clanNode.member.attacks?.forEach(attack => {
        const targetNode = opponentNodes.find(n => n.member.tag === attack.defenderTag)
        if (targetNode) {
          connections.push({
            from: clanNode,
            to: targetNode,
            stars: attack.stars,
            destruction: attack.destructionPercentage,
            order: attack.order,
            isPrediction: false
          })
        }
      })
    })

    // Add predictions for selected player (takes priority)
    if (selectedPlayer && playerPredictions?.suggestions) {
      playerPredictions.suggestions.forEach((suggestion: any) => {
        const fromNode = clanNodes.find(n => n.member.tag === suggestion.attacker_tag)
        const toNode = opponentNodes.find(n => n.member.tag === suggestion.defender_tag)

        if (fromNode && toNode) {
          // Check if this attack already happened
          const alreadyAttacked = connections.some(
            c => !c.isPrediction &&
            c.from.member.tag === suggestion.attacker_tag &&
            c.to.member.tag === suggestion.defender_tag
          )

          if (!alreadyAttacked) {
            connections.push({
              from: fromNode,
              to: toNode,
              stars: Math.round(suggestion.expected_stars),
              destruction: suggestion.expected_destruction,
              order: suggestion.priority,
              isPrediction: true,
              expectedStars: suggestion.expected_stars,
              isSelectedPlayerPrediction: true
            })
          }
        }
      })
    }

    // Add general predictions if enabled (and no selected player)
    if (showPredictions && strategy?.suggestions && !selectedPlayer) {
      strategy.suggestions.forEach((suggestion: any, index: number) => {
        const fromNode = clanNodes.find(n => n.member.tag === suggestion.attacker_tag)
        const toNode = opponentNodes.find(n => n.member.tag === suggestion.defender_tag)

        if (fromNode && toNode) {
          // Check if this attack already happened
          const alreadyAttacked = connections.some(
            c => !c.isPrediction &&
            c.from.member.tag === suggestion.attacker_tag &&
            c.to.member.tag === suggestion.defender_tag
          )

          if (!alreadyAttacked) {
            connections.push({
              from: fromNode,
              to: toNode,
              stars: Math.round(suggestion.expected_stars),
              destruction: suggestion.expected_destruction,
              order: suggestion.priority,
              isPrediction: true,
              expectedStars: suggestion.expected_stars
            })
          }
        }
      })
    }

    return connections.sort((a, b) => {
      // Actual attacks first, then predictions
      if (a.isPrediction !== b.isPrediction) return a.isPrediction ? 1 : -1
      return a.order - b.order
    })
  }, [clanNodes, opponentNodes, showPredictions, strategy, selectedPlayer, playerPredictions])

  // Calculate stats
  const stats = useMemo(() => {
    const clanAttacksUsed = clanMembers.reduce((sum, m) => sum + (m.attacks?.length || 0), 0)
    const totalPossibleAttacks = clanMembers.length * attacksPerMember
    const totalStars = edges.reduce((sum, e) => sum + e.stars, 0)
    const avgDestruction = edges.length > 0
      ? edges.reduce((sum, e) => sum + e.destruction, 0) / edges.length
      : 0

    return {
      attacksUsed: clanAttacksUsed,
      totalAttacks: totalPossibleAttacks,
      totalStars,
      avgDestruction,
      participation: (clanAttacksUsed / totalPossibleAttacks) * 100
    }
  }, [clanMembers, edges, attacksPerMember])

  // Check if node or edge should be highlighted/dimmed
  const isNodeHighlighted = (nodeTag: string) => {
    // If a player is selected, only highlight that player and their targets
    if (selectedPlayer) {
      if (nodeTag === selectedPlayer) return true
      // Check if this opponent is being targeted by selected player predictions
      const isTargeted = edges.some(e =>
        e.isSelectedPlayerPrediction &&
        e.from.member.tag === selectedPlayer &&
        e.to.member.tag === nodeTag
      )
      return isTargeted
    }
    if (!hoveredNode && !hoveredEdge) return true
    if (hoveredNode === nodeTag) return true
    if (hoveredEdge) {
      const [fromTag, toTag] = hoveredEdge.split('->')
      return nodeTag === fromTag || nodeTag === toTag
    }
    return false
  }

  const isEdgeHighlighted = (edge: { from: NodePosition; to: NodePosition; isPrediction: boolean; isSelectedPlayerPrediction?: boolean }) => {
    // If a player is selected, only highlight their prediction edges and actual attacks
    if (selectedPlayer) {
      return edge.isSelectedPlayerPrediction || (!edge.isPrediction && edge.from.member.tag === selectedPlayer)
    }
    if (!hoveredNode && !hoveredEdge) return true
    const edgeId = `${edge.from.member.tag}->${edge.to.member.tag}`
    if (hoveredEdge === edgeId) return true
    if (hoveredNode) {
      return edge.from.member.tag === hoveredNode || edge.to.member.tag === hoveredNode
    }
    return false
  }

  // Handle clan member click to show their predictions
  const handleClanNodeClick = (memberTag: string) => {
    if (selectedPlayer === memberTag) {
      // Clicking the same player again deselects them
      setSelectedPlayer(null)
    } else {
      setSelectedPlayer(memberTag)
    }
  }

  const getEdgeColor = (stars: number) => {
    if (stars === 3) return '#22c55e' // green
    if (stars === 2) return '#eab308' // yellow
    if (stars === 1) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getNodeColor = (member: Member, side: 'clan' | 'opponent') => {
    const th = member.townhallLevel
    // Color based on TH level
    if (th >= 16) return side === 'clan' ? '#8b5cf6' : '#a855f7'
    if (th >= 14) return side === 'clan' ? '#3b82f6' : '#60a5fa'
    if (th >= 12) return side === 'clan' ? '#10b981' : '#34d399'
    if (th >= 10) return side === 'clan' ? '#f59e0b' : '#fbbf24'
    return side === 'clan' ? '#6b7280' : '#9ca3af'
  }

  const getTHLabel = (th: number) => {
    if (th >= 16) return 'TH16+'
    if (th >= 14) return 'TH14-15'
    if (th >= 12) return 'TH12-13'
    if (th >= 10) return 'TH10-11'
    return 'TH<10'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              War Attack Network
            </CardTitle>
            <CardDescription>
              Interactive visualization of attacks during war - hover to explore, click clan members to see all possible predictions
            </CardDescription>
          </div>
          <Button
            variant={showPredictions ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPredictions(!showPredictions)}
            disabled={strategyLoading}
          >
            {strategyLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                {showPredictions ? 'Hide' : 'Show'} Predictions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-accent/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.attacksUsed}/{stats.totalAttacks}</div>
            <div className="text-xs text-muted-foreground">Attacks Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.totalStars}</div>
            <div className="text-xs text-muted-foreground">Total Stars</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.avgDestruction.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Avg Destruction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.participation.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Participation</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Hover to highlight | Click clan members to see predictions</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>3 Stars</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>2 Stars</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>1 Star</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>0 Stars</span>
          </div>
          {showPredictions && !selectedPlayer && (
            <div className="flex items-center gap-1">
              <svg width="20" height="12" className="inline">
                <line x1="0" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
              <span>Strategy Predictions</span>
            </div>
          )}
          {selectedPlayer && (
            <>
              <div className="flex items-center gap-1">
                <svg width="20" height="12" className="inline">
                  <line x1="0" y1="6" x2="20" y2="6" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5" />
                </svg>
                <span>Player Predictions</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500" />
                <span>Selected Player</span>
              </div>
            </>
          )}
        </div>

        {/* SVG Graph */}
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="border rounded-lg bg-background w-full px-48"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Draw edges */}
            {edges.map((edge, i) => {
              const edgeId = `${edge.from.member.tag}->${edge.to.member.tag}`
              const isHighlighted = isEdgeHighlighted(edge)
              const opacity = isHighlighted ? 0.8 : 0.1
              // Use grey for selected player predictions, otherwise use star-based color
              const edgeColor = edge.isSelectedPlayerPrediction ? '#9ca3af' : getEdgeColor(edge.stars)
              const midX = (edge.from.x + edge.to.x) / 2
              const midY = (edge.from.y + edge.to.y) / 2

              return (
                <g key={i}>
                  <line
                    x1={edge.from.x + nodeRadius}
                    y1={edge.from.y}
                    x2={edge.to.x - nodeRadius}
                    y2={edge.to.y}
                    stroke={edgeColor}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeDasharray={edge.isPrediction ? "5,5" : "none"}
                    opacity={opacity}
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(edgeId)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />

                  {/* Labels for selected player predictions (always visible) */}
                  {edge.isSelectedPlayerPrediction && isHighlighted && (
                    <g>
                      <rect
                        x={midX - 45}
                        y={midY - 12}
                        width={90}
                        height={20}
                        className="fill-background/90 stroke-border"
                        strokeWidth={1}
                        rx={3}
                      />
                      <text
                        x={midX}
                        y={midY + 3}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-foreground"
                      >
                        {edge.expectedStars?.toFixed(2)} ⭐ | {edge.destruction.toFixed(0)}%
                      </text>
                    </g>
                  )}

                  {/* Tooltip on hover (for non-selected predictions and actual attacks) */}
                  {hoveredEdge === edgeId && !edge.isSelectedPlayerPrediction && (
                    <g>
                      <rect
                        x={midX - 70}
                        y={midY - 35}
                        width={140}
                        height={edge.isPrediction ? 60 : 60}
                        className="fill-background stroke-border shadow-lg"
                        strokeWidth={1}
                        rx={4}
                      />
                      <text
                        x={midX}
                        y={midY - 15}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-foreground"
                      >
                        {edge.isPrediction ? `~${edge.expectedStars?.toFixed(2)}` : edge.stars} ⭐ | {edge.destruction.toFixed(1)}%
                      </text>
                      <text
                        x={midX}
                        y={midY + 5}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground"
                      >
                        {edge.isPrediction ? 'Predicted' : `Attack #${edge.order}`}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Draw clan nodes (left side) */}
            {clanNodes.map((node) => {
              const isHighlighted = isNodeHighlighted(node.member.tag)
              const opacity = isHighlighted ? 1 : 0.3
              const attackCount = node.member.attacks?.length || 0
              const hasAttacked = attackCount > 0
              const isSelected = selectedPlayer === node.member.tag

              return (
                <g
                  key={node.member.tag}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNode(node.member.tag)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleClanNodeClick(node.member.tag)}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeRadius + 6}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      className="animate-pulse"
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius}
                    fill={getNodeColor(node.member, 'clan')}
                    opacity={opacity}
                    stroke={isSelected ? '#3b82f6' : hasAttacked ? '#22c55e' : '#ef4444'}
                    strokeWidth={isSelected ? 4 : hasAttacked ? 3 : 2}
                  />

                  {/* TH level */}
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    className="text-sm font-bold fill-white pointer-events-none"
                  >
                    {node.member.townhallLevel}
                  </text>

                  {/* Attack count badge */}
                  {hasAttacked && (
                    <circle
                      cx={node.x + nodeRadius - 5}
                      cy={node.y - nodeRadius + 5}
                      r={10}
                      fill="#22c55e"
                      opacity={opacity}
                    />
                  )}
                  {hasAttacked && (
                    <text
                      x={node.x + nodeRadius - 5}
                      y={node.y - nodeRadius + 9}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none"
                    >
                      {attackCount}
                    </text>
                  )}

                  {/* Name label */}
                  <text
                    x={node.x - nodeRadius - 5}
                    y={node.y + 5}
                    textAnchor="end"
                    className="text-sm fill-current pointer-events-none"
                    opacity={opacity}
                  >
                    {node.member.name.length > 15 ? node.member.name.substring(0, 12) + '...' : node.member.name}
                  </text>

                  {/* Tooltip */}
                  {hoveredNode === node.member.tag && (
                    <g>
                      <rect
                        x={node.x - 80}
                        y={node.y - nodeRadius - 70}
                        width={160}
                        height={60}
                        className="fill-background stroke-border shadow-lg"
                        strokeWidth={1}
                        rx={4}
                      />
                      <text
                        x={node.x}
                        y={node.y - nodeRadius - 45}
                        textAnchor="middle"
                        className="text-sm font-semibold fill-foreground"
                      >
                        {node.member.name}
                      </text>
                      <text
                        x={node.x}
                        y={node.y - nodeRadius - 25}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground"
                      >
                        TH{node.member.townhallLevel} | {attackCount}/{attacksPerMember} attacks
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Draw opponent nodes (right side) */}
            {opponentNodes.map((node) => {
              const isHighlighted = isNodeHighlighted(node.member.tag)
              const opacity = isHighlighted ? 1 : 0.3
              const attacksReceived = edges.filter(e => e.to.member.tag === node.member.tag).length

              return (
                <g
                  key={node.member.tag}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNode(node.member.tag)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius}
                    fill={getNodeColor(node.member, 'opponent')}
                    opacity={opacity}
                    stroke={attacksReceived > 0 ? '#f59e0b' : '#6b7280'}
                    strokeWidth={2}
                  />

                  {/* TH level */}
                  <text
                    x={node.x}
                    y={node.y + 5}
                    textAnchor="middle"
                    className="text-sm font-bold fill-white pointer-events-none"
                  >
                    {node.member.townhallLevel}
                  </text>

                  {/* Attack count badge */}
                  {attacksReceived > 0 && (
                    <circle
                      cx={node.x - nodeRadius + 5}
                      cy={node.y - nodeRadius + 5}
                      r={10}
                      fill="#f59e0b"
                      opacity={opacity}
                    />
                  )}
                  {attacksReceived > 0 && (
                    <text
                      x={node.x - nodeRadius + 5}
                      y={node.y - nodeRadius + 9}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none"
                    >
                      {attacksReceived}
                    </text>
                  )}

                  {/* Name label */}
                  <text
                    x={node.x + nodeRadius + 5}
                    y={node.y + 5}
                    textAnchor="start"
                    className="text-sm fill-current pointer-events-none"
                    opacity={opacity}
                  >
                    {node.member.name.length > 15 ? node.member.name.substring(0, 12) + '...' : node.member.name}
                  </text>

                  {/* Tooltip */}
                  {hoveredNode === node.member.tag && (
                    <g>
                      <rect
                        x={node.x - 80}
                        y={node.y - nodeRadius - 70}
                        width={160}
                        height={60}
                        className="fill-background stroke-border shadow-lg"
                        strokeWidth={1}
                        rx={4}
                      />
                      <text
                        x={node.x}
                        y={node.y - nodeRadius - 45}
                        textAnchor="middle"
                        className="text-sm font-semibold fill-foreground"
                      >
                        {node.member.name}
                      </text>
                      <text
                        x={node.x}
                        y={node.y - nodeRadius - 25}
                        textAnchor="middle"
                        className="text-xs fill-muted-foreground"
                      >
                        TH{node.member.townhallLevel} | {attacksReceived} attacks received
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Side labels */}
            <text
              x={leftX}
              y={30}
              textAnchor="middle"
              className="text-lg font-bold fill-primary"
            >
              Our Clan
            </text>
            <text
              x={rightX}
              y={30}
              textAnchor="middle"
              className="text-lg font-bold fill-destructive"
            >
              Opponents
            </text>
          </svg>
        </div>

        {/* Helper text */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <p><strong>Circle colors</strong> represent Town Hall levels. <strong>Green borders</strong> on our clan show members who have attacked.
          <strong>Numbers in circles</strong> show attack counts. <strong>Line colors</strong> indicate stars earned (green=3★, yellow=2★, orange=1★, red=0★).</p>
          <p className="mt-2"><strong>Click any clan member</strong> to see AI predictions for all bases they haven't attacked yet.
          Grey dashed lines show predictions with expected stars and destruction percentage displayed above each line. Click again to deselect.</p>
        </div>
      </CardContent>
    </Card>
  )
}
