"""Screenshots of the site at 1440, 768, 390 and 320 px and with reduced motion (redesign/.shots/, JPEG), and the OG image
and touch icon from scripts/og.html. Serves the folder on a local port; nothing leaves this machine.
Run: python3 scripts/shots.py [--assets]"""
import functools, http.server, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
# A dot folder: kept in git as evidence, never served by the site host (it would count against the deploy).
OUT = ROOT / 'redesign' / '.shots'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


handler = functools.partial(Quiet, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
OUT.mkdir(parents=True, exist_ok=True)
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        if '--assets' in sys.argv:
            page = browser.new_page(viewport={'width': 1200, 'height': 630})
            page.goto(f'{base}/scripts/og.html'); page.wait_for_timeout(1600)
            page.locator('#og').screenshot(path=str(ROOT / 'og.png'))
            page.locator('#icon').screenshot(path=str(ROOT / 'apple-touch-icon.png'))
        for width, height in [(1440, 900), (768, 1024), (390, 844), (320, 640)]:
            for motion in ['no-preference', 'reduce'] if width in (1440, 390) else ['no-preference']:
                ctx = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion=motion, device_scale_factor=1)
                page = ctx.new_page()
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
                page.goto(f'{base}/'); page.wait_for_timeout(1500)
                tag = f'{width}' + ('-reduced' if motion == 'reduce' else '')
                page.screenshot(path=str(OUT / f'{tag}-hero.jpg'), type='jpeg', quality=72)
                page.screenshot(path=str(OUT / f'{tag}-full.jpg'), type='jpeg', quality=60, full_page=True)
                if motion == 'no-preference' and width in (1440, 390):
                    # The scroll stage builds as the page scrolls (a full-page capture cannot show it): one frame per state.
                    top = page.evaluate("document.querySelector('#product').offsetTop")
                    for i, frac in enumerate([0.3, 1.0, 1.8, 2.6]):
                        page.evaluate(f'window.scrollTo(0, {top} + {frac} * innerHeight * 0.72)'); page.wait_for_timeout(900)
                        page.screenshot(path=str(OUT / f'{tag}-stage-{i + 1}.jpg'), type='jpeg', quality=72)
                ctx.close()
        browser.close()
finally:
    server.shutdown()
print('errors:', errors or 'none')
