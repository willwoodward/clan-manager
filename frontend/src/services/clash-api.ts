/**
 * BACKWARD COMPATIBILITY LAYER
 *
 * This file provides backward compatibility with the old clash-api.ts interface.
 * It now uses the new unified API client under the hood.
 *
 * For new code, please use: import { coc, analytics } from '@/services/api'
 */

import { coc, clashApi as newClashApi } from './api'
import type { Clan, War } from '@/types/clash'
import type { CapitalRaidSeasons } from '@/types/capital'
import type { CWLGroup, MemberWarStats } from '@/types/cwl'

// Re-export the encode helper
export { encodeTag as encodeClanTag } from './api'

// Check if backend is available (always true now, backend handles fallback)
const hasApiKey = true

// Legacy API interface - proxies to new API
export const clashApi = {
  // Get clan information
  async getClan(clanTag: string): Promise<Clan> {
    console.log('[COMPAT] Using new backend API:', clanTag)
    return await coc.getClan(clanTag)
  },

  // Get current war information
  async getCurrentWar(clanTag: string): Promise<War> {
    console.log('[COMPAT] Using new backend API:', clanTag)
    return await coc.getCurrentWar(clanTag)
  },

  // Get player details
  async getPlayer(playerTag: string): Promise<MemberWarStats> {
    console.log('[COMPAT] Using new backend API:', playerTag)
    return await coc.getPlayer(playerTag)
  },

  // Get war log - NOT YET IMPLEMENTED IN NEW BACKEND
  async getWarLog(clanTag: string): Promise<{ items: War[] }> {
    console.warn('[COMPAT] War log not yet implemented in new backend')
    throw new Error('War log endpoint not yet implemented. Use analytics.getWarHistory() instead.')
  },

  // Get capital raid seasons
  async getCapitalRaidSeasons(clanTag: string, limit: number = 10): Promise<CapitalRaidSeasons> {
    console.log('[COMPAT] Using new backend API for capital raids:', clanTag)
    return await newClashApi.getCapitalRaidSeasons(clanTag, limit)
  },

  // Get CWL group
  async getCWLGroup(clanTag: string): Promise<CWLGroup | null> {
    console.log('[COMPAT] Using new backend API for CWL group:', clanTag)
    return await newClashApi.getCWLGroup(clanTag)
  },

  // Get CWL war by war tag
  async getCWLWar(warTag: string): Promise<War> {
    console.log('[COMPAT] Using new backend API for CWL war:', warTag)
    return await newClashApi.getCWLWar(warTag)
  },

  // Check if using mock data
  isUsingMockData(): boolean {
    return false // Backend handles this now
  },
}

// Mock data is no longer used
export const mockClanData: Clan = {
  tag: '#DEPRECATED',
  name: 'Mock data no longer used',
  type: 'inviteOnly',
  description: 'Backend handles data fetching now',
  location: {
    id: 32000000,
    name: 'International',
    isCountry: false,
  },
  badgeUrls: {
    small: '',
    large: '',
    medium: '',
  },
  clanLevel: 1,
  clanPoints: 0,
  clanVersusPoints: 0,
  clanCapitalPoints: 0,
  requiredTrophies: 0,
  warFrequency: 'unknown',
  warWinStreak: 0,
  warWins: 0,
  warTies: 0,
  warLosses: 0,
  isWarLogPublic: false,
  warLeague: {
    id: 0,
    name: 'Unranked',
  },
  members: 0,
  memberList: [],
  labels: [],
}
