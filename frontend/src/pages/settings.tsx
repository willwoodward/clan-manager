import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, RefreshCw, Key, Shield } from 'lucide-react'

export function Settings() {
  const [clanTag, setClanTag] = useState('#2PP')
  const [apiKey, setApiKey] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)

  const handleSave = () => {
    // Save settings logic
    console.log('Settings saved:', { clanTag, autoRefresh, refreshInterval })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your clan manager configuration</p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Clash of Clans API key and clan tag
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              Clash of Clans API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your API key from{' '}
              <a
                href="https://developer.clashofclans.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                developer.clashofclans.com
              </a>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Clan Tag</label>
            <input
              type="text"
              value={clanTag}
              onChange={(e) => setClanTag(e.target.value)}
              placeholder="#2PP"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your clan tag (with or without the # symbol)
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">API Status</p>
              <p className="text-xs text-muted-foreground">
                Using mock data - Configure API key to fetch live data
              </p>
            </div>
            <Badge variant="outline">Mock Mode</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Refresh Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Refresh
          </CardTitle>
          <CardDescription>Control how often data is refreshed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto Refresh</p>
              <p className="text-sm text-muted-foreground">
                Automatically refresh clan data
              </p>
            </div>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {autoRefresh && (
            <div>
              <label className="text-sm font-medium block mb-2">
                Refresh Interval (minutes)
              </label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                min="1"
                max="60"
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Data will refresh every {refreshInterval} minute{refreshInterval !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-medium">React + TypeScript</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">UI Components</span>
            <span className="font-medium">shadcn/ui</span>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
