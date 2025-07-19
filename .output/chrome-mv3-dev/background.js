var background = function() {
  "use strict";
  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const noop = () => {
  };
  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
  }
  function rune_outside_svelte(rune) {
    {
      const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
      error.name = "Svelte error";
      throw error;
    }
  }
  {
    let throw_rune_error = function(rune) {
      if (!(rune in globalThis)) {
        let value;
        Object.defineProperty(globalThis, rune, {
          configurable: true,
          // eslint-disable-next-line getter-return
          get: () => {
            if (value !== void 0) {
              return value;
            }
            rune_outside_svelte(rune);
          },
          set: (v) => {
            value = v;
          }
        });
      }
    };
    throw_rune_error("$state");
    throw_rune_error("$effect");
    throw_rune_error("$derived");
    throw_rune_error("$inspect");
    throw_rune_error("$props");
    throw_rune_error("$bindable");
  }
  const subscriber_queue = [];
  function readable(value, start) {
    return {
      subscribe: writable(value, start).subscribe
    };
  }
  function writable(value, start = noop) {
    let stop = null;
    const subscribers = /* @__PURE__ */ new Set();
    function set(new_value) {
      if (safe_not_equal(value, new_value)) {
        value = new_value;
        if (stop) {
          const run_queue = !subscriber_queue.length;
          for (const subscriber of subscribers) {
            subscriber[1]();
            subscriber_queue.push(subscriber, value);
          }
          if (run_queue) {
            for (let i = 0; i < subscriber_queue.length; i += 2) {
              subscriber_queue[i][0](subscriber_queue[i + 1]);
            }
            subscriber_queue.length = 0;
          }
        }
      }
    }
    function update(fn) {
      set(fn(
        /** @type {T} */
        value
      ));
    }
    function subscribe(run, invalidate = noop) {
      const subscriber = [run, invalidate];
      subscribers.add(subscriber);
      if (subscribers.size === 1) {
        stop = start(set, update) || noop;
      }
      run(
        /** @type {T} */
        value
      );
      return () => {
        subscribers.delete(subscriber);
        if (subscribers.size === 0 && stop) {
          stop();
          stop = null;
        }
      };
    }
    return { set, update, subscribe };
  }
  const STORAGE_KEY = "appData";
  const SYNC_STATUS_KEY = "syncStatus";
  const defaultData = {
    folders: [
      {
        id: "root",
        name: "Root",
        children: [],
        createdAt: Date.now()
      }
    ],
    tags: []
  };
  async function getAppData() {
    const result2 = await chrome.storage.local.get(STORAGE_KEY);
    if (result2[STORAGE_KEY]) {
      return result2[STORAGE_KEY];
    } else {
      await setAppData(defaultData);
      return defaultData;
    }
  }
  async function setAppData(data) {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }
  function findBookmarkById(nodes, id) {
    for (const node of nodes) {
      if ("children" in node) {
        const found = findBookmarkById(node.children, id);
        if (found) return found;
      } else {
        if (node.id === id) {
          return node;
        }
      }
    }
    return null;
  }
  function findBookmarkByUrl(nodes, url) {
    for (const node of nodes) {
      if ("children" in node) {
        const found = findBookmarkByUrl(node.children, url);
        if (found) return found;
      } else {
        try {
          if (new URL(node.url).href === new URL(url).href) {
            return node;
          }
        } catch (e) {
        }
      }
    }
    return null;
  }
  async function setSyncStatus(status, errorMessage) {
    const syncState = {
      status,
      lastSyncTime: status === "synced" ? Date.now() : void 0,
      lastErrorMessage: status === "error" ? errorMessage : void 0
    };
    await chrome.storage.local.set({ [SYNC_STATUS_KEY]: syncState });
  }
  const appDataStore = readable(null, (set) => {
    getAppData().then((data) => {
      set(data);
    }).catch((err) => {
      console.error("Failed to initialize appDataStore:", err);
      set(defaultData);
    });
    const listener = (changes, areaName) => {
      if (areaName === "local" && changes[STORAGE_KEY]) {
        set(changes[STORAGE_KEY].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  });
  background;
  const BOUNDARY = "-------314159265358979323846";
  const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
  const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
  const FILE_NAME = "chrome-extension-svelte-typescript-boilerplate-backup.json";
  const MANUAL_TOKEN_STORAGE_KEY = "gdrive_manual_token";
  class AuthError extends Error {
    constructor(message) {
      super(message);
      this.name = "AuthError";
    }
  }
  async function isChromeBrowser() {
    if (navigator.brave && await navigator.brave.isBrave()) {
      return false;
    }
    return navigator.userAgent.includes("Chrome") && !navigator.userAgent.includes("Edg");
  }
  async function getAuthToken(interactive) {
    const isChrome = await isChromeBrowser();
    if (isChrome) {
      console.log("Detected Chrome browser, using chrome.identity.getAuthToken.");
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
    } else {
      console.log("Detected a non-Chrome browser, using chrome.identity.launchWebAuthFlow.");
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(MANUAL_TOKEN_STORAGE_KEY, (result2) => {
          if (result2[MANUAL_TOKEN_STORAGE_KEY]) {
            resolve(result2[MANUAL_TOKEN_STORAGE_KEY]);
          } else {
            reject(new Error("Not logged in."));
          }
        });
      });
    }
  }
  async function getHeaders(token) {
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }
  async function findBackupFile(token) {
    const headers = await getHeaders(token);
    const response = await fetch(`${DRIVE_FILES_URL}?q=name='${FILE_NAME}' and 'root' in parents and trashed=false`, {
      headers
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError("Authentication failed. Please log in again.");
      }
      const errorDetails = await response.text();
      console.error("Google API Error on findBackupFile:", errorDetails);
      throw new Error("Failed to search for backup file: " + response.statusText);
    }
    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
  }
  async function uploadBackup(token, data) {
    const file = await findBackupFile(token);
    const fileMetadata = {
      name: FILE_NAME
    };
    const multipartRequestBody = `--${BOUNDARY}\r
Content-Type: application/json; charset=UTF-8\r
\r
${JSON.stringify(fileMetadata)}\r
--${BOUNDARY}\r
Content-Type: application/json\r
\r
${JSON.stringify(data)}\r
--${BOUNDARY}--`;
    const method = file ? "PATCH" : "POST";
    const url = file ? `${UPLOAD_URL}/${file.id}?uploadType=multipart` : `${UPLOAD_URL}?uploadType=multipart`;
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${BOUNDARY}`
      },
      body: multipartRequestBody
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError("Authentication failed. Please log in again.");
      }
      const errorDetails = await response.text();
      console.error("Google API Error on uploadBackup:", errorDetails);
      throw new Error("Failed to upload backup: " + response.statusText);
    }
  }
  background;
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        func.apply(context, args);
      }, wait);
    };
  }
  background;
  let isFirstChange = true;
  const debouncedUpload = debounce(async (token, data) => {
    console.log("Debounced backup triggered.");
    await setSyncStatus("syncing");
    try {
      await uploadBackup(token, data);
      await setSyncStatus("synced");
      console.log("Auto-backup successful.");
    } catch (e) {
      console.error("Auto-backup failed:", e);
      if (e instanceof AuthError) {
        await setSyncStatus("unauthenticated", e.message);
      } else {
        await setSyncStatus("error", e instanceof Error ? e.message : "Unknown error");
      }
    }
  }, 5e3);
  async function handleDataChange(data) {
    if (isFirstChange) {
      console.log("Initial data loaded, skipping first auto-backup.");
      isFirstChange = false;
      return;
    }
    if (data) {
      try {
        const token = await getAuthToken(false);
        if (token) {
          console.log("Data changed, scheduling auto-backup...");
          debouncedUpload(token, data);
        } else {
          await setSyncStatus("unauthenticated", "User is not logged in.");
        }
      } catch (error) {
        await setSyncStatus("unauthenticated", "User is not logged in.");
      }
    }
  }
  appDataStore.subscribe(handleDataChange);
  console.log("Auto-backup module initialized.");
  background;
  const definition = defineBackground(() => {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name.startsWith("reminder-")) {
        const bookmarkId = alarm.name.replace("reminder-", "");
        const appData = await getAppData();
        const bookmark = findBookmarkById(appData.folders, bookmarkId);
        if (bookmark) {
          chrome.notifications.create(`notification-${bookmark.id}`, {
            type: "basic",
            iconUrl: "icon-128.png",
            // WXT handles pathing
            title: "Reminder: " + bookmark.title,
            message: "Click to open this saved page.",
            priority: 2
          });
        }
      }
    });
    chrome.notifications.onClicked.addListener((notificationId) => {
      if (notificationId.startsWith("notification-")) {
        const bookmarkId = notificationId.replace("notification-", "");
        getAppData().then((appData) => {
          const bookmark = findBookmarkById(appData.folders, bookmarkId);
          if (bookmark == null ? void 0 : bookmark.url) {
            chrome.tabs.create({ url: bookmark.url });
          }
        });
      }
    });
    chrome.commands.onCommand.addListener(async (command) => {
      if (command === "open-bookmark-dialog") {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if ((tab == null ? void 0 : tab.id) && tab.url) {
          chrome.tabs.sendMessage(tab.id, {
            action: "openBookmarkDialog",
            data: {
              title: tab.title || "No title",
              url: tab.url,
              favicon: tab.favIconUrl || null
            }
          });
        }
      }
    });
    chrome.history.onVisited.addListener(async (historyItem) => {
      if (historyItem.url) {
        const appData = await getAppData();
        const bookmark = findBookmarkByUrl(appData.folders, historyItem.url);
        if (bookmark) {
          const visits = await chrome.history.getVisits({ url: historyItem.url });
          bookmark.accessHistory = visits.map((visit) => ({
            timestamp: visit.visitTime
          }));
          await setAppData(appData);
        }
      }
    });
  });
  background;
  function initPlugins() {
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vc3ZlbHRlQDUuMzUuNi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9pbnRlcm5hbC9jbGllbnQvZXJyb3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW5kZXgtY2xpZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc3RvcmUvc2hhcmVkL2luZGV4LmpzIiwiLi4vLi4vc3JjL2xpYi9zdG9yYWdlLnRzIiwiLi4vLi4vc3JjL2xpYi9nZHJpdmUudHMiLCIuLi8uLi9zcmMvbGliL3V0aWxzLnRzIiwiLi4vLi4vc3JjL2xpYi9hdXRvLWJhY2t1cC50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHdlYmV4dC1jb3JlK21hdGNoLXBhdHRlcm5zQDEuMC4zL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIFN0b3JlIHRoZSByZWZlcmVuY2VzIHRvIGdsb2JhbHMgaW4gY2FzZSBzb21lb25lIHRyaWVzIHRvIG1vbmtleSBwYXRjaCB0aGVzZSwgY2F1c2luZyB0aGUgYmVsb3dcbi8vIHRvIGRlLW9wdCAodGhpcyBvY2N1cnMgb2Z0ZW4gd2hlbiB1c2luZyBwb3B1bGFyIGV4dGVuc2lvbnMpLlxuZXhwb3J0IHZhciBpc19hcnJheSA9IEFycmF5LmlzQXJyYXk7XG5leHBvcnQgdmFyIGluZGV4X29mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG5leHBvcnQgdmFyIGFycmF5X2Zyb20gPSBBcnJheS5mcm9tO1xuZXhwb3J0IHZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzO1xuZXhwb3J0IHZhciBkZWZpbmVfcHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5leHBvcnQgdmFyIGdldF9kZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmV4cG9ydCB2YXIgZ2V0X2Rlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnM7XG5leHBvcnQgdmFyIG9iamVjdF9wcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuZXhwb3J0IHZhciBhcnJheV9wcm90b3R5cGUgPSBBcnJheS5wcm90b3R5cGU7XG5leHBvcnQgdmFyIGdldF9wcm90b3R5cGVfb2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG5leHBvcnQgdmFyIGlzX2V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvaW5kZXguanNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIE1JVCBMaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvTElDRU5TRVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEByZXR1cm5zIHt2YWx1ZSBpcyBQcm9taXNlTGlrZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIHR5cGVvZiB2YWx1ZT8udGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEBwYXJhbSB7RnVuY3Rpb259IGZuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG4vKiogQHBhcmFtIHtBcnJheTwoKSA9PiB2b2lkPn0gYXJyICovXG5leHBvcnQgZnVuY3Rpb24gcnVuX2FsbChhcnIpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcblx0XHRhcnJbaV0oKTtcblx0fVxufVxuXG4vKipcbiAqIFRPRE8gcmVwbGFjZSB3aXRoIFByb21pc2Uud2l0aFJlc29sdmVycyBvbmNlIHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmZXJyZWQoKSB7XG5cdC8qKiBAdHlwZSB7KHZhbHVlOiBUKSA9PiB2b2lkfSAqL1xuXHR2YXIgcmVzb2x2ZTtcblxuXHQvKiogQHR5cGUgeyhyZWFzb246IGFueSkgPT4gdm9pZH0gKi9cblx0dmFyIHJlamVjdDtcblxuXHQvKiogQHR5cGUge1Byb21pc2U8VD59ICovXG5cdHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG5cdFx0cmVzb2x2ZSA9IHJlcztcblx0XHRyZWplY3QgPSByZWo7XG5cdH0pO1xuXG5cdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0cmV0dXJuIHsgcHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0IH07XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFZcbiAqIEBwYXJhbSB7Vn0gdmFsdWVcbiAqIEBwYXJhbSB7ViB8ICgoKSA9PiBWKX0gZmFsbGJhY2tcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xhenldXG4gKiBAcmV0dXJucyB7Vn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrKHZhbHVlLCBmYWxsYmFjaywgbGF6eSA9IGZhbHNlKSB7XG5cdHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkXG5cdFx0PyBsYXp5XG5cdFx0XHQ/IC8qKiBAdHlwZSB7KCkgPT4gVn0gKi8gKGZhbGxiYWNrKSgpXG5cdFx0XHQ6IC8qKiBAdHlwZSB7Vn0gKi8gKGZhbGxiYWNrKVxuXHRcdDogdmFsdWU7XG59XG5cbi8qKlxuICogV2hlbiBlbmNvdW50ZXJpbmcgYSBzaXR1YXRpb24gbGlrZSBgbGV0IFthLCBiLCBjXSA9ICRkZXJpdmVkKGJsYWgoKSlgLFxuICogd2UgbmVlZCB0byBzdGFzaCBhbiBpbnRlcm1lZGlhdGUgdmFsdWUgdGhhdCBgYWAsIGBiYCwgYW5kIGBjYCBkZXJpdmVcbiAqIGZyb20sIGluIGNhc2UgaXQncyBhbiBpdGVyYWJsZVxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7QXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD59IHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gW25dXG4gKiBAcmV0dXJucyB7QXJyYXk8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b19hcnJheSh2YWx1ZSwgbikge1xuXHQvLyByZXR1cm4gYXJyYXlzIHVuY2hhbmdlZFxuXHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHQvLyBpZiB2YWx1ZSBpcyBub3QgaXRlcmFibGUsIG9yIGBuYCBpcyB1bnNwZWNpZmllZCAoaW5kaWNhdGVzIGEgcmVzdFxuXHQvLyBlbGVtZW50LCB3aGljaCBtZWFucyB3ZSdyZSBub3QgY29uY2VybmVkIGFib3V0IHVuYm91bmRlZCBpdGVyYWJsZXMpXG5cdC8vIGNvbnZlcnQgdG8gYW4gYXJyYXkgd2l0aCBgQXJyYXkuZnJvbWBcblx0aWYgKG4gPT09IHVuZGVmaW5lZCB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiB2YWx1ZSkpIHtcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG5cdH1cblxuXHQvLyBvdGhlcndpc2UsIHBvcHVsYXRlIGFuIGFycmF5IHdpdGggYG5gIHZhbHVlc1xuXG5cdC8qKiBAdHlwZSB7VFtdfSAqL1xuXHRjb25zdCBhcnJheSA9IFtdO1xuXG5cdGZvciAoY29uc3QgZWxlbWVudCBvZiB2YWx1ZSkge1xuXHRcdGFycmF5LnB1c2goZWxlbWVudCk7XG5cdFx0aWYgKGFycmF5Lmxlbmd0aCA9PT0gbikgYnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59XG4iLCIvKiogQGltcG9ydCB7IEVxdWFscyB9IGZyb20gJyNjbGllbnQnICovXG5cbi8qKiBAdHlwZSB7RXF1YWxzfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09IHRoaXMudjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3Vua25vd259IGFcbiAqIEBwYXJhbSB7dW5rbm93bn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX25vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9IGFcblx0XHQ/IGIgPT0gYlxuXHRcdDogYSAhPT0gYiB8fCAoYSAhPT0gbnVsbCAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcpIHx8IHR5cGVvZiBhID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7dW5rbm93bn0gYVxuICogQHBhcmFtIHt1bmtub3dufSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9PSBiO1xufVxuXG4vKiogQHR5cGUge0VxdWFsc30gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX2VxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gIXNhZmVfbm90X2VxdWFsKHZhbHVlLCB0aGlzLnYpO1xufVxuIiwiLyogVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBzY3JpcHRzL3Byb2Nlc3MtbWVzc2FnZXMvaW5kZXguanMuIERvIG5vdCBlZGl0ISAqL1xuXG5pbXBvcnQgeyBERVYgfSBmcm9tICdlc20tZW52JztcblxuLyoqXG4gKiBVc2luZyBgYmluZDp2YWx1ZWAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgYGJpbmQ6Y2hlY2tlZGAgaW5zdGVhZFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9jaGVja2JveF92YWx1ZVxcblVzaW5nIFxcYGJpbmQ6dmFsdWVcXGAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgXFxgYmluZDpjaGVja2VkXFxgIGluc3RlYWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDb21wb25lbnQgJWNvbXBvbmVudCUgaGFzIGFuIGV4cG9ydCBuYW1lZCBgJWtleSVgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBgYmluZDola2V5JWAsIHdoaWNoIGlzIGRpc2FsbG93ZWQuIEluc3RlYWQsIHVzZSBgYmluZDp0aGlzYCAoZS5nLiBgPCVuYW1lJSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5gKSBhbmQgdGhlbiBhY2Nlc3MgdGhlIHByb3BlcnR5IG9uIHRoZSBib3VuZCBjb21wb25lbnQgaW5zdGFuY2UgKGUuZy4gYGNvbXBvbmVudC4la2V5JWApXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2V4cG9ydChjb21wb25lbnQsIGtleSwgbmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9leHBvcnRcXG5Db21wb25lbnQgJHtjb21wb25lbnR9IGhhcyBhbiBleHBvcnQgbmFtZWQgXFxgJHtrZXl9XFxgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBcXGBiaW5kOiR7a2V5fVxcYCwgd2hpY2ggaXMgZGlzYWxsb3dlZC4gSW5zdGVhZCwgdXNlIFxcYGJpbmQ6dGhpc1xcYCAoZS5nLiBcXGA8JHtuYW1lfSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5cXGApIGFuZCB0aGVuIGFjY2VzcyB0aGUgcHJvcGVydHkgb24gdGhlIGJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZSAoZS5nLiBcXGBjb21wb25lbnQuJHtrZXl9XFxgKVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfaW52YWxpZF9leHBvcnRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2V4cG9ydGApO1xuXHR9XG59XG5cbi8qKlxuICogQSBjb21wb25lbnQgaXMgYXR0ZW1wdGluZyB0byBiaW5kIHRvIGEgbm9uLWJpbmRhYmxlIHByb3BlcnR5IGAla2V5JWAgYmVsb25naW5nIHRvICVjb21wb25lbnQlIChpLmUuIGA8JW5hbWUlIGJpbmQ6JWtleSU9ey4uLn0+YCkuIFRvIG1hcmsgYSBwcm9wZXJ0eSBhcyBiaW5kYWJsZTogYGxldCB7ICVrZXklID0gJGJpbmRhYmxlKCkgfSA9ICRwcm9wcygpYFxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRfbm90X2JpbmRhYmxlKGtleSwgY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9ub3RfYmluZGFibGVcXG5BIGNvbXBvbmVudCBpcyBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYSBub24tYmluZGFibGUgcHJvcGVydHkgXFxgJHtrZXl9XFxgIGJlbG9uZ2luZyB0byAke2NvbXBvbmVudH0gKGkuZS4gXFxgPCR7bmFtZX0gYmluZDoke2tleX09ey4uLn0+XFxgKS4gVG8gbWFyayBhIHByb3BlcnR5IGFzIGJpbmRhYmxlOiBcXGBsZXQgeyAke2tleX0gPSAkYmluZGFibGUoKSB9ID0gJHByb3BzKClcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2FsbGluZyBgJW1ldGhvZCVgIG9uIGEgY29tcG9uZW50IGluc3RhbmNlIChvZiAlY29tcG9uZW50JSkgaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1XG4gKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnRfYXBpX2NoYW5nZWQobWV0aG9kLCBjb21wb25lbnQpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBjb21wb25lbnRfYXBpX2NoYW5nZWRcXG5DYWxsaW5nIFxcYCR7bWV0aG9kfVxcYCBvbiBhIGNvbXBvbmVudCBpbnN0YW5jZSAob2YgJHtjb21wb25lbnR9KSBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDVcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2NoYW5nZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvY29tcG9uZW50X2FwaV9jaGFuZ2VkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0ZWQgdG8gaW5zdGFudGlhdGUgJWNvbXBvbmVudCUgd2l0aCBgbmV3ICVuYW1lJWAsIHdoaWNoIGlzIG5vIGxvbmdlciB2YWxpZCBpbiBTdmVsdGUgNS4gSWYgdGhpcyBjb21wb25lbnQgaXMgbm90IHVuZGVyIHlvdXIgY29udHJvbCwgc2V0IHRoZSBgY29tcGF0aWJpbGl0eS5jb21wb25lbnRBcGlgIGNvbXBpbGVyIG9wdGlvbiB0byBgNGAgdG8ga2VlcCBpdCB3b3JraW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvbmVudF9hcGlfaW52YWxpZF9uZXcoY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgY29tcG9uZW50X2FwaV9pbnZhbGlkX25ld1xcbkF0dGVtcHRlZCB0byBpbnN0YW50aWF0ZSAke2NvbXBvbmVudH0gd2l0aCBcXGBuZXcgJHtuYW1lfVxcYCwgd2hpY2ggaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1LiBJZiB0aGlzIGNvbXBvbmVudCBpcyBub3QgdW5kZXIgeW91ciBjb250cm9sLCBzZXQgdGhlIFxcYGNvbXBhdGliaWxpdHkuY29tcG9uZW50QXBpXFxgIGNvbXBpbGVyIG9wdGlvbiB0byBcXGA0XFxgIHRvIGtlZXAgaXQgd29ya2luZy5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2ludmFsaWRfbmV3YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfaW52YWxpZF9uZXdgKTtcblx0fVxufVxuXG4vKipcbiAqIEEgZGVyaXZlZCB2YWx1ZSBjYW5ub3QgcmVmZXJlbmNlIGl0c2VsZiByZWN1cnNpdmVseVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGYoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGZcXG5BIGRlcml2ZWQgdmFsdWUgY2Fubm90IHJlZmVyZW5jZSBpdHNlbGYgcmVjdXJzaXZlbHlcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXHR9XG59XG5cbi8qKlxuICogS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBgJXZhbHVlJWAgYXQgaW5kZXhlcyAlYSUgYW5kICViJVxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXG4gKiBAcGFyYW0ge3N0cmluZyB8IHVuZGVmaW5lZCB8IG51bGx9IFt2YWx1ZV1cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hfa2V5X2R1cGxpY2F0ZShhLCBiLCB2YWx1ZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVhY2hfa2V5X2R1cGxpY2F0ZVxcbiR7dmFsdWVcblx0XHRcdD8gYEtleWVkIGVhY2ggYmxvY2sgaGFzIGR1cGxpY2F0ZSBrZXkgXFxgJHt2YWx1ZX1cXGAgYXQgaW5kZXhlcyAke2F9IGFuZCAke2J9YFxuXHRcdFx0OiBgS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBhdCBpbmRleGVzICR7YX0gYW5kICR7Yn1gfVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VhY2hfa2V5X2R1cGxpY2F0ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lYWNoX2tleV9kdXBsaWNhdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlcnVuZSVgIGNhbm5vdCBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgY2xlYW51cCBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bmVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF9pbl90ZWFyZG93bihydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWZmZWN0X2luX3RlYXJkb3duXFxuXFxgJHtydW5lfVxcYCBjYW5ub3QgYmUgdXNlZCBpbnNpZGUgYW4gZWZmZWN0IGNsZWFudXAgZnVuY3Rpb25cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdGVhcmRvd25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3RlYXJkb3duYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBFZmZlY3QgY2Fubm90IGJlIGNyZWF0ZWQgaW5zaWRlIGEgYCRkZXJpdmVkYCB2YWx1ZSB0aGF0IHdhcyBub3QgaXRzZWxmIGNyZWF0ZWQgaW5zaWRlIGFuIGVmZmVjdFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkXFxuRWZmZWN0IGNhbm5vdCBiZSBjcmVhdGVkIGluc2lkZSBhIFxcYCRkZXJpdmVkXFxgIHZhbHVlIHRoYXQgd2FzIG5vdCBpdHNlbGYgY3JlYXRlZCBpbnNpZGUgYW4gZWZmZWN0XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJXJ1bmUlYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcbiAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3Rfb3JwaGFuKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3Rfb3JwaGFuXFxuXFxgJHtydW5lfVxcYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3Rfb3JwaGFuYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9vcnBoYW5gKTtcblx0fVxufVxuXG4vKipcbiAqIE1heGltdW0gdXBkYXRlIGRlcHRoIGV4Y2VlZGVkLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBhIHJlYWN0aXZlIGJsb2NrIG9yIGVmZmVjdCByZXBlYXRlZGx5IHNldHMgYSBuZXcgdmFsdWUuIFN2ZWx0ZSBsaW1pdHMgdGhlIG51bWJlciBvZiBuZXN0ZWQgdXBkYXRlcyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RfdXBkYXRlX2RlcHRoX2V4Y2VlZGVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRcXG5NYXhpbXVtIHVwZGF0ZSBkZXB0aCBleGNlZWRlZC4gVGhpcyBjYW4gaGFwcGVuIHdoZW4gYSByZWFjdGl2ZSBibG9jayBvciBlZmZlY3QgcmVwZWF0ZWRseSBzZXRzIGEgbmV3IHZhbHVlLiBTdmVsdGUgbGltaXRzIHRoZSBudW1iZXIgb2YgbmVzdGVkIHVwZGF0ZXMgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZGApO1xuXHR9XG59XG5cbi8qKlxuICogYGdldEFib3J0U2lnbmFsKClgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvbigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBnZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25cXG5cXGBnZXRBYm9ydFNpZ25hbCgpXFxgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBGYWlsZWQgdG8gaHlkcmF0ZSB0aGUgYXBwbGljYXRpb25cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh5ZHJhdGlvbl9mYWlsZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgaHlkcmF0aW9uX2ZhaWxlZFxcbkZhaWxlZCB0byBoeWRyYXRlIHRoZSBhcHBsaWNhdGlvblxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2h5ZHJhdGlvbl9mYWlsZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaHlkcmF0aW9uX2ZhaWxlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ291bGQgbm90IGB7QHJlbmRlcn1gIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIGBudWxsYCBvciBgdW5kZWZpbmVkYC4gQ29uc2lkZXIgdXNpbmcgb3B0aW9uYWwgY2hhaW5pbmcgYHtAcmVuZGVyIHNuaXBwZXQ/LigpfWBcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRfc25pcHBldCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBpbnZhbGlkX3NuaXBwZXRcXG5Db3VsZCBub3QgXFxge0ByZW5kZXJ9XFxgIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIFxcYG51bGxcXGAgb3IgXFxgdW5kZWZpbmVkXFxgLiBDb25zaWRlciB1c2luZyBvcHRpb25hbCBjaGFpbmluZyBcXGB7QHJlbmRlciBzbmlwcGV0Py4oKX1cXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9pbnZhbGlkX3NuaXBwZXRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaW52YWxpZF9zbmlwcGV0YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJW5hbWUlKC4uLilgIGNhbm5vdCBiZSB1c2VkIGluIHJ1bmVzIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWZlY3ljbGVfbGVnYWN5X29ubHkobmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGxpZmVjeWNsZV9sZWdhY3lfb25seVxcblxcYCR7bmFtZX0oLi4uKVxcYCBjYW5ub3QgYmUgdXNlZCBpbiBydW5lcyBtb2RlXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2xpZmVjeWNsZV9sZWdhY3lfb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IGRvIGBiaW5kOiVrZXklPXt1bmRlZmluZWR9YCB3aGVuIGAla2V5JWAgaGFzIGEgZmFsbGJhY2sgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3BzX2ludmFsaWRfdmFsdWUoa2V5KSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcHJvcHNfaW52YWxpZF92YWx1ZVxcbkNhbm5vdCBkbyBcXGBiaW5kOiR7a2V5fT17dW5kZWZpbmVkfVxcYCB3aGVuIFxcYCR7a2V5fVxcYCBoYXMgYSBmYWxsYmFjayB2YWx1ZVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX2ludmFsaWRfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfaW52YWxpZF92YWx1ZWApO1xuXHR9XG59XG5cbi8qKlxuICogUmVzdCBlbGVtZW50IHByb3BlcnRpZXMgb2YgYCRwcm9wcygpYCBzdWNoIGFzIGAlcHJvcGVydHklYCBhcmUgcmVhZG9ubHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcHNfcmVzdF9yZWFkb25seShwcm9wZXJ0eSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYHByb3BzX3Jlc3RfcmVhZG9ubHlcXG5SZXN0IGVsZW1lbnQgcHJvcGVydGllcyBvZiBcXGAkcHJvcHMoKVxcYCBzdWNoIGFzIFxcYCR7cHJvcGVydHl9XFxgIGFyZSByZWFkb25seVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX3Jlc3RfcmVhZG9ubHlgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfcmVzdF9yZWFkb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogVGhlIGAlcnVuZSVgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIGAuc3ZlbHRlYCBhbmQgYC5zdmVsdGUuanMvdHNgIGZpbGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuZV9vdXRzaWRlX3N2ZWx0ZShydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcnVuZV9vdXRzaWRlX3N2ZWx0ZVxcblRoZSBcXGAke3J1bmV9XFxgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIFxcYC5zdmVsdGVcXGAgYW5kIFxcYC5zdmVsdGUuanMvdHNcXGAgZmlsZXNcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9ydW5lX291dHNpZGVfc3ZlbHRlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3J1bmVfb3V0c2lkZV9zdmVsdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIFByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gYCRzdGF0ZWAgb2JqZWN0cyBtdXN0IGNvbnRhaW4gYHZhbHVlYCBhbmQgYWx3YXlzIGJlIGBlbnVtZXJhYmxlYCwgYGNvbmZpZ3VyYWJsZWAgYW5kIGB3cml0YWJsZWAuXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZFxcblByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gXFxgJHN0YXRlXFxgIG9iamVjdHMgbXVzdCBjb250YWluIFxcYHZhbHVlXFxgIGFuZCBhbHdheXMgYmUgXFxgZW51bWVyYWJsZVxcYCwgXFxgY29uZmlndXJhYmxlXFxgIGFuZCBcXGB3cml0YWJsZVxcYC5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgYCRzdGF0ZWAgb2JqZWN0XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9wcm90b3R5cGVfZml4ZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfcHJvdG90eXBlX2ZpeGVkXFxuQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgXFxgJHN0YXRlXFxgIG9iamVjdFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Byb3RvdHlwZV9maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9wcm90b3R5cGVfZml4ZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIFVwZGF0aW5nIHN0YXRlIGluc2lkZSBgJGRlcml2ZWQoLi4uKWAsIGAkaW5zcGVjdCguLi4pYCBvciBhIHRlbXBsYXRlIGV4cHJlc3Npb24gaXMgZm9yYmlkZGVuLiBJZiB0aGUgdmFsdWUgc2hvdWxkIG5vdCBiZSByZWFjdGl2ZSwgZGVjbGFyZSBpdCB3aXRob3V0IGAkc3RhdGVgXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV91bnNhZmVfbXV0YXRpb24oKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfdW5zYWZlX211dGF0aW9uXFxuVXBkYXRpbmcgc3RhdGUgaW5zaWRlIFxcYCRkZXJpdmVkKC4uLilcXGAsIFxcYCRpbnNwZWN0KC4uLilcXGAgb3IgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGlzIGZvcmJpZGRlbi4gSWYgdGhlIHZhbHVlIHNob3VsZCBub3QgYmUgcmVhY3RpdmUsIGRlY2xhcmUgaXQgd2l0aG91dCBcXGAkc3RhdGVcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV91bnNhZmVfbXV0YXRpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2Uvc3RhdGVfdW5zYWZlX211dGF0aW9uYCk7XG5cdH1cbn0iLCIvKiogQGltcG9ydCB7IENvbXBvbmVudENvbnRleHQsIENvbXBvbmVudENvbnRleHRMZWdhY3kgfSBmcm9tICcjY2xpZW50JyAqL1xuLyoqIEBpbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuL2luZGV4LmpzJyAqL1xuLyoqIEBpbXBvcnQgeyBOb3RGdW5jdGlvbiB9IGZyb20gJy4vaW50ZXJuYWwvdHlwZXMuanMnICovXG5pbXBvcnQgeyBhY3RpdmVfcmVhY3Rpb24sIHVudHJhY2sgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9ydW50aW1lLmpzJztcbmltcG9ydCB7IGlzX2FycmF5IH0gZnJvbSAnLi9pbnRlcm5hbC9zaGFyZWQvdXRpbHMuanMnO1xuaW1wb3J0IHsgdXNlcl9lZmZlY3QgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9pbmRleC5qcyc7XG5pbXBvcnQgKiBhcyBlIGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZC9lcnJvcnMuanMnO1xuaW1wb3J0IHsgbGVnYWN5X21vZGVfZmxhZyB9IGZyb20gJy4vaW50ZXJuYWwvZmxhZ3MvaW5kZXguanMnO1xuaW1wb3J0IHsgY29tcG9uZW50X2NvbnRleHQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9jb250ZXh0LmpzJztcbmltcG9ydCB7IERFViB9IGZyb20gJ2VzbS1lbnYnO1xuXG5pZiAoREVWKSB7XG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuXHQgKi9cblx0ZnVuY3Rpb24gdGhyb3dfcnVuZV9lcnJvcihydW5lKSB7XG5cdFx0aWYgKCEocnVuZSBpbiBnbG9iYWxUaGlzKSkge1xuXHRcdFx0Ly8gVE9ETyBpZiBwZW9wbGUgc3RhcnQgYWRqdXN0aW5nIHRoZSBcInRoaXMgY2FuIGNvbnRhaW4gcnVuZXNcIiBjb25maWcgdGhyb3VnaCB2LXAtcyBtb3JlLCBhZGp1c3QgdGhpcyBtZXNzYWdlXG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi9cblx0XHRcdGxldCB2YWx1ZTsgLy8gbGV0J3MgaG9wZSBub29uZSBtb2RpZmllcyB0aGlzIGdsb2JhbCwgYnV0IGJlbHRzIGFuZCBicmFjZXNcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCBydW5lLCB7XG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdldHRlci1yZXR1cm5cblx0XHRcdFx0Z2V0OiAoKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlLnJ1bmVfb3V0c2lkZV9zdmVsdGUocnVuZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldDogKHYpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IHY7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHRocm93X3J1bmVfZXJyb3IoJyRzdGF0ZScpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckZWZmZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRkZXJpdmVkJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRpbnNwZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRwcm9wcycpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckYmluZGFibGUnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFtgQWJvcnRTaWduYWxgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRTaWduYWwpIHRoYXQgYWJvcnRzIHdoZW4gdGhlIGN1cnJlbnQgW2Rlcml2ZWRdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZGVyaXZlZCkgb3IgW2VmZmVjdF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIHJlLXJ1bnMgb3IgaXMgZGVzdHJveWVkLlxuICpcbiAqIE11c3QgYmUgY2FsbGVkIHdoaWxlIGEgZGVyaXZlZCBvciBlZmZlY3QgaXMgcnVubmluZy5cbiAqXG4gKiBgYGBzdmVsdGVcbiAqIDxzY3JpcHQ+XG4gKiBcdGltcG9ydCB7IGdldEFib3J0U2lnbmFsIH0gZnJvbSAnc3ZlbHRlJztcbiAqXG4gKiBcdGxldCB7IGlkIH0gPSAkcHJvcHMoKTtcbiAqXG4gKiBcdGFzeW5jIGZ1bmN0aW9uIGdldERhdGEoaWQpIHtcbiAqIFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvaXRlbXMvJHtpZH1gLCB7XG4gKiBcdFx0XHRzaWduYWw6IGdldEFib3J0U2lnbmFsKClcbiAqIFx0XHR9KTtcbiAqXG4gKiBcdFx0cmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAqIFx0fVxuICpcbiAqIFx0Y29uc3QgZGF0YSA9ICRkZXJpdmVkKGF3YWl0IGdldERhdGEoaWQpKTtcbiAqIDwvc2NyaXB0PlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm9ydFNpZ25hbCgpIHtcblx0aWYgKGFjdGl2ZV9yZWFjdGlvbiA9PT0gbnVsbCkge1xuXHRcdGUuZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uKCk7XG5cdH1cblxuXHRyZXR1cm4gKGFjdGl2ZV9yZWFjdGlvbi5hYyA/Pz0gbmV3IEFib3J0Q29udHJvbGxlcigpKS5zaWduYWw7XG59XG5cbi8qKlxuICogYG9uTW91bnRgLCBsaWtlIFtgJGVmZmVjdGBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0KSwgc2NoZWR1bGVzIGEgZnVuY3Rpb24gdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBVbmxpa2UgYCRlZmZlY3RgLCB0aGUgcHJvdmlkZWQgZnVuY3Rpb24gb25seSBydW5zIG9uY2UuXG4gKlxuICogSXQgbXVzdCBiZSBjYWxsZWQgZHVyaW5nIHRoZSBjb21wb25lbnQncyBpbml0aWFsaXNhdGlvbiAoYnV0IGRvZXNuJ3QgbmVlZCB0byBsaXZlIF9pbnNpZGVfIHRoZSBjb21wb25lbnQ7XG4gKiBpdCBjYW4gYmUgY2FsbGVkIGZyb20gYW4gZXh0ZXJuYWwgbW9kdWxlKS4gSWYgYSBmdW5jdGlvbiBpcyByZXR1cm5lZCBfc3luY2hyb25vdXNseV8gZnJvbSBgb25Nb3VudGAsXG4gKiBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBmdW5jdGlvbnMgZG8gbm90IHJ1biBkdXJpbmcgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL3N2ZWx0ZS1zZXJ2ZXIjcmVuZGVyKS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHsoKSA9PiBOb3RGdW5jdGlvbjxUPiB8IFByb21pc2U8Tm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbk1vdW50Jyk7XG5cdH1cblxuXHRpZiAobGVnYWN5X21vZGVfZmxhZyAmJiBjb21wb25lbnRfY29udGV4dC5sICE9PSBudWxsKSB7XG5cdFx0aW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbXBvbmVudF9jb250ZXh0KS5tLnB1c2goZm4pO1xuXHR9IGVsc2Uge1xuXHRcdHVzZXJfZWZmZWN0KCgpID0+IHtcblx0XHRcdGNvbnN0IGNsZWFudXAgPSB1bnRyYWNrKGZuKTtcblx0XHRcdGlmICh0eXBlb2YgY2xlYW51cCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIC8qKiBAdHlwZSB7KCkgPT4gdm9pZH0gKi8gKGNsZWFudXApO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHVubW91bnRlZC5cbiAqXG4gKiBPdXQgb2YgYG9uTW91bnRgLCBgYmVmb3JlVXBkYXRlYCwgYGFmdGVyVXBkYXRlYCBhbmQgYG9uRGVzdHJveWAsIHRoaXMgaXMgdGhlXG4gKiBvbmx5IG9uZSB0aGF0IHJ1bnMgaW5zaWRlIGEgc2VydmVyLXNpZGUgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7KCkgPT4gYW55fSBmblxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbkRlc3Ryb3koZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbkRlc3Ryb3knKTtcblx0fVxuXG5cdG9uTW91bnQoKCkgPT4gKCkgPT4gdW50cmFjayhmbikpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHthbnl9cGFyYW1zXzBcbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlX2N1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBldmVudCBkaXNwYXRjaGVyIHRoYXQgY2FuIGJlIHVzZWQgdG8gZGlzcGF0Y2ggW2NvbXBvbmVudCBldmVudHNdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS9sZWdhY3ktb24jQ29tcG9uZW50LWV2ZW50cykuXG4gKiBFdmVudCBkaXNwYXRjaGVycyBhcmUgZnVuY3Rpb25zIHRoYXQgY2FuIHRha2UgdHdvIGFyZ3VtZW50czogYG5hbWVgIGFuZCBgZGV0YWlsYC5cbiAqXG4gKiBDb21wb25lbnQgZXZlbnRzIGNyZWF0ZWQgd2l0aCBgY3JlYXRlRXZlbnREaXNwYXRjaGVyYCBjcmVhdGUgYVxuICogW0N1c3RvbUV2ZW50XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQpLlxuICogVGhlc2UgZXZlbnRzIGRvIG5vdCBbYnViYmxlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0xlYXJuL0phdmFTY3JpcHQvQnVpbGRpbmdfYmxvY2tzL0V2ZW50cyNFdmVudF9idWJibGluZ19hbmRfY2FwdHVyZSkuXG4gKiBUaGUgYGRldGFpbGAgYXJndW1lbnQgY29ycmVzcG9uZHMgdG8gdGhlIFtDdXN0b21FdmVudC5kZXRhaWxdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC9kZXRhaWwpXG4gKiBwcm9wZXJ0eSBhbmQgY2FuIGNvbnRhaW4gYW55IHR5cGUgb2YgZGF0YS5cbiAqXG4gKiBUaGUgZXZlbnQgZGlzcGF0Y2hlciBjYW4gYmUgdHlwZWQgdG8gbmFycm93IHRoZSBhbGxvd2VkIGV2ZW50IG5hbWVzIGFuZCB0aGUgdHlwZSBvZiB0aGUgYGRldGFpbGAgYXJndW1lbnQ6XG4gKiBgYGB0c1xuICogY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXI8e1xuICogIGxvYWRlZDogbnVsbDsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogQGRlcHJlY2F0ZWQgVXNlIGNhbGxiYWNrIHByb3BzIGFuZC9vciB0aGUgYCRob3N0KClgIHJ1bmUgaW5zdGVhZCDigJQgc2VlIFttaWdyYXRpb24gZ3VpZGVdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS92NS1taWdyYXRpb24tZ3VpZGUjRXZlbnQtY2hhbmdlcy1Db21wb25lbnQtZXZlbnRzKVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXAgPSBhbnldXG4gKiBAcmV0dXJucyB7RXZlbnREaXNwYXRjaGVyPEV2ZW50TWFwPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpIHtcblx0Y29uc3QgYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0ID0gY29tcG9uZW50X2NvbnRleHQ7XG5cdGlmIChhY3RpdmVfY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2NyZWF0ZUV2ZW50RGlzcGF0Y2hlcicpO1xuXHR9XG5cblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBldmVudHMgPSAvKiogQHR5cGUge1JlY29yZDxzdHJpbmcsIEZ1bmN0aW9uIHwgRnVuY3Rpb25bXT59ICovIChcblx0XHRcdGFjdGl2ZV9jb21wb25lbnRfY29udGV4dC5zLiQkZXZlbnRzXG5cdFx0KT8uWy8qKiBAdHlwZSB7YW55fSAqLyAodHlwZSldO1xuXG5cdFx0aWYgKGV2ZW50cykge1xuXHRcdFx0Y29uc3QgY2FsbGJhY2tzID0gaXNfYXJyYXkoZXZlbnRzKSA/IGV2ZW50cy5zbGljZSgpIDogW2V2ZW50c107XG5cdFx0XHQvLyBUT0RPIGFyZSB0aGVyZSBzaXR1YXRpb25zIHdoZXJlIGV2ZW50cyBjb3VsZCBiZSBkaXNwYXRjaGVkXG5cdFx0XHQvLyBpbiBhIHNlcnZlciAobm9uLURPTSkgZW52aXJvbm1lbnQ/XG5cdFx0XHRjb25zdCBldmVudCA9IGNyZWF0ZV9jdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCBvcHRpb25zKTtcblx0XHRcdGZvciAoY29uc3QgZm4gb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRcdGZuLmNhbGwoYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0LngsIGV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcbn1cblxuLy8gVE9ETyBtYXJrIGJlZm9yZVVwZGF0ZSBhbmQgYWZ0ZXJVcGRhdGUgYXMgZGVwcmVjYXRlZCBpbiBTdmVsdGUgNlxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgLlxuICpcbiAqIEluIHJ1bmVzIG1vZGUgdXNlIGAkZWZmZWN0LnByZWAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0LnByZWBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0IyRlZmZlY3QucHJlKSBpbnN0ZWFkXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2JlZm9yZVVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYmVmb3JlVXBkYXRlJyk7XG5cdH1cblxuXHRpbml0X3VwZGF0ZV9jYWxsYmFja3MoY29tcG9uZW50X2NvbnRleHQpLmIucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YC5cbiAqXG4gKiBJbiBydW5lcyBtb2RlIHVzZSBgJGVmZmVjdGAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0YF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIGluc3RlYWRcbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWZ0ZXJVcGRhdGUoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdhZnRlclVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYWZ0ZXJVcGRhdGUnKTtcblx0fVxuXG5cdGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb21wb25lbnRfY29udGV4dCkuYS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBMZWdhY3ktbW9kZTogSW5pdCBjYWxsYmFja3Mgb2JqZWN0IGZvciBvbk1vdW50L2JlZm9yZVVwZGF0ZS9hZnRlclVwZGF0ZVxuICogQHBhcmFtIHtDb21wb25lbnRDb250ZXh0fSBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb250ZXh0KSB7XG5cdHZhciBsID0gLyoqIEB0eXBlIHtDb21wb25lbnRDb250ZXh0TGVnYWN5fSAqLyAoY29udGV4dCkubDtcblx0cmV0dXJuIChsLnUgPz89IHsgYTogW10sIGI6IFtdLCBtOiBbXSB9KTtcbn1cblxuZXhwb3J0IHsgZmx1c2hTeW5jIH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvcnVudGltZS5qcyc7XG5leHBvcnQgeyBnZXRDb250ZXh0LCBnZXRBbGxDb250ZXh0cywgaGFzQ29udGV4dCwgc2V0Q29udGV4dCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2NvbnRleHQuanMnO1xuZXhwb3J0IHsgaHlkcmF0ZSwgbW91bnQsIHVubW91bnQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9yZW5kZXIuanMnO1xuZXhwb3J0IHsgdGljaywgdW50cmFjayB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3J1bnRpbWUuanMnO1xuZXhwb3J0IHsgY3JlYXRlUmF3U25pcHBldCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2RvbS9ibG9ja3Mvc25pcHBldC5qcyc7XG4iLCIvKiogQGltcG9ydCB7IFJlYWRhYmxlLCBTdGFydFN0b3BOb3RpZmllciwgU3Vic2NyaWJlciwgVW5zdWJzY3JpYmVyLCBVcGRhdGVyLCBXcml0YWJsZSB9IGZyb20gJy4uL3B1YmxpYy5qcycgKi9cbi8qKiBAaW1wb3J0IHsgU3RvcmVzLCBTdG9yZXNWYWx1ZXMsIFN1YnNjcmliZUludmFsaWRhdGVUdXBsZSB9IGZyb20gJy4uL3ByaXZhdGUuanMnICovXG5pbXBvcnQgeyBub29wLCBydW5fYWxsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzJztcbmltcG9ydCB7IHNhZmVfbm90X2VxdWFsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMnO1xuaW1wb3J0IHsgc3Vic2NyaWJlX3RvX3N0b3JlIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG4vKipcbiAqIEB0eXBlIHtBcnJheTxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8YW55PiB8IGFueT59XG4gKi9cbmNvbnN0IHN1YnNjcmliZXJfcXVldWUgPSBbXTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI8VD59IFtzdGFydF1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlKHZhbHVlLCBzdGFydCkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogd3JpdGFibGUodmFsdWUsIHN0YXJ0KS5zdWJzY3JpYmVcblx0fTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgV3JpdGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIGJvdGggdXBkYXRpbmcgYW5kIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1R9IFt2YWx1ZV0gaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcjxUPn0gW3N0YXJ0XVxuICogQHJldHVybnMge1dyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge1Vuc3Vic2NyaWJlciB8IG51bGx9ICovXG5cdGxldCBzdG9wID0gbnVsbDtcblxuXHQvKiogQHR5cGUge1NldDxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8VD4+fSAqL1xuXHRjb25zdCBzdWJzY3JpYmVycyA9IG5ldyBTZXQoKTtcblxuXHQvKipcblx0ICogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1VwZGF0ZXI8VD59IGZuXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG5cdFx0c2V0KGZuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7U3Vic2NyaWJlcjxUPn0gcnVuXG5cdCAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2ludmFsaWRhdGVdXG5cdCAqIEByZXR1cm5zIHtVbnN1YnNjcmliZXJ9XG5cdCAqL1xuXHRmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuXHRcdC8qKiBAdHlwZSB7U3Vic2NyaWJlSW52YWxpZGF0ZVR1cGxlPFQ+fSAqL1xuXHRcdGNvbnN0IHN1YnNjcmliZXIgPSBbcnVuLCBpbnZhbGlkYXRlXTtcblx0XHRzdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJzLnNpemUgPT09IDEpIHtcblx0XHRcdHN0b3AgPSBzdGFydChzZXQsIHVwZGF0ZSkgfHwgbm9vcDtcblx0XHR9XG5cdFx0cnVuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBTdG9yZXNWYWx1ZXM8Uz4sIHNldDogKHZhbHVlOiBUKSA9PiB2b2lkLCB1cGRhdGU6IChmbjogVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gVW5zdWJzY3JpYmVyIHwgdm9pZH0gZm5cbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdXG4gKiBAcmV0dXJucyB7UmVhZGFibGU8VD59XG4gKi9cbi8qKlxuICogRGVyaXZlZCB2YWx1ZSBzdG9yZSBieSBzeW5jaHJvbml6aW5nIG9uZSBvciBtb3JlIHJlYWRhYmxlIHN0b3JlcyBhbmRcbiAqIGFwcGx5aW5nIGFuIGFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIG92ZXIgaXRzIGlucHV0IHZhbHVlcy5cbiAqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBvdmVybG9hZFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7KHZhbHVlczogU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuLyoqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7U30gc3RvcmVzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PFJlYWRhYmxlPGFueT4+fSAqL1xuXHRjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGUgPyBbc3RvcmVzXSA6IHN0b3Jlcztcblx0aWYgKCFzdG9yZXNfYXJyYXkuZXZlcnkoQm9vbGVhbikpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2Rlcml2ZWQoKSBleHBlY3RzIHN0b3JlcyBhcyBpbnB1dCwgZ290IGEgZmFsc3kgdmFsdWUnKTtcblx0fVxuXHRjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcblx0cmV0dXJuIHJlYWRhYmxlKGluaXRpYWxfdmFsdWUsIChzZXQsIHVwZGF0ZSkgPT4ge1xuXHRcdGxldCBzdGFydGVkID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtUW119ICovXG5cdFx0Y29uc3QgdmFsdWVzID0gW107XG5cdFx0bGV0IHBlbmRpbmcgPSAwO1xuXHRcdGxldCBjbGVhbnVwID0gbm9vcDtcblx0XHRjb25zdCBzeW5jID0gKCkgPT4ge1xuXHRcdFx0aWYgKHBlbmRpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQsIHVwZGF0ZSk7XG5cdFx0XHRpZiAoYXV0bykge1xuXHRcdFx0XHRzZXQocmVzdWx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNsZWFudXAgPSB0eXBlb2YgcmVzdWx0ID09PSAnZnVuY3Rpb24nID8gcmVzdWx0IDogbm9vcDtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGNvbnN0IHVuc3Vic2NyaWJlcnMgPSBzdG9yZXNfYXJyYXkubWFwKChzdG9yZSwgaSkgPT5cblx0XHRcdHN1YnNjcmliZV90b19zdG9yZShcblx0XHRcdFx0c3RvcmUsXG5cdFx0XHRcdCh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlc1tpXSA9IHZhbHVlO1xuXHRcdFx0XHRcdHBlbmRpbmcgJj0gfigxIDw8IGkpO1xuXHRcdFx0XHRcdGlmIChzdGFydGVkKSB7XG5cdFx0XHRcdFx0XHRzeW5jKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0cGVuZGluZyB8PSAxIDw8IGk7XG5cdFx0XHRcdH1cblx0XHRcdClcblx0XHQpO1xuXHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdHN5bmMoKTtcblx0XHRyZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRcdHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG5cdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHQvLyBXZSBuZWVkIHRvIHNldCB0aGlzIHRvIGZhbHNlIGJlY2F1c2UgY2FsbGJhY2tzIGNhbiBzdGlsbCBoYXBwZW4gZGVzcGl0ZSBoYXZpbmcgdW5zdWJzY3JpYmVkOlxuXHRcdFx0Ly8gQ2FsbGJhY2tzIG1pZ2h0IGFscmVhZHkgYmUgcGxhY2VkIGluIHRoZSBxdWV1ZSB3aGljaCBkb2Vzbid0IGtub3cgaXQgc2hvdWxkIG5vIGxvbmdlclxuXHRcdFx0Ly8gaW52b2tlIHRoaXMgZGVyaXZlZCBzdG9yZS5cblx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcblx0XHR9O1xuXHR9KTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHN0b3JlIGFuZCByZXR1cm5zIGEgbmV3IG9uZSBkZXJpdmVkIGZyb20gdGhlIG9sZCBvbmUgdGhhdCBpcyByZWFkYWJsZS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtSZWFkYWJsZTxUPn0gc3RvcmUgIC0gc3RvcmUgdG8gbWFrZSByZWFkb25seVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZG9ubHkoc3RvcmUpIHtcblx0cmV0dXJuIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIFRPRE8gaSBzdXNwZWN0IHRoZSBiaW5kIGlzIHVubmVjZXNzYXJ5XG5cdFx0c3Vic2NyaWJlOiBzdG9yZS5zdWJzY3JpYmUuYmluZChzdG9yZSlcblx0fTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgZnJvbSBhIHN0b3JlIGJ5IHN1YnNjcmliaW5nIGFuZCBpbW1lZGlhdGVseSB1bnN1YnNjcmliaW5nLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1JlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmVfdG9fc3RvcmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0Ly8gQHRzLWV4cGVjdC1lcnJvclxuXHRyZXR1cm4gdmFsdWU7XG59XG4iLCJpbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdHVzIG9mIHRoZSBhcHBsaWNhdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgU3luY1N0YXR1cyA9ICdpZGxlJyB8ICdzeW5jaW5nJyB8ICdzeW5jZWQnIHwgJ2Vycm9yJyB8ICd1bmF1dGhlbnRpY2F0ZWQnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdGUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3luY1N0YXRlIHtcbiAgc3RhdHVzOiBTeW5jU3RhdHVzO1xuICBsYXN0U3luY1RpbWU/OiBudW1iZXI7XG4gIGxhc3RFcnJvck1lc3NhZ2U/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIG1haW4gZGF0YSBzdHJ1Y3R1cmUgZm9yIHRoZSBhcHBsaWNhdGlvbidzIHN0b3JhZ2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwRGF0YSB7XG4gIGZvbGRlcnM6IEZvbGRlcltdO1xuICB0YWdzOiBUYWdbXTtcbiAgLy8gQm9va21hcmtzIHdpbGwgYmUgbmVzdGVkIHdpdGhpbiBmb2xkZXJzLCBidXQgd2UgY2FuIGhhdmUgYSBmbGF0IGxpc3QgZm9yIGVhc3kgYWNjZXNzIGlmIG5lZWRlZC5cbn1cblxuY29uc3QgU1RPUkFHRV9LRVkgPSAnYXBwRGF0YSc7XG5jb25zdCBTWU5DX1NUQVRVU19LRVkgPSAnc3luY1N0YXR1cyc7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgc3RhdGUgb2YgdGhlIGFwcGxpY2F0aW9uIGRhdGEuXG4gKi9cbmNvbnN0IGRlZmF1bHREYXRhOiBBcHBEYXRhID0ge1xuICBmb2xkZXJzOiBbXG4gICAge1xuICAgICAgaWQ6ICdyb290JyxcbiAgICAgIG5hbWU6ICdSb290JyxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICB9XG4gIF0sXG4gIHRhZ3M6IFtdLFxufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgYWxsIGFwcGxpY2F0aW9uIGRhdGEgZnJvbSBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqIElmIG5vIGRhdGEgaXMgZm91bmQsIGl0IGluaXRpYWxpemVzIHdpdGggdGhlIGRlZmF1bHQgc3RydWN0dXJlLlxuICpcbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBBcHBEYXRhIG9iamVjdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFwcERhdGEoKTogUHJvbWlzZTxBcHBEYXRhPiB7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChTVE9SQUdFX0tFWSk7XG4gIGlmIChyZXN1bHRbU1RPUkFHRV9LRVldKSB7XG4gICAgcmV0dXJuIHJlc3VsdFtTVE9SQUdFX0tFWV0gYXMgQXBwRGF0YTtcbiAgfSBlbHNlIHtcbiAgICAvLyBJbml0aWFsaXplIHN0b3JhZ2Ugd2l0aCBkZWZhdWx0IGRhdGEgaWYgaXQncyB0aGUgZmlyc3QgcnVuXG4gICAgYXdhaXQgc2V0QXBwRGF0YShkZWZhdWx0RGF0YSk7XG4gICAgcmV0dXJuIGRlZmF1bHREYXRhO1xuICB9XG59XG5cbi8qKlxuICogU2F2ZXMgdGhlIGVudGlyZSBhcHBsaWNhdGlvbiBkYXRhIG9iamVjdCB0byBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqXG4gKiBAcGFyYW0gZGF0YSBUaGUgQXBwRGF0YSBvYmplY3QgdG8gc2F2ZS5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGRhdGEgaXMgc2F2ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRBcHBEYXRhKGRhdGE6IEFwcERhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZXTogZGF0YSB9KTtcbn1cblxuLy8gLS0tIENSVUQgT3BlcmF0aW9ucyBmb3IgRm9sZGVycyAtLS1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IGZvbGRlciB0byBhIHBhcmVudCBmb2xkZXIuXG4gKiBAcGFyYW0gcGFyZW50Rm9sZGVySWQgVGhlIElEIG9mIHRoZSBwYXJlbnQgZm9sZGVyLlxuICogQHBhcmFtIG5ld0ZvbGRlciBUaGUgZm9sZGVyIG9iamVjdCB0byBhZGQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRGb2xkZXIocGFyZW50Rm9sZGVySWQ6IHN0cmluZywgbmV3Rm9sZGVyOiBPbWl0PEZvbGRlciwgJ2lkJyB8ICdjaGlsZHJlbicgfCAnY3JlYXRlZEF0Jz4pOiBQcm9taXNlPEZvbGRlcj4ge1xuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgXG4gICAgY29uc3QgY3JlYXRlZEZvbGRlcjogRm9sZGVyID0ge1xuICAgICAgICAuLi5uZXdGb2xkZXIsXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuICAgIH07XG5cbiAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBzZWFyY2guIEEgcmVjdXJzaXZlIHNlYXJjaCB3b3VsZCBiZSBiZXR0ZXIuXG4gICAgY29uc3QgcGFyZW50ID0gZmluZEZvbGRlckJ5SWQoYXBwRGF0YS5mb2xkZXJzLCBwYXJlbnRGb2xkZXJJZCk7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNyZWF0ZWRGb2xkZXIpO1xuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICByZXR1cm4gY3JlYXRlZEZvbGRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmVudCBmb2xkZXIgd2l0aCBpZCAke3BhcmVudEZvbGRlcklkfSBub3QgZm91bmQuYCk7XG4gICAgfVxufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZmluZCBhIGZvbGRlciByZWN1cnNpdmVseVxuZnVuY3Rpb24gZmluZEZvbGRlckJ5SWQoZm9sZGVyczogRm9sZGVyW10sIGlkOiBzdHJpbmcpOiBGb2xkZXIgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IGZvbGRlciBvZiBmb2xkZXJzKSB7XG4gICAgICAgIGlmIChmb2xkZXIuaWQgPT09IGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9sZGVyO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEZvbGRlckJ5SWQoZm9sZGVyLmNoaWxkcmVuLmZpbHRlcihjID0+ICdjaGlsZHJlbicgaW4gYykgYXMgRm9sZGVyW10sIGlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8vIC0tLSBDUlVEIE9wZXJhdGlvbnMgZm9yIEJvb2ttYXJrcyAtLS1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IGJvb2ttYXJrIHRvIGEgcGFyZW50IGZvbGRlci5cbiAqIEBwYXJhbSBwYXJlbnRGb2xkZXJJZCBUaGUgSUQgb2YgdGhlIHBhcmVudCBmb2xkZXIuXG4gKiBAcGFyYW0gbmV3Qm9va21hcmsgVGhlIGJvb2ttYXJrIG9iamVjdCB0byBhZGQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRCb29rbWFyayhwYXJlbnRGb2xkZXJJZDogc3RyaW5nLCBuZXdCb29rbWFyazogT21pdDxCb29rbWFya0l0ZW0sICdpZCcgfCAnY3JlYXRlZEF0JyB8ICdhY2Nlc3NIaXN0b3J5Jz4pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG5cbiAgICAvLyBHZXQgaGlzdG9yeSBmb3IgdGhlIFVSTFxuICAgIGNvbnN0IHZpc2l0cyA9IGF3YWl0IGNocm9tZS5oaXN0b3J5LmdldFZpc2l0cyh7IHVybDogbmV3Qm9va21hcmsudXJsIH0pO1xuICAgIGNvbnN0IGFjY2Vzc0hpc3Rvcnk6IEFjY2Vzc1JlY29yZFtdID0gdmlzaXRzLm1hcCh2aXNpdCA9PiAoe1xuICAgICAgICB0aW1lc3RhbXA6IHZpc2l0LnZpc2l0VGltZSFcbiAgICB9KSk7XG5cbiAgICBjb25zdCBjcmVhdGVkQm9va21hcms6IEJvb2ttYXJrSXRlbSA9IHtcbiAgICAgICAgLi4ubmV3Qm9va21hcmssXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIGFjY2Vzc0hpc3Rvcnk6IGFjY2Vzc0hpc3RvcnksXG4gICAgfTtcblxuICAgIGNvbnN0IHBhcmVudCA9IGZpbmRGb2xkZXJCeUlkKGFwcERhdGEuZm9sZGVycywgcGFyZW50Rm9sZGVySWQpO1xuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChjcmVhdGVkQm9va21hcmspO1xuXG4gICAgICAgIC8vIElmIGEgcmVtaW5kZXIgaXMgc2V0LCBjcmVhdGUgYSBDaHJvbWUgYWxhcm1cbiAgICAgICAgaWYgKGNyZWF0ZWRCb29rbWFyay5yZW1pbmRlcikge1xuICAgICAgICAgICAgY2hyb21lLmFsYXJtcy5jcmVhdGUoYHJlbWluZGVyLSR7Y3JlYXRlZEJvb2ttYXJrLmlkfWAsIHtcbiAgICAgICAgICAgICAgICB3aGVuOiBjcmVhdGVkQm9va21hcmsucmVtaW5kZXIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XG4gICAgICAgIHJldHVybiBjcmVhdGVkQm9va21hcms7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJlbnQgZm9sZGVyIHdpdGggaWQgJHtwYXJlbnRGb2xkZXJJZH0gbm90IGZvdW5kLmApO1xuICAgIH1cbn1cblxuLy8gLS0tIENSVUQgT3BlcmF0aW9ucyBmb3IgVGFncyAtLS1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IHRhZyB0byB0aGUgYXBwbGljYXRpb24gZGF0YS5cbiAqIEBwYXJhbSBuZXdUYWcgVGhlIHRhZyBvYmplY3QgdG8gYWRkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkVGFnKG5ld1RhZzogT21pdDxUYWcsICdpZCc+KTogUHJvbWlzZTxUYWc+IHtcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xuXG4gICAgY29uc3QgY3JlYXRlZFRhZzogVGFnID0ge1xuICAgICAgICAuLi5uZXdUYWcsXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgIH07XG5cbiAgICAvLyBBdm9pZCBkdXBsaWNhdGUgdGFnIG5hbWVzXG4gICAgaWYgKGFwcERhdGEudGFncy5zb21lKHRhZyA9PiB0YWcubmFtZS50b0xvd2VyQ2FzZSgpID09PSBjcmVhdGVkVGFnLm5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYWcgd2l0aCBuYW1lIFwiJHtjcmVhdGVkVGFnLm5hbWV9XCIgYWxyZWFkeSBleGlzdHMuYCk7XG4gICAgfVxuXG4gICAgYXBwRGF0YS50YWdzLnB1c2goY3JlYXRlZFRhZyk7XG4gICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcbiAgICByZXR1cm4gY3JlYXRlZFRhZztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGdsb2JhbCB0YWcuXG4gKiBAcGFyYW0gbmV3VGFnIFRoZSB0YWcgb2JqZWN0IHRvIGNyZWF0ZS5cbiAqIEByZXR1cm5zIFRoZSBuZXdseSBjcmVhdGVkIHRhZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVRhZyhuZXdUYWc6IFBhcnRpYWw8VGFnPik6IFByb21pc2U8VGFnPiB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcbiAgICBcbiAgICAvLyBDaGVjayBpZiBhIHRhZyB3aXRoIHRoZSBzYW1lIG5hbWUgYWxyZWFkeSBleGlzdHNcbiAgICBpZiAoZGF0YS50YWdzLnNvbWUodCA9PiB0Lm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmV3VGFnLm5hbWU/LnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFnIFwiJHtuZXdUYWcubmFtZX1cIiBhbHJlYWR5IGV4aXN0cy5gKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YWc6IFRhZyA9IHtcbiAgICAgICAgaWQ6IGB0YWctJHtEYXRlLm5vdygpfWAsXG4gICAgICAgIG5hbWU6IG5ld1RhZy5uYW1lISxcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpXG4gICAgfTtcbiAgICBkYXRhLnRhZ3MucHVzaCh0YWcpO1xuICAgIGF3YWl0IHNldEFwcERhdGEoZGF0YSk7XG4gICAgcmV0dXJuIHRhZztcbn1cblxuLy8gLS0tIEhlbHBlciBmdW5jdGlvbnMgdG8gZmluZCBpdGVtcyAtLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb29rbWFya0J5SWQobm9kZXM6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10sIGlkOiBzdHJpbmcpOiBCb29rbWFya0l0ZW0gfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEJvb2ttYXJrQnlJZChub2RlLmNoaWxkcmVuLCBpZCk7XG4gICAgICAgICAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcbiAgICAgICAgfSBlbHNlIHsgLy8gQm9va21hcmtJdGVtXG4gICAgICAgICAgICBpZiAobm9kZS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb29rbWFya0J5VXJsKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdLCB1cmw6IHN0cmluZyk6IEJvb2ttYXJrSXRlbSB8IG51bGwge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlKSB7IC8vIEZvbGRlclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kQm9va21hcmtCeVVybChub2RlLmNoaWxkcmVuLCB1cmwpO1xuICAgICAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gICAgICAgIH0gZWxzZSB7IC8vIEJvb2ttYXJrSXRlbVxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIFVSTHMgdG8gY29tcGFyZSB0aGVtIG1vcmUgcmVsaWFibHlcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKG5ldyBVUkwobm9kZS51cmwpLmhyZWYgPT09IG5ldyBVUkwodXJsKS5ocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgaW52YWxpZCBVUkxzXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8vIC0tLSBVcGRhdGUgZnVuY3Rpb25zIC0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va21hcmsodXBkYXRlZEJvb2ttYXJrOiBCb29rbWFya0l0ZW0pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgXG4gICAgLy8gV2UgbmVlZCB0byBmaW5kIHRoZSBvcmlnaW5hbCBib29rbWFyayB0byB1cGRhdGUgaXQuXG4gICAgLy8gVGhpcyBpcyBub3QgZWZmaWNpZW50LCBhIGZsYXQgbWFwIHdvdWxkIGJlIGJldHRlciBmb3IgcGVyZm9ybWFuY2Ugb24gbGFyZ2UgZGF0YXNldHMuXG4gICAgY29uc3QgYm9va21hcmsgPSBmaW5kQm9va21hcmtCeUlkKGFwcERhdGEuZm9sZGVycywgdXBkYXRlZEJvb2ttYXJrLmlkKTtcblxuICAgIGlmIChib29rbWFyaykge1xuICAgICAgICBPYmplY3QuYXNzaWduKGJvb2ttYXJrLCB1cGRhdGVkQm9va21hcmspO1xuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICByZXR1cm4gYm9va21hcms7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCb29rbWFyayB3aXRoIGlkICR7dXBkYXRlZEJvb2ttYXJrLmlkfSBub3QgZm91bmQuYCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVCb29rbWFya0J5SWQobm9kZXM6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10sIGlkOiBzdHJpbmcpOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdIHtcbiAgICByZXR1cm4gbm9kZXMuZmlsdGVyKG5vZGUgPT4ge1xuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlKSB7IC8vIEZvbGRlclxuICAgICAgICAgICAgbm9kZS5jaGlsZHJlbiA9IHJlbW92ZUJvb2ttYXJrQnlJZChub2RlLmNoaWxkcmVuLCBpZCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgZm9sZGVyXG4gICAgICAgIH1cbiAgICAgICAgLy8gSXQncyBhIGJvb2ttYXJrLCBmaWx0ZXIgaXQgb3V0IGlmIElEcyBtYXRjaFxuICAgICAgICByZXR1cm4gbm9kZS5pZCAhPT0gaWQ7IFxuICAgIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlQm9va21hcmsoaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgYXBwRGF0YS5mb2xkZXJzID0gcmVtb3ZlQm9va21hcmtCeUlkKGFwcERhdGEuZm9sZGVycywgaWQpIGFzIEZvbGRlcltdO1xuICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XG59XG5cbi8vIC0tLSBTeW5jIFN0YXR1cyBNYW5hZ2VtZW50IC0tLVxuXG4vKipcbiAqIEdldHMgdGhlIGN1cnJlbnQgc3luYyBzdGF0dXMgZnJvbSBzdG9yYWdlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U3luY1N0YXR1cygpOiBQcm9taXNlPFN5bmNTdGF0ZT4ge1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoU1lOQ19TVEFUVVNfS0VZKTtcbiAgcmV0dXJuIHJlc3VsdFtTWU5DX1NUQVRVU19LRVldIHx8IHsgc3RhdHVzOiAnaWRsZScgfTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBzeW5jIHN0YXR1cyBpbiBzdG9yYWdlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0U3luY1N0YXR1cyhzdGF0dXM6IFN5bmNTdGF0dXMsIGVycm9yTWVzc2FnZT86IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzeW5jU3RhdGU6IFN5bmNTdGF0ZSA9IHtcbiAgICBzdGF0dXMsXG4gICAgbGFzdFN5bmNUaW1lOiBzdGF0dXMgPT09ICdzeW5jZWQnID8gRGF0ZS5ub3coKSA6IHVuZGVmaW5lZCxcbiAgICBsYXN0RXJyb3JNZXNzYWdlOiBzdGF0dXMgPT09ICdlcnJvcicgPyBlcnJvck1lc3NhZ2UgOiB1bmRlZmluZWRcbiAgfTtcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NZTkNfU1RBVFVTX0tFWV06IHN5bmNTdGF0ZSB9KTtcbn1cblxuLyoqXG4gKiBBIHJlYWRhYmxlIFN2ZWx0ZSBzdG9yZSBmb3Igc3luYyBzdGF0dXMgdGhhdCBzdGF5cyBpbiBzeW5jIHdpdGggY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cbmV4cG9ydCBjb25zdCBzeW5jU3RhdHVzU3RvcmUgPSByZWFkYWJsZTxTeW5jU3RhdGU+KHsgc3RhdHVzOiAnaWRsZScgfSwgKHNldCkgPT4ge1xuICAvLyBHZXQgdGhlIGluaXRpYWwgdmFsdWUgZnJvbSBzdG9yYWdlXG4gIGdldFN5bmNTdGF0dXMoKS50aGVuKHNldCkuY2F0Y2goZXJyID0+IHtcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgc3luY1N0YXR1c1N0b3JlOlwiLCBlcnIpO1xuICAgIHNldCh7IHN0YXR1czogJ2Vycm9yJywgbGFzdEVycm9yTWVzc2FnZTogJ0ZhaWxlZCB0byBpbml0aWFsaXplIHN5bmMgc3RhdHVzJyB9KTtcbiAgfSk7XG5cbiAgLy8gU2V0IHVwIGEgbGlzdGVuZXIgZm9yIGNoYW5nZXNcbiAgY29uc3QgbGlzdGVuZXIgPSAoY2hhbmdlczogeyBba2V5OiBzdHJpbmddOiBjaHJvbWUuc3RvcmFnZS5TdG9yYWdlQ2hhbmdlIH0sIGFyZWFOYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoYXJlYU5hbWUgPT09ICdsb2NhbCcgJiYgY2hhbmdlc1tTWU5DX1NUQVRVU19LRVldKSB7XG4gICAgICBzZXQoY2hhbmdlc1tTWU5DX1NUQVRVU19LRVldLm5ld1ZhbHVlIGFzIFN5bmNTdGF0ZSk7XG4gICAgfVxuICB9O1xuXG4gIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICB9O1xufSk7XG5cbi8vIC0tLSBSZWFjdGl2ZSBTdmVsdGUgU3RvcmUgLS0tXG5pbXBvcnQgeyByZWFkYWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5cbi8qKlxuICogQSByZWFkYWJsZSBTdmVsdGUgc3RvcmUgdGhhdCBzdGF5cyBpbiBzeW5jIHdpdGggY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cbmV4cG9ydCBjb25zdCBhcHBEYXRhU3RvcmUgPSByZWFkYWJsZTxBcHBEYXRhIHwgbnVsbD4obnVsbCwgKHNldCkgPT4ge1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIGZpcnN0IHN1YnNjcmliZXIgc3Vic2NyaWJlcy5cblxuICAgIC8vIDEuIEdldCB0aGUgaW5pdGlhbCB2YWx1ZSBmcm9tIHN0b3JhZ2UgYW5kIHNldCB0aGUgc3RvcmUncyB2YWx1ZS5cbiAgICBnZXRBcHBEYXRhKCkudGhlbihkYXRhID0+IHtcbiAgICAgICAgc2V0KGRhdGEpO1xuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBhcHBEYXRhU3RvcmU6XCIsIGVycik7XG4gICAgICAgIC8vIE9wdGlvbmFsbHkgc2V0IGEgZGVmYXVsdCB2YWx1ZSBvciBhbiBlcnJvciBzdGF0ZVxuICAgICAgICBzZXQoZGVmYXVsdERhdGEpOyBcbiAgICB9KTtcblxuICAgIC8vIDIuIFNldCB1cCBhIGxpc3RlbmVyIGZvciBhbnkgc3Vic2VxdWVudCBjaGFuZ2VzIGluIHN0b3JhZ2UuXG4gICAgY29uc3QgbGlzdGVuZXIgPSAoY2hhbmdlczogeyBba2V5OiBzdHJpbmddOiBjaHJvbWUuc3RvcmFnZS5TdG9yYWdlQ2hhbmdlIH0sIGFyZWFOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGFyZWFOYW1lID09PSAnbG9jYWwnICYmIGNoYW5nZXNbU1RPUkFHRV9LRVldKSB7XG4gICAgICAgICAgICBzZXQoY2hhbmdlc1tTVE9SQUdFX0tFWV0ubmV3VmFsdWUgYXMgQXBwRGF0YSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcblxuICAgIC8vIDMuIFJldHVybiBhIGNsZWFudXAgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBzdWJzY3JpYmVyIHVuc3Vic2NyaWJlcy5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgIH07XG59KTsgIiwiLyoqXG4gKiBUaGlzIGZpbGUgY29udGFpbnMgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIGludGVyYWN0aW5nIHdpdGggdGhlIEdvb2dsZSBEcml2ZSBBUEkuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGb2xkZXIsIEJvb2ttYXJrSXRlbSwgVGFnLCBBY2Nlc3NSZWNvcmQgfSBmcm9tICckbGliL3R5cGVzJztcblxuLy8gVGhpcyBpcyB0aGUgQ2xpZW50IElEIGZvciB0aGUgXCJXZWIgQXBwbGljYXRpb25cIiB0eXBlIGNyZWRlbnRpYWwgaW4gR29vZ2xlIENsb3VkIENvbnNvbGUuXG4vLyBJdCBpcyB1c2VkIGFzIGEgZmFsbGJhY2sgZm9yIGJyb3dzZXJzIHRoYXQgZG8gbm90IHN1cHBvcnQgY2hyb21lLmlkZW50aXR5LmdldEF1dGhUb2tlbiAoZS5nLiwgQnJhdmUpLlxuY29uc3QgV0VCX0FQUF9DTElFTlRfSUQgPSAnNTE5NzI5MzA5NTExLWpiZnY4ZjFjczA4Zm0xdDc0ZmIyZXZ0dDEyaG5iYW5rLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJztcblxuY29uc3QgRElTQ09WRVJZX0RPQyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9kaXNjb3ZlcnkvdjEvYXBpcy9kcml2ZS92My9yZXN0JztcblxuY29uc3QgQk9VTkRBUlkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0Nic7XG5jb25zdCBVUExPQURfVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3VwbG9hZC9kcml2ZS92My9maWxlcyc7XG5jb25zdCBEUklWRV9GSUxFU19VUkwgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vZHJpdmUvdjMvZmlsZXMnO1xuY29uc3QgRklMRV9OQU1FID0gJ2Nocm9tZS1leHRlbnNpb24tc3ZlbHRlLXR5cGVzY3JpcHQtYm9pbGVycGxhdGUtYmFja3VwLmpzb24nO1xuY29uc3QgTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZID0gJ2dkcml2ZV9tYW51YWxfdG9rZW4nO1xuXG4vKipcbiAqIEN1c3RvbSBlcnJvciBjbGFzcyBmb3IgYXV0aGVudGljYXRpb24gZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdXRoRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG5cdGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZykge1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXHRcdHRoaXMubmFtZSA9ICdBdXRoRXJyb3InO1xuXHR9XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgR29vZ2xlIENocm9tZS5cbiAqIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGNoZWNrIGFuZCBtaWdodCBuZWVkIGltcHJvdmVtZW50LlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdHJ1ZSBpZiB0aGUgYnJvd3NlciBpcyBsaWtlbHkgQ2hyb21lLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGlzQ2hyb21lQnJvd3NlcigpOiBQcm9taXNlPGJvb2xlYW4+IHtcblx0Ly8gQHRzLWlnbm9yZVxuXHRpZiAobmF2aWdhdG9yLmJyYXZlICYmIChhd2FpdCBuYXZpZ2F0b3IuYnJhdmUuaXNCcmF2ZSgpKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHQvLyBUaGlzIGlzIG5vdCBhIGZvb2xwcm9vZiB3YXkgdG8gZGV0ZWN0IENocm9tZSwgYnV0IGl0J3MgYSBjb21tb24gbWV0aG9kLlxuXHQvLyBJdCBjaGVja3MgZm9yIHRoZSBwcmVzZW5jZSBvZiAnQ2hyb21lJyBhbmQgdGhlIGFic2VuY2Ugb2YgJ0VkZycgKGZvciBFZGdlKSBpbiB0aGUgdXNlciBhZ2VudCBzdHJpbmcuXG5cdC8vIEl0J3MgYSByZWFzb25hYmxlIGhldXJpc3RpYyBmb3IgZGlzdGluZ3Vpc2hpbmcgQ2hyb21lIGZyb20gb3RoZXIgQ2hyb21pdW0tYmFzZWQgYnJvd3NlcnMuXG5cdHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50LmluY2x1ZGVzKCdDaHJvbWUnKSAmJiAhbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmNsdWRlcygnRWRnJyk7XG59XG5cbmZ1bmN0aW9uIGxhdW5jaFdlYkF1dGhGbG93KGludGVyYWN0aXZlOiBib29sZWFuKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRpZiAoV0VCX0FQUF9DTElFTlRfSUQuc3RhcnRzV2l0aCgnQ09MRV9PX1NFVV9JRF9ERV9DTElFTlRFJykpIHtcblx0XHRcdHJldHVybiByZWplY3QoXG5cdFx0XHRcdG5ldyBFcnJvcignUGxlYXNlIHByb3ZpZGUgdGhlIFdlYiBBcHBsaWNhdGlvbiBDbGllbnQgSUQgaW4gc3JjL2xpYi9nZHJpdmUudHMnKVxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRjb25zdCBleHRlbnNpb25JZCA9IGNocm9tZS5ydW50aW1lLmlkO1xuXHRcdGNvbnN0IHJlZGlyZWN0VXJpID0gYGh0dHBzOi8vJHtleHRlbnNpb25JZH0uY2hyb21pdW1hcHAub3JnYDtcblx0XHRjb25zb2xlLmxvZyhcblx0XHRcdCdQYXJhIG8gZmx1eG8gZGUgYXV0ZW50aWNhw6fDo28gZGEgd2ViLCBjZXJ0aWZpcXVlLXNlIGRlIHF1ZSBlc3RlIFVSSSBkZSByZWRpcmVjaW9uYW1lbnRvIGVzdMOhIGFkaWNpb25hZG8gw6BzIHN1YXMgY3JlZGVuY2lhaXMgZGUgT0F1dGggMi4wIGRvIHRpcG8gXCJBcGxpY2HDp8OjbyBXZWJcIiBuYSBHb29nbGUgQ2xvdWQgQ29uc29sZTonLFxuXHRcdFx0cmVkaXJlY3RVcmlcblx0XHQpO1xuXHRcdGNvbnN0IHNjb3BlcyA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlLmZpbGUgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLnByb2ZpbGUnO1xuXHRcdGxldCBhdXRoVXJsID0gYGh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi92Mi9hdXRoYDtcblx0XHRhdXRoVXJsICs9IGA/Y2xpZW50X2lkPSR7V0VCX0FQUF9DTElFTlRfSUR9YDtcblx0XHRhdXRoVXJsICs9IGAmcmVzcG9uc2VfdHlwZT10b2tlbmA7XG5cdFx0YXV0aFVybCArPSBgJnJlZGlyZWN0X3VyaT0ke2VuY29kZVVSSUNvbXBvbmVudChyZWRpcmVjdFVyaSl9YDtcblx0XHRhdXRoVXJsICs9IGAmc2NvcGU9JHtlbmNvZGVVUklDb21wb25lbnQoc2NvcGVzKX1gO1xuXG5cdFx0Y2hyb21lLmlkZW50aXR5LmxhdW5jaFdlYkF1dGhGbG93KHsgdXJsOiBhdXRoVXJsLCBpbnRlcmFjdGl2ZSB9LCAocmVzcG9uc2VVcmwpID0+IHtcblx0XHRcdGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlVXJsKSB7XG5cdFx0XHRcdGNvbnN0IHVybCA9IG5ldyBVUkwocmVzcG9uc2VVcmwpO1xuXHRcdFx0XHRjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5oYXNoLnN1YnN0cmluZygxKSk7IC8vIFJlbW92ZSB0aGUgJyMnXG5cdFx0XHRcdGNvbnN0IGFjY2Vzc1Rva2VuID0gcGFyYW1zLmdldCgnYWNjZXNzX3Rva2VuJyk7XG5cdFx0XHRcdGlmIChhY2Nlc3NUb2tlbikge1xuXHRcdFx0XHRcdGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVldOiBhY2Nlc3NUb2tlbiB9LCAoKSA9PiB7XG5cdFx0XHRcdFx0XHQvLyBUaGUgbGlzdGVuZXIgYWJvdmUgd2lsbCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSB0aGUgc3RvcmVcblx0XHRcdFx0XHRcdHJlc29sdmUoYWNjZXNzVG9rZW4pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZDogQWNjZXNzIHRva2VuIG5vdCBmb3VuZCBpbiByZXNwb25zZS4nKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZDogTm8gcmVzcG9uc2UgVVJMLicpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59XG5cbi8qKlxuICogSW5pdGlhdGVzIHRoZSBPQXV0aCAyLjAgZmxvdyB0byBnZXQgYW4gYWNjZXNzIHRva2VuLlxuICogQHBhcmFtIGludGVyYWN0aXZlIElmIHRydWUsIHRoZSB1c2VyIHdpbGwgYmUgcHJvbXB0ZWQgdG8gbG9nIGluIGlmIG5lY2Vzc2FyeS5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBhY2Nlc3MgdG9rZW4uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBdXRoVG9rZW4oaW50ZXJhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHN0cmluZz4ge1xuXHRjb25zdCBpc0Nocm9tZSA9IGF3YWl0IGlzQ2hyb21lQnJvd3NlcigpO1xuXG5cdGlmIChpc0Nocm9tZSkge1xuXHRcdGNvbnNvbGUubG9nKCdEZXRlY3RlZCBDaHJvbWUgYnJvd3NlciwgdXNpbmcgY2hyb21lLmlkZW50aXR5LmdldEF1dGhUb2tlbi4nKTtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Y2hyb21lLmlkZW50aXR5LmdldEF1dGhUb2tlbih7IGludGVyYWN0aXZlIH0sICh0b2tlbikgPT4ge1xuXHRcdFx0XHRpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc29sdmUodG9rZW4gYXMgc3RyaW5nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc29sZS5sb2coJ0RldGVjdGVkIGEgbm9uLUNocm9tZSBicm93c2VyLCB1c2luZyBjaHJvbWUuaWRlbnRpdHkubGF1bmNoV2ViQXV0aEZsb3cuJyk7XG5cdFx0aWYgKGludGVyYWN0aXZlKSB7XG5cdFx0XHRyZXR1cm4gbGF1bmNoV2ViQXV0aEZsb3coaW50ZXJhY3RpdmUpO1xuXHRcdH1cblx0XHQvLyBUcnkgdG8gZ2V0IGZyb20gc3RvcmFnZSBpZiBub3QgaW50ZXJhY3RpdmVcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Y2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KE1BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWSwgKHJlc3VsdCkgPT4ge1xuXHRcdFx0XHRpZiAocmVzdWx0W01BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWV0pIHtcblx0XHRcdFx0XHRyZXNvbHZlKHJlc3VsdFtNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVldKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdOb3QgbG9nZ2VkIGluLicpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGEgY2FjaGVkIE9BdXRoIDIuMCB0b2tlbi5cbiAqIEBwYXJhbSB0b2tlbiBUaGUgdG9rZW4gdG8gcmVtb3ZlLlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgdG9rZW4gaXMgcmVtb3ZlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUNhY2hlZEF1dGhUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGNocm9tZS5pZGVudGl0eS5yZW1vdmVDYWNoZWRBdXRoVG9rZW4oeyB0b2tlbiB9LCAoKSA9PiB7XG5cdFx0XHRjaHJvbWUuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZLCAoKSA9PiB7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0SGVhZGVycyh0b2tlbjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW59YCxcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9O1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBiYWNrdXAgZmlsZSBpbiB0aGUgdXNlcidzIEdvb2dsZSBEcml2ZS5cbiAqIEBwYXJhbSB0b2tlbiBUaGUgT0F1dGggMi4wIGFjY2VzcyB0b2tlbi5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG1ldGFkYXRhIGlmIGZvdW5kLCBvdGhlcndpc2UgbnVsbC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZmluZEJhY2t1cEZpbGUodG9rZW46IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBhd2FpdCBnZXRIZWFkZXJzKHRva2VuKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0RSSVZFX0ZJTEVTX1VSTH0/cT1uYW1lPScke0ZJTEVfTkFNRX0nIGFuZCAncm9vdCcgaW4gcGFyZW50cyBhbmQgdHJhc2hlZD1mYWxzZWAsIHtcbiAgICAgICAgaGVhZGVycyxcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgQXV0aEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyk7XG5cdFx0fVxuICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBBUEkgRXJyb3Igb24gZmluZEJhY2t1cEZpbGU6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gc2VhcmNoIGZvciBiYWNrdXAgZmlsZTogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIHJldHVybiBkYXRhLmZpbGVzLmxlbmd0aCA+IDAgPyBkYXRhLmZpbGVzWzBdIDogbnVsbDtcbn1cblxuLyoqXG4gKiBVcGxvYWRzIHRoZSBhcHBsaWNhdGlvbiBkYXRhIHRvIEdvb2dsZSBEcml2ZS5cbiAqIEBwYXJhbSB0b2tlbiBUaGUgT0F1dGggMi4wIGFjY2VzcyB0b2tlbi5cbiAqIEBwYXJhbSBkYXRhIFRoZSBhcHBsaWNhdGlvbiBkYXRhIHRvIHVwbG9hZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEJhY2t1cCh0b2tlbjogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlID0gYXdhaXQgZmluZEJhY2t1cEZpbGUodG9rZW4pO1xuICAgIFxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YTogeyBuYW1lOiBzdHJpbmcsIHBhcmVudHM/OiBzdHJpbmdbXSB9ID0ge1xuICAgICAgICBuYW1lOiBGSUxFX05BTUUsXG4gICAgfTtcblxuICAgIGlmICghZmlsZSkge1xuICAgICAgICAvLyBQYXJlbnRzIGZpZWxkIGlzIG5vdCBuZWVkZWQgaWYgdGhlIGZpbGUgaXMgaW4gdGhlIHJvb3QuXG4gICAgICAgIC8vIEl0IGRlZmF1bHRzIHRvIHRoZSByb290IGlmIG5vdCBzcGVjaWZpZWQuXG4gICAgfVxuXG4gICAgY29uc3QgbXVsdGlwYXJ0UmVxdWVzdEJvZHkgPVxuICAgICAgICBgLS0ke0JPVU5EQVJZfVxcclxcbmAgK1xuICAgICAgICBgQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XFxyXFxuXFxyXFxuYCArXG4gICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGZpbGVNZXRhZGF0YSl9XFxyXFxuYCArXG4gICAgICAgIGAtLSR7Qk9VTkRBUll9XFxyXFxuYCArXG4gICAgICAgIGBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG5gICtcbiAgICAgICAgYCR7SlNPTi5zdHJpbmdpZnkoZGF0YSl9XFxyXFxuYCArXG4gICAgICAgIGAtLSR7Qk9VTkRBUll9LS1gO1xuXG4gICAgY29uc3QgbWV0aG9kID0gZmlsZSA/ICdQQVRDSCcgOiAnUE9TVCc7XG4gICAgY29uc3QgdXJsID0gZmlsZSA/IGAke1VQTE9BRF9VUkx9LyR7ZmlsZS5pZH0/dXBsb2FkVHlwZT1tdWx0aXBhcnRgIDogYCR7VVBMT0FEX1VSTH0/dXBsb2FkVHlwZT1tdWx0aXBhcnRgO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0b2tlbn1gLFxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6IGBtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9JHtCT1VOREFSWX1gLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBtdWx0aXBhcnRSZXF1ZXN0Qm9keSxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcblx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEpIHtcblx0XHRcdHRocm93IG5ldyBBdXRoRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZC4gUGxlYXNlIGxvZyBpbiBhZ2Fpbi4nKTtcblx0XHR9XG4gICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignR29vZ2xlIEFQSSBFcnJvciBvbiB1cGxvYWRCYWNrdXA6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBsb2FkIGJhY2t1cDogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBEb3dubG9hZHMgdGhlIGJhY2t1cCBmaWxlIGZyb20gR29vZ2xlIERyaXZlLlxuICogQHBhcmFtIHRva2VuIFRoZSBPQXV0aCAyLjAgYWNjZXNzIHRva2VuLlxuICogQHJldHVybnMgVGhlIGFwcGxpY2F0aW9uIGRhdGEgZnJvbSB0aGUgYmFja3VwIGZpbGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZEJhY2t1cCh0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnModG9rZW4pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7RFJJVkVfRklMRVNfVVJMfS8ke2ZpbGUuaWR9P2FsdD1tZWRpYWAsIHtcbiAgICAgICAgaGVhZGVycyxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcblx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEpIHtcblx0XHRcdHRocm93IG5ldyBBdXRoRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZC4gUGxlYXNlIGxvZyBpbiBhZ2Fpbi4nKTtcblx0XHR9XG4gICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignR29vZ2xlIEFQSSBFcnJvciBvbiBkb3dubG9hZEJhY2t1cDonLCBlcnJvckRldGFpbHMpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBkb3dubG9hZCBiYWNrdXA6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xufVxuXG4vLyBGdW5jdGlvbnMgZm9yIGJhY2t1cCBhbmQgcmVzdG9yZSB3aWxsIGJlIGFkZGVkIGJlbG93LiAiLCJpbXBvcnQgeyB0eXBlIENsYXNzVmFsdWUsIGNsc3ggfSBmcm9tIFwiY2xzeFwiO1xuaW1wb3J0IHsgdHdNZXJnZSB9IGZyb20gXCJ0YWlsd2luZC1tZXJnZVwiO1xuXG5leHBvcnQgZnVuY3Rpb24gY24oLi4uaW5wdXRzOiBDbGFzc1ZhbHVlW10pIHtcblx0cmV0dXJuIHR3TWVyZ2UoY2xzeChpbnB1dHMpKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGAgbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZFxuICogc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhcyBpbnZva2VkLlxuICogQHBhcmFtIGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICogQHBhcmFtIHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcmV0dXJucyBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gYW55PihmdW5jOiBULCB3YWl0OiBudW1iZXIpOiAoLi4uYXJnczogUGFyYW1ldGVyczxUPikgPT4gdm9pZCB7XG4gICAgbGV0IHRpbWVvdXQ6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbDtcblxuICAgIHJldHVybiBmdW5jdGlvbih0aGlzOiBUaGlzUGFyYW1ldGVyVHlwZTxUPiwgLi4uYXJnczogUGFyYW1ldGVyczxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH0sIHdhaXQpO1xuICAgIH07XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBXaXRob3V0Q2hpbGQ8VD4gPSBUIGV4dGVuZHMgeyBjaGlsZD86IGFueSB9ID8gT21pdDxULCBcImNoaWxkXCI+IDogVDtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBXaXRob3V0Q2hpbGRyZW48VD4gPSBUIGV4dGVuZHMgeyBjaGlsZHJlbj86IGFueSB9ID8gT21pdDxULCBcImNoaWxkcmVuXCI+IDogVDtcbmV4cG9ydCB0eXBlIFdpdGhvdXRDaGlsZHJlbk9yQ2hpbGQ8VD4gPSBXaXRob3V0Q2hpbGRyZW48V2l0aG91dENoaWxkPFQ+PjtcbmV4cG9ydCB0eXBlIFdpdGhFbGVtZW50UmVmPFQsIFUgZXh0ZW5kcyBIVE1MRWxlbWVudCA9IEhUTUxFbGVtZW50PiA9IFQgJiB7IHJlZj86IFUgfCBudWxsIH07XG4iLCJpbXBvcnQgeyBhcHBEYXRhU3RvcmUsIHNldFN5bmNTdGF0dXMgfSBmcm9tICcuL3N0b3JhZ2UnO1xuaW1wb3J0IHsgZ2V0QXV0aFRva2VuLCB1cGxvYWRCYWNrdXAsIEF1dGhFcnJvciB9IGZyb20gJy4vZ2RyaXZlJztcbmltcG9ydCB7IGRlYm91bmNlIH0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBpc0ZpcnN0Q2hhbmdlID0gdHJ1ZTtcblxuY29uc3QgZGVib3VuY2VkVXBsb2FkID0gZGVib3VuY2UoYXN5bmMgKHRva2VuOiBzdHJpbmcsIGRhdGE6IGFueSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdEZWJvdW5jZWQgYmFja3VwIHRyaWdnZXJlZC4nKTtcbiAgICBhd2FpdCBzZXRTeW5jU3RhdHVzKCdzeW5jaW5nJyk7XG4gICAgXG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdXBsb2FkQmFja3VwKHRva2VuLCBkYXRhKTtcbiAgICAgICAgYXdhaXQgc2V0U3luY1N0YXR1cygnc3luY2VkJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBzdWNjZXNzZnVsLicpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignQXV0by1iYWNrdXAgZmFpbGVkOicsIGUpO1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEF1dGhFcnJvcikge1xuICAgICAgICAgICAgYXdhaXQgc2V0U3luY1N0YXR1cygndW5hdXRoZW50aWNhdGVkJywgZS5tZXNzYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ2Vycm9yJywgZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH1cbn0sIDUwMDApOyAvLyBEZWJvdW5jZSBmb3IgNSBzZWNvbmRzXG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURhdGFDaGFuZ2UoZGF0YTogYW55KSB7XG4gICAgaWYgKGlzRmlyc3RDaGFuZ2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0luaXRpYWwgZGF0YSBsb2FkZWQsIHNraXBwaW5nIGZpcnN0IGF1dG8tYmFja3VwLicpO1xuICAgICAgICBpc0ZpcnN0Q2hhbmdlID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGEgdG9rZW4gbm9uLWludGVyYWN0aXZlbHkuXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGdldEF1dGhUb2tlbihmYWxzZSk7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGF0YSBjaGFuZ2VkLCBzY2hlZHVsaW5nIGF1dG8tYmFja3VwLi4uJyk7XG4gICAgICAgICAgICAgICAgZGVib3VuY2VkVXBsb2FkKHRva2VuLCBkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gdG9rZW4sIHdoaWNoIG1lYW5zIHdlIGFyZSBsb2dnZWQgb3V0LlxuICAgICAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3VuYXV0aGVudGljYXRlZCcsICdVc2VyIGlzIG5vdCBsb2dnZWQgaW4uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGNhbiBoYXBwZW4gaWYgZ2V0QXV0aFRva2VuIGZhaWxzIChlLmcuIG5vdCBsb2dnZWQgaW4gb24gbm9uLWNocm9tZSlcbiAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3VuYXV0aGVudGljYXRlZCcsICdVc2VyIGlzIG5vdCBsb2dnZWQgaW4uJyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIFN1YnNjcmliZSB0byB0aGUgc3RvcmUgdG8gbGlzdGVuIGZvciBjaGFuZ2VzLlxuYXBwRGF0YVN0b3JlLnN1YnNjcmliZShoYW5kbGVEYXRhQ2hhbmdlKTtcblxuY29uc29sZS5sb2coJ0F1dG8tYmFja3VwIG1vZHVsZSBpbml0aWFsaXplZC4nKTsgIiwiaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gXCIjaW1wb3J0c1wiO1xuaW1wb3J0IHsgZmluZEJvb2ttYXJrQnlJZCwgZ2V0QXBwRGF0YSwgZmluZEJvb2ttYXJrQnlVcmwsIHNldEFwcERhdGEgfSBmcm9tIFwiLi4vbGliL3N0b3JhZ2VcIjtcblxuLy8gSW1wb3J0IHRoZSBhdXRvLWJhY2t1cCBtb2R1bGUgdG8gaW5pdGlhbGl6ZSBpdC5cbmltcG9ydCAnJGxpYi9hdXRvLWJhY2t1cCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICAgIC8vIExpc3RlbmVyIGZvciB3aGVuIGFuIGFsYXJtIGdvZXMgb2ZmXG4gICAgY2hyb21lLmFsYXJtcy5vbkFsYXJtLmFkZExpc3RlbmVyKGFzeW5jIChhbGFybSkgPT4ge1xuICAgICAgICBpZiAoYWxhcm0ubmFtZS5zdGFydHNXaXRoKFwicmVtaW5kZXItXCIpKSB7XG4gICAgICAgICAgICBjb25zdCBib29rbWFya0lkID0gYWxhcm0ubmFtZS5yZXBsYWNlKFwicmVtaW5kZXItXCIsIFwiXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBib29rbWFyayBhc3NvY2lhdGVkIHdpdGggdGhpcyByZW1pbmRlclxuICAgICAgICAgICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGJvb2ttYXJrSWQpO1xuXG4gICAgICAgICAgICBpZiAoYm9va21hcmspIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5jcmVhdGUoYG5vdGlmaWNhdGlvbi0ke2Jvb2ttYXJrLmlkfWAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiYXNpY1wiLFxuICAgICAgICAgICAgICAgICAgICBpY29uVXJsOiBcImljb24tMTI4LnBuZ1wiLCAvLyBXWFQgaGFuZGxlcyBwYXRoaW5nXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlJlbWluZGVyOiBcIiArIGJvb2ttYXJrLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNsaWNrIHRvIG9wZW4gdGhpcyBzYXZlZCBwYWdlLlwiLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTGlzdGVuZXIgZm9yIHdoZW4gYSBub3RpZmljYXRpb24gaXMgY2xpY2tlZFxuICAgIGNocm9tZS5ub3RpZmljYXRpb25zLm9uQ2xpY2tlZC5hZGRMaXN0ZW5lcigobm90aWZpY2F0aW9uSWQpID0+IHtcbiAgICAgICAgaWYgKG5vdGlmaWNhdGlvbklkLnN0YXJ0c1dpdGgoXCJub3RpZmljYXRpb24tXCIpKSB7XG4gICAgICAgICAgICBjb25zdCBib29rbWFya0lkID0gbm90aWZpY2F0aW9uSWQucmVwbGFjZShcIm5vdGlmaWNhdGlvbi1cIiwgXCJcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoaXMgcGFydCBpcyB0cmlja3kgYmVjYXVzZSB3ZSBjYW4ndCBkaXJlY3RseSBnZXQgdGhlIFVSTCBoZXJlXG4gICAgICAgICAgICAvLyB3aXRob3V0IGFub3RoZXIgc3RvcmFnZSBsb29rdXAuIEEgYmV0dGVyIGFwcHJvYWNoIGZvciBhIHJlYWwgYXBwXG4gICAgICAgICAgICAvLyBtaWdodCBiZSB0byBzdG9yZSB0aGUgVVJMIGluIHRoZSBhbGFybS9ub3RpZmljYXRpb24gZGV0YWlscyBpZiBwb3NzaWJsZSxcbiAgICAgICAgICAgIC8vIG9yIHBlcmZvcm0gdGhlIGxvb2t1cCBhcyB3ZSBkbyBoZXJlLlxuICAgICAgICAgICAgZ2V0QXBwRGF0YSgpLnRoZW4oYXBwRGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm9va21hcmsgPSBmaW5kQm9va21hcmtCeUlkKGFwcERhdGEuZm9sZGVycywgYm9va21hcmtJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGJvb2ttYXJrPy51cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBib29rbWFyay51cmwgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIExpc3RlbmVyIGZvciBrZXlib2FyZCBzaG9ydGN1dFxuICBjaHJvbWUuY29tbWFuZHMub25Db21tYW5kLmFkZExpc3RlbmVyKGFzeW5jIChjb21tYW5kKSA9PiB7XG4gICAgaWYgKGNvbW1hbmQgPT09ICdvcGVuLWJvb2ttYXJrLWRpYWxvZycpIHtcbiAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XG4gICAgICBpZiAodGFiPy5pZCAmJiB0YWIudXJsKSB7XG4gICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwge1xuICAgICAgICAgIGFjdGlvbjogJ29wZW5Cb29rbWFya0RpYWxvZycsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgdGl0bGU6IHRhYi50aXRsZSB8fCAnTm8gdGl0bGUnLFxuICAgICAgICAgICAgdXJsOiB0YWIudXJsLFxuICAgICAgICAgICAgZmF2aWNvbjogdGFiLmZhdkljb25VcmwgfHwgbnVsbCxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gICAgLy8gTGlzdGVuZXIgZm9yIHdoZW4gYSB1c2VyIHZpc2l0cyBhIHBhZ2VcbiAgICBjaHJvbWUuaGlzdG9yeS5vblZpc2l0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKGhpc3RvcnlJdGVtKSA9PiB7XG4gICAgICAgIGlmIChoaXN0b3J5SXRlbS51cmwpIHtcbiAgICAgICAgICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgICAgICAgICBjb25zdCBib29rbWFyayA9IGZpbmRCb29rbWFya0J5VXJsKGFwcERhdGEuZm9sZGVycywgaGlzdG9yeUl0ZW0udXJsKTtcblxuICAgICAgICAgICAgaWYgKGJvb2ttYXJrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmlzaXRzID0gYXdhaXQgY2hyb21lLmhpc3RvcnkuZ2V0VmlzaXRzKHsgdXJsOiBoaXN0b3J5SXRlbS51cmwgfSk7XG4gICAgICAgICAgICAgICAgYm9va21hcmsuYWNjZXNzSGlzdG9yeSA9IHZpc2l0cy5tYXAoKHZpc2l0OiBjaHJvbWUuaGlzdG9yeS5WaXNpdEl0ZW0pID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdmlzaXQudmlzaXRUaW1lIVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsi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WUFBTSwwQkFBMEIsWUFBWSxNQUFNLE1BQU0sRUFBRTtBQUFBLElBQzVEO0FBQUEsRUFDRjtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLENBQUMsYUFBYSxVQUFVLFNBQVMsUUFBUSxLQUFLLGFBQWE7QUFDN0QsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0EsR0FBRyxRQUFRLDBCQUEwQixhQUFhLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxNQUM1RTtBQUFBLEVBQ0E7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixZQUFNLElBQUksb0JBQW9CLGNBQWMsZ0NBQWdDO0FBQzlFLFFBQUksU0FBUyxTQUFTLEdBQUcsS0FBSyxTQUFTLFNBQVMsS0FBSyxDQUFDLFNBQVMsV0FBVyxJQUFJO0FBQzVFLFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDTjtBQUFBLEVBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDExLDEyLDEzXX0=
