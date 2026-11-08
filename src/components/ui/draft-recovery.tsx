"use client"
import { Button } from './button'
export function DraftRecovery({ onRestore, onDiscard }: { onRestore: () => void; onDiscard: () => void }) {
 return <div role="status" className="mb-3 rounded-[var(--radius-sm)] border border-[var(--line)] p-3 text-sm"><p>Hay un borrador local sin guardar. Restaurarlo reemplazará los campos de este formulario.</p><div className="mt-2 flex gap-2"><Button type="button" size="sm" onClick={onRestore}>Restaurar borrador</Button><Button type="button" size="sm" variant="ghost" onClick={onDiscard}>Descartar borrador</Button></div></div>
}
