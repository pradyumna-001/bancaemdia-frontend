"""Real HTTP session setup, outside the measured cold navigation."""

from pathlib import Path

SOURCE = (
    (Path(__file__).resolve().parents[2] / "scripts/prepare-measurement-session.mjs")
    .read_text(encoding="utf8")
    .replace("export async function ", "async function ", 1)
)


async def prepare_session(page, origin):
    # JSON has no application assets or scripts. A new navigation afterwards
    # still exercises the public SPA bootstrap, guard and all real API reads.
    await page.goto(origin + "/config.json")
    # Destroy the previous SPA before activation can initiate a competing refresh.
    await page.bring_to_front()
    assert await page.evaluate(f"({SOURCE})()"), "Session setup failed"
