import express from 'express';
import fetch from 'node-fetch';

const app = express();

app.get('/auth', (_req, res) => {
  const { GITHUB_CLIENT_ID, REDIRECT_URL } = process.env;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URL);
  res.redirect(url.toString());
});

app.get('/callback', async (req, res) => {
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
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) return res.status(400).json(tokenJson);

  const origin = (process.env.ALLOWED_ORIGINS || '').split(',')[0];
  const next = `${origin}/admin/#access_token=${tokenJson.access_token}`;
  res.redirect(next);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`OAuth proxy on ${port}`));
