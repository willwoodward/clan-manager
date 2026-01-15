import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Star, Search, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useClanContext } from '@/hooks/use-clan-context'
import { coc } from '@/services/api'
import { getProxiedImageUrl } from '@/utils/image-proxy'
import type { ClanInfo } from '@/types/clan'

export function ClanSelector() {
  const {
    currentClan,
    setCurrentClan,
    savedClans,
    addSavedClan,
    monitoredClanTag,
    getClanType,
  } = useClanContext()

  const [addClanOpen, setAddClanOpen] = useState(false)
  const [searchTag, setSearchTag] = useState('')
  const [searchError, setSearchError] = useState('')

  // Query for searching a new clan
  const {
    data: searchResult,
    isLoading: searching,
    refetch: searchClan,
    isError: searchHasError,
  } = useQuery({
    queryKey: ['searchClan', searchTag],
    queryFn: () => coc.getClan(searchTag),
    enabled: false,
    retry: false,
  })

  const handleSearch = async () => {
    if (!searchTag.trim()) return
    setSearchError('')
    try {
      const result = await searchClan()
      if (!result.data) {
        setSearchError('Clan not found. Check the tag and try again.')
      }
    } catch {
      setSearchError('Clan not found. Check the tag and try again.')
    }
  }

  const handleAddClan = () => {
    if (searchResult) {
      const clanInfo: ClanInfo = {
        tag: searchResult.tag,
        name: searchResult.name,
        type: getClanType(searchResult.tag),
        badgeUrl: searchResult.badgeUrls?.small,
      }
      addSavedClan(clanInfo)
      setCurrentClan(clanInfo)
      setAddClanOpen(false)
      setSearchTag('')
    }
  }

  const handleSelectClan = (clanTag: string) => {
    if (clanTag === '__add_clan__') {
      setAddClanOpen(true)
      return
    }

    const clan = savedClans.find((c) => c.tag === clanTag)
    if (clan) {
      setCurrentClan(clan)
    }
  }

  const normalizedMonitoredTag = monitoredClanTag.toUpperCase().replace('#', '')

  return (
    <>
      <Select
        value={currentClan?.tag || ''}
        onValueChange={handleSelectClan}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a clan">
            {currentClan && (
              <div className="flex items-center gap-2">
                {currentClan.badgeUrl && (
                  <img
                    src={getProxiedImageUrl(currentClan.badgeUrl)}
                    alt=""
                    className="h-5 w-5 rounded"
                  />
                )}
                <span className="truncate">{currentClan.name}</span>
                {currentClan.type === 'monitored' && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {savedClans.map((clan) => {
            const isMonitored =
              clan.tag.toUpperCase().replace('#', '') === normalizedMonitoredTag
            return (
              <SelectItem key={clan.tag} value={clan.tag}>
                <div className="flex items-center gap-2">
                  {clan.badgeUrl && (
                    <img
                      src={getProxiedImageUrl(clan.badgeUrl)}
                      alt=""
                      className="h-4 w-4 rounded"
                    />
                  )}
                  <span className="truncate">{clan.name}</span>
                  {isMonitored && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </SelectItem>
            )
          })}
          <SelectItem value="__add_clan__">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span>Add Clan</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Add Clan Dialog */}
      <Dialog open={addClanOpen} onOpenChange={setAddClanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Clan</DialogTitle>
            <DialogDescription>
              Enter a clan tag to view any clan. Note: Only your primary clan (
              {monitoredClanTag}) has access to historical data features like
              predictions and analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter clan tag (e.g., #2PP)"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {(searchError || searchHasError) && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>{searchError || 'Clan not found. Check the tag and try again.'}</span>
              </div>
            )}

            {searchResult && !searchError && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  {searchResult.badgeUrls?.small && (
                    <img
                      src={getProxiedImageUrl(searchResult.badgeUrls.small)}
                      alt=""
                      className="h-12 w-12 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{searchResult.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {searchResult.tag} | {searchResult.members} members | Level{' '}
                      {searchResult.clanLevel}
                    </div>
                  </div>
                  <Button onClick={handleAddClan} className="flex-shrink-0">
                    Add & Switch
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
