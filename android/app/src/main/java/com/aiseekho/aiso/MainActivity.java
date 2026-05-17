package com.aiseekho.aiso;

import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

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
    }
}
