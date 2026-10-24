// Runs before the page scripts. On the very first app start it copies the
// progress found in the old browser version into this app's own storage,
// but never overwrites progress the app already has.
const { contextBridge, ipcRenderer } = require("electron");

const PROGRESS_KEY = "ordhavn-progress-v1";

if (location.origin === "http://localhost:3000") {
  try {
    if (localStorage.getItem(PROGRESS_KEY) === null) {
      const entries = ipcRenderer.sendSync("ordhavn:import-payload");
      if (entries) {
        for (const [key, value] of Object.entries(entries)) {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
        }
      }
      ipcRenderer.sendSync("ordhavn:import-finished", Boolean(entries));
    } else {
      ipcRenderer.sendSync("ordhavn:import-finished", false);
    }
  } catch {
    // The app still starts with empty progress if storage is unavailable.
  }
}

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("ordhavnDesktop", {
    restart: () => ipcRenderer.send("ordhavn:restart"),
  });
}
