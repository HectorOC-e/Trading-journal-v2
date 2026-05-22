"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_SECTIONS = [
  {
    label: "OPERACIÓN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "⊞" },
      { href: "/cuentas",   label: "Cuentas",   icon: "◎" },
      { href: "/trades",    label: "Trades",    icon: "↕", badge: 3 },
      { href: "/playbook",  label: "Playbook",  icon: "◈" },
      { href: "/reglas",    label: "Reglas",    icon: "⊘" },
      { href: "/reviews",   label: "Reviews",   icon: "↺" },
      { href: "/aprendizaje", label: "Aprendizaje", icon: "◉" },
    ],
  },
  {
    label: "CUENTA",
    items: [
      { href: "/perfil", label: "Perfil", icon: "◯" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[var(--line)]">
        <span className="text-[15px] font-bold tracking-tight text-[var(--ink)]">
          Trading <span className="text-[var(--accent)]">Journal</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-eyebrow px-3 mb-1">{section.label}</p>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--ink-2)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <span className="text-[11px] font-semibold bg-[var(--loss)] text-white rounded-full px-1.5 py-0.5 leading-none">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Review semanal CTA */}
      <div className="mx-3 mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--panel-2)] border border-[var(--line)]">
        <p className="text-[12px] font-semibold text-[var(--ink)] mb-1">Review semanal lista</p>
        <p className="text-[11px] text-[var(--ink-3)] mb-3 leading-relaxed">
          Cierra la semana del 14–20 may con 23 trades y 3 violaciones detectadas.
        </p>
        <Link
          href="/reviews/new"
          className="block text-center text-[12px] font-semibold py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--panel)] border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
        >
          Empezar review
        </Link>
      </div>
    </aside>
  )
}
