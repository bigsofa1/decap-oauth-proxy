export default function handler(req, res) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.REDIRECT_URL); // e.g. https://<proxy>.vercel.app/callback
  url.searchParams.set('scope', 'repo');

  // Decap sends along a state param; forward it so we can use it in the callback for postMessage origin.
  if (req.query.state) {
    url.searchParams.set('state', req.query.state);
  }

  res.redirect(url.toString());
}
