// Popup: shows the current tab's title and description with copy buttons.

import { extractPageMeta } from './extract-page.js';

const els = {
  favicon: document.getElementById('favicon'),
  siteTitle: document.getElementById('site-title'),
  siteUrl: document.getElementById('site-url'),
  titleValue: document.getElementById('title-value'),
  descValue: document.getElementById('desc-value'),
  copyTitle: document.getElementById('copy-title'),
  copyDesc: document.getElementById('copy-desc'),
  note: document.getElementById('note'),
};

let current = { title: '', description: '' };

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    els.siteUrl.textContent = tab.url || '';
    if (tab.favIconUrl) els.favicon.src = tab.favIconUrl;
  }

  let meta = { title: '', description: '' };
  let injected = false;

  if (tab && typeof tab.id === 'number') {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageMeta,
      });
      if (res && res.result) {
        meta = res.result;
        injected = true;
      }
    } catch (_) {
      // Restricted page (chrome://, Web Store, PDF viewer, …).
    }
  }

  if (!meta.title && tab) meta.title = tab.title || '';
  current = meta;

  els.siteTitle.textContent = meta.title || tab?.title || '(タイトルなし)';

  renderValue(els.titleValue, els.copyTitle, meta.title);
  renderValue(els.descValue, els.copyDesc, meta.description);

  if (!injected) {
    showNote('このページでは description を取得できません（chrome:// や拡張機能ページなど）。');
  }
}

function renderValue(valueEl, btn, text) {
  if (text) {
    valueEl.textContent = text;
    valueEl.classList.remove('empty');
    btn.disabled = false;
  } else {
    valueEl.textContent = 'ありません';
    valueEl.classList.add('empty');
    btn.disabled = true;
  }
}

function showNote(message) {
  els.note.textContent = message;
  els.note.hidden = false;
}

els.copyTitle.addEventListener('click', () => copy(current.title, els.copyTitle));
els.copyDesc.addEventListener('click', () => copy(current.description, els.copyDesc));

async function copy(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flash(btn);
  } catch (_) {
    // Fallback for the rare case navigator.clipboard is unavailable.
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    flash(btn);
  }
}

function flash(btn) {
  const original = btn.textContent;
  btn.textContent = 'コピー済み';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 1200);
}
