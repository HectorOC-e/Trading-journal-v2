"use client"

import Link from "next/link"
import { Lock, Clock, BookOpen, ShieldCheck, Check, CheckCheck, BellOff } from "lucide-react"
import { TopBar } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { useNotifications, type AppNotification, type NotifCategory } from "@/lib/notifications"

const TONE_ICON = { danger: Lock, warning: Clock, info: BookOpen, reminder: ShieldCheck } as const
const CATEGORY_ORDER: NotifCategory[] = ["Cuenta", "Aprendizaje", "Reviews", "Reglas"]

function toneColor(t: AppNotification["tone"]) {
  return t === "danger" ? "var(--loss)" : t === "warning" ? "var(--be)" : t === "reminder" ? "var(--ink-3)" : "var(--accent)"
}

export default function NotificacionesPage() {
  const { active, count, dismiss, clearAll } = useNotifications()

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: active.filter((n) => n.category === cat) }))
    .filter((g) => g.items.length > 0)

  return (
    <main aria-label="Notificaciones">
      <TopBar
        title="Notificaciones"
        subtitle={count > 0 ? `${count} pendiente${count !== 1 ? "s" : ""}` : "Sin alertas"}
        actions={count > 0 ? [{
          label: "Limpiar todas",
          icon: <CheckCheck size={14} />,
          variant: "ghost" as const,
          onClick: clearAll,
        }] : []}
      />

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--win-soft)] flex items-center justify-center">
            <BellOff size={22} className="text-[var(--win)]" />
          </div>
          <p className="text-[14px] font-semibold text-[var(--ink)]">Todo al día</p>
          <p className="text-[12px] text-[var(--ink-3)] max-w-[320px]">
            No tienes alertas pendientes. Aquí verás cuentas bloqueadas, reviews vencidas, recordatorios de reglas y avisos de aprendizaje.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-[760px]">
          {grouped.map(({ cat, items }) => (
            <section key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)] mb-2">{cat}</p>
              <div className="flex flex-col gap-2">
                {items.map((n) => {
                  const Icon = TONE_ICON[n.tone]
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 card-hover"
                    >
                      <span
                        className="mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "var(--panel-2)", color: toneColor(n.tone) }}
                      >
                        <Icon size={16} />
                      </span>
                      <Link href={n.href} className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--ink)] leading-snug">{n.title}</p>
                        {n.body && <p className="text-[11.5px] text-[var(--ink-3)] leading-snug mt-0.5">{n.body}</p>}
                      </Link>
                      <Button variant="subtle" size="xs" onClick={() => dismiss(n.id)} className="shrink-0">
                        <Check size={12} /> Listo
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
