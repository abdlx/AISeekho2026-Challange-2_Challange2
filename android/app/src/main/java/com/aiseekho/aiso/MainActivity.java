package com.aiseekho.aiso;

import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.content.Context;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable edge-to-edge content display under status and navigation bars
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        // Ensure transparent colors for the system status and navigation bars
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // Configure WebView Caches to enable offline loading!
        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                
                // If offline, fall back to the cache completely
                if (!isNetworkAvailable()) {
                    settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                } else {
                    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager 
            = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager != null ? connectivityManager.getActiveNetworkInfo() : null;
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }
}
