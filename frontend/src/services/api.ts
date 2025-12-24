/**
 * Unified API client for Clan Manager backend
 *
 * Replaces the old server.js proxy with direct calls to FastAPI backend.
 * Provides both CoC API proxy (live data) and Analytics API (predictions, stats).
 */

import axios, { AxiosInstance } from 'axios'

// Backend API URL (defaults to localhost for development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instances for different API sections
const cocApi: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/coc`,
  headers: {
    'Accept': 'application/json',
  },
})

const analyticsApi: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/analytics`,
  headers: {
    'Accept': 'application/json',
  },
})

// Helper to encode clan/player tags (remove # and encode)
export function encodeTag(tag: string): string {
  return encodeURIComponent(tag.replace('#', ''))
}

/**
 * CoC API Client - Live data from Clash of Clans API
 * Proxied through our backend to avoid CORS issues
 */
export const coc = {
  /**
   * Get clan information
   */
  async getClan(clanTag: string) {
    const encodedTag = encodeTag(clanTag)
    const response = await cocApi.get(`/clan/${encodedTag}`)
    return response.data
  },

  /**
   * Get clan members
   */
  async getClanMembers(clanTag: string) {
    const encodedTag = encodeTag(clanTag)
    const response = await cocApi.get(`/clan/${encodedTag}/members`)
    return response.data
  },

  /**
   * Get current war status
   */
  async getCurrentWar(clanTag: string) {
    const encodedTag = encodeTag(clanTag)
    const response = await cocApi.get(`/currentwar/${encodedTag}`)
    return response.data
  },

  /**
   * Get player information
   */
  async getPlayer(playerTag: string) {
    const encodedTag = encodeTag(playerTag)
    const response = await cocApi.get(`/player/${encodedTag}`)
    return response.data
  },
}

/**
 * Analytics API Client - Predictions and statistics
 * Based on historical war data
 */
export const analytics = {
  /**
   * Predict player performance for a specific matchup
   */
  async predictPerformance(params: {
    playerTag: string
    defenderTh?: number
    defenderHeroes?: number[]
    defenderTag?: string
  }) {
    const encodedTag = encodeTag(params.playerTag)
    const heroesParam = params.defenderHeroes?.join(',') || ''

    const queryParams: any = {}
    if (params.defenderTag) {
      queryParams.defender_tag = encodeTag(params.defenderTag)
    }
    if (params.defenderTh !== undefined) {
      queryParams.defender_th = params.defenderTh
    }
    if (heroesParam) {
      queryParams.defender_heroes = heroesParam
    }

    const response = await analyticsApi.get(`/predict/${encodedTag}`, {
      params: queryParams,
    })
    return response.data
  },

  /**
   * Get player attack statistics from war history
   */
  async getPlayerStats(playerTag: string) {
    const encodedTag = encodeTag(playerTag)
    const response = await analyticsApi.get(`/stats/player/${encodedTag}`)
    return response.data
  },

  /**
   * Get war history
   */
  async getWarHistory(params?: { limit?: number; offset?: number }) {
    const response = await analyticsApi.get('/wars/history', {
      params: {
        limit: params?.limit || 20,
        offset: params?.offset || 0,
      },
    })
    return response.data
  },

  /**
   * Get TH-level priors (statistics used for predictions)
   */
  async getPriors() {
    const response = await analyticsApi.get('/priors')
    return response.data
  },

  /**
   * Get list of all known players from war history
   */
  async getKnownPlayers() {
    const response = await analyticsApi.get('/players')
    return response.data
  },

  /**
   * Get storage backend information
   */
  async getStorageInfo() {
    const response = await analyticsApi.get('/storage/info')
    return response.data
  },

  /**
   * Generate optimal war strategy
   */
  async generateWarStrategy(params: {
    attackers: Array<{ tag: string; name: string; town_hall: number; heroes?: number[] }>
    defenders: Array<{ tag: string; name: string; town_hall: number; heroes?: number[] }>
    attacks_per_member?: number
    strategy_type?: 'balanced' | 'aggressive' | 'safe'
  }) {
    const response = await analyticsApi.post('/war/strategy', {
      attackers: params.attackers,
      defenders: params.defenders,
      attacks_per_member: params.attacks_per_member || 2,
      strategy_type: params.strategy_type || 'balanced',
    })
    return response.data
  },
}

/**
 * Health check endpoint
 */
export async function checkHealth() {
  const response = await axios.get(`${API_BASE_URL}/health`)
  return response.data
}

/**
 * Legacy compatibility layer
 * Provides the same interface as the old clash-api.ts for backward compatibility
 */
export const clashApi = {
  getClan: coc.getClan,
  getCurrentWar: coc.getCurrentWar,
  getPlayer: coc.getPlayer,

  /**
   * Get capital raid seasons
   */
  async getCapitalRaidSeasons(clanTag: string, limit: number = 10) {
    const encodedTag = encodeTag(clanTag)
    const response = await cocApi.get(`/clan/${encodedTag}/capitalraidseasons`, {
      params: { limit }
    })
    return response.data
  },

  /**
   * Get CWL group information
   */
  async getCWLGroup(clanTag: string) {
    const encodedTag = encodeTag(clanTag)
    const response = await cocApi.get(`/clan/${encodedTag}/currentwar/leaguegroup`)
    return response.data
  },

  /**
   * Get specific CWL war
   */
  async getCWLWar(warTag: string) {
    const encodedTag = encodeURIComponent(warTag.replace('#', ''))
    const response = await cocApi.get(`/clanwarleagues/wars/${encodedTag}`)
    return response.data
  },

  // Note: War log endpoint not implemented - use analytics.getWarHistory() instead
  async getWarLog(clanTag: string) {
    throw new Error('War log endpoint not yet implemented in new backend. Use analytics.getWarHistory() instead.')
  },

  isUsingMockData(): boolean {
    return false // Backend handles this now
  },
}

/**
 * Events API client
 */
const eventsApi = axios.create({
  baseURL: `${API_BASE_URL}/api/events`,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Events API
 */
export const events = {
  /**
   * Get recent clan events
   */
  async getRecentEvents(limit: number = 50, eventType?: string) {
    const params: any = { limit }
    if (eventType) {
      params.event_type = eventType
    }
    const response = await eventsApi.get('/recent', { params })
    return response.data
  },

  /**
   * Log a new event (for testing)
   */
  async logEvent(eventType: string, title: string, description: string, metadata?: any) {
    const response = await eventsApi.post('/log', {
      event_type: eventType,
      title,
      description,
      metadata
    })
    return response.data
  }
}

/**
 * Activity API client
 */
const activityApi = axios.create({
  baseURL: `${API_BASE_URL}/api/activity`,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Activity API
 */
export const activity = {
  /**
   * Get last activity for a specific player
   */
  async getPlayerActivity(playerTag: string) {
    const encodedTag = encodeTag(playerTag)
    const response = await activityApi.get(`/players/${encodedTag}/activity`)
    return response.data
  },

  /**
   * Get activity data for all tracked players
   */
  async getAllActivities() {
    const response = await activityApi.get('/players/activity')
    return response.data
  },

  /**
   * Get players who haven't been active in the specified hours
   */
  async getInactivePlayers(hours: number = 24) {
    const response = await activityApi.get('/players/activity/inactive', {
      params: { hours }
    })
    return response.data
  },

  /**
   * Get daily activity history for a player
   */
  async getPlayerActivityHistory(playerTag: string, days: number = 30) {
    const encodedTag = encodeTag(playerTag)
    const response = await activityApi.get(`/players/${encodedTag}/activity/history`, {
      params: { days }
    })
    return response.data
  }
}

// Export the encode helper for backward compatibility
export { encodeTag as encodeClanTag }

// Export default for convenience
export default {
  coc,
  analytics,
  clashApi,
  checkHealth,
}
