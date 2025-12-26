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
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { useState, useEffect } from 'react'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const menuButton = document.getElementById('menu-button')

      if (
        sidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        menuButton &&
        !menuButton.contains(event.target as Node)
      ) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
        <Button
          id="menu-button"
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold">Clan Manager</h1>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo - hidden on mobile (shown in header instead) */}
          <div className="hidden h-16 items-center gap-2 border-b px-6 lg:flex">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Clan Manager</h1>
              <p className="text-xs text-muted-foreground">Clash of Clans</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 pt-20 lg:pt-4">
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
      <div className="pt-16 lg:pl-64 lg:pt-0">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
