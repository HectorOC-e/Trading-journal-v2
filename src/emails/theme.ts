// Email design tokens — hex mirror of the app's oklch theme (globals.css).
// Email clients don't support oklch, so we keep a hand-tuned hex palette per mode.
// Visual reference: "Dashboard sereno" mockups (spec §9).

export interface EmailTheme {
  mode: "light" | "dark"
  pageBg: string
  cardBg: string
  cardBorder: string
  accent: string
  band: string
  onAccent: string
  onBandMuted: string
  ink: string
  ink2: string
  ink3: string
  lineSection: string
  lineRow: string
  lossText: string
  lossBg: string
  amberText: string
  amberBg: string
  win: string
  footerBg: string
  footerInk: string
}

export const lightTheme: EmailTheme = {
  mode: "light",
  pageBg: "#f4f5f8",
  cardBg: "#ffffff",
  cardBorder: "#e7e9ef",
  accent: "#4f6ef7",
  band: "#4f6ef7",
  onAccent: "#ffffff",
  onBandMuted: "#dbe2ff",
  ink: "#14161d",
  ink2: "#4b5160",
  ink3: "#8b909c",
  lineSection: "#eef0f4",
  lineRow: "#f4f5f8",
  lossText: "#e5484d",
  lossBg: "#fdeaea",
  amberText: "#9a6a12",
  amberBg: "#fef3e0",
  win: "#1aa35a",
  footerBg: "#fafbfc",
  footerInk: "#a9adb8",
}

export const darkTheme: EmailTheme = {
  mode: "dark",
  pageBg: "#0f1117",
  cardBg: "#181a22",
  cardBorder: "#262a35",
  accent: "#5e7bff",
  band: "#4a64ef",
  onAccent: "#ffffff",
  onBandMuted: "#dbe2ff",
  ink: "#ecedf0",
  ink2: "#b4b8c2",
  ink3: "#767b87",
  lineSection: "#262a35",
  lineRow: "#20232c",
  lossText: "#ff8a8e",
  lossBg: "#3a2226",
  amberText: "#f0b454",
  amberBg: "#3a2f1c",
  win: "#3ecf8e",
  footerBg: "#14161d",
  footerInk: "#6b707c",
}

export function resolveTheme(mode: "light" | "dark" | undefined): EmailTheme {
  return mode === "dark" ? darkTheme : lightTheme
}

export const fontSans =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const fontMono =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
