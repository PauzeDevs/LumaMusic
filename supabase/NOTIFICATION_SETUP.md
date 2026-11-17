# LumaMusic push notifications: Supabase setup

The app registers Expo push tokens and notification preferences in Supabase. Push delivery is handled by Expo's Push API; Supabase stores device registrations and provides a protected sender function.

## 1. Apply the database migration

In the Supabase dashboard, open **SQL Editor**, create a query, paste the contents of `migrations/202611170001_notification_devices.sql`, and run it.

## 2. Deploy the sender function

Install the Supabase CLI, log in, link this project, then deploy:

```sh
supabase login
supabase link --project-ref vzvxcxmoxhyycwzddzbm
supabase functions deploy send-notification
```

## 3. Configure server-only secrets

In **Supabase → Edge Functions → Secrets**, set:

- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role/secret key. Keep it only in Supabase server secrets. Never put it in the app or GitHub.
- `NOTIFICATION_ADMIN_SECRET`: a long, random secret you generate. This protects the notification sender endpoint.

The sender function uses its own admin-secret header and the service-role key server-side.

## 4. Send a test notification

Send an HTTP POST to:

`https://vzvxcxmoxhyycwzddzbm.supabase.co/functions/v1/send-notification`

Headers:
- `Content-Type: application/json`
- `x-notification-admin-secret: YOUR_NOTIFICATIONS_ADMIN_SECRET`

Body:
```json
{
  "title": "Hello from LumaMusic",
  "body": "Push notifications are connected.",
  "category": "app_announcements"
}
```

Valid categories: `new_music`, `artist_releases`, `app_announcements`.

## Notes

- The app's Supabase publishable key and Expo project ID are public app configuration, not server secrets.
- A development/production Android build is required to test real remote push delivery. A local simulator or Expo Go may not behave like the installed app.
- This sender supports manual/admin announcements. Automatic artist-release discovery still needs a separate release-monitoring source and scheduler.
