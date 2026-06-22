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
  Brain, LineChart, Plus, Bell, MessageCircle,
} from "lucide-react"
import { useLogout } from "@/hooks/useLogout"
import { trpc } from "@/lib/trpc/client"
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

/** Ticks once per minute, aligned to the minute boundary. Returns null until
 *  mounted so server/client render the same markup (no hydration mismatch). */
function useMinuteClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    let interval: ReturnType<typeof setInterval> | undefined
    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    const timer = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, msToNextMinute)
    return () => { clearTimeout(timer); if (interval) clearInterval(interval) }
  }, [])
  return now
}

/** Live clock for the mobile top bar — 24h time + short date in the user's tz. */
function MobileClock({ tz }: { tz: string }) {
  const now = useMinuteClock()
  if (!now) {
    // Reserve width to avoid a layout shift when the time appears on mount.
    return <div className="h-[15px] w-[112px]" aria-hidden="true" />
  }
  const opts = tz ? { timeZone: tz } : {}
  const time = new Intl.DateTimeFormat("es", {
    hour: "2-digit", minute: "2-digit", hour12: false, ...opts,
  }).format(now)
  const date = new Intl.DateTimeFormat("es", {
    weekday: "short", day: "numeric", month: "short", ...opts,
  }).format(now)
  return (
    <div className="flex items-baseline gap-1.5 min-w-0" aria-label={`${time} · ${date}`}>
      <span className="text-[15px] font-semibold tabular-nums leading-none" style={{ color: "var(--ink)" }}>
        {time}
      </span>
      <span className="text-[11px] leading-none truncate" style={{ color: "var(--ink-3)" }}>
        · {date}
      </span>
    </div>
  )
}

/** Circular notch carved into the top-center of the floating pill, sized to
 *  cradle the 56px FAB. A CSS radial-gradient mask (no JS measurement, so it can
 *  never silently render flat) carves the cutout; `filter: drop-shadow` is used
 *  instead of box-shadow so the shadow follows the notch instead of bleeding
 *  across it. Supported on iOS Safari via the -webkit- prefix. */
const NOTCH_MASK = "radial-gradient(34px at 50% 0, transparent 0 33px, #000 34px)"

function ThemeIcon({ theme }: { theme: string }) {
  if (theme === "dark")   return <Moon size={13} />
  if (theme === "light")  return <Sun size={13} />
  return <Monitor size={13} />
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number | string }> }

/** Icon-only tab (faithful to the reference bottom bar — no labels). */
function IconTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex-1 flex items-center justify-center h-full transition-colors",
        active ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
      )}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={23} />
    </Link>
  )
}

/** Expanded desktop nav row (label + icon, active pill + right bar + badge). */
function DeskItem({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 h-[34px] px-3 mx-2.5 mb-0.5 rounded-[var(--radius-sm)] transition-colors duration-150",
        active
          ? "text-[var(--accent)] font-semibold"
          : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--chip)]"
      )}
      style={{ fontSize: 13, background: active ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={16} />
      <span className="whitespace-nowrap flex-1">{item.label}</span>
      {badge > 0 && (
        <span
          className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--loss)", color: "#fff" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {active && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: "var(--accent)" }} />
      )}
    </Link>
  )
}

function openCoach() {
  window.dispatchEvent(new Event("coach:open"))
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
  // Desktop accordion: which collapsible section is open (PRINCIPAL is pinned).
  const [openSection,  setOpenSection]  = useState<string | null>(null)
  const width = useWindowWidth()

  // Auto-open the collapsible section that holds the active route, so the current
  // page is always visible without the user hunting for it.
  useEffect(() => {
    const group = NAV.slice(1).find(g => g.items.some(i => pathname.startsWith(i.href)))
    if (group) setOpenSection(group.section)
  }, [pathname])

  // Identity is read from the same source as /perfil (the `users` table via tRPC) so the
  // avatar initial, name and role stay coherent with the profile and update reactively
  // when the user edits them — Supabase auth metadata would go stale after a name change.
  const { data: profile } = trpc.profile.get.useQuery(undefined, { staleTime: 60_000 })
  const userName    = profile?.name?.trim() || ""
  const userEmail   = profile?.email ?? ""
  const userRole    = profile?.role || "Single-trader"
  const userTz      = profile?.timezone || ""
  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Usuario")
  const userInitial = (userName[0] || userEmail[0] || "").toUpperCase()

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
        {/* Top header — brand + live clock · actions */}
        <header
          className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-4 gap-3"
          style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}
        >
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white font-mono font-bold text-[11px] relative shrink-0"
            style={{ background: "var(--ink)" }}>
            TJ
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px]"
              style={{ background: "var(--win)", borderColor: "var(--panel)" }} />
          </div>

          <div className="flex-1 min-w-0">
            <MobileClock tz={userTz} />
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
            bottom: drawerOpen ? 88 : "-100%",
            background: "var(--panel)",
            borderTop: "1px solid var(--line)",
            transition: "bottom 0.32s var(--ease-drawer)",
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

        {/* Bottom nav — floating pill with a concave notch cradling the FAB.
            Icon-only, faithful to the reference. 2 destinos · FAB · 2 destinos */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
          aria-label="Navegación principal"
        >
          <div className="relative mx-auto max-w-md pointer-events-auto">
            {/* Pill — notch carved by a radial mask; drop-shadow follows the cut */}
            <div
              className="relative h-[62px] flex items-stretch"
              style={{
                background: "var(--panel)",
                borderRadius: 30,
                WebkitMask: NOTCH_MASK,
                mask: NOTCH_MASK,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.12)) drop-shadow(0 10px 24px rgba(0,0,0,0.10))",
              }}
            >
              {leftItems.map(item => (
                <IconTab key={item.href} item={item} active={pathname.startsWith(item.href)} />
              ))}

              {/* Gap beneath the FAB / notch */}
              <div className="w-[68px] shrink-0" aria-hidden="true" />

              {rightItems.map(item => (
                <IconTab key={item.href} item={item} active={pathname.startsWith(item.href)} />
              ))}

              <button
                onClick={() => setDrawerOpen(v => !v)}
                className={cn(
                  "relative flex-1 flex items-center justify-center h-full transition-colors",
                  anyDrawerActive || drawerOpen ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
                )}
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                aria-label="Más secciones"
                aria-expanded={drawerOpen}
              >
                <MoreHorizontal size={23} />
                {anyDrawerActive && !drawerOpen && (
                  <span
                    className="absolute top-2.5 right-[26%] w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            {/* Center FAB — sibling of the masked pill so it isn't clipped.
                Quick Action: Nuevo Trade */}
            <button
              onClick={openRegister}
              aria-label="Nuevo trade"
              className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full flex items-center justify-center text-[var(--accent-contrast)] active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
                boxShadow: "0 8px 22px -4px color-mix(in oklch, var(--accent) 60%, transparent), 0 2px 6px rgba(0,0,0,0.18)",
              }}
            >
              <Plus size={26} />
            </button>
          </div>
        </nav>
      </>
    )
  }

  // ── Tablet — floating rail card (collapsed language) ──────────────────────────
  if (isTablet) {
    const allItems = NAV.flatMap(g => g.items)
    return (
      <div
        className="flex flex-col gap-2.5"
        style={{ width: 64, minWidth: 64, position: "sticky", top: 0, height: "100vh", padding: 10 }}
      >
        <aside
          className="flex-1 min-h-0 flex flex-col rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        >
          {/* Avatar top */}
          <div className="flex justify-center py-3.5" style={{ borderBottom: "1px solid var(--line)" }}>
            <Link href="/perfil" title={userEmail || "Perfil"} aria-label="Perfil"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-opacity hover:opacity-80"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {userInitial || "?"}
            </Link>
          </div>

          {/* + Nuevo trade */}
          <div className="flex justify-center pt-3 pb-1">
            <button
              onClick={openRegister}
              title="Nuevo trade"
              aria-label="Nuevo trade"
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--accent-contrast)] active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
                boxShadow: "0 6px 16px -6px color-mix(in oklch, var(--accent) 55%, transparent)",
              }}
            >
              <Plus size={18} />
            </button>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto no-scrollbar" aria-label="Navegación">
            {allItems.map(item => {
              const active = pathname.startsWith(item.href)
              const Icon   = item.icon
              const badge  = navBadge[item.href] ?? 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "relative flex items-center justify-center h-[38px] mx-1.5 mb-1 rounded-[var(--radius-sm)] transition-colors",
                    active ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]"
                  )}
                  style={{ background: active ? "var(--accent-soft)" : "transparent" }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} />
                  {badge > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--loss)", border: "1.5px solid var(--panel)" }} />
                  )}
                  {active && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Coach IA — purple chat square */}
          <div className="flex justify-center pb-3 pt-1">
            <button
              onClick={openCoach}
              title="Coach IA"
              aria-label="Coach IA"
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--accent-contrast)] active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
                boxShadow: "0 6px 16px -6px color-mix(in oklch, var(--accent) 55%, transparent)",
              }}
            >
              <MessageCircle size={17} />
            </button>
          </div>
        </aside>

        {/* Secondary card — theme + logout */}
        <div
          className="flex flex-col items-center gap-1.5 py-2.5 rounded-[var(--radius-lg)]"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <button
            onClick={toggle}
            title={`Tema: ${resolvedTheme}`}
            className="w-8 h-8 rounded-[var(--radius-xs)] flex items-center justify-center transition-colors hover:bg-[var(--chip)]"
            style={{ color: "var(--ink-3)" }}
            aria-label="Cambiar tema"
          >
            <ThemeIcon theme={resolvedTheme} />
          </button>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="w-8 h-8 rounded-[var(--radius-xs)] flex items-center justify-center transition-colors hover:text-[var(--loss)] hover:bg-[var(--loss-soft)]"
            style={{ color: "var(--ink-3)" }}
            aria-label="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── Desktop — floating card sidebar ───────────────────────────────────────────
  const W = collapsed ? 76 : 248
  const [principal, ...collapsibleGroups] = NAV

  return (
    <div
      style={{
        width: W, minWidth: W,
        position: "sticky", top: 0, height: "100vh",
        padding: 12,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Single floating card — identity · + · nav (accordion) · Coach · footer */}
      <aside
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
        }}
      >
        {/* Identity (top) — links to /perfil */}
        <div
          style={{
            display: "flex", alignItems: "center",
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "16px 0 14px" : "16px 16px 14px",
            borderBottom: "1px solid var(--line)",
            position: "relative",
          }}
        >
          <Link href="/perfil" title={userEmail || "Perfil"} aria-label="Perfil"
            className="flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-80"
            style={{ textDecoration: "none" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {userInitial || "?"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: "var(--ink)" }}>
                  {displayName}
                </p>
                <p className="text-[11px] leading-tight truncate" style={{ color: "var(--ink-3)" }}>
                  {userEmail || userRole}
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? "Expandir" : "Colapsar"}
            className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--chip)] shrink-0"
            style={{
              width: 20, height: 20,
              position: "absolute",
              bottom: -10,
              right: collapsed ? "calc(50% - 10px)" : 12,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              zIndex: 10, cursor: "pointer",
            }}
          >
            {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>
        </div>

        {/* + Nuevo trade — primary action (opens the register modal; same as "n") */}
        <div style={{ padding: collapsed ? "12px 0 4px" : "12px 12px 4px" }}>
          <button
            onClick={openRegister}
            title="Nuevo trade"
            aria-label="Nuevo trade"
            className={cn(
              "flex items-center justify-center gap-2 text-[var(--accent-contrast)] active:scale-[0.98] transition-transform",
              collapsed ? "w-9 h-9 mx-auto rounded-[var(--radius-sm)]" : "w-full h-10 rounded-[var(--radius-sm)]"
            )}
            style={{
              background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
              boxShadow: "0 8px 20px -8px color-mix(in oklch, var(--accent) 55%, transparent)",
            }}
          >
            <Plus size={collapsed ? 18 : 17} />
            {!collapsed && <span className="text-[13px] font-semibold">Nuevo trade</span>}
          </button>
        </div>

        {/* Nav — collapsed: icon list · expanded: PRINCIPAL pinned + accordion */}
        <nav
          className="no-scrollbar"
          style={{ padding: "8px 0", flex: 1, overflowY: "auto", overflowX: "hidden" }}
          aria-label="Navegación principal"
        >
          {collapsed ? (
            NAV.map((group, gi) => (
              <div key={group.section}>
                {gi > 0 && <div style={{ height: 1, margin: "8px 16px", background: "var(--line)" }} />}
                {group.items.map(item => {
                  const active = pathname.startsWith(item.href)
                  const Icon   = item.icon
                  const badge  = navBadge[item.href] ?? 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "relative flex items-center justify-center h-[38px] mx-2 mb-1 rounded-[var(--radius-sm)] transition-colors",
                        active ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--chip)]"
                      )}
                      style={{ background: active ? "var(--accent-soft)" : "transparent" }}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={16} />
                      {badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--loss)", border: "1.5px solid var(--panel)" }} />
                      )}
                      {active && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: "var(--accent)" }} />
                      )}
                    </Link>
                  )
                })}
              </div>
            ))
          ) : (
            <>
              {/* PRINCIPAL — pinned (always visible) */}
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-[18px] mb-1.5" style={{ color: "var(--ink-3)" }}>
                {principal.section}
              </p>
              {principal.items.map(item => (
                <DeskItem key={item.href} item={item} active={pathname.startsWith(item.href)} badge={navBadge[item.href] ?? 0} />
              ))}

              {/* Collapsible sections — one open at a time */}
              {collapsibleGroups.map(group => {
                const isOpen   = openSection === group.section
                const hasSignal = group.items.some(i => pathname.startsWith(i.href) || (navBadge[i.href] ?? 0) > 0)
                return (
                  <div key={group.section} style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setOpenSection(s => (s === group.section ? null : group.section))}
                      className="w-full flex items-center gap-2 h-[30px] px-[18px] transition-colors hover:bg-[var(--chip)]"
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                      aria-expanded={isOpen}
                    >
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--ink-3)" }}>
                        {group.section}
                      </span>
                      {!isOpen && hasSignal && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
                      )}
                      <ChevronRight
                        size={12}
                        className="ml-auto shrink-0 transition-transform duration-200"
                        style={{ color: "var(--ink-3)", transform: isOpen ? "rotate(90deg)" : "none" }}
                      />
                    </button>
                    {/* grid 0fr→1fr animates height without measuring */}
                    <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.18s var(--ease-out)" }}>
                      <div style={{ overflow: "hidden", minHeight: 0 }}>
                        <div style={{ paddingTop: 2 }}>
                          {group.items.map(item => (
                            <DeskItem key={item.href} item={item} active={pathname.startsWith(item.href)} badge={navBadge[item.href] ?? 0} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </nav>

        {/* Coach IA — purple CTA */}
        <div style={{ padding: collapsed ? "6px 0 8px" : "6px 12px 8px" }}>
          <button
            onClick={openCoach}
            title="Coach IA"
            aria-label="Coach IA"
            className={cn(
              "flex items-center justify-center gap-2 text-[var(--accent-contrast)] active:scale-[0.98] transition-transform",
              collapsed ? "w-9 h-9 mx-auto rounded-[var(--radius-sm)]" : "w-full h-10 rounded-[var(--radius-sm)]"
            )}
            style={{
              background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
              boxShadow: "0 8px 20px -8px color-mix(in oklch, var(--accent) 55%, transparent)",
            }}
          >
            <MessageCircle size={collapsed ? 17 : 16} />
            {!collapsed && <span className="text-[13px] font-semibold">Coach IA</span>}
          </button>
        </div>

        {/* Footer — bell · theme · logout (merged into the card) */}
        <div
          style={{
            borderTop: "1px solid var(--line)",
            padding: collapsed ? "10px 0" : "10px 12px",
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            alignItems: "center",
            gap: collapsed ? 8 : 6,
          }}
        >
          <NotificationBell placement="up" align="left" />
          <button
            onClick={toggle}
            title={`Tema: ${resolvedTheme}`}
            className={cn(
              "flex items-center justify-center rounded-[var(--radius-xs)] transition-colors hover:bg-[var(--chip)]",
              collapsed ? "w-8 h-8" : "h-8 flex-1 gap-1.5"
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
              collapsed ? "w-8 h-8" : "h-8 flex-1 gap-1.5"
            )}
            style={{ color: "var(--ink-3)", border: "1px solid var(--line)", cursor: "pointer", fontSize: 11 }}
          >
            <LogOut size={13} />
            {!collapsed && <span className="text-[11px] font-medium">Salir</span>}
          </button>
        </div>
      </aside>
    </div>
  )
}
