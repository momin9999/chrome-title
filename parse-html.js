// Pure HTML metadata parsing for linked pages. Kept free of any chrome.* APIs
// so it can be unit-tested in plain Node. Service workers have no DOMParser,
// so we scan the raw HTML with regexes.

export function parseMeta(html) {
  // Only the <head> matters; cap the scanned region to keep parsing cheap.
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(
    0,
    headEnd >= 0 ? headEnd : Math.min(html.length, 200000)
  );
  return {
    title: parseTitle(head),
    description: parseDescription(head),
  };
}

export function parseTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
  if (!title) title = metaContent(html, ['og:title', 'twitter:title']);
  return title;
}

export function parseDescription(html) {
  return metaContent(html, [
    'description',
    'og:description',
    'twitter:description',
  ]);
}

// Collect the content of every relevant <meta> tag, then return the first
// match by `names` *priority order* (not document order) — e.g. a plain
// `description` is preferred over `og:description` even if it appears later.
export function metaContent(html, names) {
  const found = Object.create(null);
  const metaTag = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaTag.exec(html)) !== null) {
    const tag = m[0];
    const key = (attr(tag, 'name') || attr(tag, 'property')).toLowerCase();
    if (!key || found[key] || !names.includes(key)) continue;
    const content = attr(tag, 'content');
    if (!content) continue;
    const value = decodeEntities(content).replace(/\s+/g, ' ').trim();
    if (value) found[key] = value;
  }
  for (const name of names) {
    if (found[name]) return found[name];
  }
  return '';
}

// Read an attribute from a single tag string. Requires the attribute name to be
// preceded by start-of-string or whitespace so "name" doesn't match "data-name".
export function attr(tag, name) {
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    'i'
  );
  const m = tag.match(re);
  if (!m) return '';
  return m[1] ?? m[2] ?? m[3] ?? '';
}

export function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&'); // must run last
}

function safeCodePoint(cp) {
  try {
    return String.fromCodePoint(cp);
  } catch (_) {
    return '';
  }
}
