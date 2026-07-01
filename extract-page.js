// Runs *inside the target page* via chrome.scripting.executeScript({ func }).
// Must be fully self-contained: it is serialized with Function.prototype.toString
// and cannot reference anything from module scope.
export function extractPageMeta() {
  const getMeta = (names) => {
    const metas = document.getElementsByTagName('meta');
    for (const m of metas) {
      const key = (m.getAttribute('name') || m.getAttribute('property') || '')
        .trim()
        .toLowerCase();
      if (names.includes(key)) {
        const content = m.getAttribute('content');
        if (content && content.trim()) return content.trim();
      }
    }
    return '';
  };

  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  const title =
    clean(document.title) ||
    clean(getMeta(['og:title', 'twitter:title']));

  const description = clean(
    getMeta(['description', 'og:description', 'twitter:description'])
  );

  return { title, description };
}
