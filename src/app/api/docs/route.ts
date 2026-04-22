export function GET() {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GDPR Rights API — Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css">
  <style>
    body { margin: 0; background: #f3f2f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .topbar { background: #0078d4; padding: 12px 24px; display: flex; align-items: center; gap: 12px; }
    .topbar img { height: 28px; }
    .topbar h1 { color: #fff; font-size: 16px; font-weight: 600; margin: 0; }
    .topbar small { color: rgba(255,255,255,0.7); font-size: 12px; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fff; border: 1px solid #edebe9; border-radius: 4px; }
    .swagger-ui .opblock { border-radius: 4px; }
    .swagger-ui .opblock.opblock-post { border-color: #0078d4; }
    .swagger-ui .opblock.opblock-get { border-color: #107c10; }
    .swagger-ui .btn.authorize { background: #0078d4; border-color: #0078d4; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>📋 GDPR Rights API</h1>
      <small>Ενσωματώστε τα δικαιώματα GDPR στα websites της επιχείρησής σας</small>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${base}/api/public/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: (req) => { req.headers['X-API-Key'] = req.headers['X-API-Key'] || ''; return req; },
      });
    }
  </script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
