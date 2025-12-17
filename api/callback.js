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

  const targetOrigin = req.query.state || '*';
  const safeOrigin = /^https?:\/\//.test(targetOrigin) ? targetOrigin : '*';

  const page = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authentication Complete</title>
  </head>
  <body>
    <p>You can close this window.</p>
    <script>
      (function() {
        var token = ${JSON.stringify(data.access_token)};
        var targetOrigin = ${JSON.stringify(safeOrigin)};
        function postToken(origin) {
          if (!window.opener) return;
          try {
            window.opener.postMessage('authorization:github:success:' + token, origin);
          } catch (err) {
            window.opener.postMessage('authorization:github:success:' + token, '*');
          }
        }
        function receiveMessage(event) {
          postToken(event.origin || targetOrigin);
          setTimeout(function() { window.close(); }, 50);
        }
        window.addEventListener('message', receiveMessage, false);
        if (window.opener) {
          window.opener.postMessage('authorizing:github', '*');
        }
        setTimeout(function() {
          postToken(targetOrigin);
          window.close();
        }, 2000);
      })();
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(page);
}
