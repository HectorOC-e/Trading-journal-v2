"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useState } from "react"
import {
  LayoutDashboard,
  Wallet,
  CandlestickChart,
  BookOpen,
  ShieldCheck,
  ClipboardList,
  GraduationCap,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const NAV = [
  {
    section: "OPERACIÓN",
    items: [
      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
      { href: "/cuentas",     label: "Cuentas",     icon: Wallet },
      { href: "/trades",      label: "Trades",      icon: CandlestickChart, badge: 3 },
      { href: "/playbook",    label: "Playbook",    icon: BookOpen },
      { href: "/reglas",      label: "Reglas",      icon: ShieldCheck },
      { href: "/reviews",     label: "Reviews",     icon: ClipboardList },
      { href: "/aprendizaje", label: "Aprendizaje", icon: GraduationCap },
    ],
  },
  {
    section: "CUENTA",
    items: [
      { href: "/perfil", label: "Perfil", icon: User },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const W = collapsed ? 56 : 240

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        transition: "width .2s ease, min-width .2s ease",
      }}
    >
      {/* Brand + collapse button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "20px 12px 16px" : "20px 20px 16px",
        borderBottom: "1px solid var(--line)",
        justifyContent: collapsed ? "center" : "flex-start",
        position: "relative",
        transition: "padding .2s",
      }}>
        {/* Logo mark */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--ink)",
          display: "grid", placeItems: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700, fontSize: 13, color: "white",
          position: "relative", flexShrink: 0,
        }}>
          TJ
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--win)",
            position: "absolute", top: -2, right: -2,
            border: "2px solid var(--panel)",
          }} />
        </div>

        {/* Brand name — hidden when collapsed */}
        {!collapsed && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, whiteSpace: "nowrap" }}>
            Trading Journal
          </span>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          style={{
            position: collapsed ? "absolute" : "static",
            bottom: collapsed ? -14 : undefined,
            right: collapsed ? -14 : undefined,
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            display: "grid", placeItems: "center",
            cursor: "pointer", flexShrink: 0,
            zIndex: 10,
            color: "var(--ink-3)",
          }}
        >
          {collapsed
            ? <ChevronRight size={12} />
            : <ChevronLeft size={12} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 0", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map(group => (
          <div key={group.section}>
            {/* Section label — only when expanded */}
            {!collapsed && (
              <p className="eyebrow" style={{ padding: "8px 20px 4px", whiteSpace: "nowrap" }}>
                {group.section}
              </p>
            )}
            {collapsed && <div style={{ height: 8 }} />}

            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? "9px 0" : "9px 12px 9px 20px",
                    margin: collapsed ? "1px 6px" : "1px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13.5,
                    color: active ? "var(--accent)" : "var(--ink-2)",
                    fontWeight: active ? 600 : 400,
                    background: active ? "var(--accent-soft)" : "transparent",
                    textDecoration: "none",
                    transition: "background .12s",
                    justifyContent: collapsed ? "center" : "flex-start",
                    position: "relative",
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                  )}
                  {"badge" in item && item.badge ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: "var(--loss)", color: "white",
                      borderRadius: 999, padding: "1px 6px",
                      position: collapsed ? "absolute" : "static",
                      top: collapsed ? 4 : undefined,
                      right: collapsed ? 4 : undefined,
                    }}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer — avatar + user info */}
      <div style={{
        padding: collapsed ? "16px 0" : "16px 20px",
        borderTop: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? "center" : "flex-start",
        flexDirection: "column",
        transition: "padding .2s",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 10,
          width: "100%",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div
            title={collapsed ? "Héctor O.C." : undefined}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--accent-soft)", color: "var(--accent)",
              display: "grid", placeItems: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}
          >
            HC
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
                Héctor O.C.
              </p>
              <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Single-trader · TJ</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={toggle}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "var(--chip)", border: "1px solid var(--line)",
                display: "grid", placeItems: "center",
                cursor: "pointer", flexShrink: 0, fontSize: 14,
              }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggle}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            style={{
              marginTop: 8,
              width: 28, height: 28, borderRadius: 8,
              background: "var(--chip)", border: "1px solid var(--line)",
              display: "grid", placeItems: "center",
              cursor: "pointer", fontSize: 14,
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        )}
      </div>
    </aside>
  )
}
