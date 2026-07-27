"""
Auditoria de tool-use del Coach en vivo, contra PROD.

Instrumenta window.fetch para capturar el stream CRUDO de /api/ai-coach y parsea
las tramas NUL. Eso da la verdad de campo (que tools pidio el modelo y en que
orden), en vez de inferirla del DOM.

Uso:  QA_PASSWORD=... python scripts/coach-tool-audit.py

Escrito el 2026-07-27 para la auditoria posterior a #173. Reutilizable: cambia
PREGUNTAS y su campo `espera` (la tool que la REGLA del system prompt exige, no
la que te guste) y vuelve a correrlo.
"""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright

BASE = "https://www.tjournalx.com"
USER = os.environ.get("QA_USER", "ariaoc89@gmail.com")
# La contrasena NO se versiona. Vive en docs/STATUS.md §"Datos utiles" y en el
# secret E2E_USER_PASSWORD. Exporta QA_PASSWORD antes de correr esto.
PASSWORDS = [p for p in [os.environ.get("QA_PASSWORD")] if p]

# Cada pregunta lleva la tool que la REGLA DEL SYSTEM PROMPT exige (no mi gusto).
PREGUNTAS = [
    dict(
        id="Q1-semantica",
        texto="Que escribi en las notas de mis ultimos trades sobre por que me sali antes de tiempo?",
        espera={"semantic_search"},
        razon="menciona lo que el trader ESCRIBIO -> la regla dice SIEMPRE semantica",
    ),
    dict(
        id="Q2-campos",
        texto="Cuantos trades de NQ cerre en perdida este mes?",
        espera={"search_trades", "get_period_stats"},
        razon="nombra simbolo + resultado concretos -> busqueda por campos",
    ),
    dict(
        id="Q3-aprendizaje",
        texto="Que deberia estudiar hoy y por que?",
        espera={"suggest_study", "get_study_agenda", "get_learning_resources"},
        razon="pregunta de aprendizaje -> herramientas de estudio",
    ),
    dict(
        id="Q4-setup",
        texto="Dame el detalle de mi peor setup: cuantos trades lleva y que win rate tiene.",
        espera={"get_setup_detail", "get_period_stats"},
        razon="pide detalle de un setup concreto",
    ),
    dict(
        id="Q5-multihop",
        texto="Compara los numeros de mi peor setup con lo que anote sobre el en mis reviews.",
        espera={"semantic_search"},
        razon="mitad numeros mitad texto escrito -> deberia encadenar >1 ronda e incluir semantica",
    ),
]

CAPTURE = r"""
window.__caps = [];
(() => {
  const orig = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    const res = await orig(...args);
    if (!url.includes('/api/ai-coach')) return res;
    const rec = { status: res.status, ct: res.headers.get('content-type') || '', raw: '', done: false, err: null };
    window.__caps.push(rec);
    if (!res.body) { rec.done = true; return res; }
    const [a, b] = res.body.tee();
    (async () => {
      const r = b.getReader(); const d = new TextDecoder();
      try {
        for (;;) { const { done, value } = await r.read(); if (done) break; rec.raw += d.decode(value, { stream: true }); }
      } catch (e) { rec.err = String(e); }
      rec.done = true;
    })();
    return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
})();
"""


def parse_frames(raw: str):
    """Separa texto de respuesta y tramas NUL {tool}/{cites}."""
    tools, cites, text, i = [], 0, [], 0
    while True:
        s = raw.find("\x00", i)
        if s < 0:
            text.append(raw[i:]); break
        e = raw.find("\x00", s + 1)
        if e < 0:
            text.append(raw[i:]); break
        text.append(raw[i:s])
        try:
            ev = json.loads(raw[s + 1:e])
            if "tool" in ev: tools.append(ev["tool"])
            if "cites" in ev: cites += len(ev["cites"])
        except Exception:
            pass
        i = e + 1
    return tools, cites, "".join(text).strip()


async def dismiss_overlay(page):
    """Una INTERVENCION ACTIVA bloquea la app con overlay fixed inset-0 sin salida."""
    for label in ["Seguir, asumo el riesgo", "Detener por hoy"]:
        try:
            btn = page.get_by_role("button", name=label)
            if await btn.count() and await btn.first.is_visible():
                print(f"  [overlay] intervencion activa detectada -> '{label}'", flush=True)
                await btn.first.click()
                await page.wait_for_timeout(1200)
                return True
        except Exception:
            pass
    return False


async def login(page):
    for pw in PASSWORDS:
        await page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        email = page.locator('input[type="email"]').first
        pwd = page.locator('input[type="password"]').first
        await email.fill(""); await email.press_sequentially(USER, delay=25)
        await pwd.fill("");   await pwd.press_sequentially(pw, delay=25)
        btn = page.get_by_role("button", name="Iniciar sesión")
        for _ in range(40):  # nace disabled por hidratacion
            if not await btn.is_disabled():
                break
            await page.wait_for_timeout(250)
        await btn.click()
        try:
            await page.wait_for_url(lambda u: "/login" not in u, timeout=25000)
            print(f"  login OK con la password que empieza por {pw[:4]}...", flush=True)
            return True
        except Exception:
            print(f"  login FALLO con {pw[:4]}...", flush=True)
    return False


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--ignore-certificate-errors"])
        ctx = await browser.new_context(ignore_https_errors=True, viewport={"width": 1440, "height": 950})
        await ctx.add_init_script(CAPTURE)
        page = await ctx.new_page()

        print("== login", flush=True)
        if not await login(page):
            print("ABORTA: no se pudo iniciar sesion"); await browser.close(); return

        await page.wait_for_timeout(2500)
        await dismiss_overlay(page)

        # Abrir el drawer del Coach (FAB anclado por aria-label)
        fab = page.locator('[aria-label*="coach" i]').first
        await fab.wait_for(state="visible", timeout=20000)
        await fab.click()
        await page.wait_for_timeout(2000)
        await dismiss_overlay(page)

        results = []
        for q in PREGUNTAS:
            print(f"\n== {q['id']}: {q['texto'][:60]}...", flush=True)
            before = await page.evaluate("window.__caps.length")

            ta = page.locator("textarea").last          # el input del coach es <textarea>
            await ta.click()
            await ta.fill("")
            await ta.press_sequentially(q["texto"], delay=8)
            await ta.press("Enter")

            # Esperar a que aparezca la captura y termine el stream (max 180 s)
            rec = None
            t0 = time.time()
            while time.time() - t0 < 180:
                caps = await page.evaluate("window.__caps.length")
                if caps > before:
                    rec = await page.evaluate(f"window.__caps[{before}]")
                    if rec and rec.get("done"):
                        break
                await page.wait_for_timeout(1000)

            if not rec:
                print("  SIN CAPTURA (posible overlay o fallo de envio)", flush=True)
                await dismiss_overlay(page)
                results.append(dict(q=q["id"], error="sin captura"))
                continue

            tools, ncites, text = parse_frames(rec.get("raw", ""))
            elapsed = round(time.time() - t0, 1)
            ok = bool(set(tools) & q["espera"])
            results.append(dict(
                q=q["id"], status=rec.get("status"), ct=rec.get("ct", "")[:40],
                tools=tools, rondas_con_tools=len(tools), cites=ncites,
                chars=len(text), err=rec.get("err"), acierto=ok,
                espera=sorted(q["espera"]), segs=elapsed,
                texto=text[:400],
            ))
            print(f"  status={rec.get('status')} tools={tools} cites={ncites} chars={len(text)} err={rec.get('err')} {elapsed}s", flush=True)
            await page.wait_for_timeout(3000)

        out = "coach_audit_result.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n== escrito {out}", flush=True)
        await browser.close()


asyncio.run(main())
