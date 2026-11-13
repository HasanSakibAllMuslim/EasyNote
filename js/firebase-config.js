import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTIpaxVp94OL7wCSyk6XAoBnLuliupVOU",
  authDomain: "tools-hsccrackers.firebaseapp.com",
  projectId: "tools-hsccrackers",
  storageBucket: "tools-hsccrackers.firebasestorage.app",
  messagingSenderId: "367071850689",
  appId: "1:367071850689:web:bfa62fbdce2008911ba440"
};

export const app = initializeApp(firebaseConfig);

// App Check: proves requests come from this website, not from scripts or bots.
// Paste the reCAPTCHA Enterprise site key from Firebase console → App Check → Apps → (web app) → reCAPTCHA Enterprise.
// While empty, App Check is off. Turn on "Enforce" for Firestore in the console only after this key is live.
export const APP_CHECK_SITE_KEY = "";

if (APP_CHECK_SITE_KEY) {
  // On your own computer, use a debug token instead (printed in the browser console; add it in the console under "Manage debug tokens").
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
