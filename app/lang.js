// The A/文 language button: the dialog opens with no script (invoker commands); this file puts focus on the current
// language, remembers the visitor's choice, and shows the hint when the browser prefers another of the site's locales.
// The mechanism is the one the public CommandAGI sites use (docs/sites.md § the language button).
(() => {
    const KEY = 'vibecloud.lang';
    const dialog = document.querySelector('#lang-dialog');
    if (dialog) {
        document.querySelector('#lang-button')?.addEventListener('click', event => {
            event.preventDefault();
            if (!dialog.open) dialog.showModal();
        });
        dialog.addEventListener('toggle', () => {
            if (dialog.open) dialog.querySelector('a[aria-current="true"]')?.focus();
        });
        for (const link of dialog.querySelectorAll('a[data-lang]'))
            link.addEventListener('click', () => {
                try { localStorage.setItem(KEY, link.dataset.lang); } catch { /* storage off: the link still goes there */ }
            });
    }
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch { /* storage off */ }
    const hint = document.querySelector('#lang-hint');
    if (stored || !hint) return;
    const langs = (navigator.languages ?? [navigator.language ?? '']).map(l => String(l).toLowerCase());
    const here = String(document.documentElement.lang).toLowerCase();
    const pick = langs.find(l => l.startsWith('zh') && !here.startsWith('zh')) ?? langs.find(l => l.startsWith('es') && !here.startsWith('es'));
    if (!pick) return;
    const target = hint.querySelector('a');
    const zh = pick.startsWith('zh');
    target.href = zh ? '/zh/' : '/es/';
    target.hreflang = zh ? 'zh-Hans' : 'es';
    target.lang = zh ? 'zh-Hans' : 'es';
    target.textContent = zh ? '在简体中文中查看' : 'Ver en español';
    hint.hidden = false;
})();
