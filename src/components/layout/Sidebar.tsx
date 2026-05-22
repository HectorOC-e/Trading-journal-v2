"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  {
    section: "OPERACIÓN",
    items: [
      { href: "/dashboard",   label: "Dashboard" },
      { href: "/cuentas",     label: "Cuentas" },
      { href: "/trades",      label: "Trades",      badge: 3 },
      { href: "/playbook",    label: "Playbook" },
      { href: "/reglas",      label: "Reglas" },
      { href: "/reviews",     label: "Reviews" },
      { href: "/aprendizaje", label: "Aprendizaje" },
    ],
  },
  {
    section: "CUENTA",
    items: [
      { href: "/perfil", label: "Perfil" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--line)",
      }}>
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
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          Trading Journal
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {NAV.map(group => (
          <div key={group.section}>
            <p className="eyebrow" style={{ padding: "8px 20px 4px" }}>
              {group.section}
            </p>
            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px 9px 20px", margin: "1px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13.5,
                  color: active ? "var(--accent)" : "var(--ink-2)",
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--accent-soft)" : "transparent",
                  textDecoration: "none",
                  transition: "background .12s",
                }}>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: "var(--loss)", color: "white",
                      borderRadius: 999, padding: "1px 6px",
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
        padding: "16px 20px",
        borderTop: "1px solid var(--line)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--accent-soft)", color: "var(--accent)",
          display: "grid", placeItems: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          HC
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
            Héctor O.C.
          </p>
          <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Single-trader · TJ</p>
        </div>
      </div>
    </aside>
  )
}
