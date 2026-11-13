const { app, BrowserWindow, shell, protocol } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "easynote";
const APP_HOST = "app";
const APP_ROOT = app.getAppPath();

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".cjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon"
};

function isInsideRoot(filePath) {
  const relativePath = path.relative(APP_ROOT, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

async function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== APP_HOST) {
        return new Response("Not found", { status: 404 });
      }

      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response("Bad request", { status: 400 });
      }

      if (pathname === "/") pathname = "/index.html";
      const requestedPath = path.resolve(APP_ROOT, `.${pathname}`);

      if (!isInsideRoot(requestedPath)) {
        return new Response("Forbidden", { status: 403 });
      }

      const stat = await fs.stat(requestedPath).catch(() => null);
      if (!stat || !stat.isFile()) {
        return new Response("Not found", { status: 404 });
      }

      const body = await fs.readFile(requestedPath);
      const contentType = MIME_TYPES[path.extname(requestedPath).toLowerCase()] || "application/octet-stream";

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch (error) {
      console.error("Local app protocol error:", error);
      return new Response("Internal application error", { status: 500 });
    }
  });
}

function openExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" || url.protocol === "http:") {
      shell.openExternal(url.toString());
    }
  } catch {
    // Ignore malformed or unsupported URLs.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    title: "EasyNote",
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b0d0a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!navigationUrl.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
      event.preventDefault();
      openExternalUrl(navigationUrl);
    }
  });

  win.once("ready-to-show", () => {
    win.show();
    win.maximize();
  });

  win.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);
}

const hasSingleInstance = app.requestSingleInstanceLock();

if (!hasSingleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const existing = BrowserWindow.getAllWindows()[0];
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
    }
  });

  app.whenReady().then(async () => {
    await registerAppProtocol();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
