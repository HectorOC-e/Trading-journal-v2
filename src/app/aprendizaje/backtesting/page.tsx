import { z } from "zod"
import { BacktestWorkspace } from "./components/workspace"

export default async function BacktestingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const id = (value: unknown) => z.uuid().safeParse(value).data
  return <BacktestWorkspace sessionId={id(params.session)} setupId={id(params.setup)} tradeId={id(params.trade)} createNew={params.new === "1" || !!id(params.setup)} criterion={typeof params.criterion === "string" ? params.criterion.slice(0, 240) : undefined} />
}
