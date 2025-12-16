export default function handler(req, res) {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.REDIRECT_URL); // e.g. https://<proxy>.vercel.app/callback
  url.searchParams.set('scope', 'repo');
  res.redirect(url.toString());
}
