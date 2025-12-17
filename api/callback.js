import fetch from 'node-fetch';

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  const body = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: process.env.REDIRECT_URL,
  });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
  const data = await tokenRes.json();
  if (!data.access_token) return res.status(400).json(data);

  const targetOrigin = req.query.state;
  let fallbackUrl = null;
  if (targetOrigin && /^https?:\/\//.test(targetOrigin)) {
    try {
      const parsed = new URL(targetOrigin);
      parsed.hash = `#access_token=${data.access_token}`;
      fallbackUrl = parsed.toString();
    } catch (e) {
      // ignore invalid URL
    }
  }

  const page = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authentication Complete</title>
  </head>
  <body>
    <p>Finishing sign-in…</p>
    <script>
      (function() {
        var token = ${JSON.stringify(data.access_token)};
        var fallbackUrl = ${fallbackUrl ? JSON.stringify(fallbackUrl) : 'null'};

        function postAll(origin) {
          if (!window.opener) return;
          // Object payload (Decap ≥3 expects an object)
          window.opener.postMessage({ token: token, provider: 'github' }, origin);
          // JSON-string payload (some custom widgets expect a JSON string)
          window.opener.postMessage(JSON.stringify({ token: token, provider: 'github' }), origin);
          // Legacy string payload (older Decap/Netlify CMS)
          window.opener.postMessage('authorization:github:success:' + token, origin);
        }
        // Chromium-origin quirk: always blast to "*" to ensure the parent receives it.
        postAll('*');
        setTimeout(function() {
          try { postAll('*'); } catch (e) {}
          // Force-set hash on opener so Decap can pick up the token even if postMessage is ignored.
          if (window.opener) {
            try {
              var href = window.opener.location.href.split('#')[0] + '#access_token=' + token;
              window.opener.location.replace(href);
            } catch (e) {
              // ignore cross-origin errors
            }
          }
          if (fallbackUrl) {
            window.location.href = fallbackUrl;
          }
          window.close();
        }, 1200);
      })();
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(page);
}
