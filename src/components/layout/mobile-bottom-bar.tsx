"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { MoreHorizontal, Plus, TrendingUp, MessageCircle, Search, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuickActions } from "@/lib/quick-actions-store"

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number | string }> }

/** Notch carved into the top-center of the floating pill (cradles the FAB). */
const NOTCH_MASK = "radial-gradient(34px at 50% 0, transparent 0 33px, #000 34px)"

/** Icon-only nav tab (faithful to the reference bottom bar — no labels). */
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

type CreateAction = {
  label: string
  icon: React.ComponentType<{ size?: number | string }>
  /** Closed-state horizontal offset toward the FAB (px); animates to 0 on open. */
  dx: number
  /** Stagger delay (ms) — inner buttons emerge before the outer ones. */
  delay: number
  run: () => void
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduce(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduce
}

export function MobileBottomBar({
  leftItems, rightItems, pathname, drawerOpen, setDrawerOpen, anyDrawerActive,
}: {
  leftItems: NavItem[]
  rightItems: NavItem[]
  pathname: string
  drawerOpen: boolean
  setDrawerOpen: (fn: (v: boolean) => boolean) => void
  anyDrawerActive: boolean
}) {
  const router = useRouter()
  const openRegister = useQuickActions(s => s.openRegister)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduce = useReducedMotion()

  // Close the create menu on route change so it never lingers across pages.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  function runAction(fn: () => void) {
    setMenuOpen(false)
    fn()
  }

  // 2 left · [FAB] · 2 right — slots align with the nav tabs underneath.
  const actions: CreateAction[] = [
    { label: "Trade",  icon: TrendingUp,    dx:  72, delay: 40, run: () => runAction(openRegister) },
    { label: "Coach",  icon: MessageCircle, dx:  32, delay: 0,  run: () => runAction(() => window.dispatchEvent(new Event("coach:open"))) },
    { label: "Buscar", icon: Search,        dx: -32, delay: 0,  run: () => runAction(() => window.dispatchEvent(new Event("palette:open"))) },
    { label: "Review", icon: ClipboardList, dx: -72, delay: 40, run: () => runAction(() => router.push("/reviews")) },
  ]

  return (
    <>
      {/* Backdrop — tap to close the create menu */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[47] fade-in"
          style={{ background: "rgba(0,0,0,0.35)" }}
          aria-hidden="true"
        />
      )}

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
            {/* Nav-tab layer — fades out while the create menu is open */}
            <div
              className="flex items-stretch w-full"
              style={{
                opacity: menuOpen ? 0 : 1,
                pointerEvents: menuOpen ? "none" : "auto",
                transition: "opacity 0.18s ease",
              }}
            >
              {leftItems.map(item => (
                <IconTab key={item.href} item={item} active={pathname.startsWith(item.href)} />
              ))}
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
                  <span className="absolute top-2.5 right-[26%] w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Action layer — siblings of the masked pill (not clipped by the notch).
              Each circle emerges from the FAB and slides to its slot. */}
          <div
            className="absolute inset-x-0 bottom-0 h-[62px] flex items-stretch"
            style={{ pointerEvents: menuOpen ? "auto" : "none" }}
            aria-hidden={!menuOpen}
          >
            {actions.map((a, i) => {
              const Icon = a.icon
              const slotClass = i === 1 ? "mr-[68px]" : "" // gap after the 2nd (Coach) for the FAB notch
              return (
                <div key={a.label} className={cn("flex-1 flex items-center justify-center", slotClass)}>
                  <button
                    onClick={a.run}
                    tabIndex={menuOpen ? 0 : -1}
                    className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    aria-label={a.label}
                    style={{
                      opacity: menuOpen ? 1 : 0,
                      transform: reduce
                        ? "none"
                        : menuOpen ? "translateX(0) scale(1)" : `translateX(${a.dx}px) scale(0.4)`,
                      transition: reduce
                        ? "opacity 0.16s ease"
                        : `transform 0.26s var(--ease-out) ${menuOpen ? a.delay : 0}ms, opacity 0.2s ease ${menuOpen ? a.delay : 0}ms`,
                    }}
                  >
                    <span
                      className="w-[42px] h-[42px] rounded-full flex items-center justify-center"
                      style={{ background: "var(--panel)", color: "var(--ink)", boxShadow: "0 3px 10px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10)" }}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="text-[8.5px] font-semibold" style={{ color: "var(--ink-3)" }}>{a.label}</span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Center FAB — toggles the create menu (+ ⇄ ×). Sibling of the pill. */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? "Cerrar acciones" : "Crear"}
            aria-expanded={menuOpen}
            className="absolute left-1/2 -top-7 w-14 h-14 rounded-full flex items-center justify-center text-[var(--accent-contrast)] active:scale-95 z-10"
            style={{
              background: "linear-gradient(145deg, var(--accent), var(--accent-h))",
              boxShadow: "0 8px 22px -4px color-mix(in oklch, var(--accent) 60%, transparent), 0 2px 6px rgba(0,0,0,0.18)",
              transform: `translateX(-50%) rotate(${menuOpen ? 45 : 0}deg)`,
              transition: "transform 0.2s ease",
            }}
          >
            <Plus size={26} />
          </button>
        </div>
      </nav>
    </>
  )
}
