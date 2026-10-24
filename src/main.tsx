import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./theme.css";
import "./matches.css";
import "./branding.css";
import "./manager.css";
import "./game-navigation.css";
import "./headquarters.css";
import "./menu-eras.css";
import "./event-menus.css";
import "./reborn-client.css";
import "./client-menus.css";
import "./client-pages.css";

// This disposable interactive preview is available only on the local dev server.
const Root = import.meta.env.DEV && new URLSearchParams(location.search).has("patch-preview")
  ? React.lazy(() => import("./PatchPreview"))
  : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={<p role="status">Loading patch preview…</p>}><Root /></React.Suspense>
  </React.StrictMode>,
);
