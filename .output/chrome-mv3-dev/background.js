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
      let sanitizeNodes = function(nodes) {
        if (!Array.isArray(nodes)) {
          return;
        }
        for (const node of nodes) {
          if (!node) continue;
          if ("children" in node) {
            sanitizeNodes(node.children);
          } else {
            if (node.tags && typeof node.tags === "object" && !Array.isArray(node.tags)) {
              node.tags = Object.values(node.tags);
            }
          }
        }
      };
      const appData = result2[STORAGE_KEY];
      if (!Array.isArray(appData.folders) || !appData.folders.some((f) => "children" in f && f.id === "root")) {
        appData.folders = defaultData.folders;
      }
      sanitizeNodes(appData.folders);
      return appData;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vc3ZlbHRlQDUuMzUuNi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9pbnRlcm5hbC9jbGllbnQvZXJyb3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW5kZXgtY2xpZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc3RvcmUvc2hhcmVkL2luZGV4LmpzIiwiLi4vLi4vc3JjL2xpYi9zdG9yYWdlLnRzIiwiLi4vLi4vc3JjL2xpYi9nZHJpdmUudHMiLCIuLi8uLi9zcmMvbGliL3V0aWxzLnRzIiwiLi4vLi4vc3JjL2xpYi9hdXRvLWJhY2t1cC50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHdlYmV4dC1jb3JlK21hdGNoLXBhdHRlcm5zQDEuMC4zL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIFN0b3JlIHRoZSByZWZlcmVuY2VzIHRvIGdsb2JhbHMgaW4gY2FzZSBzb21lb25lIHRyaWVzIHRvIG1vbmtleSBwYXRjaCB0aGVzZSwgY2F1c2luZyB0aGUgYmVsb3dcbi8vIHRvIGRlLW9wdCAodGhpcyBvY2N1cnMgb2Z0ZW4gd2hlbiB1c2luZyBwb3B1bGFyIGV4dGVuc2lvbnMpLlxuZXhwb3J0IHZhciBpc19hcnJheSA9IEFycmF5LmlzQXJyYXk7XG5leHBvcnQgdmFyIGluZGV4X29mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG5leHBvcnQgdmFyIGFycmF5X2Zyb20gPSBBcnJheS5mcm9tO1xuZXhwb3J0IHZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzO1xuZXhwb3J0IHZhciBkZWZpbmVfcHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5leHBvcnQgdmFyIGdldF9kZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmV4cG9ydCB2YXIgZ2V0X2Rlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnM7XG5leHBvcnQgdmFyIG9iamVjdF9wcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuZXhwb3J0IHZhciBhcnJheV9wcm90b3R5cGUgPSBBcnJheS5wcm90b3R5cGU7XG5leHBvcnQgdmFyIGdldF9wcm90b3R5cGVfb2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG5leHBvcnQgdmFyIGlzX2V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvaW5kZXguanNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIE1JVCBMaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvTElDRU5TRVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEByZXR1cm5zIHt2YWx1ZSBpcyBQcm9taXNlTGlrZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIHR5cGVvZiB2YWx1ZT8udGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEBwYXJhbSB7RnVuY3Rpb259IGZuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG4vKiogQHBhcmFtIHtBcnJheTwoKSA9PiB2b2lkPn0gYXJyICovXG5leHBvcnQgZnVuY3Rpb24gcnVuX2FsbChhcnIpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcblx0XHRhcnJbaV0oKTtcblx0fVxufVxuXG4vKipcbiAqIFRPRE8gcmVwbGFjZSB3aXRoIFByb21pc2Uud2l0aFJlc29sdmVycyBvbmNlIHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmZXJyZWQoKSB7XG5cdC8qKiBAdHlwZSB7KHZhbHVlOiBUKSA9PiB2b2lkfSAqL1xuXHR2YXIgcmVzb2x2ZTtcblxuXHQvKiogQHR5cGUgeyhyZWFzb246IGFueSkgPT4gdm9pZH0gKi9cblx0dmFyIHJlamVjdDtcblxuXHQvKiogQHR5cGUge1Byb21pc2U8VD59ICovXG5cdHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG5cdFx0cmVzb2x2ZSA9IHJlcztcblx0XHRyZWplY3QgPSByZWo7XG5cdH0pO1xuXG5cdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0cmV0dXJuIHsgcHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0IH07XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFZcbiAqIEBwYXJhbSB7Vn0gdmFsdWVcbiAqIEBwYXJhbSB7ViB8ICgoKSA9PiBWKX0gZmFsbGJhY2tcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xhenldXG4gKiBAcmV0dXJucyB7Vn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrKHZhbHVlLCBmYWxsYmFjaywgbGF6eSA9IGZhbHNlKSB7XG5cdHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkXG5cdFx0PyBsYXp5XG5cdFx0XHQ/IC8qKiBAdHlwZSB7KCkgPT4gVn0gKi8gKGZhbGxiYWNrKSgpXG5cdFx0XHQ6IC8qKiBAdHlwZSB7Vn0gKi8gKGZhbGxiYWNrKVxuXHRcdDogdmFsdWU7XG59XG5cbi8qKlxuICogV2hlbiBlbmNvdW50ZXJpbmcgYSBzaXR1YXRpb24gbGlrZSBgbGV0IFthLCBiLCBjXSA9ICRkZXJpdmVkKGJsYWgoKSlgLFxuICogd2UgbmVlZCB0byBzdGFzaCBhbiBpbnRlcm1lZGlhdGUgdmFsdWUgdGhhdCBgYWAsIGBiYCwgYW5kIGBjYCBkZXJpdmVcbiAqIGZyb20sIGluIGNhc2UgaXQncyBhbiBpdGVyYWJsZVxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7QXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD59IHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gW25dXG4gKiBAcmV0dXJucyB7QXJyYXk8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b19hcnJheSh2YWx1ZSwgbikge1xuXHQvLyByZXR1cm4gYXJyYXlzIHVuY2hhbmdlZFxuXHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHQvLyBpZiB2YWx1ZSBpcyBub3QgaXRlcmFibGUsIG9yIGBuYCBpcyB1bnNwZWNpZmllZCAoaW5kaWNhdGVzIGEgcmVzdFxuXHQvLyBlbGVtZW50LCB3aGljaCBtZWFucyB3ZSdyZSBub3QgY29uY2VybmVkIGFib3V0IHVuYm91bmRlZCBpdGVyYWJsZXMpXG5cdC8vIGNvbnZlcnQgdG8gYW4gYXJyYXkgd2l0aCBgQXJyYXkuZnJvbWBcblx0aWYgKG4gPT09IHVuZGVmaW5lZCB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiB2YWx1ZSkpIHtcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG5cdH1cblxuXHQvLyBvdGhlcndpc2UsIHBvcHVsYXRlIGFuIGFycmF5IHdpdGggYG5gIHZhbHVlc1xuXG5cdC8qKiBAdHlwZSB7VFtdfSAqL1xuXHRjb25zdCBhcnJheSA9IFtdO1xuXG5cdGZvciAoY29uc3QgZWxlbWVudCBvZiB2YWx1ZSkge1xuXHRcdGFycmF5LnB1c2goZWxlbWVudCk7XG5cdFx0aWYgKGFycmF5Lmxlbmd0aCA9PT0gbikgYnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59XG4iLCIvKiogQGltcG9ydCB7IEVxdWFscyB9IGZyb20gJyNjbGllbnQnICovXG5cbi8qKiBAdHlwZSB7RXF1YWxzfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09IHRoaXMudjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3Vua25vd259IGFcbiAqIEBwYXJhbSB7dW5rbm93bn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX25vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9IGFcblx0XHQ/IGIgPT0gYlxuXHRcdDogYSAhPT0gYiB8fCAoYSAhPT0gbnVsbCAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcpIHx8IHR5cGVvZiBhID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7dW5rbm93bn0gYVxuICogQHBhcmFtIHt1bmtub3dufSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9PSBiO1xufVxuXG4vKiogQHR5cGUge0VxdWFsc30gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX2VxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gIXNhZmVfbm90X2VxdWFsKHZhbHVlLCB0aGlzLnYpO1xufVxuIiwiLyogVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBzY3JpcHRzL3Byb2Nlc3MtbWVzc2FnZXMvaW5kZXguanMuIERvIG5vdCBlZGl0ISAqL1xuXG5pbXBvcnQgeyBERVYgfSBmcm9tICdlc20tZW52JztcblxuLyoqXG4gKiBVc2luZyBgYmluZDp2YWx1ZWAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgYGJpbmQ6Y2hlY2tlZGAgaW5zdGVhZFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9jaGVja2JveF92YWx1ZVxcblVzaW5nIFxcYGJpbmQ6dmFsdWVcXGAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgXFxgYmluZDpjaGVja2VkXFxgIGluc3RlYWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDb21wb25lbnQgJWNvbXBvbmVudCUgaGFzIGFuIGV4cG9ydCBuYW1lZCBgJWtleSVgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBgYmluZDola2V5JWAsIHdoaWNoIGlzIGRpc2FsbG93ZWQuIEluc3RlYWQsIHVzZSBgYmluZDp0aGlzYCAoZS5nLiBgPCVuYW1lJSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5gKSBhbmQgdGhlbiBhY2Nlc3MgdGhlIHByb3BlcnR5IG9uIHRoZSBib3VuZCBjb21wb25lbnQgaW5zdGFuY2UgKGUuZy4gYGNvbXBvbmVudC4la2V5JWApXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2V4cG9ydChjb21wb25lbnQsIGtleSwgbmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9leHBvcnRcXG5Db21wb25lbnQgJHtjb21wb25lbnR9IGhhcyBhbiBleHBvcnQgbmFtZWQgXFxgJHtrZXl9XFxgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBcXGBiaW5kOiR7a2V5fVxcYCwgd2hpY2ggaXMgZGlzYWxsb3dlZC4gSW5zdGVhZCwgdXNlIFxcYGJpbmQ6dGhpc1xcYCAoZS5nLiBcXGA8JHtuYW1lfSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5cXGApIGFuZCB0aGVuIGFjY2VzcyB0aGUgcHJvcGVydHkgb24gdGhlIGJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZSAoZS5nLiBcXGBjb21wb25lbnQuJHtrZXl9XFxgKVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfaW52YWxpZF9leHBvcnRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2V4cG9ydGApO1xuXHR9XG59XG5cbi8qKlxuICogQSBjb21wb25lbnQgaXMgYXR0ZW1wdGluZyB0byBiaW5kIHRvIGEgbm9uLWJpbmRhYmxlIHByb3BlcnR5IGAla2V5JWAgYmVsb25naW5nIHRvICVjb21wb25lbnQlIChpLmUuIGA8JW5hbWUlIGJpbmQ6JWtleSU9ey4uLn0+YCkuIFRvIG1hcmsgYSBwcm9wZXJ0eSBhcyBiaW5kYWJsZTogYGxldCB7ICVrZXklID0gJGJpbmRhYmxlKCkgfSA9ICRwcm9wcygpYFxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRfbm90X2JpbmRhYmxlKGtleSwgY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9ub3RfYmluZGFibGVcXG5BIGNvbXBvbmVudCBpcyBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYSBub24tYmluZGFibGUgcHJvcGVydHkgXFxgJHtrZXl9XFxgIGJlbG9uZ2luZyB0byAke2NvbXBvbmVudH0gKGkuZS4gXFxgPCR7bmFtZX0gYmluZDoke2tleX09ey4uLn0+XFxgKS4gVG8gbWFyayBhIHByb3BlcnR5IGFzIGJpbmRhYmxlOiBcXGBsZXQgeyAke2tleX0gPSAkYmluZGFibGUoKSB9ID0gJHByb3BzKClcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2FsbGluZyBgJW1ldGhvZCVgIG9uIGEgY29tcG9uZW50IGluc3RhbmNlIChvZiAlY29tcG9uZW50JSkgaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1XG4gKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnRfYXBpX2NoYW5nZWQobWV0aG9kLCBjb21wb25lbnQpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBjb21wb25lbnRfYXBpX2NoYW5nZWRcXG5DYWxsaW5nIFxcYCR7bWV0aG9kfVxcYCBvbiBhIGNvbXBvbmVudCBpbnN0YW5jZSAob2YgJHtjb21wb25lbnR9KSBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDVcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2NoYW5nZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvY29tcG9uZW50X2FwaV9jaGFuZ2VkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0ZWQgdG8gaW5zdGFudGlhdGUgJWNvbXBvbmVudCUgd2l0aCBgbmV3ICVuYW1lJWAsIHdoaWNoIGlzIG5vIGxvbmdlciB2YWxpZCBpbiBTdmVsdGUgNS4gSWYgdGhpcyBjb21wb25lbnQgaXMgbm90IHVuZGVyIHlvdXIgY29udHJvbCwgc2V0IHRoZSBgY29tcGF0aWJpbGl0eS5jb21wb25lbnRBcGlgIGNvbXBpbGVyIG9wdGlvbiB0byBgNGAgdG8ga2VlcCBpdCB3b3JraW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvbmVudF9hcGlfaW52YWxpZF9uZXcoY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgY29tcG9uZW50X2FwaV9pbnZhbGlkX25ld1xcbkF0dGVtcHRlZCB0byBpbnN0YW50aWF0ZSAke2NvbXBvbmVudH0gd2l0aCBcXGBuZXcgJHtuYW1lfVxcYCwgd2hpY2ggaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1LiBJZiB0aGlzIGNvbXBvbmVudCBpcyBub3QgdW5kZXIgeW91ciBjb250cm9sLCBzZXQgdGhlIFxcYGNvbXBhdGliaWxpdHkuY29tcG9uZW50QXBpXFxgIGNvbXBpbGVyIG9wdGlvbiB0byBcXGA0XFxgIHRvIGtlZXAgaXQgd29ya2luZy5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2ludmFsaWRfbmV3YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfaW52YWxpZF9uZXdgKTtcblx0fVxufVxuXG4vKipcbiAqIEEgZGVyaXZlZCB2YWx1ZSBjYW5ub3QgcmVmZXJlbmNlIGl0c2VsZiByZWN1cnNpdmVseVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGYoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGZcXG5BIGRlcml2ZWQgdmFsdWUgY2Fubm90IHJlZmVyZW5jZSBpdHNlbGYgcmVjdXJzaXZlbHlcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXHR9XG59XG5cbi8qKlxuICogS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBgJXZhbHVlJWAgYXQgaW5kZXhlcyAlYSUgYW5kICViJVxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXG4gKiBAcGFyYW0ge3N0cmluZyB8IHVuZGVmaW5lZCB8IG51bGx9IFt2YWx1ZV1cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hfa2V5X2R1cGxpY2F0ZShhLCBiLCB2YWx1ZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVhY2hfa2V5X2R1cGxpY2F0ZVxcbiR7dmFsdWVcblx0XHRcdD8gYEtleWVkIGVhY2ggYmxvY2sgaGFzIGR1cGxpY2F0ZSBrZXkgXFxgJHt2YWx1ZX1cXGAgYXQgaW5kZXhlcyAke2F9IGFuZCAke2J9YFxuXHRcdFx0OiBgS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBhdCBpbmRleGVzICR7YX0gYW5kICR7Yn1gfVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VhY2hfa2V5X2R1cGxpY2F0ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lYWNoX2tleV9kdXBsaWNhdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlcnVuZSVgIGNhbm5vdCBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgY2xlYW51cCBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bmVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF9pbl90ZWFyZG93bihydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWZmZWN0X2luX3RlYXJkb3duXFxuXFxgJHtydW5lfVxcYCBjYW5ub3QgYmUgdXNlZCBpbnNpZGUgYW4gZWZmZWN0IGNsZWFudXAgZnVuY3Rpb25cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdGVhcmRvd25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3RlYXJkb3duYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBFZmZlY3QgY2Fubm90IGJlIGNyZWF0ZWQgaW5zaWRlIGEgYCRkZXJpdmVkYCB2YWx1ZSB0aGF0IHdhcyBub3QgaXRzZWxmIGNyZWF0ZWQgaW5zaWRlIGFuIGVmZmVjdFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkXFxuRWZmZWN0IGNhbm5vdCBiZSBjcmVhdGVkIGluc2lkZSBhIFxcYCRkZXJpdmVkXFxgIHZhbHVlIHRoYXQgd2FzIG5vdCBpdHNlbGYgY3JlYXRlZCBpbnNpZGUgYW4gZWZmZWN0XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJXJ1bmUlYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcbiAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3Rfb3JwaGFuKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3Rfb3JwaGFuXFxuXFxgJHtydW5lfVxcYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3Rfb3JwaGFuYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9vcnBoYW5gKTtcblx0fVxufVxuXG4vKipcbiAqIE1heGltdW0gdXBkYXRlIGRlcHRoIGV4Y2VlZGVkLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBhIHJlYWN0aXZlIGJsb2NrIG9yIGVmZmVjdCByZXBlYXRlZGx5IHNldHMgYSBuZXcgdmFsdWUuIFN2ZWx0ZSBsaW1pdHMgdGhlIG51bWJlciBvZiBuZXN0ZWQgdXBkYXRlcyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RfdXBkYXRlX2RlcHRoX2V4Y2VlZGVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRcXG5NYXhpbXVtIHVwZGF0ZSBkZXB0aCBleGNlZWRlZC4gVGhpcyBjYW4gaGFwcGVuIHdoZW4gYSByZWFjdGl2ZSBibG9jayBvciBlZmZlY3QgcmVwZWF0ZWRseSBzZXRzIGEgbmV3IHZhbHVlLiBTdmVsdGUgbGltaXRzIHRoZSBudW1iZXIgb2YgbmVzdGVkIHVwZGF0ZXMgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZGApO1xuXHR9XG59XG5cbi8qKlxuICogYGdldEFib3J0U2lnbmFsKClgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvbigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBnZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25cXG5cXGBnZXRBYm9ydFNpZ25hbCgpXFxgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBGYWlsZWQgdG8gaHlkcmF0ZSB0aGUgYXBwbGljYXRpb25cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh5ZHJhdGlvbl9mYWlsZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgaHlkcmF0aW9uX2ZhaWxlZFxcbkZhaWxlZCB0byBoeWRyYXRlIHRoZSBhcHBsaWNhdGlvblxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2h5ZHJhdGlvbl9mYWlsZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaHlkcmF0aW9uX2ZhaWxlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ291bGQgbm90IGB7QHJlbmRlcn1gIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIGBudWxsYCBvciBgdW5kZWZpbmVkYC4gQ29uc2lkZXIgdXNpbmcgb3B0aW9uYWwgY2hhaW5pbmcgYHtAcmVuZGVyIHNuaXBwZXQ/LigpfWBcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRfc25pcHBldCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBpbnZhbGlkX3NuaXBwZXRcXG5Db3VsZCBub3QgXFxge0ByZW5kZXJ9XFxgIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIFxcYG51bGxcXGAgb3IgXFxgdW5kZWZpbmVkXFxgLiBDb25zaWRlciB1c2luZyBvcHRpb25hbCBjaGFpbmluZyBcXGB7QHJlbmRlciBzbmlwcGV0Py4oKX1cXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9pbnZhbGlkX3NuaXBwZXRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaW52YWxpZF9zbmlwcGV0YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJW5hbWUlKC4uLilgIGNhbm5vdCBiZSB1c2VkIGluIHJ1bmVzIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWZlY3ljbGVfbGVnYWN5X29ubHkobmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGxpZmVjeWNsZV9sZWdhY3lfb25seVxcblxcYCR7bmFtZX0oLi4uKVxcYCBjYW5ub3QgYmUgdXNlZCBpbiBydW5lcyBtb2RlXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2xpZmVjeWNsZV9sZWdhY3lfb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IGRvIGBiaW5kOiVrZXklPXt1bmRlZmluZWR9YCB3aGVuIGAla2V5JWAgaGFzIGEgZmFsbGJhY2sgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3BzX2ludmFsaWRfdmFsdWUoa2V5KSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcHJvcHNfaW52YWxpZF92YWx1ZVxcbkNhbm5vdCBkbyBcXGBiaW5kOiR7a2V5fT17dW5kZWZpbmVkfVxcYCB3aGVuIFxcYCR7a2V5fVxcYCBoYXMgYSBmYWxsYmFjayB2YWx1ZVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX2ludmFsaWRfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfaW52YWxpZF92YWx1ZWApO1xuXHR9XG59XG5cbi8qKlxuICogUmVzdCBlbGVtZW50IHByb3BlcnRpZXMgb2YgYCRwcm9wcygpYCBzdWNoIGFzIGAlcHJvcGVydHklYCBhcmUgcmVhZG9ubHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcHNfcmVzdF9yZWFkb25seShwcm9wZXJ0eSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYHByb3BzX3Jlc3RfcmVhZG9ubHlcXG5SZXN0IGVsZW1lbnQgcHJvcGVydGllcyBvZiBcXGAkcHJvcHMoKVxcYCBzdWNoIGFzIFxcYCR7cHJvcGVydHl9XFxgIGFyZSByZWFkb25seVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX3Jlc3RfcmVhZG9ubHlgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfcmVzdF9yZWFkb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogVGhlIGAlcnVuZSVgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIGAuc3ZlbHRlYCBhbmQgYC5zdmVsdGUuanMvdHNgIGZpbGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuZV9vdXRzaWRlX3N2ZWx0ZShydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcnVuZV9vdXRzaWRlX3N2ZWx0ZVxcblRoZSBcXGAke3J1bmV9XFxgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIFxcYC5zdmVsdGVcXGAgYW5kIFxcYC5zdmVsdGUuanMvdHNcXGAgZmlsZXNcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9ydW5lX291dHNpZGVfc3ZlbHRlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3J1bmVfb3V0c2lkZV9zdmVsdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIFByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gYCRzdGF0ZWAgb2JqZWN0cyBtdXN0IGNvbnRhaW4gYHZhbHVlYCBhbmQgYWx3YXlzIGJlIGBlbnVtZXJhYmxlYCwgYGNvbmZpZ3VyYWJsZWAgYW5kIGB3cml0YWJsZWAuXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZFxcblByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gXFxgJHN0YXRlXFxgIG9iamVjdHMgbXVzdCBjb250YWluIFxcYHZhbHVlXFxgIGFuZCBhbHdheXMgYmUgXFxgZW51bWVyYWJsZVxcYCwgXFxgY29uZmlndXJhYmxlXFxgIGFuZCBcXGB3cml0YWJsZVxcYC5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgYCRzdGF0ZWAgb2JqZWN0XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9wcm90b3R5cGVfZml4ZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfcHJvdG90eXBlX2ZpeGVkXFxuQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgXFxgJHN0YXRlXFxgIG9iamVjdFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Byb3RvdHlwZV9maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9wcm90b3R5cGVfZml4ZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIFVwZGF0aW5nIHN0YXRlIGluc2lkZSBgJGRlcml2ZWQoLi4uKWAsIGAkaW5zcGVjdCguLi4pYCBvciBhIHRlbXBsYXRlIGV4cHJlc3Npb24gaXMgZm9yYmlkZGVuLiBJZiB0aGUgdmFsdWUgc2hvdWxkIG5vdCBiZSByZWFjdGl2ZSwgZGVjbGFyZSBpdCB3aXRob3V0IGAkc3RhdGVgXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV91bnNhZmVfbXV0YXRpb24oKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfdW5zYWZlX211dGF0aW9uXFxuVXBkYXRpbmcgc3RhdGUgaW5zaWRlIFxcYCRkZXJpdmVkKC4uLilcXGAsIFxcYCRpbnNwZWN0KC4uLilcXGAgb3IgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGlzIGZvcmJpZGRlbi4gSWYgdGhlIHZhbHVlIHNob3VsZCBub3QgYmUgcmVhY3RpdmUsIGRlY2xhcmUgaXQgd2l0aG91dCBcXGAkc3RhdGVcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV91bnNhZmVfbXV0YXRpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2Uvc3RhdGVfdW5zYWZlX211dGF0aW9uYCk7XG5cdH1cbn0iLCIvKiogQGltcG9ydCB7IENvbXBvbmVudENvbnRleHQsIENvbXBvbmVudENvbnRleHRMZWdhY3kgfSBmcm9tICcjY2xpZW50JyAqL1xuLyoqIEBpbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuL2luZGV4LmpzJyAqL1xuLyoqIEBpbXBvcnQgeyBOb3RGdW5jdGlvbiB9IGZyb20gJy4vaW50ZXJuYWwvdHlwZXMuanMnICovXG5pbXBvcnQgeyBhY3RpdmVfcmVhY3Rpb24sIHVudHJhY2sgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9ydW50aW1lLmpzJztcbmltcG9ydCB7IGlzX2FycmF5IH0gZnJvbSAnLi9pbnRlcm5hbC9zaGFyZWQvdXRpbHMuanMnO1xuaW1wb3J0IHsgdXNlcl9lZmZlY3QgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9pbmRleC5qcyc7XG5pbXBvcnQgKiBhcyBlIGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZC9lcnJvcnMuanMnO1xuaW1wb3J0IHsgbGVnYWN5X21vZGVfZmxhZyB9IGZyb20gJy4vaW50ZXJuYWwvZmxhZ3MvaW5kZXguanMnO1xuaW1wb3J0IHsgY29tcG9uZW50X2NvbnRleHQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9jb250ZXh0LmpzJztcbmltcG9ydCB7IERFViB9IGZyb20gJ2VzbS1lbnYnO1xuXG5pZiAoREVWKSB7XG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuXHQgKi9cblx0ZnVuY3Rpb24gdGhyb3dfcnVuZV9lcnJvcihydW5lKSB7XG5cdFx0aWYgKCEocnVuZSBpbiBnbG9iYWxUaGlzKSkge1xuXHRcdFx0Ly8gVE9ETyBpZiBwZW9wbGUgc3RhcnQgYWRqdXN0aW5nIHRoZSBcInRoaXMgY2FuIGNvbnRhaW4gcnVuZXNcIiBjb25maWcgdGhyb3VnaCB2LXAtcyBtb3JlLCBhZGp1c3QgdGhpcyBtZXNzYWdlXG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi9cblx0XHRcdGxldCB2YWx1ZTsgLy8gbGV0J3MgaG9wZSBub29uZSBtb2RpZmllcyB0aGlzIGdsb2JhbCwgYnV0IGJlbHRzIGFuZCBicmFjZXNcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCBydW5lLCB7XG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdldHRlci1yZXR1cm5cblx0XHRcdFx0Z2V0OiAoKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlLnJ1bmVfb3V0c2lkZV9zdmVsdGUocnVuZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldDogKHYpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IHY7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHRocm93X3J1bmVfZXJyb3IoJyRzdGF0ZScpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckZWZmZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRkZXJpdmVkJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRpbnNwZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRwcm9wcycpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckYmluZGFibGUnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFtgQWJvcnRTaWduYWxgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRTaWduYWwpIHRoYXQgYWJvcnRzIHdoZW4gdGhlIGN1cnJlbnQgW2Rlcml2ZWRdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZGVyaXZlZCkgb3IgW2VmZmVjdF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIHJlLXJ1bnMgb3IgaXMgZGVzdHJveWVkLlxuICpcbiAqIE11c3QgYmUgY2FsbGVkIHdoaWxlIGEgZGVyaXZlZCBvciBlZmZlY3QgaXMgcnVubmluZy5cbiAqXG4gKiBgYGBzdmVsdGVcbiAqIDxzY3JpcHQ+XG4gKiBcdGltcG9ydCB7IGdldEFib3J0U2lnbmFsIH0gZnJvbSAnc3ZlbHRlJztcbiAqXG4gKiBcdGxldCB7IGlkIH0gPSAkcHJvcHMoKTtcbiAqXG4gKiBcdGFzeW5jIGZ1bmN0aW9uIGdldERhdGEoaWQpIHtcbiAqIFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvaXRlbXMvJHtpZH1gLCB7XG4gKiBcdFx0XHRzaWduYWw6IGdldEFib3J0U2lnbmFsKClcbiAqIFx0XHR9KTtcbiAqXG4gKiBcdFx0cmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAqIFx0fVxuICpcbiAqIFx0Y29uc3QgZGF0YSA9ICRkZXJpdmVkKGF3YWl0IGdldERhdGEoaWQpKTtcbiAqIDwvc2NyaXB0PlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm9ydFNpZ25hbCgpIHtcblx0aWYgKGFjdGl2ZV9yZWFjdGlvbiA9PT0gbnVsbCkge1xuXHRcdGUuZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uKCk7XG5cdH1cblxuXHRyZXR1cm4gKGFjdGl2ZV9yZWFjdGlvbi5hYyA/Pz0gbmV3IEFib3J0Q29udHJvbGxlcigpKS5zaWduYWw7XG59XG5cbi8qKlxuICogYG9uTW91bnRgLCBsaWtlIFtgJGVmZmVjdGBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0KSwgc2NoZWR1bGVzIGEgZnVuY3Rpb24gdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBVbmxpa2UgYCRlZmZlY3RgLCB0aGUgcHJvdmlkZWQgZnVuY3Rpb24gb25seSBydW5zIG9uY2UuXG4gKlxuICogSXQgbXVzdCBiZSBjYWxsZWQgZHVyaW5nIHRoZSBjb21wb25lbnQncyBpbml0aWFsaXNhdGlvbiAoYnV0IGRvZXNuJ3QgbmVlZCB0byBsaXZlIF9pbnNpZGVfIHRoZSBjb21wb25lbnQ7XG4gKiBpdCBjYW4gYmUgY2FsbGVkIGZyb20gYW4gZXh0ZXJuYWwgbW9kdWxlKS4gSWYgYSBmdW5jdGlvbiBpcyByZXR1cm5lZCBfc3luY2hyb25vdXNseV8gZnJvbSBgb25Nb3VudGAsXG4gKiBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBmdW5jdGlvbnMgZG8gbm90IHJ1biBkdXJpbmcgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL3N2ZWx0ZS1zZXJ2ZXIjcmVuZGVyKS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHsoKSA9PiBOb3RGdW5jdGlvbjxUPiB8IFByb21pc2U8Tm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbk1vdW50Jyk7XG5cdH1cblxuXHRpZiAobGVnYWN5X21vZGVfZmxhZyAmJiBjb21wb25lbnRfY29udGV4dC5sICE9PSBudWxsKSB7XG5cdFx0aW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbXBvbmVudF9jb250ZXh0KS5tLnB1c2goZm4pO1xuXHR9IGVsc2Uge1xuXHRcdHVzZXJfZWZmZWN0KCgpID0+IHtcblx0XHRcdGNvbnN0IGNsZWFudXAgPSB1bnRyYWNrKGZuKTtcblx0XHRcdGlmICh0eXBlb2YgY2xlYW51cCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIC8qKiBAdHlwZSB7KCkgPT4gdm9pZH0gKi8gKGNsZWFudXApO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHVubW91bnRlZC5cbiAqXG4gKiBPdXQgb2YgYG9uTW91bnRgLCBgYmVmb3JlVXBkYXRlYCwgYGFmdGVyVXBkYXRlYCBhbmQgYG9uRGVzdHJveWAsIHRoaXMgaXMgdGhlXG4gKiBvbmx5IG9uZSB0aGF0IHJ1bnMgaW5zaWRlIGEgc2VydmVyLXNpZGUgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7KCkgPT4gYW55fSBmblxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbkRlc3Ryb3koZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbkRlc3Ryb3knKTtcblx0fVxuXG5cdG9uTW91bnQoKCkgPT4gKCkgPT4gdW50cmFjayhmbikpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHthbnl9cGFyYW1zXzBcbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlX2N1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBldmVudCBkaXNwYXRjaGVyIHRoYXQgY2FuIGJlIHVzZWQgdG8gZGlzcGF0Y2ggW2NvbXBvbmVudCBldmVudHNdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS9sZWdhY3ktb24jQ29tcG9uZW50LWV2ZW50cykuXG4gKiBFdmVudCBkaXNwYXRjaGVycyBhcmUgZnVuY3Rpb25zIHRoYXQgY2FuIHRha2UgdHdvIGFyZ3VtZW50czogYG5hbWVgIGFuZCBgZGV0YWlsYC5cbiAqXG4gKiBDb21wb25lbnQgZXZlbnRzIGNyZWF0ZWQgd2l0aCBgY3JlYXRlRXZlbnREaXNwYXRjaGVyYCBjcmVhdGUgYVxuICogW0N1c3RvbUV2ZW50XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQpLlxuICogVGhlc2UgZXZlbnRzIGRvIG5vdCBbYnViYmxlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0xlYXJuL0phdmFTY3JpcHQvQnVpbGRpbmdfYmxvY2tzL0V2ZW50cyNFdmVudF9idWJibGluZ19hbmRfY2FwdHVyZSkuXG4gKiBUaGUgYGRldGFpbGAgYXJndW1lbnQgY29ycmVzcG9uZHMgdG8gdGhlIFtDdXN0b21FdmVudC5kZXRhaWxdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC9kZXRhaWwpXG4gKiBwcm9wZXJ0eSBhbmQgY2FuIGNvbnRhaW4gYW55IHR5cGUgb2YgZGF0YS5cbiAqXG4gKiBUaGUgZXZlbnQgZGlzcGF0Y2hlciBjYW4gYmUgdHlwZWQgdG8gbmFycm93IHRoZSBhbGxvd2VkIGV2ZW50IG5hbWVzIGFuZCB0aGUgdHlwZSBvZiB0aGUgYGRldGFpbGAgYXJndW1lbnQ6XG4gKiBgYGB0c1xuICogY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXI8e1xuICogIGxvYWRlZDogbnVsbDsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogQGRlcHJlY2F0ZWQgVXNlIGNhbGxiYWNrIHByb3BzIGFuZC9vciB0aGUgYCRob3N0KClgIHJ1bmUgaW5zdGVhZCDigJQgc2VlIFttaWdyYXRpb24gZ3VpZGVdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS92NS1taWdyYXRpb24tZ3VpZGUjRXZlbnQtY2hhbmdlcy1Db21wb25lbnQtZXZlbnRzKVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXAgPSBhbnldXG4gKiBAcmV0dXJucyB7RXZlbnREaXNwYXRjaGVyPEV2ZW50TWFwPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpIHtcblx0Y29uc3QgYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0ID0gY29tcG9uZW50X2NvbnRleHQ7XG5cdGlmIChhY3RpdmVfY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2NyZWF0ZUV2ZW50RGlzcGF0Y2hlcicpO1xuXHR9XG5cblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBldmVudHMgPSAvKiogQHR5cGUge1JlY29yZDxzdHJpbmcsIEZ1bmN0aW9uIHwgRnVuY3Rpb25bXT59ICovIChcblx0XHRcdGFjdGl2ZV9jb21wb25lbnRfY29udGV4dC5zLiQkZXZlbnRzXG5cdFx0KT8uWy8qKiBAdHlwZSB7YW55fSAqLyAodHlwZSldO1xuXG5cdFx0aWYgKGV2ZW50cykge1xuXHRcdFx0Y29uc3QgY2FsbGJhY2tzID0gaXNfYXJyYXkoZXZlbnRzKSA/IGV2ZW50cy5zbGljZSgpIDogW2V2ZW50c107XG5cdFx0XHQvLyBUT0RPIGFyZSB0aGVyZSBzaXR1YXRpb25zIHdoZXJlIGV2ZW50cyBjb3VsZCBiZSBkaXNwYXRjaGVkXG5cdFx0XHQvLyBpbiBhIHNlcnZlciAobm9uLURPTSkgZW52aXJvbm1lbnQ/XG5cdFx0XHRjb25zdCBldmVudCA9IGNyZWF0ZV9jdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCBvcHRpb25zKTtcblx0XHRcdGZvciAoY29uc3QgZm4gb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRcdGZuLmNhbGwoYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0LngsIGV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcbn1cblxuLy8gVE9ETyBtYXJrIGJlZm9yZVVwZGF0ZSBhbmQgYWZ0ZXJVcGRhdGUgYXMgZGVwcmVjYXRlZCBpbiBTdmVsdGUgNlxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgLlxuICpcbiAqIEluIHJ1bmVzIG1vZGUgdXNlIGAkZWZmZWN0LnByZWAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0LnByZWBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0IyRlZmZlY3QucHJlKSBpbnN0ZWFkXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2JlZm9yZVVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYmVmb3JlVXBkYXRlJyk7XG5cdH1cblxuXHRpbml0X3VwZGF0ZV9jYWxsYmFja3MoY29tcG9uZW50X2NvbnRleHQpLmIucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YC5cbiAqXG4gKiBJbiBydW5lcyBtb2RlIHVzZSBgJGVmZmVjdGAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0YF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIGluc3RlYWRcbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWZ0ZXJVcGRhdGUoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdhZnRlclVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYWZ0ZXJVcGRhdGUnKTtcblx0fVxuXG5cdGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb21wb25lbnRfY29udGV4dCkuYS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBMZWdhY3ktbW9kZTogSW5pdCBjYWxsYmFja3Mgb2JqZWN0IGZvciBvbk1vdW50L2JlZm9yZVVwZGF0ZS9hZnRlclVwZGF0ZVxuICogQHBhcmFtIHtDb21wb25lbnRDb250ZXh0fSBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb250ZXh0KSB7XG5cdHZhciBsID0gLyoqIEB0eXBlIHtDb21wb25lbnRDb250ZXh0TGVnYWN5fSAqLyAoY29udGV4dCkubDtcblx0cmV0dXJuIChsLnUgPz89IHsgYTogW10sIGI6IFtdLCBtOiBbXSB9KTtcbn1cblxuZXhwb3J0IHsgZmx1c2hTeW5jIH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvcnVudGltZS5qcyc7XG5leHBvcnQgeyBnZXRDb250ZXh0LCBnZXRBbGxDb250ZXh0cywgaGFzQ29udGV4dCwgc2V0Q29udGV4dCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2NvbnRleHQuanMnO1xuZXhwb3J0IHsgaHlkcmF0ZSwgbW91bnQsIHVubW91bnQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9yZW5kZXIuanMnO1xuZXhwb3J0IHsgdGljaywgdW50cmFjayB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3J1bnRpbWUuanMnO1xuZXhwb3J0IHsgY3JlYXRlUmF3U25pcHBldCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2RvbS9ibG9ja3Mvc25pcHBldC5qcyc7XG4iLCIvKiogQGltcG9ydCB7IFJlYWRhYmxlLCBTdGFydFN0b3BOb3RpZmllciwgU3Vic2NyaWJlciwgVW5zdWJzY3JpYmVyLCBVcGRhdGVyLCBXcml0YWJsZSB9IGZyb20gJy4uL3B1YmxpYy5qcycgKi9cbi8qKiBAaW1wb3J0IHsgU3RvcmVzLCBTdG9yZXNWYWx1ZXMsIFN1YnNjcmliZUludmFsaWRhdGVUdXBsZSB9IGZyb20gJy4uL3ByaXZhdGUuanMnICovXG5pbXBvcnQgeyBub29wLCBydW5fYWxsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzJztcbmltcG9ydCB7IHNhZmVfbm90X2VxdWFsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMnO1xuaW1wb3J0IHsgc3Vic2NyaWJlX3RvX3N0b3JlIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG4vKipcbiAqIEB0eXBlIHtBcnJheTxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8YW55PiB8IGFueT59XG4gKi9cbmNvbnN0IHN1YnNjcmliZXJfcXVldWUgPSBbXTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI8VD59IFtzdGFydF1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlKHZhbHVlLCBzdGFydCkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogd3JpdGFibGUodmFsdWUsIHN0YXJ0KS5zdWJzY3JpYmVcblx0fTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgV3JpdGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIGJvdGggdXBkYXRpbmcgYW5kIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1R9IFt2YWx1ZV0gaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcjxUPn0gW3N0YXJ0XVxuICogQHJldHVybnMge1dyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge1Vuc3Vic2NyaWJlciB8IG51bGx9ICovXG5cdGxldCBzdG9wID0gbnVsbDtcblxuXHQvKiogQHR5cGUge1NldDxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8VD4+fSAqL1xuXHRjb25zdCBzdWJzY3JpYmVycyA9IG5ldyBTZXQoKTtcblxuXHQvKipcblx0ICogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1VwZGF0ZXI8VD59IGZuXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG5cdFx0c2V0KGZuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7U3Vic2NyaWJlcjxUPn0gcnVuXG5cdCAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2ludmFsaWRhdGVdXG5cdCAqIEByZXR1cm5zIHtVbnN1YnNjcmliZXJ9XG5cdCAqL1xuXHRmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuXHRcdC8qKiBAdHlwZSB7U3Vic2NyaWJlSW52YWxpZGF0ZVR1cGxlPFQ+fSAqL1xuXHRcdGNvbnN0IHN1YnNjcmliZXIgPSBbcnVuLCBpbnZhbGlkYXRlXTtcblx0XHRzdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJzLnNpemUgPT09IDEpIHtcblx0XHRcdHN0b3AgPSBzdGFydChzZXQsIHVwZGF0ZSkgfHwgbm9vcDtcblx0XHR9XG5cdFx0cnVuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBTdG9yZXNWYWx1ZXM8Uz4sIHNldDogKHZhbHVlOiBUKSA9PiB2b2lkLCB1cGRhdGU6IChmbjogVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gVW5zdWJzY3JpYmVyIHwgdm9pZH0gZm5cbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdXG4gKiBAcmV0dXJucyB7UmVhZGFibGU8VD59XG4gKi9cbi8qKlxuICogRGVyaXZlZCB2YWx1ZSBzdG9yZSBieSBzeW5jaHJvbml6aW5nIG9uZSBvciBtb3JlIHJlYWRhYmxlIHN0b3JlcyBhbmRcbiAqIGFwcGx5aW5nIGFuIGFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIG92ZXIgaXRzIGlucHV0IHZhbHVlcy5cbiAqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBvdmVybG9hZFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7KHZhbHVlczogU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuLyoqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7U30gc3RvcmVzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PFJlYWRhYmxlPGFueT4+fSAqL1xuXHRjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGUgPyBbc3RvcmVzXSA6IHN0b3Jlcztcblx0aWYgKCFzdG9yZXNfYXJyYXkuZXZlcnkoQm9vbGVhbikpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2Rlcml2ZWQoKSBleHBlY3RzIHN0b3JlcyBhcyBpbnB1dCwgZ290IGEgZmFsc3kgdmFsdWUnKTtcblx0fVxuXHRjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcblx0cmV0dXJuIHJlYWRhYmxlKGluaXRpYWxfdmFsdWUsIChzZXQsIHVwZGF0ZSkgPT4ge1xuXHRcdGxldCBzdGFydGVkID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtUW119ICovXG5cdFx0Y29uc3QgdmFsdWVzID0gW107XG5cdFx0bGV0IHBlbmRpbmcgPSAwO1xuXHRcdGxldCBjbGVhbnVwID0gbm9vcDtcblx0XHRjb25zdCBzeW5jID0gKCkgPT4ge1xuXHRcdFx0aWYgKHBlbmRpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQsIHVwZGF0ZSk7XG5cdFx0XHRpZiAoYXV0bykge1xuXHRcdFx0XHRzZXQocmVzdWx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNsZWFudXAgPSB0eXBlb2YgcmVzdWx0ID09PSAnZnVuY3Rpb24nID8gcmVzdWx0IDogbm9vcDtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGNvbnN0IHVuc3Vic2NyaWJlcnMgPSBzdG9yZXNfYXJyYXkubWFwKChzdG9yZSwgaSkgPT5cblx0XHRcdHN1YnNjcmliZV90b19zdG9yZShcblx0XHRcdFx0c3RvcmUsXG5cdFx0XHRcdCh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlc1tpXSA9IHZhbHVlO1xuXHRcdFx0XHRcdHBlbmRpbmcgJj0gfigxIDw8IGkpO1xuXHRcdFx0XHRcdGlmIChzdGFydGVkKSB7XG5cdFx0XHRcdFx0XHRzeW5jKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0cGVuZGluZyB8PSAxIDw8IGk7XG5cdFx0XHRcdH1cblx0XHRcdClcblx0XHQpO1xuXHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdHN5bmMoKTtcblx0XHRyZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRcdHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG5cdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHQvLyBXZSBuZWVkIHRvIHNldCB0aGlzIHRvIGZhbHNlIGJlY2F1c2UgY2FsbGJhY2tzIGNhbiBzdGlsbCBoYXBwZW4gZGVzcGl0ZSBoYXZpbmcgdW5zdWJzY3JpYmVkOlxuXHRcdFx0Ly8gQ2FsbGJhY2tzIG1pZ2h0IGFscmVhZHkgYmUgcGxhY2VkIGluIHRoZSBxdWV1ZSB3aGljaCBkb2Vzbid0IGtub3cgaXQgc2hvdWxkIG5vIGxvbmdlclxuXHRcdFx0Ly8gaW52b2tlIHRoaXMgZGVyaXZlZCBzdG9yZS5cblx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcblx0XHR9O1xuXHR9KTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHN0b3JlIGFuZCByZXR1cm5zIGEgbmV3IG9uZSBkZXJpdmVkIGZyb20gdGhlIG9sZCBvbmUgdGhhdCBpcyByZWFkYWJsZS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtSZWFkYWJsZTxUPn0gc3RvcmUgIC0gc3RvcmUgdG8gbWFrZSByZWFkb25seVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZG9ubHkoc3RvcmUpIHtcblx0cmV0dXJuIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIFRPRE8gaSBzdXNwZWN0IHRoZSBiaW5kIGlzIHVubmVjZXNzYXJ5XG5cdFx0c3Vic2NyaWJlOiBzdG9yZS5zdWJzY3JpYmUuYmluZChzdG9yZSlcblx0fTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgZnJvbSBhIHN0b3JlIGJ5IHN1YnNjcmliaW5nIGFuZCBpbW1lZGlhdGVseSB1bnN1YnNjcmliaW5nLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1JlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmVfdG9fc3RvcmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0Ly8gQHRzLWV4cGVjdC1lcnJvclxuXHRyZXR1cm4gdmFsdWU7XG59XG4iLCJpbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdHVzIG9mIHRoZSBhcHBsaWNhdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgU3luY1N0YXR1cyA9ICdpZGxlJyB8ICdzeW5jaW5nJyB8ICdzeW5jZWQnIHwgJ2Vycm9yJyB8ICd1bmF1dGhlbnRpY2F0ZWQnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdGUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3luY1N0YXRlIHtcbiAgc3RhdHVzOiBTeW5jU3RhdHVzO1xuICBsYXN0U3luY1RpbWU/OiBudW1iZXI7XG4gIGxhc3RFcnJvck1lc3NhZ2U/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIG1haW4gZGF0YSBzdHJ1Y3R1cmUgZm9yIHRoZSBhcHBsaWNhdGlvbidzIHN0b3JhZ2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwRGF0YSB7XG4gIGZvbGRlcnM6IEZvbGRlcltdO1xuICB0YWdzOiBUYWdbXTtcbiAgLy8gQm9va21hcmtzIHdpbGwgYmUgbmVzdGVkIHdpdGhpbiBmb2xkZXJzLCBidXQgd2UgY2FuIGhhdmUgYSBmbGF0IGxpc3QgZm9yIGVhc3kgYWNjZXNzIGlmIG5lZWRlZC5cbn1cblxuY29uc3QgU1RPUkFHRV9LRVkgPSAnYXBwRGF0YSc7XG5jb25zdCBTWU5DX1NUQVRVU19LRVkgPSAnc3luY1N0YXR1cyc7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgc3RhdGUgb2YgdGhlIGFwcGxpY2F0aW9uIGRhdGEuXG4gKi9cbmNvbnN0IGRlZmF1bHREYXRhOiBBcHBEYXRhID0ge1xuICBmb2xkZXJzOiBbXG4gICAge1xuICAgICAgaWQ6ICdyb290JyxcbiAgICAgIG5hbWU6ICdSb290JyxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICB9XG4gIF0sXG4gIHRhZ3M6IFtdLFxufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgYWxsIGFwcGxpY2F0aW9uIGRhdGEgZnJvbSBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqIElmIG5vIGRhdGEgaXMgZm91bmQsIGl0IGluaXRpYWxpemVzIHdpdGggdGhlIGRlZmF1bHQgc3RydWN0dXJlLlxuICpcbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBBcHBEYXRhIG9iamVjdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFwcERhdGEoKTogUHJvbWlzZTxBcHBEYXRhPiB7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChTVE9SQUdFX0tFWSk7XG4gIGlmIChyZXN1bHRbU1RPUkFHRV9LRVldKSB7XG4gICAgY29uc3QgYXBwRGF0YSA9IHJlc3VsdFtTVE9SQUdFX0tFWV0gYXMgQXBwRGF0YTtcbiAgICAvLyBEYXRhIG1pZ3JhdGlvbi9zYW5pdGl6YXRpb24gbG9naWNcbiAgICBmdW5jdGlvbiBzYW5pdGl6ZU5vZGVzKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkobm9kZXMpKSB7XG4gICAgICAgIHJldHVybjsgLy8gTm90IGFuIGFycmF5LCBub3RoaW5nIHRvIHNhbml0aXplXG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKCFub2RlKSBjb250aW51ZTsgLy8gU2tpcCBudWxsL3VuZGVmaW5lZCBlbnRyaWVzXG5cbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkge1xuICAgICAgICAgIC8vIEl0J3MgYSBmb2xkZXIsIHJlY3Vyc2VcbiAgICAgICAgICBzYW5pdGl6ZU5vZGVzKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEl0J3MgYSBib29rbWFya1xuICAgICAgICAgIGlmIChub2RlLnRhZ3MgJiYgdHlwZW9mIG5vZGUudGFncyA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkobm9kZS50YWdzKSkge1xuICAgICAgICAgICAgbm9kZS50YWdzID0gT2JqZWN0LnZhbHVlcyhub2RlLnRhZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1vcmUgcm9idXN0IGNoZWNrOiBlbnN1cmUgZm9sZGVycyBpcyBhbiBhcnJheSBBTkQgdGhlIHJvb3QgZm9sZGVyIGV4aXN0cy5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXBwRGF0YS5mb2xkZXJzKSB8fCAhYXBwRGF0YS5mb2xkZXJzLnNvbWUoZiA9PiAnY2hpbGRyZW4nIGluIGYgJiYgZi5pZCA9PT0gJ3Jvb3QnKSkge1xuICAgICAgICAvLyBJZiBmb2xkZXJzIGFycmF5IGlzIG1pc3NpbmcsIG5vdCBhbiBhcnJheSwgb3IgZG9lc24ndCBoYXZlIGEgcm9vdCBmb2xkZXIsXG4gICAgICAgIC8vIHdlIHJlc2V0IGl0IHRvIHRoZSBkZWZhdWx0LiBUaGlzIGlzIGEgYml0IGRlc3RydWN0aXZlIGlmIHRoZXJlIGFyZSBvdGhlclxuICAgICAgICAvLyB0b3AtbGV2ZWwgZm9sZGVycywgYnV0IHRoZSByb290IGZvbGRlciBpcyBlc3NlbnRpYWwuXG4gICAgICAgIGFwcERhdGEuZm9sZGVycyA9IGRlZmF1bHREYXRhLmZvbGRlcnM7XG4gICAgfVxuICAgIFxuICAgIHNhbml0aXplTm9kZXMoYXBwRGF0YS5mb2xkZXJzKTtcbiAgICBcbiAgICByZXR1cm4gYXBwRGF0YTtcbiAgfSBlbHNlIHtcbiAgICAvLyBJbml0aWFsaXplIHN0b3JhZ2Ugd2l0aCBkZWZhdWx0IGRhdGEgaWYgaXQncyB0aGUgZmlyc3QgcnVuXG4gICAgYXdhaXQgc2V0QXBwRGF0YShkZWZhdWx0RGF0YSk7XG4gICAgcmV0dXJuIGRlZmF1bHREYXRhO1xuICB9XG59XG5cbi8qKlxuICogU2F2ZXMgdGhlIGVudGlyZSBhcHBsaWNhdGlvbiBkYXRhIG9iamVjdCB0byBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqXG4gKiBAcGFyYW0gZGF0YSBUaGUgQXBwRGF0YSBvYmplY3QgdG8gc2F2ZS5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGRhdGEgaXMgc2F2ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRBcHBEYXRhKGRhdGE6IEFwcERhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZXTogZGF0YSB9KTtcbn1cblxuLy8gLS0tIENSVUQgT3BlcmF0aW9ucyBmb3IgRm9sZGVycyAtLS1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IGZvbGRlciB0byBhIHBhcmVudCBmb2xkZXIuXG4gKiBAcGFyYW0gcGFyZW50Rm9sZGVySWQgVGhlIElEIG9mIHRoZSBwYXJlbnQgZm9sZGVyLlxuICogQHBhcmFtIG5ld0ZvbGRlciBUaGUgZm9sZGVyIG9iamVjdCB0byBhZGQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRGb2xkZXIocGFyZW50Rm9sZGVySWQ6IHN0cmluZywgbmV3Rm9sZGVyOiBPbWl0PEZvbGRlciwgJ2lkJyB8ICdjaGlsZHJlbicgfCAnY3JlYXRlZEF0Jz4pOiBQcm9taXNlPEZvbGRlcj4ge1xuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgXG4gICAgY29uc3QgY3JlYXRlZEZvbGRlcjogRm9sZGVyID0ge1xuICAgICAgICAuLi5uZXdGb2xkZXIsXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuICAgIH07XG5cbiAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBzZWFyY2guIEEgcmVjdXJzaXZlIHNlYXJjaCB3b3VsZCBiZSBiZXR0ZXIuXG4gICAgY29uc3QgcGFyZW50ID0gZmluZEZvbGRlckJ5SWQoYXBwRGF0YS5mb2xkZXJzLCBwYXJlbnRGb2xkZXJJZCk7XG5cbiAgICBpZiAocGFyZW50KSB7XG4gICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNyZWF0ZWRGb2xkZXIpO1xuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICByZXR1cm4gY3JlYXRlZEZvbGRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmVudCBmb2xkZXIgd2l0aCBpZCAke3BhcmVudEZvbGRlcklkfSBub3QgZm91bmQuYCk7XG4gICAgfVxufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZmluZCBhIGZvbGRlciByZWN1cnNpdmVseVxuZnVuY3Rpb24gZmluZEZvbGRlckJ5SWQobm9kZXM6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10sIGlkOiBzdHJpbmcpOiBGb2xkZXIgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBJdCdzIGEgRm9sZGVyXG4gICAgICAgICAgICBpZiAobm9kZS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlY3Vyc2UgaW50byB0aGUgY2hpbGRyZW4gb2YgdGhpcyBmb2xkZXJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEZvbGRlckJ5SWQobm9kZS5jaGlsZHJlbiwgaWQpO1xuICAgICAgICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBCb29rbWFya3MgLS0tXG5cbi8qKlxuICogQWRkcyBhIG5ldyBib29rbWFyayB0byBhIHBhcmVudCBmb2xkZXIuXG4gKiBAcGFyYW0gcGFyZW50Rm9sZGVySWQgVGhlIElEIG9mIHRoZSBwYXJlbnQgZm9sZGVyLlxuICogQHBhcmFtIG5ld0Jvb2ttYXJrIFRoZSBib29rbWFyayBvYmplY3QgdG8gYWRkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va21hcmsocGFyZW50Rm9sZGVySWQ6IHN0cmluZywgbmV3Qm9va21hcms6IE9taXQ8Qm9va21hcmtJdGVtLCAnaWQnIHwgJ2NyZWF0ZWRBdCcgfCAnYWNjZXNzSGlzdG9yeSc+KTogUHJvbWlzZTxCb29rbWFya0l0ZW0+IHtcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xuXG4gICAgLy8gR2V0IGhpc3RvcnkgZm9yIHRoZSBVUkxcbiAgICBjb25zdCB2aXNpdHMgPSBhd2FpdCBjaHJvbWUuaGlzdG9yeS5nZXRWaXNpdHMoeyB1cmw6IG5ld0Jvb2ttYXJrLnVybCB9KTtcbiAgICBjb25zdCBhY2Nlc3NIaXN0b3J5OiBBY2Nlc3NSZWNvcmRbXSA9IHZpc2l0cy5tYXAodmlzaXQgPT4gKHtcbiAgICAgICAgdGltZXN0YW1wOiB2aXNpdC52aXNpdFRpbWUhXG4gICAgfSkpO1xuXG4gICAgY29uc3QgY3JlYXRlZEJvb2ttYXJrOiBCb29rbWFya0l0ZW0gPSB7XG4gICAgICAgIC4uLm5ld0Jvb2ttYXJrLFxuICAgICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICBhY2Nlc3NIaXN0b3J5OiBhY2Nlc3NIaXN0b3J5LFxuICAgIH07XG5cbiAgICBjb25zdCBwYXJlbnQgPSBmaW5kRm9sZGVyQnlJZChhcHBEYXRhLmZvbGRlcnMsIHBhcmVudEZvbGRlcklkKTtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goY3JlYXRlZEJvb2ttYXJrKTtcblxuICAgICAgICAvLyBJZiBhIHJlbWluZGVyIGlzIHNldCwgY3JlYXRlIGEgQ2hyb21lIGFsYXJtXG4gICAgICAgIGlmIChjcmVhdGVkQm9va21hcmsucmVtaW5kZXIpIHtcbiAgICAgICAgICAgIGNocm9tZS5hbGFybXMuY3JlYXRlKGByZW1pbmRlci0ke2NyZWF0ZWRCb29rbWFyay5pZH1gLCB7XG4gICAgICAgICAgICAgICAgd2hlbjogY3JlYXRlZEJvb2ttYXJrLnJlbWluZGVyLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICByZXR1cm4gY3JlYXRlZEJvb2ttYXJrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUGFyZW50IGZvbGRlciB3aXRoIGlkICR7cGFyZW50Rm9sZGVySWR9IG5vdCBmb3VuZC5gKTtcbiAgICB9XG59XG5cbi8vIC0tLSBDUlVEIE9wZXJhdGlvbnMgZm9yIFRhZ3MgLS0tXG5cbi8qKlxuICogQWRkcyBhIG5ldyB0YWcgdG8gdGhlIGFwcGxpY2F0aW9uIGRhdGEuXG4gKiBAcGFyYW0gbmV3VGFnIFRoZSB0YWcgb2JqZWN0IHRvIGFkZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFRhZyhuZXdUYWc6IE9taXQ8VGFnLCAnaWQnPik6IFByb21pc2U8VGFnPiB7XG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcblxuICAgIGNvbnN0IGNyZWF0ZWRUYWc6IFRhZyA9IHtcbiAgICAgICAgLi4ubmV3VGFnLFxuICAgICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICB9O1xuXG4gICAgLy8gQXZvaWQgZHVwbGljYXRlIHRhZyBuYW1lc1xuICAgIGlmIChhcHBEYXRhLnRhZ3Muc29tZSh0YWcgPT4gdGFnLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gY3JlYXRlZFRhZy5uYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFnIHdpdGggbmFtZSBcIiR7Y3JlYXRlZFRhZy5uYW1lfVwiIGFscmVhZHkgZXhpc3RzLmApO1xuICAgIH1cblxuICAgIGFwcERhdGEudGFncy5wdXNoKGNyZWF0ZWRUYWcpO1xuICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XG4gICAgcmV0dXJuIGNyZWF0ZWRUYWc7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBnbG9iYWwgdGFnLlxuICogQHBhcmFtIG5ld1RhZyBUaGUgdGFnIG9iamVjdCB0byBjcmVhdGUuXG4gKiBAcmV0dXJucyBUaGUgbmV3bHkgY3JlYXRlZCB0YWcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVUYWcobmV3VGFnOiBQYXJ0aWFsPFRhZz4pOiBQcm9taXNlPFRhZz4ge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgYSB0YWcgd2l0aCB0aGUgc2FtZSBuYW1lIGFscmVhZHkgZXhpc3RzXG4gICAgaWYgKGRhdGEudGFncy5zb21lKHQgPT4gdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5ld1RhZy5uYW1lPy50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRhZyBcIiR7bmV3VGFnLm5hbWV9XCIgYWxyZWFkeSBleGlzdHMuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgdGFnOiBUYWcgPSB7XG4gICAgICAgIGlkOiBgdGFnLSR7RGF0ZS5ub3coKX1gLFxuICAgICAgICBuYW1lOiBuZXdUYWcubmFtZSEsXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxuICAgIH07XG4gICAgZGF0YS50YWdzLnB1c2godGFnKTtcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGRhdGEpO1xuICAgIHJldHVybiB0YWc7XG59XG5cbi8vIC0tLSBIZWxwZXIgZnVuY3Rpb25zIHRvIGZpbmQgaXRlbXMgLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQm9va21hcmtCeUlkKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdLCBpZDogc3RyaW5nKTogQm9va21hcmtJdGVtIHwgbnVsbCB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUpIHsgLy8gRm9sZGVyXG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmRCb29rbWFya0J5SWQobm9kZS5jaGlsZHJlbiwgaWQpO1xuICAgICAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gICAgICAgIH0gZWxzZSB7IC8vIEJvb2ttYXJrSXRlbVxuICAgICAgICAgICAgaWYgKG5vZGUuaWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQm9va21hcmtCeVVybChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgdXJsOiBzdHJpbmcpOiBCb29rbWFya0l0ZW0gfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEJvb2ttYXJrQnlVcmwobm9kZS5jaGlsZHJlbiwgdXJsKTtcbiAgICAgICAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xuICAgICAgICB9IGVsc2UgeyAvLyBCb29rbWFya0l0ZW1cbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBVUkxzIHRvIGNvbXBhcmUgdGhlbSBtb3JlIHJlbGlhYmx5XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChuZXcgVVJMKG5vZGUudXJsKS5ocmVmID09PSBuZXcgVVJMKHVybCkuaHJlZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGludmFsaWQgVVJMc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vLyAtLS0gVXBkYXRlIGZ1bmN0aW9ucyAtLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUJvb2ttYXJrKHVwZGF0ZWRCb29rbWFyazogQm9va21hcmtJdGVtKTogUHJvbWlzZTxCb29rbWFya0l0ZW0+IHtcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xuICAgIFxuICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgb3JpZ2luYWwgYm9va21hcmsgdG8gdXBkYXRlIGl0LlxuICAgIC8vIFRoaXMgaXMgbm90IGVmZmljaWVudCwgYSBmbGF0IG1hcCB3b3VsZCBiZSBiZXR0ZXIgZm9yIHBlcmZvcm1hbmNlIG9uIGxhcmdlIGRhdGFzZXRzLlxuICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIHVwZGF0ZWRCb29rbWFyay5pZCk7XG5cbiAgICBpZiAoYm9va21hcmspIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihib29rbWFyaywgdXBkYXRlZEJvb2ttYXJrKTtcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcbiAgICAgICAgcmV0dXJuIGJvb2ttYXJrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQm9va21hcmsgd2l0aCBpZCAke3VwZGF0ZWRCb29rbWFyay5pZH0gbm90IGZvdW5kLmApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQm9va21hcmtCeUlkKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdLCBpZDogc3RyaW5nKTogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSB7XG4gICAgcmV0dXJuIG5vZGVzLmZpbHRlcihub2RlID0+IHtcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcbiAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4gPSByZW1vdmVCb29rbWFya0J5SWQobm9kZS5jaGlsZHJlbiwgaWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIGZvbGRlclxuICAgICAgICB9XG4gICAgICAgIC8vIEl0J3MgYSBib29rbWFyaywgZmlsdGVyIGl0IG91dCBpZiBJRHMgbWF0Y2hcbiAgICAgICAgcmV0dXJuIG5vZGUuaWQgIT09IGlkOyBcbiAgICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUJvb2ttYXJrKGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xuICAgIGFwcERhdGEuZm9sZGVycyA9IHJlbW92ZUJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGlkKSBhcyBGb2xkZXJbXTtcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xufVxuXG4vLyAtLS0gU3luYyBTdGF0dXMgTWFuYWdlbWVudCAtLS1cblxuLyoqXG4gKiBHZXRzIHRoZSBjdXJyZW50IHN5bmMgc3RhdHVzIGZyb20gc3RvcmFnZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFN5bmNTdGF0dXMoKTogUHJvbWlzZTxTeW5jU3RhdGU+IHtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFNZTkNfU1RBVFVTX0tFWSk7XG4gIHJldHVybiByZXN1bHRbU1lOQ19TVEFUVVNfS0VZXSB8fCB7IHN0YXR1czogJ2lkbGUnIH07XG59XG5cbi8qKlxuICogU2V0cyB0aGUgc3luYyBzdGF0dXMgaW4gc3RvcmFnZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldFN5bmNTdGF0dXMoc3RhdHVzOiBTeW5jU3RhdHVzLCBlcnJvck1lc3NhZ2U/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc3luY1N0YXRlOiBTeW5jU3RhdGUgPSB7XG4gICAgc3RhdHVzLFxuICAgIGxhc3RTeW5jVGltZTogc3RhdHVzID09PSAnc3luY2VkJyA/IERhdGUubm93KCkgOiB1bmRlZmluZWQsXG4gICAgbGFzdEVycm9yTWVzc2FnZTogc3RhdHVzID09PSAnZXJyb3InID8gZXJyb3JNZXNzYWdlIDogdW5kZWZpbmVkXG4gIH07XG4gIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTWU5DX1NUQVRVU19LRVldOiBzeW5jU3RhdGUgfSk7XG59XG5cbi8qKlxuICogQSByZWFkYWJsZSBTdmVsdGUgc3RvcmUgZm9yIHN5bmMgc3RhdHVzIHRoYXQgc3RheXMgaW4gc3luYyB3aXRoIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICovXG5leHBvcnQgY29uc3Qgc3luY1N0YXR1c1N0b3JlID0gcmVhZGFibGU8U3luY1N0YXRlPih7IHN0YXR1czogJ2lkbGUnIH0sIChzZXQpID0+IHtcbiAgLy8gR2V0IHRoZSBpbml0aWFsIHZhbHVlIGZyb20gc3RvcmFnZVxuICBnZXRTeW5jU3RhdHVzKCkudGhlbihzZXQpLmNhdGNoKGVyciA9PiB7XG4gICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIHN5bmNTdGF0dXNTdG9yZTpcIiwgZXJyKTtcbiAgICBzZXQoeyBzdGF0dXM6ICdlcnJvcicsIGxhc3RFcnJvck1lc3NhZ2U6ICdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBzeW5jIHN0YXR1cycgfSk7XG4gIH0pO1xuXG4gIC8vIFNldCB1cCBhIGxpc3RlbmVyIGZvciBjaGFuZ2VzXG4gIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXM6IHsgW2tleTogc3RyaW5nXTogY2hyb21lLnN0b3JhZ2UuU3RvcmFnZUNoYW5nZSB9LCBhcmVhTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGFyZWFOYW1lID09PSAnbG9jYWwnICYmIGNoYW5nZXNbU1lOQ19TVEFUVVNfS0VZXSkge1xuICAgICAgc2V0KGNoYW5nZXNbU1lOQ19TVEFUVVNfS0VZXS5uZXdWYWx1ZSBhcyBTeW5jU3RhdGUpO1xuICAgIH1cbiAgfTtcblxuICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgfTtcbn0pO1xuXG4vLyAtLS0gUmVhY3RpdmUgU3ZlbHRlIFN0b3JlIC0tLVxuaW1wb3J0IHsgcmVhZGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuXG4vKipcbiAqIEEgcmVhZGFibGUgU3ZlbHRlIHN0b3JlIHRoYXQgc3RheXMgaW4gc3luYyB3aXRoIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICovXG5leHBvcnQgY29uc3QgYXBwRGF0YVN0b3JlID0gcmVhZGFibGU8QXBwRGF0YSB8IG51bGw+KG51bGwsIChzZXQpID0+IHtcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBmaXJzdCBzdWJzY3JpYmVyIHN1YnNjcmliZXMuXG5cbiAgICAvLyAxLiBHZXQgdGhlIGluaXRpYWwgdmFsdWUgZnJvbSBzdG9yYWdlIGFuZCBzZXQgdGhlIHN0b3JlJ3MgdmFsdWUuXG4gICAgZ2V0QXBwRGF0YSgpLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgIHNldChkYXRhKTtcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgYXBwRGF0YVN0b3JlOlwiLCBlcnIpO1xuICAgICAgICAvLyBPcHRpb25hbGx5IHNldCBhIGRlZmF1bHQgdmFsdWUgb3IgYW4gZXJyb3Igc3RhdGVcbiAgICAgICAgc2V0KGRlZmF1bHREYXRhKTsgXG4gICAgfSk7XG5cbiAgICAvLyAyLiBTZXQgdXAgYSBsaXN0ZW5lciBmb3IgYW55IHN1YnNlcXVlbnQgY2hhbmdlcyBpbiBzdG9yYWdlLlxuICAgIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXM6IHsgW2tleTogc3RyaW5nXTogY2hyb21lLnN0b3JhZ2UuU3RvcmFnZUNoYW5nZSB9LCBhcmVhTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmIChhcmVhTmFtZSA9PT0gJ2xvY2FsJyAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZXSkge1xuICAgICAgICAgICAgc2V0KGNoYW5nZXNbU1RPUkFHRV9LRVldLm5ld1ZhbHVlIGFzIEFwcERhdGEpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cbiAgICAvLyAzLiBSZXR1cm4gYSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGxhc3Qgc3Vic2NyaWJlciB1bnN1YnNjcmliZXMuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICB9O1xufSk7ICIsIi8qKlxuICogVGhpcyBmaWxlIGNvbnRhaW5zIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBpbnRlcmFjdGluZyB3aXRoIHRoZSBHb29nbGUgRHJpdmUgQVBJLlxuICovXG5cbmltcG9ydCB0eXBlIHsgRm9sZGVyLCBCb29rbWFya0l0ZW0sIFRhZywgQWNjZXNzUmVjb3JkIH0gZnJvbSAnJGxpYi90eXBlcyc7XG5cbi8vIFRoaXMgaXMgdGhlIENsaWVudCBJRCBmb3IgdGhlIFwiV2ViIEFwcGxpY2F0aW9uXCIgdHlwZSBjcmVkZW50aWFsIGluIEdvb2dsZSBDbG91ZCBDb25zb2xlLlxuLy8gSXQgaXMgdXNlZCBhcyBhIGZhbGxiYWNrIGZvciBicm93c2VycyB0aGF0IGRvIG5vdCBzdXBwb3J0IGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4gKGUuZy4sIEJyYXZlKS5cbmNvbnN0IFdFQl9BUFBfQ0xJRU5UX0lEID0gJzUxOTcyOTMwOTUxMS1qYmZ2OGYxY3MwOGZtMXQ3NGZiMmV2dHQxMmhuYmFuay5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG5cbmNvbnN0IERJU0NPVkVSWV9ET0MgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vZGlzY292ZXJ5L3YxL2FwaXMvZHJpdmUvdjMvcmVzdCc7XG5cbmNvbnN0IEJPVU5EQVJZID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnO1xuY29uc3QgVVBMT0FEX1VSTCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS91cGxvYWQvZHJpdmUvdjMvZmlsZXMnO1xuY29uc3QgRFJJVkVfRklMRVNfVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2RyaXZlL3YzL2ZpbGVzJztcbmNvbnN0IEZJTEVfTkFNRSA9ICdjaHJvbWUtZXh0ZW5zaW9uLXN2ZWx0ZS10eXBlc2NyaXB0LWJvaWxlcnBsYXRlLWJhY2t1cC5qc29uJztcbmNvbnN0IE1BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWSA9ICdnZHJpdmVfbWFudWFsX3Rva2VuJztcblxuLyoqXG4gKiBDdXN0b20gZXJyb3IgY2xhc3MgZm9yIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmVzLlxuICovXG5leHBvcnQgY2xhc3MgQXV0aEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcblx0XHRzdXBlcihtZXNzYWdlKTtcblx0XHR0aGlzLm5hbWUgPSAnQXV0aEVycm9yJztcblx0fVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBicm93c2VyIGlzIEdvb2dsZSBDaHJvbWUuXG4gKiBUaGlzIGlzIGEgc2ltcGxpZmllZCBjaGVjayBhbmQgbWlnaHQgbmVlZCBpbXByb3ZlbWVudC5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRydWUgaWYgdGhlIGJyb3dzZXIgaXMgbGlrZWx5IENocm9tZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG5hc3luYyBmdW5jdGlvbiBpc0Nocm9tZUJyb3dzZXIoKTogUHJvbWlzZTxib29sZWFuPiB7XG5cdC8vIEB0cy1pZ25vcmVcblx0aWYgKG5hdmlnYXRvci5icmF2ZSAmJiAoYXdhaXQgbmF2aWdhdG9yLmJyYXZlLmlzQnJhdmUoKSkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Ly8gVGhpcyBpcyBub3QgYSBmb29scHJvb2Ygd2F5IHRvIGRldGVjdCBDaHJvbWUsIGJ1dCBpdCdzIGEgY29tbW9uIG1ldGhvZC5cblx0Ly8gSXQgY2hlY2tzIGZvciB0aGUgcHJlc2VuY2Ugb2YgJ0Nocm9tZScgYW5kIHRoZSBhYnNlbmNlIG9mICdFZGcnIChmb3IgRWRnZSkgaW4gdGhlIHVzZXIgYWdlbnQgc3RyaW5nLlxuXHQvLyBJdCdzIGEgcmVhc29uYWJsZSBoZXVyaXN0aWMgZm9yIGRpc3Rpbmd1aXNoaW5nIENocm9tZSBmcm9tIG90aGVyIENocm9taXVtLWJhc2VkIGJyb3dzZXJzLlxuXHRyZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmNsdWRlcygnQ2hyb21lJykgJiYgIW5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0VkZycpO1xufVxuXG5mdW5jdGlvbiBsYXVuY2hXZWJBdXRoRmxvdyhpbnRlcmFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0aWYgKFdFQl9BUFBfQ0xJRU5UX0lELnN0YXJ0c1dpdGgoJ0NPTEVfT19TRVVfSURfREVfQ0xJRU5URScpKSB7XG5cdFx0XHRyZXR1cm4gcmVqZWN0KFxuXHRcdFx0XHRuZXcgRXJyb3IoJ1BsZWFzZSBwcm92aWRlIHRoZSBXZWIgQXBwbGljYXRpb24gQ2xpZW50IElEIGluIHNyYy9saWIvZ2RyaXZlLnRzJylcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZXh0ZW5zaW9uSWQgPSBjaHJvbWUucnVudGltZS5pZDtcblx0XHRjb25zdCByZWRpcmVjdFVyaSA9IGBodHRwczovLyR7ZXh0ZW5zaW9uSWR9LmNocm9taXVtYXBwLm9yZ2A7XG5cdFx0Y29uc29sZS5sb2coXG5cdFx0XHQnUGFyYSBvIGZsdXhvIGRlIGF1dGVudGljYcOnw6NvIGRhIHdlYiwgY2VydGlmaXF1ZS1zZSBkZSBxdWUgZXN0ZSBVUkkgZGUgcmVkaXJlY2lvbmFtZW50byBlc3TDoSBhZGljaW9uYWRvIMOgcyBzdWFzIGNyZWRlbmNpYWlzIGRlIE9BdXRoIDIuMCBkbyB0aXBvIFwiQXBsaWNhw6fDo28gV2ViXCIgbmEgR29vZ2xlIENsb3VkIENvbnNvbGU6Jyxcblx0XHRcdHJlZGlyZWN0VXJpXG5cdFx0KTtcblx0XHRjb25zdCBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZS5maWxlIGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8uZW1haWwgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJztcblx0XHRsZXQgYXV0aFVybCA9IGBodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvdjIvYXV0aGA7XG5cdFx0YXV0aFVybCArPSBgP2NsaWVudF9pZD0ke1dFQl9BUFBfQ0xJRU5UX0lEfWA7XG5cdFx0YXV0aFVybCArPSBgJnJlc3BvbnNlX3R5cGU9dG9rZW5gO1xuXHRcdGF1dGhVcmwgKz0gYCZyZWRpcmVjdF91cmk9JHtlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmkpfWA7XG5cdFx0YXV0aFVybCArPSBgJnNjb3BlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNjb3Blcyl9YDtcblxuXHRcdGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdyh7IHVybDogYXV0aFVybCwgaW50ZXJhY3RpdmUgfSwgKHJlc3BvbnNlVXJsKSA9PiB7XG5cdFx0XHRpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZVVybCkge1xuXHRcdFx0XHRjb25zdCB1cmwgPSBuZXcgVVJMKHJlc3BvbnNlVXJsKTtcblx0XHRcdFx0Y29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh1cmwuaGFzaC5zdWJzdHJpbmcoMSkpOyAvLyBSZW1vdmUgdGhlICcjJ1xuXHRcdFx0XHRjb25zdCBhY2Nlc3NUb2tlbiA9IHBhcmFtcy5nZXQoJ2FjY2Vzc190b2tlbicpO1xuXHRcdFx0XHRpZiAoYWNjZXNzVG9rZW4pIHtcblx0XHRcdFx0XHRjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXTogYWNjZXNzVG9rZW4gfSwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gVGhlIGxpc3RlbmVyIGFib3ZlIHdpbGwgYXV0b21hdGljYWxseSB1cGRhdGUgdGhlIHN0b3JlXG5cdFx0XHRcdFx0XHRyZXNvbHZlKGFjY2Vzc1Rva2VuKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQ6IEFjY2VzcyB0b2tlbiBub3QgZm91bmQgaW4gcmVzcG9uc2UuJykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQ6IE5vIHJlc3BvbnNlIFVSTC4nKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG4vKipcbiAqIEluaXRpYXRlcyB0aGUgT0F1dGggMi4wIGZsb3cgdG8gZ2V0IGFuIGFjY2VzcyB0b2tlbi5cbiAqIEBwYXJhbSBpbnRlcmFjdGl2ZSBJZiB0cnVlLCB0aGUgdXNlciB3aWxsIGJlIHByb21wdGVkIHRvIGxvZyBpbiBpZiBuZWNlc3NhcnkuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgYWNjZXNzIHRva2VuLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXV0aFRva2VuKGludGVyYWN0aXZlOiBib29sZWFuKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0Y29uc3QgaXNDaHJvbWUgPSBhd2FpdCBpc0Nocm9tZUJyb3dzZXIoKTtcblxuXHRpZiAoaXNDaHJvbWUpIHtcblx0XHRjb25zb2xlLmxvZygnRGV0ZWN0ZWQgQ2hyb21lIGJyb3dzZXIsIHVzaW5nIGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4uJyk7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4oeyBpbnRlcmFjdGl2ZSB9LCAodG9rZW4pID0+IHtcblx0XHRcdFx0aWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXNvbHZlKHRva2VuIGFzIHN0cmluZyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnNvbGUubG9nKCdEZXRlY3RlZCBhIG5vbi1DaHJvbWUgYnJvd3NlciwgdXNpbmcgY2hyb21lLmlkZW50aXR5LmxhdW5jaFdlYkF1dGhGbG93LicpO1xuXHRcdGlmIChpbnRlcmFjdGl2ZSkge1xuXHRcdFx0cmV0dXJuIGxhdW5jaFdlYkF1dGhGbG93KGludGVyYWN0aXZlKTtcblx0XHR9XG5cdFx0Ly8gVHJ5IHRvIGdldCBmcm9tIHN0b3JhZ2UgaWYgbm90IGludGVyYWN0aXZlXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVksIChyZXN1bHQpID0+IHtcblx0XHRcdFx0aWYgKHJlc3VsdFtNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVldKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZShyZXN1bHRbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignTm90IGxvZ2dlZCBpbi4nKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhIGNhY2hlZCBPQXV0aCAyLjAgdG9rZW4uXG4gKiBAcGFyYW0gdG9rZW4gVGhlIHRva2VuIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIHRva2VuIGlzIHJlbW92ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDYWNoZWRBdXRoVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjaHJvbWUuaWRlbnRpdHkucmVtb3ZlQ2FjaGVkQXV0aFRva2VuKHsgdG9rZW4gfSwgKCkgPT4ge1xuXHRcdFx0Y2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKE1BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWSwgKCkgPT4ge1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEhlYWRlcnModG9rZW46IHN0cmluZykge1xuICAgIHJldHVybiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke3Rva2VufWAsXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgfTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgYmFja3VwIGZpbGUgaW4gdGhlIHVzZXIncyBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBtZXRhZGF0YSBpZiBmb3VuZCwgb3RoZXJ3aXNlIG51bGwuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGZpbmRCYWNrdXBGaWxlKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICBjb25zdCBoZWFkZXJzID0gYXdhaXQgZ2V0SGVhZGVycyh0b2tlbik7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtEUklWRV9GSUxFU19VUkx9P3E9bmFtZT0nJHtGSUxFX05BTUV9JyBhbmQgJ3Jvb3QnIGluIHBhcmVudHMgYW5kIHRyYXNoZWQ9ZmFsc2VgLCB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuXHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSkge1xuXHRcdFx0dGhyb3cgbmV3IEF1dGhFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkLiBQbGVhc2UgbG9nIGluIGFnYWluLicpO1xuXHRcdH1cbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGZpbmRCYWNrdXBGaWxlOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHNlYXJjaCBmb3IgYmFja3VwIGZpbGU6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gZGF0YS5maWxlcy5sZW5ndGggPiAwID8gZGF0YS5maWxlc1swXSA6IG51bGw7XG59XG5cbi8qKlxuICogVXBsb2FkcyB0aGUgYXBwbGljYXRpb24gZGF0YSB0byBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gZGF0YSBUaGUgYXBwbGljYXRpb24gZGF0YSB0byB1cGxvYWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRCYWNrdXAodG9rZW46IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBcbiAgICBjb25zdCBmaWxlTWV0YWRhdGE6IHsgbmFtZTogc3RyaW5nLCBwYXJlbnRzPzogc3RyaW5nW10gfSA9IHtcbiAgICAgICAgbmFtZTogRklMRV9OQU1FLFxuICAgIH07XG5cbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgLy8gUGFyZW50cyBmaWVsZCBpcyBub3QgbmVlZGVkIGlmIHRoZSBmaWxlIGlzIGluIHRoZSByb290LlxuICAgICAgICAvLyBJdCBkZWZhdWx0cyB0byB0aGUgcm9vdCBpZiBub3Qgc3BlY2lmaWVkLlxuICAgIH1cblxuICAgIGNvbnN0IG11bHRpcGFydFJlcXVlc3RCb2R5ID1cbiAgICAgICAgYC0tJHtCT1VOREFSWX1cXHJcXG5gICtcbiAgICAgICAgYENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFxcclxcblxcclxcbmAgK1xuICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShmaWxlTWV0YWRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfVxcclxcbmAgK1xuICAgICAgICBgQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuYCArXG4gICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfS0tYDtcblxuICAgIGNvbnN0IG1ldGhvZCA9IGZpbGUgPyAnUEFUQ0gnIDogJ1BPU1QnO1xuICAgIGNvbnN0IHVybCA9IGZpbGUgPyBgJHtVUExPQURfVVJMfS8ke2ZpbGUuaWR9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YCA6IGAke1VQTE9BRF9VUkx9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW59YCxcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiBgbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PSR7Qk9VTkRBUll9YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogbXVsdGlwYXJ0UmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgQXV0aEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyk7XG5cdFx0fVxuICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBBUEkgRXJyb3Igb24gdXBsb2FkQmFja3VwOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHVwbG9hZCBiYWNrdXA6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG59XG5cbi8qKlxuICogRG93bmxvYWRzIHRoZSBiYWNrdXAgZmlsZSBmcm9tIEdvb2dsZSBEcml2ZS5cbiAqIEBwYXJhbSB0b2tlbiBUaGUgT0F1dGggMi4wIGFjY2VzcyB0b2tlbi5cbiAqIEByZXR1cm5zIFRoZSBhcHBsaWNhdGlvbiBkYXRhIGZyb20gdGhlIGJhY2t1cCBmaWxlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRCYWNrdXAodG9rZW46IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBmaW5kQmFja3VwRmlsZSh0b2tlbik7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGhlYWRlcnMgPSBhd2FpdCBnZXRIZWFkZXJzKHRva2VuKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0RSSVZFX0ZJTEVTX1VSTH0vJHtmaWxlLmlkfT9hbHQ9bWVkaWFgLCB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgQXV0aEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyk7XG5cdFx0fVxuICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBBUEkgRXJyb3Igb24gZG93bmxvYWRCYWNrdXA6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZG93bmxvYWQgYmFja3VwOiAnICsgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbn1cblxuLy8gRnVuY3Rpb25zIGZvciBiYWNrdXAgYW5kIHJlc3RvcmUgd2lsbCBiZSBhZGRlZCBiZWxvdy4gIiwiaW1wb3J0IHsgdHlwZSBDbGFzc1ZhbHVlLCBjbHN4IH0gZnJvbSBcImNsc3hcIjtcbmltcG9ydCB7IHR3TWVyZ2UgfSBmcm9tIFwidGFpbHdpbmQtbWVyZ2VcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNuKC4uLmlucHV0czogQ2xhc3NWYWx1ZVtdKSB7XG5cdHJldHVybiB0d01lcmdlKGNsc3goaW5wdXRzKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWRcbiAqIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXMgaW52b2tlZC5cbiAqIEBwYXJhbSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHJldHVybnMgUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyAoLi4uYXJnczogYW55W10pID0+IGFueT4oZnVuYzogVCwgd2FpdDogbnVtYmVyKTogKC4uLmFyZ3M6IFBhcmFtZXRlcnM8VD4pID0+IHZvaWQge1xuICAgIGxldCB0aW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24odGhpczogVGhpc1BhcmFtZXRlclR5cGU8VD4sIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXM7XG4gICAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICB9LCB3YWl0KTtcbiAgICB9O1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkPFQ+ID0gVCBleHRlbmRzIHsgY2hpbGQ/OiBhbnkgfSA/IE9taXQ8VCwgXCJjaGlsZFwiPiA6IFQ7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkcmVuPFQ+ID0gVCBleHRlbmRzIHsgY2hpbGRyZW4/OiBhbnkgfSA/IE9taXQ8VCwgXCJjaGlsZHJlblwiPiA6IFQ7XG5leHBvcnQgdHlwZSBXaXRob3V0Q2hpbGRyZW5PckNoaWxkPFQ+ID0gV2l0aG91dENoaWxkcmVuPFdpdGhvdXRDaGlsZDxUPj47XG5leHBvcnQgdHlwZSBXaXRoRWxlbWVudFJlZjxULCBVIGV4dGVuZHMgSFRNTEVsZW1lbnQgPSBIVE1MRWxlbWVudD4gPSBUICYgeyByZWY/OiBVIHwgbnVsbCB9O1xuIiwiaW1wb3J0IHsgYXBwRGF0YVN0b3JlLCBzZXRTeW5jU3RhdHVzIH0gZnJvbSAnLi9zdG9yYWdlJztcbmltcG9ydCB7IGdldEF1dGhUb2tlbiwgdXBsb2FkQmFja3VwLCBBdXRoRXJyb3IgfSBmcm9tICcuL2dkcml2ZSc7XG5pbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgaXNGaXJzdENoYW5nZSA9IHRydWU7XG5cbmNvbnN0IGRlYm91bmNlZFVwbG9hZCA9IGRlYm91bmNlKGFzeW5jICh0b2tlbjogc3RyaW5nLCBkYXRhOiBhbnkpID0+IHtcbiAgICBjb25zb2xlLmxvZygnRGVib3VuY2VkIGJhY2t1cCB0cmlnZ2VyZWQuJyk7XG4gICAgYXdhaXQgc2V0U3luY1N0YXR1cygnc3luY2luZycpO1xuICAgIFxuICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHVwbG9hZEJhY2t1cCh0b2tlbiwgZGF0YSk7XG4gICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3N5bmNlZCcpO1xuICAgICAgICBjb25zb2xlLmxvZygnQXV0by1iYWNrdXAgc3VjY2Vzc2Z1bC4nKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dG8tYmFja3VwIGZhaWxlZDonLCBlKTtcbiAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBBdXRoRXJyb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3VuYXV0aGVudGljYXRlZCcsIGUubWVzc2FnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCBzZXRTeW5jU3RhdHVzKCdlcnJvcicsIGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyk7XG4gICAgICAgIH1cbiAgICB9XG59LCA1MDAwKTsgLy8gRGVib3VuY2UgZm9yIDUgc2Vjb25kc1xuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVEYXRhQ2hhbmdlKGRhdGE6IGFueSkge1xuICAgIGlmIChpc0ZpcnN0Q2hhbmdlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdJbml0aWFsIGRhdGEgbG9hZGVkLCBza2lwcGluZyBmaXJzdCBhdXRvLWJhY2t1cC4nKTtcbiAgICAgICAgaXNGaXJzdENoYW5nZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBhIHRva2VuIG5vbi1pbnRlcmFjdGl2ZWx5LlxuICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBhd2FpdCBnZXRBdXRoVG9rZW4oZmFsc2UpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RhdGEgY2hhbmdlZCwgc2NoZWR1bGluZyBhdXRvLWJhY2t1cC4uLicpO1xuICAgICAgICAgICAgICAgIGRlYm91bmNlZFVwbG9hZCh0b2tlbiwgZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIHRva2VuLCB3aGljaCBtZWFucyB3ZSBhcmUgbG9nZ2VkIG91dC5cbiAgICAgICAgICAgICAgICBhd2FpdCBzZXRTeW5jU3RhdHVzKCd1bmF1dGhlbnRpY2F0ZWQnLCAnVXNlciBpcyBub3QgbG9nZ2VkIGluLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gVGhpcyBjYW4gaGFwcGVuIGlmIGdldEF1dGhUb2tlbiBmYWlscyAoZS5nLiBub3QgbG9nZ2VkIGluIG9uIG5vbi1jaHJvbWUpXG4gICAgICAgICAgICBhd2FpdCBzZXRTeW5jU3RhdHVzKCd1bmF1dGhlbnRpY2F0ZWQnLCAnVXNlciBpcyBub3QgbG9nZ2VkIGluLicpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBTdWJzY3JpYmUgdG8gdGhlIHN0b3JlIHRvIGxpc3RlbiBmb3IgY2hhbmdlcy5cbmFwcERhdGFTdG9yZS5zdWJzY3JpYmUoaGFuZGxlRGF0YUNoYW5nZSk7XG5cbmNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBtb2R1bGUgaW5pdGlhbGl6ZWQuJyk7ICIsImltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tIFwiI2ltcG9ydHNcIjtcbmltcG9ydCB7IGZpbmRCb29rbWFya0J5SWQsIGdldEFwcERhdGEsIGZpbmRCb29rbWFya0J5VXJsLCBzZXRBcHBEYXRhIH0gZnJvbSBcIi4uL2xpYi9zdG9yYWdlXCI7XG5cbi8vIEltcG9ydCB0aGUgYXV0by1iYWNrdXAgbW9kdWxlIHRvIGluaXRpYWxpemUgaXQuXG5pbXBvcnQgJyRsaWIvYXV0by1iYWNrdXAnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhbiBhbGFybSBnb2VzIG9mZlxuICAgIGNocm9tZS5hbGFybXMub25BbGFybS5hZGRMaXN0ZW5lcihhc3luYyAoYWxhcm0pID0+IHtcbiAgICAgICAgaWYgKGFsYXJtLm5hbWUuc3RhcnRzV2l0aChcInJlbWluZGVyLVwiKSkge1xuICAgICAgICAgICAgY29uc3QgYm9va21hcmtJZCA9IGFsYXJtLm5hbWUucmVwbGFjZShcInJlbWluZGVyLVwiLCBcIlwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgYm9va21hcmsgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcmVtaW5kZXJcbiAgICAgICAgICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgICAgICAgICBjb25zdCBib29rbWFyayA9IGZpbmRCb29rbWFya0J5SWQoYXBwRGF0YS5mb2xkZXJzLCBib29rbWFya0lkKTtcblxuICAgICAgICAgICAgaWYgKGJvb2ttYXJrKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKGBub3RpZmljYXRpb24tJHtib29rbWFyay5pZH1gLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYmFzaWNcIixcbiAgICAgICAgICAgICAgICAgICAgaWNvblVybDogXCJpY29uLTEyOC5wbmdcIiwgLy8gV1hUIGhhbmRsZXMgcGF0aGluZ1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJSZW1pbmRlcjogXCIgKyBib29rbWFyay50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJDbGljayB0byBvcGVuIHRoaXMgc2F2ZWQgcGFnZS5cIixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIExpc3RlbmVyIGZvciB3aGVuIGEgbm90aWZpY2F0aW9uIGlzIGNsaWNrZWRcbiAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKG5vdGlmaWNhdGlvbklkKSA9PiB7XG4gICAgICAgIGlmIChub3RpZmljYXRpb25JZC5zdGFydHNXaXRoKFwibm90aWZpY2F0aW9uLVwiKSkge1xuICAgICAgICAgICAgY29uc3QgYm9va21hcmtJZCA9IG5vdGlmaWNhdGlvbklkLnJlcGxhY2UoXCJub3RpZmljYXRpb24tXCIsIFwiXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGlzIHBhcnQgaXMgdHJpY2t5IGJlY2F1c2Ugd2UgY2FuJ3QgZGlyZWN0bHkgZ2V0IHRoZSBVUkwgaGVyZVxuICAgICAgICAgICAgLy8gd2l0aG91dCBhbm90aGVyIHN0b3JhZ2UgbG9va3VwLiBBIGJldHRlciBhcHByb2FjaCBmb3IgYSByZWFsIGFwcFxuICAgICAgICAgICAgLy8gbWlnaHQgYmUgdG8gc3RvcmUgdGhlIFVSTCBpbiB0aGUgYWxhcm0vbm90aWZpY2F0aW9uIGRldGFpbHMgaWYgcG9zc2libGUsXG4gICAgICAgICAgICAvLyBvciBwZXJmb3JtIHRoZSBsb29rdXAgYXMgd2UgZG8gaGVyZS5cbiAgICAgICAgICAgIGdldEFwcERhdGEoKS50aGVuKGFwcERhdGEgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGJvb2ttYXJrSWQpO1xuICAgICAgICAgICAgICAgIGlmIChib29rbWFyaz8udXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogYm9va21hcmsudXJsIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBMaXN0ZW5lciBmb3Iga2V5Ym9hcmQgc2hvcnRjdXRcbiAgY2hyb21lLmNvbW1hbmRzLm9uQ29tbWFuZC5hZGRMaXN0ZW5lcihhc3luYyAoY29tbWFuZCkgPT4ge1xuICAgIGlmIChjb21tYW5kID09PSAnb3Blbi1ib29rbWFyay1kaWFsb2cnKSB7XG4gICAgICBjb25zdCBbdGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xuICAgICAgaWYgKHRhYj8uaWQgJiYgdGFiLnVybCkge1xuICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHtcbiAgICAgICAgICBhY3Rpb246ICdvcGVuQm9va21hcmtEaWFsb2cnLFxuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHRpdGxlOiB0YWIudGl0bGUgfHwgJ05vIHRpdGxlJyxcbiAgICAgICAgICAgIHVybDogdGFiLnVybCxcbiAgICAgICAgICAgIGZhdmljb246IHRhYi5mYXZJY29uVXJsIHx8IG51bGwsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAgIC8vIExpc3RlbmVyIGZvciB3aGVuIGEgdXNlciB2aXNpdHMgYSBwYWdlXG4gICAgY2hyb21lLmhpc3Rvcnkub25WaXNpdGVkLmFkZExpc3RlbmVyKGFzeW5jIChoaXN0b3J5SXRlbSkgPT4ge1xuICAgICAgICBpZiAoaGlzdG9yeUl0ZW0udXJsKSB7XG4gICAgICAgICAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xuICAgICAgICAgICAgY29uc3QgYm9va21hcmsgPSBmaW5kQm9va21hcmtCeVVybChhcHBEYXRhLmZvbGRlcnMsIGhpc3RvcnlJdGVtLnVybCk7XG5cbiAgICAgICAgICAgIGlmIChib29rbWFyaykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpc2l0cyA9IGF3YWl0IGNocm9tZS5oaXN0b3J5LmdldFZpc2l0cyh7IHVybDogaGlzdG9yeUl0ZW0udXJsIH0pO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrLmFjY2Vzc0hpc3RvcnkgPSB2aXNpdHMubWFwKCh2aXNpdDogY2hyb21lLmhpc3RvcnkuVmlzaXRJdGVtKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHZpc2l0LnZpc2l0VGltZSFcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImUucnVuZV9vdXRzaWRlX3N2ZWx0ZSIsInJlc3VsdCIsImJyb3dzZXIiLCJfYnJvd3NlciJdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sV0FBUyxpQkFBaUIsS0FBSztBQUNwQyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNUO0FDbUJPLFFBQU0sT0FBTyxNQUFNO0FBQUEsRUFBQztBQ1ZwQixXQUFTLGVBQWUsR0FBRyxHQUFHO0FBQ3BDLFdBQU8sS0FBSyxJQUNULEtBQUssSUFDTCxNQUFNLEtBQU0sTUFBTSxRQUFRLE9BQU8sTUFBTSxZQUFhLE9BQU8sTUFBTTtBQUFBLEVBQ3JFO0FDNlJPLFdBQVMsb0JBQW9CLE1BQU07QUFDaEM7QUFDUixZQUFNLFFBQVEsSUFBSSxNQUFNO0FBQUEsUUFBOEIsSUFBSTtBQUFBLHlDQUFvSDtBQUU5SyxZQUFNLE9BQU87QUFFYixZQUFNO0FBQUEsSUFDUDtBQUFBLEVBR0Q7QUMzU1M7QUFJUixRQUFTLG1CQUFULFNBQTBCLE1BQU07QUFDL0Is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LGNBQWMsUUFBUTtBQUNoQyxZQUFNLDBCQUEwQixZQUFZLE1BQU0sTUFBTSxFQUFFO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksQ0FBQyxhQUFhLFVBQVUsU0FBUyxRQUFRLEtBQUssYUFBYTtBQUM3RCxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQSxHQUFHLFFBQVEsMEJBQTBCLGFBQWEsVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLE1BQzVFO0FBQUEsRUFDQTtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLFNBQVMsU0FBUyxHQUFHO0FBQ3ZCLFlBQU0sSUFBSSxvQkFBb0IsY0FBYyxnQ0FBZ0M7QUFDOUUsUUFBSSxTQUFTLFNBQVMsR0FBRyxLQUFLLFNBQVMsU0FBUyxLQUFLLENBQUMsU0FBUyxXQUFXLElBQUk7QUFDNUUsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxNQUNOO0FBQUEsRUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsMTEsMTIsMTNdfQ==
