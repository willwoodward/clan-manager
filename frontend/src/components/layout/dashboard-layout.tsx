import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  Swords,
  Trophy,
  Settings,
  Moon,
  Sun,
  Shield,
  Medal,
  UserPlus,
  TrendingUp,
  Gamepad2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Wars', href: '/wars', icon: Swords },
  { name: 'CWL', href: '/cwl', icon: Medal },
  { name: 'Capital Raids', href: '/capital-raids', icon: Trophy },
  { name: 'Clan Games', href: '/clan-games', icon: Gamepad2 },
  { name: 'Recruitment', href: '/recruitment', icon: UserPlus },
  { name: 'Promotions', href: '/promotions', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardLayout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Clan Manager</h1>
              <p className="text-xs text-muted-foreground">Clash of Clans</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Theme Toggle */}
          <div className="border-t p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
