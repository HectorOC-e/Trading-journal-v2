import { FiscalWorkspace } from "./components/fiscal-workspace";
export default async function FiscalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const value = (await searchParams).rulesYear;
  const year =
    typeof value === "string" && /^\d{4}$/.test(value)
      ? Number(value)
      : undefined;
  return (
    <FiscalWorkspace
      initialRuleYear={
        year !== undefined && year >= 2026 && year <= 2100 ? year : undefined
      }
    />
  );
}
