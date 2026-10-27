"""The site in a browser, as a visitor uses it: the fleet command (plan → approve → apply → verified), the ⌘K palette
by keyboard, the console's plan, provision and outage, the sample sentences, the language dialog, the three locales,
reduced motion and the page with no script. Serves this folder on a local port; nothing leaves this machine.
Run: python3 tests/journey.py (needs Python Playwright and its Chromium)."""
import functools, http.server, threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


handler = functools.partial(Quiet, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'


def errors_of(page):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    return errors


try:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # the fleet: the first command is planned on load; nothing changes before approval
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = errors_of(page)
        page.goto(f'{base}/')
        ops = page.locator('#ops')
        expect(ops).to_have_attribute('data-phase', 'proposed')
        expect(page.locator('#ops-map .n.add')).to_have_count(3)
        expect(page.locator('#ops-log')).to_contain_text('+3 × api in us-west on cloudflare/main')
        expect(page.locator('#ops-log')).to_contain_text('+$87.60')
        expect(page.locator('#ops-apply')).to_be_disabled()
        page.click('#ops-approve')
        expect(ops).to_have_attribute('data-phase', 'approved')
        expect(page.locator('#ops-apply')).to_be_focused()
        page.keyboard.press('Enter')
        expect(ops).to_have_attribute('data-phase', 'verified', timeout=8000)
        expect(page.locator('#ops-map .n.add.ok')).to_have_count(3)
        expect(page.locator('#ops-log')).to_contain_text('(simulated)')

        # a typed command that scales down, and one the console does not know
        page.fill('#ops-cmd', 'scale api to 2 in us-west')
        page.keyboard.press('Enter')
        expect(page.locator('#ops-map .n.del')).to_have_count(4)
        expect(page.locator('#ops-log')).to_contain_text('−4 × api in us-west')
        page.fill('#ops-cmd', 'make it fast')
        page.keyboard.press('Enter')
        expect(ops).to_have_attribute('data-phase', 'idle')
        expect(page.locator('#ops-log')).to_contain_text('Not a command')
        page.fill('#ops-cmd', 'scale api to 9 in us-west')
        page.keyboard.press('Enter')
        expect(page.locator('#ops-log')).to_contain_text('up to 6')

        # the palette, by keyboard only: ⌘K/Ctrl+K, filter, arrows, Enter
        page.keyboard.press('Control+k')
        expect(page.locator('#palette')).to_be_visible()
        expect(page.locator('#palette-input')).to_be_focused()
        page.keyboard.type('drain')
        expect(page.locator('#palette-list [role=option]')).to_have_count(1)
        page.keyboard.press('Enter')
        expect(page.locator('#palette')).to_be_hidden()
        expect(page.locator('#ops-cmd')).to_have_value('drain us-east')
        expect(ops).to_have_attribute('data-phase', 'proposed')
        page.keyboard.press('Control+k')
        page.keyboard.type('add 1 db in us-east')
        expect(page.locator('#palette-list [role=option]').first).to_contain_text('Run')
        page.keyboard.press('Escape')
        expect(page.locator('#palette')).to_be_hidden()
        page.locator('.kbar').click()
        page.keyboard.type('console')
        page.keyboard.press('Enter')
        expect(page.locator('#describe')).to_be_focused()

        # the console: the plan, a sample sentence, an outage that moves a resource, the simulated provision
        expect(page.locator('#plan table')).to_contain_text('gcp/main')
        page.locator('button.try').nth(1).click()
        expect(page.locator('#describe')).to_have_value('A GPU for model training in the US, and a Postgres database, under $3,000 a month.')
        expect(page.locator('#plan table')).to_contain_text('runpod/gpu')
        page.locator('button.try').first.click()
        page.select_option('#outage', 'gcp/main')
        expect(page.locator('#plan td.moved')).to_contain_text('gcp/main')
        page.select_option('#outage', '')
        page.click('#provision')
        expect(page.locator('#steps .step.running')).to_contain_text('Running on', timeout=8000)

        # the language dialog: opens on its current language, links the three locales
        page.click('#lang-button')
        expect(page.locator('#lang-dialog a[aria-current="true"]')).to_be_focused()
        page.keyboard.press('Escape')
        assert not errors, errors

        # the other locales plan in their own words
        for path, word in [('/es/', 'propuesto'), ('/zh/', '已提议')]:
            page.goto(f'{base}{path}')
            expect(page.locator('#ops-state')).to_have_text(word)
            expect(page.locator('#plan table')).to_contain_text('gcp/main')
        assert not errors, errors

        # reduced motion: no video plays, and the fleet still applies
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page = ctx.new_page()
        errors = errors_of(page)
        page.goto(f'{base}/')
        page.locator('.deck').scroll_into_view_if_needed()
        page.wait_for_timeout(600)
        assert page.evaluate("[...document.querySelectorAll('video')].every(v => v.paused)"), 'a video plays with reduced motion'
        expect(page.locator('.deck .vid-toggle')).to_have_text('Play the video')
        page.click('#ops-approve'); page.click('#ops-apply')
        expect(page.locator('#ops')).to_have_attribute('data-phase', 'verified')
        assert page.evaluate('document.documentElement.scrollWidth') <= 390, 'the page scrolls sideways at 390 px'
        assert not errors, errors
        ctx.close()

        # with motion, the section video plays on screen and its button pauses it
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto(f'{base}/')
        page.locator('.deck').scroll_into_view_if_needed()
        page.wait_for_function("!document.querySelector('.deck video').paused", timeout=8000)
        page.click('.deck .vid-toggle')
        assert page.evaluate("document.querySelector('.deck video').paused")
        expect(page.locator('.deck .vid-toggle')).to_have_attribute('aria-pressed', 'true')

        # 320 px: nothing scrolls sideways
        ctx = browser.new_context(viewport={'width': 320, 'height': 640})
        page = ctx.new_page()
        page.goto(f'{base}/')
        page.wait_for_timeout(300)
        assert page.evaluate('document.documentElement.scrollWidth') <= 320, 'the page scrolls sideways at 320 px'
        ctx.close()

        # no script: the page reads, the topology is drawn, the scroll stage shows its whole picture
        ctx = browser.new_context(java_script_enabled=False)
        page = ctx.new_page()
        page.goto(f'{base}/')
        expect(page.locator('#ops-map svg .n')).to_have_count(13)
        expect(page.locator('#stage')).to_have_attribute('data-step', '4')
        expect(page.locator('noscript').first).to_be_attached()
        ctx.close()
        browser.close()
finally:
    server.shutdown()
print('journey: ok')
