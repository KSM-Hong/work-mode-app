const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");
let win, saved;
function create() {
  win = new BrowserWindow({
    width: 1100, height: 760, frame: false, titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 10 },
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, "..", "dist-electron", "index.html"));
}
ipcMain.on("set-mini", (_e, mini) => {
  if (!win) return;
  if (mini) {
    saved = win.getBounds();
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    win.setWindowButtonVisibility?.(false);
    win.setMinimumSize(200, 80);
    win.setBounds({ x: width - 300, y: 40, width: 280, height: 96 });
    win.setAlwaysOnTop(true, "floating");
    win.setVisibleOnAllWorkspaces(true);
  } else {
    win.setAlwaysOnTop(false);
    win.setVisibleOnAllWorkspaces(false);
    win.setWindowButtonVisibility?.(true);
    if (saved) win.setBounds(saved);
    win.focus();
  }
});
ipcMain.on("set-opacity", (_e, o) => { if (win) win.setOpacity(Math.max(0.2, Math.min(1, o))); });
app.whenReady().then(async () => {
  if (process.platform === "darwin" && !app.isInApplicationsFolder()) {
    const { response } = await dialog.showMessageBox({ type: "question", buttons: ["Move to Applications", "Not now"], defaultId: 0, message: "Move Work Mode to your Applications folder?" });
    if (response === 0) { try { app.moveToApplicationsFolder(); return; } catch { /* keep running */ } }
  }
  create();
});
app.on("window-all-closed", () => app.quit());
