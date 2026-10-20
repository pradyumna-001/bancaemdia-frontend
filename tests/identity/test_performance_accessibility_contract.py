"""Large real populations: both themes, keyboard, reflow and trusted interactions.

Only allowlisted aggregates leave memory. Accessibility trees and private DOM do not.
"""

import asyncio
import importlib.util
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import async_playwright

_spec = importlib.util.spec_from_file_location(
    "frontend_accessibility_measurement",
    Path(__file__).with_name("test_performance_contract.py"),
)
measurement = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = measurement
_spec.loader.exec_module(measurement)
core, load, resolved_routes = (
    measurement.core,
    measurement.load,
    measurement.resolved_routes,
)

seed = load("frontend_accessibility_seed", "performance_seed.py")
banco = core.banco
harness = core.harness
ROOT = Path(__file__).resolve().parents[2]


def require(condition, code):
    if not condition:
        pytest.fail(code, pytrace=False)


async def settled(page, target):
    await page.wait_for_function(
        """heading => {
          const h = document.querySelector('main h1');
          return h?.getClientRects().length && h.textContent.trim() === heading &&
            !document.querySelector('[aria-busy="true"]') &&
            ![...document.querySelectorAll('[role="status"]')].some(n =>
              n.getClientRects().length &&
              /^(Abrindo|Carregando|Consultando|Conferindo)/.test(n.textContent.trim()));
        }""",
        arg=target["heading"],
    )
    require(await page.locator("main .erro-api").count() == 0, "A11Y_PAGE_ERROR")


async def keyboard(page, private):
    # Fresh navigation starts focus at the document; use actual trusted keys.
    await page.keyboard.press("Tab")
    if private:
        require(
            await page.locator(".pular-conteudo").evaluate(
                "el => el === document.activeElement"
            ),
            "A11Y_SKIP_LINK",
        )
        await page.keyboard.press("Enter")
    steps = await page.evaluate(
        """privatePage => {
          const scope = document.querySelector(privatePage ? '#conteudo' : 'main');
          return Math.min(4, [...scope.querySelectorAll(
            'a[href],button,input,textarea,summary,[tabindex]'
          )].filter(el => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length).length);
        }""",
        private,
    )
    require(steps > 0, "A11Y_PAGE_ACTION_REQUIRED")
    # Stop at the real controls of short pages rather than testing browser chrome.
    for _ in range(steps):
        await page.keyboard.press("Tab")
        require(
            await page.evaluate(
                """() => {
                  const el = document.activeElement;
                  if (!el || el === document.body || !el.getClientRects().length) return false;
                  const style = getComputedStyle(el);
                  return el.matches(':focus-visible') &&
                    (style.outlineStyle !== 'none' || style.boxShadow !== 'none');
                }"""
            ),
            "A11Y_VISIBLE_KEYBOARD_FOCUS",
        )


async def graph_alternatives(page):
    count = 0
    for graph in await page.locator(".grafico,.analises-banca").all():
        if not await graph.locator("svg").count():
            continue
        details = graph.locator("details")
        if await details.count():
            summary = details.locator("summary").first
            await summary.focus()
            await page.keyboard.press("Enter")
        require(await graph.locator("table").count() > 0, "A11Y_GRAPH_TABLE")
        table = graph.locator("table").first
        require(await table.is_visible(), "A11Y_GRAPH_TABLE_VISIBLE")
        require(await table.locator("th").count() > 0, "A11Y_GRAPH_HEADERS")
        count += 1
        if await details.count():
            await summary.focus()
            await page.keyboard.press("Enter")
            require(
                await summary.evaluate("el => el === document.activeElement"),
                "A11Y_GRAPH_FOCUS_RETURN",
            )
    return count


async def expanded_analyses(page):
    count = 0
    for section in await page.locator(".analises-recorte").all():
        summary = section.locator(":scope > summary")
        await summary.focus()
        await page.keyboard.press("Enter")
        require(await section.get_attribute("open") is not None, "A11Y_ANALYSIS_EXPAND")
        table_details = section.locator(".analises-tabela-detalhe")
        if await table_details.count():
            table_summary = table_details.locator("summary")
            await table_summary.focus()
            await page.keyboard.press("Enter")
        require(
            await section.locator("table").first.is_visible(), "A11Y_ANALYSIS_TABLE"
        )
        require(await section.locator("th").count() > 0, "A11Y_ANALYSIS_HEADERS")
        if await section.locator(".analises-mapa").count():
            require(
                await section.locator(".analises-mapa tbody tr").count() == 7,
                "A11Y_MATRIX_DAYS",
            )
            require(
                await section.locator(".analises-mapa thead th").count() == 5,
                "A11Y_MATRIX_COLUMNS",
            )
            region = section.get_by_role("region", name="Mapa de dias e horários")
            await region.focus()
            await page.keyboard.press("ArrowRight")
            require(
                await region.evaluate("el => el === document.activeElement"),
                "A11Y_MATRIX_KEYBOARD",
            )
        await core.accessibility(page)
        count += 1
        await summary.focus()
        await page.keyboard.press("Enter")
        require(
            await summary.evaluate("el => el === document.activeElement"),
            "A11Y_ANALYSIS_FOCUS_RETURN",
        )
    require(count > 0, "A11Y_ANALYSIS_INVENTORY")
    # Every published period remains visible without requiring a tooltip/hover.
    for table in await page.locator(".serie-valores table").all():
        require(await table.is_visible(), "A11Y_PERIODS_ALWAYS_VISIBLE")
    return count


async def photo(page):
    reserved = page.locator(".foto-aposta-espaco")
    before = await reserved.bounding_box()
    await page.get_by_role("button", name="Abrir foto", exact=True).click()
    image = reserved.locator("img")
    await image.wait_for(state="visible")
    after = await reserved.bounding_box()
    require(
        before
        and after
        and all(abs(before[k] - after[k]) <= 1 for k in ("width", "height")),
        "A11Y_PHOTO_RESERVED_SPACE",
    )
    require(await image.get_attribute("loading") == "lazy", "A11Y_PHOTO_LAZY")
    button = page.get_by_role("button", name="Ampliar foto", exact=True)
    await button.click()
    await page.get_by_role("dialog", name="Foto ampliada").wait_for(state="visible")
    await page.keyboard.press("Escape")
    require(
        await button.evaluate("el => el === document.activeElement"), "A11Y_PHOTO_FOCUS"
    )


async def interactions(page, browser_name, context):
    supported = await page.evaluate(
        "'PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('event')"
    )
    if browser_name == "chromium":
        require(supported, "EVENT_TIMING_REQUIRED")
        cdp = await context.new_cdp_session(page)
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        await cdp.send("Network.enable")
        await cdp.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": 150,
                "downloadThroughput": 200000,
                "uploadThroughput": 75000,
            },
        )
    await page.evaluate(
        """supported => {
          window.__measured = {trusted: 0, durations: []};
          document.addEventListener('click', e => {
            if (e.isTrusted) window.__measured.trusted++;
          });
          if (supported) {
            window.__eventObserver = new PerformanceObserver(list => {
              for (const entry of list.getEntries())
                if (entry.interactionId > 0) window.__measured.durations.push(entry.duration);
            });
            window.__eventObserver.observe({type: 'event', durationThreshold: 16});
          }
        }""",
        supported,
    )
    for name in ("Cartões", "Lista compacta", "Cartões", "Lista compacta"):
        button = page.get_by_role("button", name=name, exact=True)
        await button.click()
        # Observe a subsequent frame; no synthetic dispatch and no timing substitution.
        await page.evaluate(
            "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
        )
        require(
            await button.get_attribute("aria-pressed") == "true",
            "INTERACTION_RESULT_REQUIRED",
        )
        require(
            await page.locator(".aposta-linha").count() == 100, "LARGE_LIST_REQUIRED"
        )
    await asyncio.sleep(
        0.2
    )  # Flush Event Timing's reporting interval, not an app retry.
    result = await page.evaluate("window.__measured")
    require(result["trusted"] >= 4, "TRUSTED_INTERACTIONS_REQUIRED")
    maximum = max(result["durations"], default=None)
    if supported:
        require(maximum is None or maximum < 200, "INTERACTION_LATENCY_EXCEEDED")
    if browser_name == "chromium":
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
        await cdp.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": 0,
                "downloadThroughput": -1,
                "uploadThroughput": -1,
            },
        )
        await cdp.detach()
    return {
        "supported": supported,
        "trustedClicks": result["trusted"],
        "entries": len(result["durations"]),
        "maxDurationMs": maximum,
        "thresholdMs": 16,
        "throttled": browser_name == "chromium",
    }


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize("profile", ["mobile", "desktop"])
async def test_public_spa_large_accessibility(
    harness, engine_admin, engine_app, como, browser_name, profile
):
    viewport = (
        {"width": 390, "height": 844}
        if profile == "mobile"
        else {"width": 1440, "height": 900}
    )
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        private = await browser.new_context(viewport=viewport)
        anonymous = await browser.new_context(viewport=viewport)
        try:
            page = await private.new_page()
            user, _ = await core.backend.register(
                page,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            await core.grant(page, engine_admin, user["usuario_id"], seconds=7200)
            initial, dataset = await seed.seed_large(
                core, page, engine_admin, engine_app, como, user["usuario_id"]
            )
            targets = resolved_routes(initial)
            catalog = json.loads(
                (ROOT / "config/performance-routes.json").read_text(encoding="utf8")
            )
            samples, graphs = [], 0
            public_page = await anonymous.new_page()
            for theme in ("claro", "escuro"):
                for route, target in zip(catalog, targets, strict=True):
                    active = page if route["private"] else public_page
                    await active.emulate_media(
                        color_scheme="light" if theme == "claro" else "dark"
                    )
                    try:
                        await active.goto(core.backend.FRONT + target["path"])
                        await settled(active, target)
                        require(
                            await active.locator("html").get_attribute("data-tema")
                            == theme,
                            "A11Y_SYSTEM_THEME",
                        )
                        require(
                            await active.locator('select,input[type="date"]').count()
                            == 0,
                            "A11Y_NATIVE_PICKER",
                        )
                        await keyboard(active, route["private"])
                        graphs += await graph_alternatives(active)
                        if route["id"] == "painel-analises":
                            graphs += await expanded_analyses(active)
                        await core.accessibility(active)
                        # Review semantics in memory; never persist private tree text.
                        tree = await active.locator("main").aria_snapshot()
                        require("heading" in tree, "A11Y_ACCESSIBLE_TREE")
                        del tree
                        if route["id"] == "aposta-chave-foto":
                            await photo(active)
                    except PlaywrightError:
                        pytest.fail(
                            f"A11Y_ROUTE_FAILED:{route['id']}:{theme}", pytrace=False
                        )
                    samples.append(
                        {"route": route["id"], "theme": theme, "passed": True}
                    )
            root = next(t for t in targets if t["id"] == "apostas")
            await page.goto(core.backend.FRONT + root["path"])
            await settled(page, root)
            timing = await interactions(page, browser_name, private)
            require(graphs > 0, "A11Y_GRAPH_INVENTORY_EMPTY")
            report = {
                "schema": 1,
                "frontendSha": (
                    await asyncio.to_thread(
                        subprocess.check_output,
                        ["git", "rev-parse", "HEAD"],
                        cwd=ROOT,
                        text=True,
                    )
                ).strip(),
                "apiSha": (
                    await asyncio.to_thread(
                        subprocess.check_output, ["git", "rev-parse", "HEAD"], text=True
                    )
                ).strip(),
                "browser": browser_name,
                "browserVersion": browser.version,
                "profile": profile,
                "viewport": viewport,
                "dataset": dataset,
                "samples": samples,
                "graphAlternatives": graphs,
                "photoReservedAndFocus": True,
                "eventTiming": timing,
                "productionAuthorized": False,
            }
            output = (
                Path(os.environ["PERFORMANCE_REPORT_DIR"])
                / f"accessibility-{browser_name}-{profile}.json"
            )
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
        finally:
            await private.close()
            await anonymous.close()
            await browser.close()
