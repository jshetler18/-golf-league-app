package com.lvvgolfsim.leaderboard

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var web: WebView
    private val url = "https://www.lvvgolfsim.com/tv"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep the Fire TV awake while the leaderboard is displayed.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Full-screen display.
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

        // Start our background wake/recovery service.
        try {
            startService(Intent(this, WakeService::class.java))
        } catch (_: Exception) {
        }

        web = WebView(this)
        setContentView(web)

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.settings.loadsImagesAutomatically = true

        web.webChromeClient = WebChromeClient()

        web.webViewClient = object : WebViewClient() {

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    view?.postDelayed({
                        view.reload()
                    }, 5000)
                }
            }
        }

        web.loadUrl(url)
    }

    override fun onResume() {
        super.onResume()

        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

        if (::web.isInitialized) {
            web.onResume()
        }
    }

    override fun onPause() {
        if (::web.isInitialized) {
            web.onPause()
        }
        super.onPause()
    }

    override fun onBackPressed() {
        // Prevent an accidental Back press from exiting the leaderboard.
        if (::web.isInitialized && web.canGoBack()) {
            web.goBack()
        }
    }
}
