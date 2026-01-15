import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Star, Trash2, AlertCircle } from 'lucide-react'
import { ClanSelector } from '@/components/clan-selector'
import { useClanContext } from '@/hooks/use-clan-context'
import { getProxiedImageUrl } from '@/utils/image-proxy'

export function Settings() {
  const {
    currentClan,
    savedClans,
    removeSavedClan,
    monitoredClanTag,
    isMonitored,
  } = useClanContext()

  const normalizeTag = (tag: string) => tag.toUpperCase().replace('#', '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage clans and app configuration</p>
      </div>

      {/* Clan Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Clan Management
          </CardTitle>
          <CardDescription>
            Switch between clans or add new ones to track
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Clan */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Current Clan
            </label>
            <ClanSelector />
            {!isMonitored && currentClan && (
              <div className="flex items-center gap-2 text-xs text-amber-500 mt-2">
                <AlertCircle className="h-3 w-3" />
                <span>Limited features - historical data not available for this clan</span>
              </div>
            )}
          </div>

          {/* Primary (Monitored) Clan Info */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">Primary Clan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your primary clan <Badge variant="outline">{monitoredClanTag}</Badge> has access to all features including war predictions, lineup optimizer, and historical statistics.
            </p>
          </div>

          {/* Saved Clans */}
          {savedClans.length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">
                Saved Clans ({savedClans.length})
              </label>
              <div className="space-y-2">
                {savedClans.map((clan) => {
                  const isClanMonitored = normalizeTag(clan.tag) === normalizeTag(monitoredClanTag)
                  const isCurrentClan = currentClan && normalizeTag(clan.tag) === normalizeTag(currentClan.tag)
                  return (
                    <div
                      key={clan.tag}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCurrentClan ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {clan.badgeUrl && (
                          <img
                            src={getProxiedImageUrl(clan.badgeUrl)}
                            alt=""
                            className="h-8 w-8 rounded"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{clan.name}</span>
                            {isClanMonitored && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{clan.tag}</span>
                            {isClanMonitored ? (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Live data only</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isClanMonitored && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSavedClan(clan.tag)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
