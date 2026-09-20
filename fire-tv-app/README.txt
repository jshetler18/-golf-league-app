19th Hole Leaderboard - Fire OS 7 wrapper
URL: https://www.lvvgolfsim.com/tv

Features:
- Full-screen WebView
- Keeps screen awake
- Reloads after main-page network errors
- Attempts to launch after a full Fire TV reboot
- Returns to /tv if resumed on another URL

Build in Android Studio (JDK 17+): open fire-tv-app and build the debug APK.
The web app itself uses Supabase Realtime for immediate score updates and a 60-second recovery refresh.
