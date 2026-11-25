import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

export async function renderHtmlPdf(html: string, numbered = false): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    const pdf = await page.pdf({ format: "A4", printBackground: true, ...(numbered ? {
      displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: '<div style="width:100%;text-align:center;font:9px sans-serif;color:#64748b">TjournalX · Backtesting · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: "15mm", right: "15mm", bottom: "17mm", left: "15mm" },
    } : {}) })
    return Buffer.from(pdf)
  } finally { await browser.close() }
}
