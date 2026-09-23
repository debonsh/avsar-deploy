import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import { migrateLegacyKeys } from "./lib/storage.js";
import { AvsarProvider } from "./app/store.jsx";
import { Shell } from "./app/shell.jsx";

// Devices that predate the rename keep their profile, resume and progress:
// move the old keys across before any module reads them.
migrateLegacyKeys();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AvsarProvider>
        <Shell />
      </AvsarProvider>
    </BrowserRouter>
  </StrictMode>
);

// PWA: cache the shell for low-bandwidth wards. Production only — dev stays live.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
