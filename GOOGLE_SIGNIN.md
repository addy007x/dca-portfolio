# Google Sign-In Setup

The app includes a Google sign-in button through Supabase OAuth.

1. In Supabase, go to Authentication > Providers > Google and enable it.
2. Create a Google OAuth Client ID in Google Cloud Console.
3. Add your app origin as an Authorized JavaScript origin: `https://addy007x.github.io`
4. Add the Supabase callback URL as an Authorized redirect URI. Supabase shows this callback URL inside the Google provider settings.
5. Add `https://addy007x.github.io/dca-portfolio/` to Supabase Authentication > URL Configuration > Redirect URLs.

Useful docs:

- Supabase Google login: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
