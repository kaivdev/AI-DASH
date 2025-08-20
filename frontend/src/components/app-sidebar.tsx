import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Calendar,
  Home,
  Users,
  FileText,
  TrendingUp,
  Target,
  BookOpen,
  DollarSign,
  CheckSquare,
  Settings,
  User,
  LogOut,
  ChevronUp,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/stores/useAuth'
import { useModules } from '@/stores/useModules'
import { registry, type ModuleKey } from '@/features/modules/registry'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// Иконки для модулей
const moduleIcons: Record<ModuleKey, any> = {
  metrics: TrendingUp,
  notes: FileText,
  tasks: CheckSquare,
  finance: DollarSign,
  employees: Users,
  projects: LayoutGrid,
  goals: Target,
  reading: BookOpen,
}

// Основная навигация
const navigation = [
  {
    title: 'Дашборд',
    url: '/',
    icon: Home,
  },
  {
    title: 'Kanban Board',
    url: '/kanban',
    icon: Calendar,
  },
]

export function AppSidebar() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const location = useLocation()
  
  const enabled = useModules((s) => s.enabled)
  const enable = useModules((s) => s.enable)
  const disable = useModules((s) => s.disable)
  
  const enabledKeys = new Set(enabled.map((m) => m.key))

  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current
      if (!el) return
      // Use composedPath to properly handle portal elements (radix, portals, etc.)
      const path = (e.composedPath && (e.composedPath() as EventTarget[])) || ((e as any).path || [])

      // If any element in the event path is the sidebar root or is contained by it, treat as inside
      for (const node of path) {
        if (node === el) return
        if (node instanceof Node && el.contains(node as Node)) return
        if (node instanceof Element) {
          // Ignore clicks inside portalized dropdowns/menus associated with the sidebar (role heuristics)
          const role = node.getAttribute?.('role')
          if (role === 'menu' || role === 'listbox' || role === 'dialog') return
        }
      }

      // on small screens, clicking outside should close the sidebar
      if (window.innerWidth < 768) {
        // dispatch a custom event so a parent layout can handle closing the sidebar
        window.dispatchEvent(new CustomEvent('closeSidebar'))
      }
    }

    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
  <Sidebar variant="inset" ref={rootRef}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Home className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AI Life Dashboard</span>
                  <span className="truncate text-xs">Управление жизнью</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <Collapsible defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Модули
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {Object.keys(registry).map((key) => {
                      const k = key as ModuleKey
                      const isOn = enabledKeys.has(k)
                      const Icon = moduleIcons[k]
                      
                      return (
                        <SidebarMenuItem key={k}>
                          <SidebarMenuButton
                            onClick={() => (isOn ? disable(k) : enable(k))}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="capitalize">{k}</span>
                            </div>
                            <Checkbox 
                              checked={isOn} 
                              onCheckedChange={() => (isOn ? disable(k) : enable(k))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <User className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || 'Гость'}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || 'Не авторизован'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                {user ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/account">
                        <Settings />
                        Профиль
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut />
                      Выйти
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/login">
                      <User />
                      Войти
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
