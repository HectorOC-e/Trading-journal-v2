/** Supavisor session mode reserves a backend per serverless client. Use the
 * transaction endpoint for Vercel runtime traffic; leave direct/local/CLI URLs
 * and credentials unchanged. PrismaPg uses unnamed statements by default.
 */
export function serverlessDatabaseUrl(connectionString: string, onVercel: boolean): string {
  if (!onVercel) return connectionString
  const url = new URL(connectionString)
  if ((url.protocol === "postgres:" || url.protocol === "postgresql:") &&
    url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
    url.port = "6543"
    return url.toString()
  }
  return connectionString
}
