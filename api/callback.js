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

  const page = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authentication Complete</title>
  </head>
  <body>
    <script>
      (function() {
        var token = ${JSON.stringify(data.access_token)};
        // Wait for the opener to send us its origin, then respond with the token.
        function receiveMessage(event) {
          if (!window.opener) return;
          window.opener.postMessage('authorization:github:success:' + token, event.origin);
          window.close();
        }
        window.addEventListener('message', receiveMessage, false);
        // Kick off the handshake so the opener replies with its origin.
        if (window.opener) {
          window.opener.postMessage('authorizing:github', '*');
        }
      })();
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(page);
}
