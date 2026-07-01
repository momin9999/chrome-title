// Offscreen document: the only place in the extension (besides visible pages)
// allowed to touch the clipboard. Receives text from the service worker and
// writes it using a textarea + execCommand('copy').

const buffer = document.getElementById('clipboard-buffer');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== 'offscreen') return;

  if (message.type === 'copy') {
    let ok = false;
    try {
      buffer.value = message.text ?? '';
      buffer.focus();
      buffer.select();
      ok = document.execCommand('copy');
    } catch (_) {
      ok = false;
    } finally {
      buffer.value = '';
    }
    sendResponse({ ok });
  }
  // Keep the message channel open for the (synchronous) sendResponse above.
  return true;
});
