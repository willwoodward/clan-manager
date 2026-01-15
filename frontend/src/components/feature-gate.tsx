import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Star } from 'lucide-react'
import { useFeatureAvailable, useClanContext } from '@/hooks/use-clan-context'
import type { HistoricalFeature } from '@/types/clan'

interface FeatureGateProps {
  feature: HistoricalFeature
  children: ReactNode
  /** Show a placeholder message instead of hiding content */
  showPlaceholder?: boolean
  /** Custom placeholder message */
  placeholderMessage?: string
}

const defaultMessages: Record<HistoricalFeature, string> = {
  warPredictions: 'War predictions require historical attack data',
  lineupOptimizer: 'Lineup optimizer requires historical attack data',
  playerStats: 'Player statistics require historical attack data',
  warHistory: 'War history is only available for your primary clan',
  clanGamesHistory: 'Clan games history is only available for your primary clan',
  cwlHistory: 'CWL history is only available for your primary clan',
}

/**
 * Conditionally renders children based on whether the feature
 * is available for the current clan (monitored vs default).
 */
export function FeatureGate({
  feature,
  children,
  showPlaceholder = true,
  placeholderMessage,
}: FeatureGateProps) {
  const available = useFeatureAvailable(feature)
  const { monitoredClanTag } = useClanContext()

  if (available) {
    return <>{children}</>
  }

  if (!showPlaceholder) {
    return null
  }

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground mb-2">
          {placeholderMessage || defaultMessages[feature]}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-muted-foreground">
            Switch to your primary clan ({monitoredClanTag}) for full features
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Hook-based feature check for conditional rendering in components.
 * Re-exported from use-clan-context for convenience.
 */
export { useFeatureAvailable } from '@/hooks/use-clan-context'
