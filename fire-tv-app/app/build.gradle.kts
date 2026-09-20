plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.lvvgolfsim.leaderboard"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.lvvgolfsim.leaderboard"
        minSdk = 28
        targetSdk = 28
        versionCode = 2
        versionName = "1.1"
    }
}
