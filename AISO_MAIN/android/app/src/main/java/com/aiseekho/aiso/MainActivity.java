package com.aiseekho.aiso;

import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

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

        // Intercept WebView network errors and load the local offline page instead.
        // This fires BEFORE the ugly "Webpage not available" screen appears.
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            // Enable app cache / DOM storage so the browser can persist assets
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // Override the WebViewClient: catch main-frame network errors
            webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
                @Override
                public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
                ) {
                    // Only intercept top-level page navigations, not sub-resources
                    if (request != null && request.isForMainFrame()) {
                        // Load the premium local offline page bundled in assets/
                        view.loadUrl("file:///android_asset/offline.html");
                        return;
                    }
                    super.onReceivedError(view, request, error);
                }
            });
        }
    }
}
