import { useState } from "react";
import { Download, X } from "lucide-react";

// Published by the mobile copy's scripts/mobile-release.mjs; always the newest APK.
export const ANDROID_APK_URL = "https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/releases/download/mobile-latest/aegis-manager.apk";
const DISMISS_KEY = "aegis-android-banner-dismissed";

function shouldOffer() {
  try { return /Android/i.test(navigator.userAgent) && localStorage.getItem(DISMISS_KEY) !== "1"; }
  catch { return /Android/i.test(navigator.userAgent); }
}

/** Android visitors get the app; it is not on Google Play, so the steps are spelled out. */
export default function AndroidAppBanner() {
  const [shown, setShown] = useState(shouldOffer);
  const [started, setStarted] = useState(false);
  if (!shown) return null;
  const dismiss = () => { setShown(false); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* shows again next visit */ } };
  return <section className="android-app-banner" aria-label="Android app">
    <div>
      <strong>Play on the Android app</strong>
      <p>{started
        ? "When the download finishes, open it. If Android asks, allow installs from your browser, then tap Install. The app updates itself."
        : "Touch controls, works offline and updates itself. Free, not on Google Play. App saves are separate from this website."}</p>
    </div>
    <a className="android-app-download" href={ANDROID_APK_URL} onClick={() => setStarted(true)}><Download size={18} /> Download app</a>
    <button className="android-app-dismiss" aria-label="Hide Android app offer" onClick={dismiss}><X size={18} /></button>
  </section>;
}
