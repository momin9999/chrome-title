// Service worker (MV3). Handles the right-click context menus, fetches linked
// pages, reads the current page's metadata, and copies results to the clipboard
// via an offscreen document.

import { extractPageMeta } from './extract-page.js';
import { parseMeta } from './parse-html.js';

const MENU = {
  LINK_TITLE: 'link-title',
  LINK_DESC: 'link-desc',
  PAGE_TITLE: 'page-title',
  PAGE_DESC: 'page-desc',
};

const NOTIFY_TITLE = 'タイトル & description コピー';

// ---------------------------------------------------------------------------
// Context menus
// ---------------------------------------------------------------------------
function buildMenus() {
  chrome.contextMenus.removeAll(() => {
    // Link right-click -> operates on the LINK's destination. Prefixed with "L:".
    chrome.contextMenus.create({
      id: MENU.LINK_TITLE,
      title: 'L:タイトルを取得',
      contexts: ['link'],
    });
    chrome.contextMenus.create({
      id: MENU.LINK_DESC,
      title: 'L:descriptionを取得',
      contexts: ['link'],
    });
    // Plain page right-click -> operates on the CURRENT page. No prefix.
    chrome.contextMenus.create({
      id: MENU.PAGE_TITLE,
      title: 'タイトルを取得',
      contexts: ['page', 'selection'],
    });
    chrome.contextMenus.create({
      id: MENU.PAGE_DESC,
      title: 'descriptionを取得',
      contexts: ['page', 'selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);

// ---------------------------------------------------------------------------
// Click handling
// ---------------------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = info.menuItemId;
  const wantTitle = id === MENU.LINK_TITLE || id === MENU.PAGE_TITLE;
  const label = wantTitle ? 'タイトル' : 'description';

  try {
    let meta;
    if (id === MENU.LINK_TITLE || id === MENU.LINK_DESC) {
      if (!info.linkUrl) {
        notify('リンクのURLを取得できませんでした。');
        return;
      }
      meta = await fetchMeta(info.linkUrl);
    } else {
      meta = await getCurrentPageMeta(tab);
    }

    const value = wantTitle ? meta.title : meta.description;
    if (!value) {
      notify(`${label}が見つかりませんでした。`);
      return;
    }

    await copyToClipboard(value);
    notify(`${label}をコピーしました:\n${truncate(value, 100)}`);
  } catch (err) {
    console.error('[title-desc-copy]', err);
    notify(`取得に失敗しました: ${err && err.message ? err.message : err}`);
  }
});

// ---------------------------------------------------------------------------
// Current page metadata (inject into the active/target tab)
// ---------------------------------------------------------------------------
async function getCurrentPageMeta(tab) {
  const tabId = tab && tab.id;
  if (typeof tabId === 'number' && tabId >= 0) {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractPageMeta,
      });
      if (res && res.result) return res.result;
    } catch (_) {
      // Restricted page (chrome://, Web Store, etc.) — fall back to tab.title.
    }
  }
  return { title: (tab && tab.title) || '', description: '' };
}

// ---------------------------------------------------------------------------
// Fetch a linked page and parse its <title> / meta description.
// ---------------------------------------------------------------------------
async function fetchMeta(url) {
  const res = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseMeta(html);
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ---------------------------------------------------------------------------
// Clipboard via an offscreen document (service workers can't touch the clipboard)
// ---------------------------------------------------------------------------
let creatingOffscreen = null;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }
  creatingOffscreen = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'タイトル/description をクリップボードにコピーするため。',
  });
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function copyToClipboard(text) {
  await ensureOffscreen();
  const resp = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'copy',
    text,
  });
  if (!resp || !resp.ok) {
    throw new Error('クリップボードへのコピーに失敗しました。');
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: NOTIFY_TITLE,
    message,
  });
}
