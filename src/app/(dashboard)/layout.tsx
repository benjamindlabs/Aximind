'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  DollarSign,
  CheckSquare,
  Activity,
  Bot,
  Settings,
  LogOut,
  Sparkles,
  User as UserIcon,
  Zap,
  BarChart3,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiChatWidget } from '@/components/ai-chat-widget'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Leads', href: '/leads', icon: Target },
  { name: 'Deals', href: '/deals', icon: DollarSign },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Activities', href: '/activities', icon: Activity },
  { name: 'Automations', href: '/automations', icon: Zap },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const hasSetupWorkspace = React.useRef(false)

  React.useEffect(() => {
    const supabase = createClient()
    
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user)
      } catch (err: any) {
        console.error('Error fetching user:', err?.message || 'Unknown error')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Setup workspace silently once per session
  React.useEffect(() => {
    if (user && !hasSetupWorkspace.current) {
      hasSetupWorkspace.current = true
      fetch('/api/user/setup-workspace').catch(err => {
        console.error('Silent workspace setup error:', err)
      })
    }
  }, [user])

  // Close sidebar when pathname changes (mobile navigation)
  React.useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err: any) {
      console.error('Error logging out:', err?.message || 'Unknown error')
    }
  }

  // Get user initials for the avatar
  const getInitials = () => {
    if (!user) return 'U'
    const name = user.user_metadata?.full_name || user.email || ''
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const getUserName = () => {
    if (!user) return 'User'
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  }

  const getUserEmail = () => {
    if (!user) return ''
    return user.email || ''
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800/60 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-wider uppercase">
            AXI<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">MIND</span>
          </span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed 240px */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-60 bg-zinc-900 border-r border-zinc-800/60 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Top Header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-800/40">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-wider uppercase">
                AXI<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">MIND</span>
              </span>
            </div>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 -mr-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="mt-6 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group font-medium min-h-[44px]",
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-zinc-450 group-hover:text-zinc-300"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-zinc-800/40 space-y-3 pb-6 lg:pb-3">
          {/* Settings Route */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group font-medium min-h-[44px]",
              pathname === '/settings'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <Settings
              className={cn(
                "h-4 w-4 shrink-0",
                pathname === '/settings' ? "text-white" : "text-zinc-450 group-hover:text-zinc-300"
              )}
            />
            Settings
          </Link>

          {/* Divider */}
          <div className="h-px bg-zinc-800/60 mx-1" />

          {/* User Profile Card */}
          {loading ? (
            <div className="flex items-center gap-3 px-3 py-2 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-zinc-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-zinc-800 rounded-sm w-3/4" />
                <div className="h-2.5 bg-zinc-800 rounded-sm w-1/2" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/40 border border-zinc-805/30 border-zinc-800/30">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Custom Initials Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate leading-none mb-1">
                    {getUserName()}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate leading-none">
                    {getUserEmail()}
                  </p>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="h-10 w-10 lg:h-8 lg:w-8 rounded-lg text-zinc-450 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all duration-200 cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-zinc-950 flex flex-col overflow-y-auto mt-16 lg:mt-0">
        <div className="flex-1 p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Global Floating Chat Widget */}
      <AiChatWidget />
    </div>
  )
}
