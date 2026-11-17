"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OperationalMode } from "@/domains/trading/operational-mode";
import type { PracticeTradeRole } from "@/server/services/learning/practice-trades-service";

export type PracticeLinkDraft = { tradeId: string; role: PracticeTradeRole };
export function PracticeTradePicker({ mode, kind, links, onChange, practiceId }: {
  mode: OperationalMode; kind: "EXECUTION" | "REVIEW"; links: PracticeLinkDraft[];
  onChange: (links: PracticeLinkDraft[]) => void; practiceId?: string;
}) {
  const [search, setSearch] = useState("");
  const q = trpc.learningPractices.tradeCandidates.useInfiniteQuery({ mode, search, limit: 20 }, { getNextPageParam: p => p.nextCursor ?? undefined });
  const rows = q.data?.pages.flatMap(p => p.items) ?? [];
  return <section aria-label="Vincular operaciones" className="space-y-2">
    <h4 className="text-sm font-medium">Vincular operaciones · {mode}</h4>
    <p className="text-xs text-[var(--ink-3)]">{links.length}/50 ejemplos. Vincular no crea operaciones ni añade minutos. La fecha de mercado se conserva.</p>
    <Input type="search" aria-label="Buscar operaciones de esta modalidad" placeholder="Símbolo o notas" value={search} onChange={e => setSearch(e.target.value)} />
    {q.error && <p role="alert">No se pudieron buscar operaciones. <Button type="button" variant="link" onClick={() => void q.refetch()}>Reintentar</Button></p>}
    {q.isLoading ? <p role="status">Buscando operaciones…</p> : rows.length === 0 ? <p className="text-xs">Sin operaciones en esta modalidad con esta búsqueda.</p> : <ul className="max-h-52 overflow-auto space-y-2">
      {rows.map(t => {
        const selected = links.some(l => l.tradeId === t.id);
        const executionElsewhere = kind === "EXECUTION" && t.practiceLinks.some(l => l.practiceId !== practiceId);
        return <li key={t.id} className="flex gap-2 items-start text-xs">
          <label className="flex flex-1 gap-2"><input type="checkbox" checked={selected} disabled={!selected && (executionElsewhere || links.length >= 50)} onChange={() => onChange(selected ? links.filter(l => l.tradeId !== t.id) : [...links, { tradeId: t.id, role: kind === "EXECUTION" ? "EXECUTED" : "REVIEWED" }])} />
            <span>{t.symbol} · mercado {t.date.slice(0,10)} · {t.status}{executionElsewhere ? " · ya ejecutada; elige Revisión para reutilizar" : ""}</span>
          </label>
          <a className="underline" href={`/trades?mode=${mode}&trade=${t.id}`} target="_blank" rel="noreferrer">Original</a>
        </li>;
      })}
    </ul>}
    {links.filter(l => !rows.some(t => t.id === l.tradeId)).map(l => <p key={l.tradeId} className="text-xs">Operación seleccionada <a className="underline" target="_blank" rel="noreferrer" href={`/trades?mode=${mode}&trade=${l.tradeId}`}>{l.tradeId}</a> <Button type="button" variant="link" size="sm" onClick={() => onChange(links.filter(item => item.tradeId !== l.tradeId))}>Quitar vínculo</Button></p>)}
    {q.hasNextPage && <Button type="button" variant="ghost" size="sm" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>Cargar más operaciones</Button>}
  </section>;
}
