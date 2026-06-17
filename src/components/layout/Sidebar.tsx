"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useState, useEffect } from "react"
import {
  LayoutDashboard, Wallet, CandlestickChart, BookOpen,
  ShieldCheck, ClipboardList, GraduationCap, User,
  ChevronLeft, ChevronRight, MoreHorizontal, BarChart2,
  LogOut, ArrowDownToLine, Tag, Sun, Moon, Monitor,
  Brain, LineChart, Plus, Bell,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLogout } from "@/hooks/useLogout"
import { cn } from "@/lib/utils"
import { useQuickActions } from "@/lib/quick-actions-store"
import { NotificationBell } from "@/components/layout/notification-bell"
import { useNotifications } from "@/lib/notifications"

const NAV = [
  {
    section: "PRINCIPAL",
    items: [
      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
      { href: "/trades",      label: "Trades",      icon: CandlestickChart },
      { href: "/reviews",     label: "Reviews",     icon: ClipboardList },
    ],
  },
  {
    section: "ANÁLISIS",
    items: [
      { href: "/psicologia",  label: "Psicología",  icon: Brain },
      { href: "/analytics",   label: "Analytics",   icon: LineChart },
    ],
  },
  {
    section: "GESTIÓN",
    items: [
      { href: "/cuentas",     label: "Cuentas",     icon: Wallet },
      { href: "/playbook",    label: "Playbook",    icon: BookOpen },
      { href: "/reglas",      label: "Reglas",      icon: ShieldCheck },
      { href: "/mercados",    label: "Mercados",    icon: BarChart2 },
    ],
  },
  {
    section: "APRENDIZAJE",
    items: [
      { href: "/aprendizaje", label: "Aprendizaje", icon: GraduationCap },
    ],
  },
  {
    section: "CUENTA",
    items: [
      { href: "/notificaciones", label: "Notificaciones", icon: Bell },
      { href: "/retiros",    label: "Retiros",   icon: ArrowDownToLine },
      { href: "/etiquetas",  label: "Etiquetas", icon: Tag },
      { href: "/perfil",     label: "Perfil",    icon: User },
    ],
  },
]

function useWindowWidth() {
  const [width, setWidth] = useState(1200)
  useEffect(() => {
    setWidth(window.innerWidth)
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return width
}

function ThemeIcon({ theme }: { theme: string }) {
  if (theme === "dark")   return <Moon size={13} />
  if (theme === "light")  return <Sun size={13} />
  return <Monitor size={13} />
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number | string }> }

function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 h-[56px] rounded-[8px] transition-colors",
        active ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
      )}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} />
      <span className={cn("text-[9px] leading-none", active ? "font-semibold" : "font-medium")}>
        {item.label}
      </span>
    </Link>
  )
}

export function Sidebar() {
  const pathname  = usePathname()
  const { resolvedTheme, toggle } = useTheme()
  const openRegister = useQuickActions(s => s.openRegister)
  const { count: unreadCount, unreadByCategory } = useNotifications()
  const navBadge: Record<string, number> = {
    "/notificaciones": unreadCount,
    "/cuentas":     unreadByCategory["Cuenta"] ?? 0,
    "/aprendizaje": unreadByCategory["Aprendizaje"] ?? 0,
  }
  const [collapsed,    setCollapsed]    = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [userInitial,  setUserInitial]  = useState("")
  const [userEmail,    setUserEmail]    = useState("")
  const width = useWindowWidth()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const name  = data.user.user_metadata?.name as string | undefined
      const email = data.user.email ?? ""
      const letter = name ? name[0] : email[0]
      if (letter) setUserInitial(letter.toUpperCase())
      setUserEmail(email)
    })
  }, [])

  const handleLogout = useLogout()

  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1024

  // ── Mobile ───────────────────────────────────────────────────────────────────
  const allNav = NAV.flatMap(g => g.items)
  const byHref = (href: string) => allNav.find(i => i.href === href)!

  if (isMobile) {
    // 2 destinos + FAB central (Nuevo Trade) + 2 destinos
    const leftItems  = [byHref("/dashboard"), byHref("/trades")]
    const rightItems = [byHref("/analytics")]
    const bottomItems = [...leftItems, ...rightItems]
    const drawerItems = allNav.filter(i => !bottomItems.some(b => b.href === i.href))
    const anyDrawerActive = drawerItems.some(i => pathname.startsWith(i.href))

    return (
      <>
        {/* Top header */}
        <header
          className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-4 gap-3"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white font-mono font-bold text-[11px] relative shrink-0"
              style={{ background: "var(--ink)" }}>
              TJ
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px]"
                style={{ background: "var(--win)", borderColor: "var(--panel)" }} />
            </div>
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--ink)" }}>
              Trading Journal
            </span>
          </div>
          <NotificationBell placement="down" compact />
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-[var(--radius-xs)] flex items-center justify-center transition-colors"
            style={{ background: "var(--chip)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
            aria-label="Cambiar tema"
          >
            <ThemeIcon theme={resolvedTheme} />
          </button>
          {userInitial && (
            <Link href="/perfil"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              aria-label="Perfil"
            >
              {userInitial}
            </Link>
          )}
        </header>

        {/* Drawer backdrop */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[48]"
            style={{ background: "rgba(0,0,0,0.45)" }}
            aria-hidden="true"
          />
        )}

        {/* Drawer panel */}
        <div
          className="fixed left-0 right-0 z-[49] rounded-t-[20px] overflow-hidden"
          style={{
            bottom: drawerOpen ? 56 : "-100%",
            background: "var(--panel)",
            borderTop: "1px solid var(--line)",
            transition: "bottom 0.28s cubic-bezier(0.32,0,0.67,0)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.20)",
          }}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 rounded-full" style={{ background: "var(--line-2)" }} />
          </div>
          <div className="px-4 pb-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: "var(--ink-3)" }}>
              Más secciones
            </p>
            <div className="grid grid-cols-2 gap-2">
              {drawerItems.map(item => {
                const active = pathname.startsWith(item.href)
                const Icon   = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-[var(--radius-sm)] transition-colors",
                      active
                        ? "text-[var(--accent)]"
                        : "text-[var(--ink-2)]"
                    )}
                    style={{
                      background: active ? "var(--accent-soft)" : "var(--panel-2)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    }}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className={cn("text-[13px]", active ? "font-semibold" : "font-medium")}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-[12px] font-medium transition-colors hover:text-[var(--loss)]"
                style={{ color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* Bottom nav — 2 destinos · FAB central (Nuevo Trade) · 2 destinos */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between h-[60px] px-1"
          style={{ background: "var(--panel)", borderTop: "1px solid var(--line)" }}
          aria-label="Navegación principal"
        >
          {leftItems.map(item => (
            <BottomTab key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}

          {/* Center FAB — Quick Action: Nuevo Trade */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={openRegister}
              aria-label="Nuevo trade"
              className="w-14 h-14 -mt-5 rounded-full flex items-center justify-center shadow-[var(--shadow-lg)] bg-[var(--accent)] text-[var(--accent-contrast)] active:scale-95 transition-transform"
              style={{ border: "3px solid var(--panel)" }}
            >
              <Plus size={26} />
            </button>
          </div>

          {rightItems.map(item => (
            <BottomTab key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}

          <button
            onClick={() => setDrawerOpen(v => !v)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 h-[56px] rounded-[8px] transition-colors relative",
              anyDrawerActive || drawerOpen ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
            )}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
            aria-label="Más secciones"
            aria-expanded={drawerOpen}
          >
            <MoreHorizontal size={20} />
            <span className={cn("text-[9px] leading-none", anyDrawerActive || drawerOpen ? "font-semibold" : "font-medium")}>
              Más
            </span>
            {anyDrawerActive && !drawerOpen && (
              <span
                className="absolute top-2 right-[26%] w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)", border: "1.5px solid var(--panel)" }}
                aria-hidden="true"
              />
            )}
          </button>
        </nav>
      </>
    )
  }

  // ── Tablet ───────────────────────────────────────────────────────────────────
  if (isTablet) {
    const allItems = NAV.flatMap(g => g.items)
    return (
      <aside
        className="flex flex-col"
        style={{
          width: 52, minWidth: 52,
          position: "sticky", top: 0, height: "100vh",
          overflow: "hidden",
          background: "var(--panel)",
          borderRight: "1px solid var(--line)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center py-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white font-mono font-bold text-[10px] relative"
            style={{ background: "var(--ink)" }}>
            TJ
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px]"
              style={{ background: "var(--win)", borderColor: "var(--panel)" }} />
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto" aria-label="Navegación">
          {allItems.map(item => {
            const active = pathname.startsWith(item.href)
            const Icon   = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center justify-center h-[38px] mx-1.5 mb-0.5 rounded-[var(--radius-xs)] transition-colors",
                  active ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]"
                )}
                style={{ background: active ? "var(--accent-soft)" : "transparent" }}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} />
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col items-center gap-2 py-3" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            {userInitial || "?"}
          </div>
          <NotificationBell placement="up" align="left" />
          <button
            onClick={toggle}
            className="w-7 h-7 rounded-[var(--radius-xs)] flex items-center justify-center transition-colors hover:bg-[var(--chip)]"
            style={{ color: "var(--ink-3)", border: "1px solid var(--line)" }}
            aria-label="Cambiar tema"
          >
            <ThemeIcon theme={resolvedTheme} />
          </button>
        </div>
      </aside>
    )
  }

  // ── Desktop ───────────────────────────────────────────────────────────────────
  const W = collapsed ? 72 : 240

  return (
    <aside
      style={{
        width: W, minWidth: W,
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex", alignItems: "center",
          gap: 10,
          padding: collapsed ? "18px 0 16px" : "18px 18px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--line)",
          position: "relative",
        }}
      >
        <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white font-mono font-bold text-[10px] relative shrink-0"
          style={{ background: "var(--ink)" }}>
          TJ
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px]"
            style={{ background: "var(--win)", borderColor: "var(--panel)" }} />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold whitespace-nowrap" style={{ color: "var(--ink)" }}>
              Trading Journal
            </p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--chip)] shrink-0"
          style={{
            width: 20, height: 20,
            position: collapsed ? "absolute" : "static",
            bottom: collapsed ? -10 : undefined,
            right: collapsed ? -10 : undefined,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink-3)",
            zIndex: 10, cursor: "pointer",
          }}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* Nav — reference spacing: 16px gutter, 38px rows, 4px gaps, section labels */}
      <nav
        style={{ padding: collapsed ? "12px 0" : "12px 0", flex: 1, overflowY: "auto", overflowX: "hidden" }}
        aria-label="Navegación principal"
      >
        {NAV.map((group, gi) => (
          <div key={group.section} style={{ marginTop: gi === 0 ? 0 : 16 }}>
            {!collapsed ? (
              <p
                className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-[18px] mb-1.5"
                style={{ color: "var(--ink-3)" }}
              >
                {group.section}
              </p>
            ) : (
              <div style={{ height: 1, margin: "10px 16px", background: "var(--line)" }} />
            )}
            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              const Icon   = item.icon
              const badge  = navBadge[item.href] ?? 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex items-center transition-colors duration-150",
                    collapsed
                      ? "justify-center h-[40px] mx-2 mb-1 rounded-[var(--radius-sm)]"
                      : "gap-3 h-[38px] px-3 mx-2.5 mb-0.5 rounded-[var(--radius-sm)]",
                    active
                      ? "text-[var(--accent)] font-semibold"
                      : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--chip)]"
                  )}
                  style={{
                    fontSize: 13,
                    background: active ? "var(--accent-soft)" : "transparent",
                    textDecoration: "none",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap flex-1">{item.label}</span>}

                  {/* Count badge */}
                  {badge > 0 && (
                    !collapsed ? (
                      <span
                        className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "var(--loss)", color: "#fff" }}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : (
                      <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--loss)", border: "1.5px solid var(--panel)" }}
                      />
                    )
                  )}

                  {/* Active indicator bar (right edge) */}
                  {active && !collapsed && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "14px 18px",
          borderTop: "1px solid var(--line)",
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {/* User */}
        <div
          style={{
            display: "flex", alignItems: "center",
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            title={userEmail || undefined}
          >
            {userInitial || "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: "var(--ink)" }}>
                {userEmail ? userEmail.split("@")[0] : "Usuario"}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: "var(--ink-3)" }}>Single-trader</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            gap: 6,
            alignItems: "center",
          }}
        >
          <NotificationBell placement="up" align="left" />
          <button
            onClick={toggle}
            title={`Tema: ${resolvedTheme}`}
            className={cn(
              "flex items-center justify-center rounded-[var(--radius-xs)] transition-colors hover:bg-[var(--chip)]",
              collapsed ? "w-7 h-7" : "h-7 flex-1 gap-1.5"
            )}
            style={{ color: "var(--ink-3)", border: "1px solid var(--line)", cursor: "pointer", fontSize: 11 }}
          >
            <ThemeIcon theme={resolvedTheme} />
            {!collapsed && (
              <span className="text-[11px] font-medium capitalize">{resolvedTheme}</span>
            )}
          </button>

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className={cn(
              "flex items-center justify-center rounded-[var(--radius-xs)] transition-colors hover:text-[var(--loss)] hover:bg-[var(--loss-soft)]",
              collapsed ? "w-7 h-7" : "h-7 flex-1 gap-1.5"
            )}
            style={{ color: "var(--ink-3)", border: "1px solid var(--line)", cursor: "pointer", fontSize: 11 }}
          >
            <LogOut size={13} />
            {!collapsed && <span className="text-[11px] font-medium">Salir</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
