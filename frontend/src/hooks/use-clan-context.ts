import { useClan } from '@/components/clan-provider'
import type { HistoricalFeature } from '@/types/clan'

/**
 * Hook that provides the current clan context throughout the app.
 * Returns the current clan tag and whether it's the monitored clan.
 */
export function useClanContext() {
  const {
    currentClan,
    setCurrentClan,
    monitoredClanTag,
    savedClans,
    addSavedClan,
    removeSavedClan,
    isMonitoredClan,
    getClanType,
  } = useClan()

  return {
    currentClan,
    clanTag: currentClan?.tag || monitoredClanTag,
    isMonitored: isMonitoredClan(),
    setCurrentClan,
    savedClans,
    addSavedClan,
    removeSavedClan,
    monitoredClanTag,
    getClanType,
  }
}

/**
 * Hook to check if a specific feature is available for the current clan.
 * Historical features are only available for the monitored clan.
 */
export function useFeatureAvailable(feature: HistoricalFeature): boolean {
  const { isMonitored } = useClanContext()

  // All historical features require monitored clan
  const historicalFeatures: HistoricalFeature[] = [
    'warPredictions',
    'lineupOptimizer',
    'playerStats',
    'warHistory',
    'clanGamesHistory',
    'cwlHistory',
  ]

  if (historicalFeatures.includes(feature)) {
    return isMonitored
  }

  return true
}
