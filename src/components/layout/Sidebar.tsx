"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useState, useEffect } from "react"
import {
  LayoutDashboard, Wallet, CandlestickChart, BookOpen,
  ShieldCheck, ClipboardList, GraduationCap, User,
  ChevronLeft, ChevronRight, MoreHorizontal, BarChart2, LogOut, ArrowDownToLine,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  {
    section: "OPERACIÓN",
    items: [
      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
      { href: "/cuentas",     label: "Cuentas",     icon: Wallet },
      { href: "/mercados",    label: "Mercados",    icon: BarChart2 },
      { href: "/trades",      label: "Trades",      icon: CandlestickChart },
      { href: "/playbook",    label: "Playbook",    icon: BookOpen },
      { href: "/reglas",      label: "Reglas",      icon: ShieldCheck },
      { href: "/reviews",     label: "Reviews",     icon: ClipboardList },
      { href: "/aprendizaje", label: "Aprendizaje", icon: GraduationCap },
    ],
  },
  {
    section: "CUENTA",
    items: [
      { href: "/retiros", label: "Retiros",  icon: ArrowDownToLine },
      { href: "/perfil",  label: "Perfil",   icon: User },
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userInitial, setUserInitial] = useState("")
  const width = useWindowWidth()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const name = data.user.user_metadata?.name as string | undefined
      const email = data.user.email ?? ""
      const letter = name ? name[0] : email[0]
      if (letter) setUserInitial(letter.toUpperCase())
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1024

  // ── Mobile: top bar + bottom nav + "Más" drawer ──────────────────────────
  if (isMobile) {
    const bottomItems = [
      NAV[0].items[0], // Dashboard
      NAV[0].items[3], // Trades
      NAV[0].items[6], // Reviews
      NAV[0].items[7], // Aprendizaje
      NAV[1].items[0], // Perfil
    ]
    // Items that go into the "Más" drawer
    const drawerItems = [
      NAV[0].items[1], // Cuentas
      NAV[0].items[2], // Mercados
      NAV[0].items[4], // Playbook
      NAV[0].items[5], // Reglas
    ]
    const anyDrawerActive = drawerItems.some(i => pathname.startsWith(i.href))

    return (
      <>
        {/* Top header bar */}
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          height: 52,
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center",
          padding: "0 16px",
          gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--ink)",
            display: "grid", placeItems: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 12, color: "white",
            position: "relative", flexShrink: 0,
          }}>
            TJ
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--win)",
              position: "absolute", top: -2, right: -2,
              border: "2px solid var(--panel)",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1 }}>
            Trading Journal
          </span>
          <button
            onClick={toggle}
            style={{ width: 32, height: 32, borderRadius: 8, background: "var(--chip)", border: "1px solid var(--line)", display: "grid", placeItems: "center", cursor: "pointer", fontSize: 14 }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {userInitial && (
            <Link href="/perfil" style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--accent-soft)", color: "var(--accent)",
              display: "grid", placeItems: "center",
              fontSize: 12, fontWeight: 700,
              textDecoration: "none", flexShrink: 0,
            }}>
              {userInitial}
            </Link>
          )}
        </header>

        {/* "Más" drawer backdrop */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 48,
              background: "rgba(0,0,0,.4)",
            }}
          />
        )}

        {/* "Más" drawer panel */}
        <div style={{
          position: "fixed", left: 0, right: 0, zIndex: 49,
          bottom: drawerOpen ? 56 : "-100%",
          background: "var(--panel)",
          borderTop: "1px solid var(--line)",
          borderRadius: "16px 16px 0 0",
          padding: "16px 16px 8px",
          transition: "bottom .25s cubic-bezier(.32,0,.67,0)",
          boxShadow: "0 -8px 32px rgba(0,0,0,.18)",
        }}>
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--line-2)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", marginBottom: 12 }}>
            Más secciones
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {drawerItems.map(item => {
              const active = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: "var(--radius-sm)",
                    background: active ? "var(--accent-soft)" : "var(--panel-2)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    color: active ? "var(--accent)" : "var(--ink-2)",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div style={{ height: 16 }} />
        </div>

        {/* Bottom nav bar */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 56,
          background: "var(--panel)",
          borderTop: "1px solid var(--line)",
          display: "flex", alignItems: "center",
          padding: "0 4px",
        }}>
          {bottomItems.map(item => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                style={{
                  flex: 1, height: 44,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 2, borderRadius: 10,
                  color: active ? "var(--accent)" : "var(--ink-3)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <Icon size={18} />
                <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, lineHeight: 1 }}>
                  {item.label.slice(0, 6)}
                </span>
                {"badge" in item && item.badge ? (
                  <span style={{
                    position: "absolute", top: 4, right: "20%",
                    fontSize: 9, fontWeight: 700,
                    background: "var(--loss)", color: "white",
                    borderRadius: 999, padding: "1px 4px",
                    lineHeight: 1.4,
                  }}>
                    {(item as { badge: number }).badge}
                  </span>
                ) : null}
              </Link>
            )
          })}

          {/* Más button */}
          <button
            onClick={() => setDrawerOpen(v => !v)}
            style={{
              flex: 1, height: 44,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 2, borderRadius: 10, border: "none",
              color: anyDrawerActive || drawerOpen ? "var(--accent)" : "var(--ink-3)",
              background: anyDrawerActive || drawerOpen ? "var(--accent-soft)" : "transparent",
              cursor: "pointer", position: "relative",
            }}
          >
            <MoreHorizontal size={18} />
            <span style={{ fontSize: 9, fontWeight: anyDrawerActive || drawerOpen ? 600 : 400, lineHeight: 1 }}>Más</span>
            {/* dot if a drawer page is active */}
            {anyDrawerActive && !drawerOpen && (
              <span style={{
                position: "absolute", top: 6, right: "22%",
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--accent)",
                border: "1.5px solid var(--panel)",
              }} />
            )}
          </button>
        </nav>
      </>
    )
  }

  // ── Tablet: always icon-only, no toggle ────────────────────────────────────
  if (isTablet) {
    return (
      <aside style={{
        width: 56, minWidth: 56,
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 12px 14px",
          borderBottom: "1px solid var(--line)",
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--ink)",
            display: "grid", placeItems: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 12, color: "white",
            position: "relative",
          }}>
            TJ
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--win)",
              position: "absolute", top: -2, right: -2,
              border: "2px solid var(--panel)",
            }} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "8px 0", flex: 1, overflowY: "auto" }}>
          {NAV.map(group => (
            <div key={group.section}>
              <div style={{ height: 6 }} />
              {group.items.map(item => {
                const active = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} title={item.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "9px 0", margin: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    color: active ? "var(--accent)" : "var(--ink-2)",
                    background: active ? "var(--accent-soft)" : "transparent",
                    textDecoration: "none",
                    position: "relative",
                  }}>
                    <Icon size={16} />
                    {"badge" in item && item.badge ? (
                      <span style={{
                        position: "absolute", top: 4, right: 4,
                        fontSize: 9, fontWeight: 700,
                        background: "var(--loss)", color: "white",
                        borderRadius: 999, padding: "1px 4px",
                      }}>
                        {(item as { badge: number }).badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "12px 0 16px",
          borderTop: "1px solid var(--line)",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 8,
        }}>
          <div title="Héctor O.C." style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "grid", placeItems: "center",
            fontSize: 11, fontWeight: 700,
          }}>HC</div>
          <button onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"} style={{
            width: 26, height: 26, borderRadius: 8,
            background: "var(--chip)", border: "1px solid var(--line)",
            display: "grid", placeItems: "center",
            cursor: "pointer", fontSize: 13,
          }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </aside>
    )
  }

  // ── Desktop: collapsible ───────────────────────────────────────────────────
  const W = collapsed ? 56 : 240

  return (
    <aside style={{
      width: W, minWidth: W,
      position: "sticky", top: 0, height: "100vh",
      overflow: "hidden",
      background: "var(--panel)",
      borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column",
      transition: "width .2s ease, min-width .2s ease",
    }}>
      {/* Brand + collapse button */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 10,
        padding: collapsed ? "20px 12px 16px" : "20px 20px 16px",
        borderBottom: "1px solid var(--line)",
        justifyContent: collapsed ? "center" : "flex-start",
        position: "relative",
        transition: "padding .2s",
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
        {!collapsed && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, whiteSpace: "nowrap" }}>
            Trading Journal
          </span>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
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
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 0", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map(group => (
          <div key={group.section}>
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
                <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{
                  display: "flex", alignItems: "center",
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
                }}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>}
                  {"badge" in item && item.badge ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: "var(--loss)", color: "white",
                      borderRadius: 999, padding: "1px 6px",
                      position: collapsed ? "absolute" : "static",
                      top: collapsed ? 4 : undefined,
                      right: collapsed ? 4 : undefined,
                    }}>
                      {(item as { badge: number }).badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? "16px 0" : "16px 20px",
        borderTop: "1px solid var(--line)",
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? "center" : "flex-start",
        flexDirection: "column",
        transition: "padding .2s",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: collapsed ? 0 : 10,
          width: "100%",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div title={collapsed ? "Héctor O.C." : undefined} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>HC</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>Héctor O.C.</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Single-trader · TJ</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"} style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--chip)", border: "1px solid var(--line)",
              display: "grid", placeItems: "center",
              cursor: "pointer", flexShrink: 0, fontSize: 14,
            }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
        </div>
        {collapsed ? (
          <>
            <button onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"} style={{
              marginTop: 8,
              width: 28, height: 28, borderRadius: 8,
              background: "var(--chip)", border: "1px solid var(--line)",
              display: "grid", placeItems: "center",
              cursor: "pointer", fontSize: 14,
            }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={handleLogout} title="Cerrar sesión" style={{
              marginTop: 4,
              width: 28, height: 28, borderRadius: 8,
              background: "transparent", border: "1px solid var(--line)",
              display: "grid", placeItems: "center",
              cursor: "pointer", color: "var(--ink-3)",
            }}>
              <LogOut size={14} />
            </button>
          </>
        ) : (
          <button onClick={handleLogout} style={{
            marginTop: 8,
            width: "100%",
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 10px",
            borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--ink-3)",
            fontSize: 13, cursor: "pointer",
          }}>
            <LogOut size={14} />
            Cerrar sesión
          </button>
        )}
      </div>
    </aside>
  )
}
