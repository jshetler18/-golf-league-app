package com.lvvgolfsim.cupstandings;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
public class MainActivity extends Activity {
 private WebView web;
 private void fullscreen(){getWindow().getDecorView().setSystemUiVisibility(5894|1024|512);}
 @Override public void onCreate(Bundle state){super.onCreate(state);fullscreen();getWindow().addFlags(128);web=new WebView(this);web.setBackgroundColor(0xff000000);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);web.setWebViewClient(new WebViewClient());setContentView(web);web.loadUrl("https://www.lvvgolfsim.com/cup-tv");}
 @Override public void onResume(){super.onResume();fullscreen();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){if(web!=null)web.loadUrl("https://www.lvvgolfsim.com/cup-tv");}
}
