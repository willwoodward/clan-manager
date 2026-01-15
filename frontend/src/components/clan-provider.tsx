import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ClanInfo, ClanType } from '@/types/clan'
import { coc } from '@/services/api'

const STORAGE_KEY = 'clan-manager-clan-selection'
const MONITORED_CLAN_TAG = import.meta.env.VITE_CLAN_TAG || '#29U8UJCU0'

function normalizeTag(tag: string): string {
  return tag.toUpperCase().replace('#', '').replace('%23', '')
}

type ClanProviderProps = {
  children: React.ReactNode
}

type ClanProviderState = {
  currentClan: ClanInfo | null
  savedClans: ClanInfo[]
  monitoredClanTag: string
  setCurrentClan: (clan: ClanInfo) => void
  addSavedClan: (clan: ClanInfo) => void
  removeSavedClan: (tag: string) => void
  isMonitoredClan: () => boolean
  getClanType: (tag: string) => ClanType
}

const initialState: ClanProviderState = {
  currentClan: null,
  savedClans: [],
  monitoredClanTag: MONITORED_CLAN_TAG,
  setCurrentClan: () => null,
  addSavedClan: () => null,
  removeSavedClan: () => null,
  isMonitoredClan: () => true,
  getClanType: () => 'monitored',
}

const ClanProviderContext = createContext<ClanProviderState>(initialState)

interface StoredClanState {
  currentClan: ClanInfo | null
  savedClans: ClanInfo[]
}

export function ClanProvider({ children }: ClanProviderProps) {
  const [currentClan, setCurrentClanState] = useState<ClanInfo | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: StoredClanState = JSON.parse(stored)
        return parsed.currentClan || null
      }
    } catch {
      // Ignore parse errors
    }
    return null
  })

  const [savedClans, setSavedClans] = useState<ClanInfo[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: StoredClanState = JSON.parse(stored)
        return parsed.savedClans || []
      }
    } catch {
      // Ignore parse errors
    }
    return []
  })

  // Sync to localStorage whenever state changes
  useEffect(() => {
    const state: StoredClanState = { currentClan, savedClans }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [currentClan, savedClans])

  // Auto-initialize with monitored clan on first load
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    if (currentClan || savedClans.length > 0) {
      initialized.current = true
      return
    }

    // No saved state - fetch and initialize with monitored clan
    initialized.current = true
    coc.getClan(MONITORED_CLAN_TAG)
      .then((data) => {
        if (data) {
          const clanInfo: ClanInfo = {
            tag: data.tag,
            name: data.name,
            type: 'monitored',
            badgeUrl: data.badgeUrls?.small,
          }
          setCurrentClanState(clanInfo)
          setSavedClans([clanInfo])
        }
      })
      .catch((err) => {
        console.error('Failed to fetch monitored clan:', err)
      })
  }, [currentClan, savedClans])

  const getClanType = useCallback((tag: string): ClanType => {
    return normalizeTag(tag) === normalizeTag(MONITORED_CLAN_TAG)
      ? 'monitored'
      : 'default'
  }, [])

  const isMonitoredClan = useCallback((): boolean => {
    if (!currentClan) return true // Default to monitored behavior
    return normalizeTag(currentClan.tag) === normalizeTag(MONITORED_CLAN_TAG)
  }, [currentClan])

  const setCurrentClan = useCallback((clan: ClanInfo) => {
    // Auto-detect clan type
    const type = getClanType(clan.tag)
    setCurrentClanState({ ...clan, type })
  }, [getClanType])

  const addSavedClan = useCallback((clan: ClanInfo) => {
    setSavedClans((prev) => {
      // Don't add duplicates
      if (prev.find((c) => normalizeTag(c.tag) === normalizeTag(clan.tag))) {
        return prev
      }
      const type = getClanType(clan.tag)
      return [...prev, { ...clan, type }]
    })
  }, [getClanType])

  const removeSavedClan = useCallback((tag: string) => {
    setSavedClans((prev) => prev.filter((c) => normalizeTag(c.tag) !== normalizeTag(tag)))
  }, [])

  const value: ClanProviderState = {
    currentClan,
    savedClans,
    monitoredClanTag: MONITORED_CLAN_TAG,
    setCurrentClan,
    addSavedClan,
    removeSavedClan,
    isMonitoredClan,
    getClanType,
  }

  return (
    <ClanProviderContext.Provider value={value}>
      {children}
    </ClanProviderContext.Provider>
  )
}

export const useClan = () => {
  const context = useContext(ClanProviderContext)

  if (context === undefined) {
    throw new Error('useClan must be used within a ClanProvider')
  }

  return context
}
