"use client";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Panel, formatMoney } from "./fiscal-form";

function checkedAt(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("es-HN", {
        dateStyle: "medium",
        timeStyle: "short",
        hourCycle: "h23",
        timeZone: "America/Tegucigalpa",
      }).format(new Date(value))
    : "Todavía sin una consulta completada";
}
function changeRows(
  value: unknown,
): { label: string; before: string | null; after: string | null }[] {
  return Array.isArray(value)
    ? value.filter(
        (
          v,
        ): v is {
          label: string;
          before: string | null;
          after: string | null;
        } =>
          !!v &&
          typeof v === "object" &&
          typeof v.label === "string" &&
          (typeof v.before === "string" || v.before === null) &&
          (typeof v.after === "string" || v.after === null),
      )
    : [];
}
export function RulesPanel({
  year,
  years,
  onYearChange,
}: {
  year: number;
  years: number[];
  onYearChange: (year: number) => void;
}) {
  const query = trpc.tax.rules.status.useQuery({ year }, { staleTime: 60_000 });
  const data = query.data;
  return (
    <div id="reglas-fiscales" className="scroll-mt-6">
      <Panel title="Reglas fiscales y actualizaciones">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm">
            Consultar reglas del ejercicio{" "}
            <select
              className="m-2 rounded bg-[var(--panel-2)] p-2"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {[...new Set([...years, ...(data?.availableYears ?? []), year])]
                .sort()
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </label>
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Actualizar estado
          </Button>
        </div>
        <p className="text-sm text-[var(--ink-3)]">
          Consultamos diariamente las publicaciones del SAR. Las nuevas tablas
          anuales compatibles se activan tras validar su fuente y estructura;
          los cambios que requieren revisión no se aplican automáticamente.
        </p>
        {query.isPending ? (
          <p role="status" className="mt-3">
            Consultando reglas…
          </p>
        ) : query.error ? (
          <p role="alert" className="mt-3">
            No pudimos consultar el estado de las reglas.{" "}
            <Button variant="ghost" onClick={() => void query.refetch()}>
              Reintentar reglas
            </Button>
          </p>
        ) : (
          data && (
            <div className="space-y-3 mt-4">
              <p className="font-medium">
                {data.available
                  ? `Reglas ISR ${year} disponibles`
                  : `Reglas ISR ${year} pendientes`}
              </p>
              {!data.available && (
                <p className="text-sm">
                  Puedes registrar ingresos, movimientos y documentos. El
                  cálculo y la simulación se habilitan cuando exista una tabla
                  validada para este ejercicio.
                </p>
              )}
              {data.sync?.status === "SOURCE_UNAVAILABLE" && (
                <p role="status" className="text-sm">
                  No se pudo consultar la fuente oficial. Se reintentará
                  automáticamente; las reglas ya publicadas se conservan.
                </p>
              )}
              {data.sync?.status === "SETUP_PENDING" && (
                <p role="status" className="text-sm">
                  El seguimiento automático está pendiente de habilitación.
                </p>
              )}
              {(!data.sync ||
          data.sync.status === "NOT_CHECKED" ||
                data.sync.status === "CHECKING") && (
                <p className="text-sm">
                  {data.sync?.status === "CHECKING"
                    ? "Comprobación oficial en curso."
                    : "La primera comprobación automática está pendiente."}
                </p>
              )}
              {data.reviewRequired && (
                <p role="status" className="text-sm">
                  Una publicación requiere revisión antes de activar cambios
                  para este ejercicio.
                </p>
              )}
              <p className="text-xs text-[var(--ink-3)]">
                Última consulta completada:{" "}
                {checkedAt(data.sync?.lastSuccessAt)} · Honduras (UTC−6).
              </p>
              {data.active && (
                <>
                  <p className="text-xs break-all">
                    Versión: {data.active.version}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <caption className="text-left mb-2">
                        Tabla anual de renta neta gravable · HNL
                      </caption>
                      <thead>
                        <tr>
                          <th className="py-2 pr-4" scope="col">
                            Límite superior del tramo
                          </th>
                          <th scope="col">Tasa marginal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.active.brackets.map((b, i) => (
                          <tr key={i} className="border-t border-[var(--line)]">
                            <td className="py-2 pr-4">
                              {b.upper === null
                                ? "Sin límite superior"
                                : `L ${formatMoney(b.upper)}`}
                            </td>
                            <td>{["Exento", "15%", "20%", "25%"][i]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {data.active.references.map((ref) => (
                      <a
                        key={ref.id}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-[var(--accent)]"
                      >
                        Fuente oficial · {ref.id}
                      </a>
                    ))}
                  </div>
                </>
              )}
              <details className="border-t border-[var(--line)] pt-3">
                <summary className="cursor-pointer text-sm">
                  Historial de cambios publicados ({data.updates.length})
                </summary>
                {data.updates.length === 0 ? (
                  <p className="text-sm mt-2">
                    No se han publicado actualizaciones automáticas para este
                    ejercicio. La tabla inicial de 2026 se conserva sin generar
                    un aviso nuevo.
                  </p>
                ) : (
                  <ul className="space-y-3 mt-3">
                    {data.updates.map((update) => (
                      <li key={update.id} className="text-sm">
                        <a
                          href={update.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-[var(--accent)]"
                        >
                          {update.agreement ?? `ISR ${update.year}`}
                        </a>
                        <span className="block text-xs">
                          {checkedAt(update.publishedAt)}
                        </span>
                        {changeRows(update.changes).length ? (
                          changeRows(update.changes).map((c) => (
                            <p key={c.label}>
                              {c.label}:{" "}
                              {c.before === null
                                ? "Sin referencia anterior"
                                : `L ${formatMoney(c.before)}`}{" "}
                              →{" "}
                              {c.after === null
                                ? "Sin límite"
                                : `L ${formatMoney(c.after)}`}
                            </p>
                          ))
                        ) : (
                          <p>
                            Tabla disponible para el nuevo ejercicio, sin
                            variación en los umbrales comparados.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          )
        )}
        <p className="text-xs mt-4 text-[var(--ink-3)]">
          Al publicarse una actualización recibirás un aviso en Notificaciones ·
          Fiscalidad. Para recibirlo también por correo, activa Email ·
          Fiscalidad en{" "}
          <a href="/perfil" className="underline">
            Perfil → Notificaciones
          </a>
          . Los ejercicios anteriores y las declaraciones archivadas conservan
          su versión.
        </p>
      </Panel>
    </div>
  );
}
