const fs = require('node:fs');
const path = require('node:path');

// Only the three exact assets needed by the browser regression harness are served.
function createStaticHandler(root, theme) {
  const assets = new Map([
    ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
    ['/mock.js', ['.test-build/browser-mock.js', 'application/javascript; charset=utf-8']],
    ['/main.js', ['main.js', 'application/javascript; charset=utf-8']],
  ]);
  return (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end();
      return;
    }
    const route = (req.url || '').split('?')[0];
    if (route === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        req.method === 'HEAD'
          ? undefined
          : `<!doctype html><html><head><meta charset="utf-8"><style>${theme}</style><link rel="stylesheet" href="/styles.css"></head><body><div id="app"></div><script src="/mock.js"></script><script src="/main.js"></script><script>boot().catch(console.error)</script></body></html>`,
      );
      return;
    }
    const asset = assets.get(route);
    if (!asset) {
      res.statusCode = 404;
      res.end();
      return;
    }
    try {
      const bytes = fs.readFileSync(path.join(root, asset[0]));
      res.setHeader('Content-Type', asset[1]);
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  };
}
module.exports = { createStaticHandler };
