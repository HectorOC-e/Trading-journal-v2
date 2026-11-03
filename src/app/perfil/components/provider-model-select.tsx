"use client";
import { useId, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import type { AiProvider } from "@/lib/ai/config";

export function ProviderModelSelect({
  provider,
  value,
  onChange,
  label,
  emptyLabel,
  purpose = "chat",
  warnTools = false,
}: {
  provider: AiProvider;
  value: string;
  onChange: (model: string) => void;
  label: string;
  emptyLabel?: string;
  purpose?: "chat" | "embeddings";
  warnTools?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const catalog = trpc.aiConfig.models.useQuery(
    { provider, purpose },
    {
      enabled: open,
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const models = catalog.data?.models ?? [];
  const selected = models.find((m) => m.id === value);
  const term = query.trim().toLowerCase();
  const unlisted =
    !!value && value !== "auto" && !models.some((m) => m.id === value);
  const choices: Array<{
    id: string;
    name: string;
    free?: boolean;
    supportsTools?: boolean | null;
    supportsVision?: boolean | null;
  }> = [
    ...(emptyLabel ? [{ id: "", name: emptyLabel }] : []),
    { id: "auto", name: "Automático según prioridad" },
    ...(unlisted ? [{ id: value, name: "Actual / personalizado" }] : []),
    ...models.filter((m) => m.id !== "auto"),
  ];
  const matches = choices.filter((m) =>
    `${m.name} ${m.id}`.toLowerCase().includes(term),
  );
  const visible = matches.slice(0, 200);
  const choose = (model: string) => {
    onChange(model);
    setOpen(false);
    setManual(false);
  };
  const title =
    value === "auto"
      ? "Automático según prioridad"
      : value
        ? (selected?.name ?? value)
        : (emptyLabel ?? "Seleccionar modelo");
  return (
    <div className="min-w-0 space-y-1.5">
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery("");
        }}
      >
        <Popover.Trigger asChild>
          <Button
            type="button"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={id}
            variant="ghost"
            className="w-full min-w-0 justify-between text-left font-normal"
            title={value || title}
          >
            <span className="min-w-0 truncate">{title}</span>
            <ChevronDown size={14} className="shrink-0" aria-hidden="true" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            id={id}
            sideOffset={5}
            align="start"
            collisionPadding={16}
            aria-label={`Elegir ${label.toLowerCase()}`}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              search.current?.focus();
            }}
            className="z-[70] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto w-[min(420px,calc(100vw_-_2rem))] rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-lg space-y-2"
          >
            <Input
              ref={search}
              aria-label={`Buscar ${label.toLowerCase()}`}
              placeholder="Buscar por nombre o ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  list.current
                    ?.querySelector<HTMLElement>('[role="option"]')
                    ?.focus();
                }
                if (event.key === "Enter" && visible.length) {
                  event.preventDefault();
                  choose(visible[0].id);
                }
              }}
            />
            {catalog.isLoading && (
              <p role="status" className="text-xs text-[var(--ink-3)]">
                Cargando catálogo…
              </p>
            )}
            {catalog.error && (
              <p role="alert" className="text-xs text-[var(--loss)]">
                No se pudo cargar el catálogo. Revisa la clave, reintenta o
                introduce un ID manual.
              </p>
            )}
            <div
              ref={list}
              role="listbox"
              aria-label={`Catálogo: ${label}`}
              className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] p-1"
              onKeyDown={(event) => {
                const buttons = Array.from(
                  list.current?.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ) ?? [],
                );
                const current = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) &&
                  buttons.length
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buttons.length - 1
                        : (current +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            buttons.length) %
                          buttons.length;
                  buttons[next]?.focus();
                }
                if (event.key === "Enter" || event.key === " ") {
                  const option = (
                    event.target as HTMLElement
                  ).closest<HTMLButtonElement>('[role="option"]');
                  if (option) {
                    event.preventDefault();
                    choose(option.value);
                  }
                }
              }}
            >
              {visible.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={value === m.id}
                  value={m.id}
                  tabIndex={-1}
                  variant="ghost"
                  className={`w-full h-auto justify-start whitespace-normal py-2 text-left font-normal ${value === m.id ? "bg-[var(--accent-soft)]" : ""}`}
                  onClick={() => choose(m.id)}
                >
                  <span className="block min-w-0">
                    <span className="block break-words text-[12px]">
                      {m.name}
                    </span>
                    {m.id && m.id !== "auto" && m.name !== m.id && (
                      <span className="block break-all text-[10px] text-[var(--ink-3)]">
                        {m.id}
                      </span>
                    )}
                    {(m.free || m.supportsTools || m.supportsVision) && (
                      <span className="block text-[10px] text-[var(--ink-3)]">
                        {[
                          m.free ? "Gratis" : "",
                          m.supportsTools ? "Herramientas" : "",
                          m.supportsVision ? "Visión" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </Button>
              ))}
            </div>
            {!catalog.isLoading && !catalog.error && !matches.length && (
              <p className="text-xs text-[var(--ink-3)]">
                No hay modelos con esta búsqueda. Puedes introducir un ID
                manual.
              </p>
            )}
            {catalog.data && (
              <p className="text-xs text-[var(--ink-3)]">
                {catalog.data.scope === "account"
                  ? "Catálogo de tu cuenta"
                  : "Catálogo público"}{" "}
                · {matches.length}{" "}
                {matches.length === 1 ? "opción" : "opciones"}
                {matches.length > visible.length
                  ? ". Usa la búsqueda para acotar la lista."
                  : ""}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={catalog.isFetching}
                onClick={() => void catalog.refetch()}
              >
                Actualizar catálogo
              </Button>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => {
                  setManual(true);
                  setOpen(false);
                }}
              >
                Introducir ID manual
              </Button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {manual && (
        <Input
          aria-label={`ID manual: ${label}`}
          value={value}
          maxLength={100}
          onChange={(event) => onChange(event.target.value)}
          placeholder="ID exacto del proveedor"
        />
      )}
      {!manual && value && value !== "auto" && (
        <p className="break-all text-[10px] text-[var(--ink-3)]">{value}</p>
      )}
      {warnTools && selected?.supportsTools === false && (
        <p className="text-[11px] text-[var(--be)]">
          Este modelo no permite al Coach consultar tus datos mediante
          herramientas según el catálogo.
        </p>
      )}
    </div>
  );
}
