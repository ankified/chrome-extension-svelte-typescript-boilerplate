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
    console.log("Background script loaded.");
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      console.log("Alarm fired:", alarm);
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
    chrome.history.onVisited.addListener(async (historyItem) => {
      if (historyItem.url) {
        const appData = await getAppData();
        const bookmark = findBookmarkByUrl(appData.folders, historyItem.url);
        if (bookmark) {
          console.log(`Updating history for bookmarked item: ${bookmark.title}`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vc3ZlbHRlQDUuMzUuNi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9pbnRlcm5hbC9jbGllbnQvZXJyb3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW5kZXgtY2xpZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc3RvcmUvc2hhcmVkL2luZGV4LmpzIiwiLi4vLi4vc3JjL2xpYi9zdG9yYWdlLnRzIiwiLi4vLi4vc3JjL2xpYi9nZHJpdmUudHMiLCIuLi8uLi9zcmMvbGliL3V0aWxzLnRzIiwiLi4vLi4vc3JjL2xpYi9hdXRvLWJhY2t1cC50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHdlYmV4dC1jb3JlK21hdGNoLXBhdHRlcm5zQDEuMC4zL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIFN0b3JlIHRoZSByZWZlcmVuY2VzIHRvIGdsb2JhbHMgaW4gY2FzZSBzb21lb25lIHRyaWVzIHRvIG1vbmtleSBwYXRjaCB0aGVzZSwgY2F1c2luZyB0aGUgYmVsb3dcbi8vIHRvIGRlLW9wdCAodGhpcyBvY2N1cnMgb2Z0ZW4gd2hlbiB1c2luZyBwb3B1bGFyIGV4dGVuc2lvbnMpLlxuZXhwb3J0IHZhciBpc19hcnJheSA9IEFycmF5LmlzQXJyYXk7XG5leHBvcnQgdmFyIGluZGV4X29mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG5leHBvcnQgdmFyIGFycmF5X2Zyb20gPSBBcnJheS5mcm9tO1xuZXhwb3J0IHZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzO1xuZXhwb3J0IHZhciBkZWZpbmVfcHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5leHBvcnQgdmFyIGdldF9kZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmV4cG9ydCB2YXIgZ2V0X2Rlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnM7XG5leHBvcnQgdmFyIG9iamVjdF9wcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuZXhwb3J0IHZhciBhcnJheV9wcm90b3R5cGUgPSBBcnJheS5wcm90b3R5cGU7XG5leHBvcnQgdmFyIGdldF9wcm90b3R5cGVfb2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG5leHBvcnQgdmFyIGlzX2V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvaW5kZXguanNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIE1JVCBMaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvTElDRU5TRVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEByZXR1cm5zIHt2YWx1ZSBpcyBQcm9taXNlTGlrZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIHR5cGVvZiB2YWx1ZT8udGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEBwYXJhbSB7RnVuY3Rpb259IGZuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG4vKiogQHBhcmFtIHtBcnJheTwoKSA9PiB2b2lkPn0gYXJyICovXG5leHBvcnQgZnVuY3Rpb24gcnVuX2FsbChhcnIpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcblx0XHRhcnJbaV0oKTtcblx0fVxufVxuXG4vKipcbiAqIFRPRE8gcmVwbGFjZSB3aXRoIFByb21pc2Uud2l0aFJlc29sdmVycyBvbmNlIHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmZXJyZWQoKSB7XG5cdC8qKiBAdHlwZSB7KHZhbHVlOiBUKSA9PiB2b2lkfSAqL1xuXHR2YXIgcmVzb2x2ZTtcblxuXHQvKiogQHR5cGUgeyhyZWFzb246IGFueSkgPT4gdm9pZH0gKi9cblx0dmFyIHJlamVjdDtcblxuXHQvKiogQHR5cGUge1Byb21pc2U8VD59ICovXG5cdHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG5cdFx0cmVzb2x2ZSA9IHJlcztcblx0XHRyZWplY3QgPSByZWo7XG5cdH0pO1xuXG5cdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0cmV0dXJuIHsgcHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0IH07XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFZcbiAqIEBwYXJhbSB7Vn0gdmFsdWVcbiAqIEBwYXJhbSB7ViB8ICgoKSA9PiBWKX0gZmFsbGJhY2tcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xhenldXG4gKiBAcmV0dXJucyB7Vn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrKHZhbHVlLCBmYWxsYmFjaywgbGF6eSA9IGZhbHNlKSB7XG5cdHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkXG5cdFx0PyBsYXp5XG5cdFx0XHQ/IC8qKiBAdHlwZSB7KCkgPT4gVn0gKi8gKGZhbGxiYWNrKSgpXG5cdFx0XHQ6IC8qKiBAdHlwZSB7Vn0gKi8gKGZhbGxiYWNrKVxuXHRcdDogdmFsdWU7XG59XG5cbi8qKlxuICogV2hlbiBlbmNvdW50ZXJpbmcgYSBzaXR1YXRpb24gbGlrZSBgbGV0IFthLCBiLCBjXSA9ICRkZXJpdmVkKGJsYWgoKSlgLFxuICogd2UgbmVlZCB0byBzdGFzaCBhbiBpbnRlcm1lZGlhdGUgdmFsdWUgdGhhdCBgYWAsIGBiYCwgYW5kIGBjYCBkZXJpdmVcbiAqIGZyb20sIGluIGNhc2UgaXQncyBhbiBpdGVyYWJsZVxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7QXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD59IHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gW25dXG4gKiBAcmV0dXJucyB7QXJyYXk8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b19hcnJheSh2YWx1ZSwgbikge1xuXHQvLyByZXR1cm4gYXJyYXlzIHVuY2hhbmdlZFxuXHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHQvLyBpZiB2YWx1ZSBpcyBub3QgaXRlcmFibGUsIG9yIGBuYCBpcyB1bnNwZWNpZmllZCAoaW5kaWNhdGVzIGEgcmVzdFxuXHQvLyBlbGVtZW50LCB3aGljaCBtZWFucyB3ZSdyZSBub3QgY29uY2VybmVkIGFib3V0IHVuYm91bmRlZCBpdGVyYWJsZXMpXG5cdC8vIGNvbnZlcnQgdG8gYW4gYXJyYXkgd2l0aCBgQXJyYXkuZnJvbWBcblx0aWYgKG4gPT09IHVuZGVmaW5lZCB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiB2YWx1ZSkpIHtcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG5cdH1cblxuXHQvLyBvdGhlcndpc2UsIHBvcHVsYXRlIGFuIGFycmF5IHdpdGggYG5gIHZhbHVlc1xuXG5cdC8qKiBAdHlwZSB7VFtdfSAqL1xuXHRjb25zdCBhcnJheSA9IFtdO1xuXG5cdGZvciAoY29uc3QgZWxlbWVudCBvZiB2YWx1ZSkge1xuXHRcdGFycmF5LnB1c2goZWxlbWVudCk7XG5cdFx0aWYgKGFycmF5Lmxlbmd0aCA9PT0gbikgYnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59XG4iLCIvKiogQGltcG9ydCB7IEVxdWFscyB9IGZyb20gJyNjbGllbnQnICovXG5cbi8qKiBAdHlwZSB7RXF1YWxzfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09IHRoaXMudjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3Vua25vd259IGFcbiAqIEBwYXJhbSB7dW5rbm93bn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX25vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9IGFcblx0XHQ/IGIgPT0gYlxuXHRcdDogYSAhPT0gYiB8fCAoYSAhPT0gbnVsbCAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcpIHx8IHR5cGVvZiBhID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7dW5rbm93bn0gYVxuICogQHBhcmFtIHt1bmtub3dufSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9PSBiO1xufVxuXG4vKiogQHR5cGUge0VxdWFsc30gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX2VxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gIXNhZmVfbm90X2VxdWFsKHZhbHVlLCB0aGlzLnYpO1xufVxuIiwiLyogVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBzY3JpcHRzL3Byb2Nlc3MtbWVzc2FnZXMvaW5kZXguanMuIERvIG5vdCBlZGl0ISAqL1xuXG5pbXBvcnQgeyBERVYgfSBmcm9tICdlc20tZW52JztcblxuLyoqXG4gKiBVc2luZyBgYmluZDp2YWx1ZWAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgYGJpbmQ6Y2hlY2tlZGAgaW5zdGVhZFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9jaGVja2JveF92YWx1ZVxcblVzaW5nIFxcYGJpbmQ6dmFsdWVcXGAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgXFxgYmluZDpjaGVja2VkXFxgIGluc3RlYWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDb21wb25lbnQgJWNvbXBvbmVudCUgaGFzIGFuIGV4cG9ydCBuYW1lZCBgJWtleSVgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBgYmluZDola2V5JWAsIHdoaWNoIGlzIGRpc2FsbG93ZWQuIEluc3RlYWQsIHVzZSBgYmluZDp0aGlzYCAoZS5nLiBgPCVuYW1lJSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5gKSBhbmQgdGhlbiBhY2Nlc3MgdGhlIHByb3BlcnR5IG9uIHRoZSBib3VuZCBjb21wb25lbnQgaW5zdGFuY2UgKGUuZy4gYGNvbXBvbmVudC4la2V5JWApXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2V4cG9ydChjb21wb25lbnQsIGtleSwgbmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9leHBvcnRcXG5Db21wb25lbnQgJHtjb21wb25lbnR9IGhhcyBhbiBleHBvcnQgbmFtZWQgXFxgJHtrZXl9XFxgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBcXGBiaW5kOiR7a2V5fVxcYCwgd2hpY2ggaXMgZGlzYWxsb3dlZC4gSW5zdGVhZCwgdXNlIFxcYGJpbmQ6dGhpc1xcYCAoZS5nLiBcXGA8JHtuYW1lfSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5cXGApIGFuZCB0aGVuIGFjY2VzcyB0aGUgcHJvcGVydHkgb24gdGhlIGJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZSAoZS5nLiBcXGBjb21wb25lbnQuJHtrZXl9XFxgKVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfaW52YWxpZF9leHBvcnRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2V4cG9ydGApO1xuXHR9XG59XG5cbi8qKlxuICogQSBjb21wb25lbnQgaXMgYXR0ZW1wdGluZyB0byBiaW5kIHRvIGEgbm9uLWJpbmRhYmxlIHByb3BlcnR5IGAla2V5JWAgYmVsb25naW5nIHRvICVjb21wb25lbnQlIChpLmUuIGA8JW5hbWUlIGJpbmQ6JWtleSU9ey4uLn0+YCkuIFRvIG1hcmsgYSBwcm9wZXJ0eSBhcyBiaW5kYWJsZTogYGxldCB7ICVrZXklID0gJGJpbmRhYmxlKCkgfSA9ICRwcm9wcygpYFxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRfbm90X2JpbmRhYmxlKGtleSwgY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9ub3RfYmluZGFibGVcXG5BIGNvbXBvbmVudCBpcyBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYSBub24tYmluZGFibGUgcHJvcGVydHkgXFxgJHtrZXl9XFxgIGJlbG9uZ2luZyB0byAke2NvbXBvbmVudH0gKGkuZS4gXFxgPCR7bmFtZX0gYmluZDoke2tleX09ey4uLn0+XFxgKS4gVG8gbWFyayBhIHByb3BlcnR5IGFzIGJpbmRhYmxlOiBcXGBsZXQgeyAke2tleX0gPSAkYmluZGFibGUoKSB9ID0gJHByb3BzKClcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2FsbGluZyBgJW1ldGhvZCVgIG9uIGEgY29tcG9uZW50IGluc3RhbmNlIChvZiAlY29tcG9uZW50JSkgaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1XG4gKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnRfYXBpX2NoYW5nZWQobWV0aG9kLCBjb21wb25lbnQpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBjb21wb25lbnRfYXBpX2NoYW5nZWRcXG5DYWxsaW5nIFxcYCR7bWV0aG9kfVxcYCBvbiBhIGNvbXBvbmVudCBpbnN0YW5jZSAob2YgJHtjb21wb25lbnR9KSBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDVcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2NoYW5nZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvY29tcG9uZW50X2FwaV9jaGFuZ2VkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0ZWQgdG8gaW5zdGFudGlhdGUgJWNvbXBvbmVudCUgd2l0aCBgbmV3ICVuYW1lJWAsIHdoaWNoIGlzIG5vIGxvbmdlciB2YWxpZCBpbiBTdmVsdGUgNS4gSWYgdGhpcyBjb21wb25lbnQgaXMgbm90IHVuZGVyIHlvdXIgY29udHJvbCwgc2V0IHRoZSBgY29tcGF0aWJpbGl0eS5jb21wb25lbnRBcGlgIGNvbXBpbGVyIG9wdGlvbiB0byBgNGAgdG8ga2VlcCBpdCB3b3JraW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvbmVudF9hcGlfaW52YWxpZF9uZXcoY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgY29tcG9uZW50X2FwaV9pbnZhbGlkX25ld1xcbkF0dGVtcHRlZCB0byBpbnN0YW50aWF0ZSAke2NvbXBvbmVudH0gd2l0aCBcXGBuZXcgJHtuYW1lfVxcYCwgd2hpY2ggaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1LiBJZiB0aGlzIGNvbXBvbmVudCBpcyBub3QgdW5kZXIgeW91ciBjb250cm9sLCBzZXQgdGhlIFxcYGNvbXBhdGliaWxpdHkuY29tcG9uZW50QXBpXFxgIGNvbXBpbGVyIG9wdGlvbiB0byBcXGA0XFxgIHRvIGtlZXAgaXQgd29ya2luZy5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2ludmFsaWRfbmV3YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfaW52YWxpZF9uZXdgKTtcblx0fVxufVxuXG4vKipcbiAqIEEgZGVyaXZlZCB2YWx1ZSBjYW5ub3QgcmVmZXJlbmNlIGl0c2VsZiByZWN1cnNpdmVseVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGYoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGZcXG5BIGRlcml2ZWQgdmFsdWUgY2Fubm90IHJlZmVyZW5jZSBpdHNlbGYgcmVjdXJzaXZlbHlcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXHR9XG59XG5cbi8qKlxuICogS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBgJXZhbHVlJWAgYXQgaW5kZXhlcyAlYSUgYW5kICViJVxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXG4gKiBAcGFyYW0ge3N0cmluZyB8IHVuZGVmaW5lZCB8IG51bGx9IFt2YWx1ZV1cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hfa2V5X2R1cGxpY2F0ZShhLCBiLCB2YWx1ZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVhY2hfa2V5X2R1cGxpY2F0ZVxcbiR7dmFsdWVcblx0XHRcdD8gYEtleWVkIGVhY2ggYmxvY2sgaGFzIGR1cGxpY2F0ZSBrZXkgXFxgJHt2YWx1ZX1cXGAgYXQgaW5kZXhlcyAke2F9IGFuZCAke2J9YFxuXHRcdFx0OiBgS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBhdCBpbmRleGVzICR7YX0gYW5kICR7Yn1gfVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VhY2hfa2V5X2R1cGxpY2F0ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lYWNoX2tleV9kdXBsaWNhdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlcnVuZSVgIGNhbm5vdCBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgY2xlYW51cCBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bmVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF9pbl90ZWFyZG93bihydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWZmZWN0X2luX3RlYXJkb3duXFxuXFxgJHtydW5lfVxcYCBjYW5ub3QgYmUgdXNlZCBpbnNpZGUgYW4gZWZmZWN0IGNsZWFudXAgZnVuY3Rpb25cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdGVhcmRvd25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3RlYXJkb3duYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBFZmZlY3QgY2Fubm90IGJlIGNyZWF0ZWQgaW5zaWRlIGEgYCRkZXJpdmVkYCB2YWx1ZSB0aGF0IHdhcyBub3QgaXRzZWxmIGNyZWF0ZWQgaW5zaWRlIGFuIGVmZmVjdFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkXFxuRWZmZWN0IGNhbm5vdCBiZSBjcmVhdGVkIGluc2lkZSBhIFxcYCRkZXJpdmVkXFxgIHZhbHVlIHRoYXQgd2FzIG5vdCBpdHNlbGYgY3JlYXRlZCBpbnNpZGUgYW4gZWZmZWN0XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJXJ1bmUlYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcbiAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3Rfb3JwaGFuKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3Rfb3JwaGFuXFxuXFxgJHtydW5lfVxcYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3Rfb3JwaGFuYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9vcnBoYW5gKTtcblx0fVxufVxuXG4vKipcbiAqIE1heGltdW0gdXBkYXRlIGRlcHRoIGV4Y2VlZGVkLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBhIHJlYWN0aXZlIGJsb2NrIG9yIGVmZmVjdCByZXBlYXRlZGx5IHNldHMgYSBuZXcgdmFsdWUuIFN2ZWx0ZSBsaW1pdHMgdGhlIG51bWJlciBvZiBuZXN0ZWQgdXBkYXRlcyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RfdXBkYXRlX2RlcHRoX2V4Y2VlZGVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRcXG5NYXhpbXVtIHVwZGF0ZSBkZXB0aCBleGNlZWRlZC4gVGhpcyBjYW4gaGFwcGVuIHdoZW4gYSByZWFjdGl2ZSBibG9jayBvciBlZmZlY3QgcmVwZWF0ZWRseSBzZXRzIGEgbmV3IHZhbHVlLiBTdmVsdGUgbGltaXRzIHRoZSBudW1iZXIgb2YgbmVzdGVkIHVwZGF0ZXMgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZGApO1xuXHR9XG59XG5cbi8qKlxuICogYGdldEFib3J0U2lnbmFsKClgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvbigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBnZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25cXG5cXGBnZXRBYm9ydFNpZ25hbCgpXFxgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBGYWlsZWQgdG8gaHlkcmF0ZSB0aGUgYXBwbGljYXRpb25cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh5ZHJhdGlvbl9mYWlsZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgaHlkcmF0aW9uX2ZhaWxlZFxcbkZhaWxlZCB0byBoeWRyYXRlIHRoZSBhcHBsaWNhdGlvblxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2h5ZHJhdGlvbl9mYWlsZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaHlkcmF0aW9uX2ZhaWxlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ291bGQgbm90IGB7QHJlbmRlcn1gIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIGBudWxsYCBvciBgdW5kZWZpbmVkYC4gQ29uc2lkZXIgdXNpbmcgb3B0aW9uYWwgY2hhaW5pbmcgYHtAcmVuZGVyIHNuaXBwZXQ/LigpfWBcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRfc25pcHBldCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBpbnZhbGlkX3NuaXBwZXRcXG5Db3VsZCBub3QgXFxge0ByZW5kZXJ9XFxgIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIFxcYG51bGxcXGAgb3IgXFxgdW5kZWZpbmVkXFxgLiBDb25zaWRlciB1c2luZyBvcHRpb25hbCBjaGFpbmluZyBcXGB7QHJlbmRlciBzbmlwcGV0Py4oKX1cXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9pbnZhbGlkX3NuaXBwZXRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaW52YWxpZF9zbmlwcGV0YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJW5hbWUlKC4uLilgIGNhbm5vdCBiZSB1c2VkIGluIHJ1bmVzIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWZlY3ljbGVfbGVnYWN5X29ubHkobmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGxpZmVjeWNsZV9sZWdhY3lfb25seVxcblxcYCR7bmFtZX0oLi4uKVxcYCBjYW5ub3QgYmUgdXNlZCBpbiBydW5lcyBtb2RlXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2xpZmVjeWNsZV9sZWdhY3lfb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IGRvIGBiaW5kOiVrZXklPXt1bmRlZmluZWR9YCB3aGVuIGAla2V5JWAgaGFzIGEgZmFsbGJhY2sgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3BzX2ludmFsaWRfdmFsdWUoa2V5KSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcHJvcHNfaW52YWxpZF92YWx1ZVxcbkNhbm5vdCBkbyBcXGBiaW5kOiR7a2V5fT17dW5kZWZpbmVkfVxcYCB3aGVuIFxcYCR7a2V5fVxcYCBoYXMgYSBmYWxsYmFjayB2YWx1ZVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX2ludmFsaWRfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfaW52YWxpZF92YWx1ZWApO1xuXHR9XG59XG5cbi8qKlxuICogUmVzdCBlbGVtZW50IHByb3BlcnRpZXMgb2YgYCRwcm9wcygpYCBzdWNoIGFzIGAlcHJvcGVydHklYCBhcmUgcmVhZG9ubHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcHNfcmVzdF9yZWFkb25seShwcm9wZXJ0eSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYHByb3BzX3Jlc3RfcmVhZG9ubHlcXG5SZXN0IGVsZW1lbnQgcHJvcGVydGllcyBvZiBcXGAkcHJvcHMoKVxcYCBzdWNoIGFzIFxcYCR7cHJvcGVydHl9XFxgIGFyZSByZWFkb25seVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX3Jlc3RfcmVhZG9ubHlgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfcmVzdF9yZWFkb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogVGhlIGAlcnVuZSVgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIGAuc3ZlbHRlYCBhbmQgYC5zdmVsdGUuanMvdHNgIGZpbGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuZV9vdXRzaWRlX3N2ZWx0ZShydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcnVuZV9vdXRzaWRlX3N2ZWx0ZVxcblRoZSBcXGAke3J1bmV9XFxgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIFxcYC5zdmVsdGVcXGAgYW5kIFxcYC5zdmVsdGUuanMvdHNcXGAgZmlsZXNcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9ydW5lX291dHNpZGVfc3ZlbHRlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3J1bmVfb3V0c2lkZV9zdmVsdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIFByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gYCRzdGF0ZWAgb2JqZWN0cyBtdXN0IGNvbnRhaW4gYHZhbHVlYCBhbmQgYWx3YXlzIGJlIGBlbnVtZXJhYmxlYCwgYGNvbmZpZ3VyYWJsZWAgYW5kIGB3cml0YWJsZWAuXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZFxcblByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gXFxgJHN0YXRlXFxgIG9iamVjdHMgbXVzdCBjb250YWluIFxcYHZhbHVlXFxgIGFuZCBhbHdheXMgYmUgXFxgZW51bWVyYWJsZVxcYCwgXFxgY29uZmlndXJhYmxlXFxgIGFuZCBcXGB3cml0YWJsZVxcYC5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgYCRzdGF0ZWAgb2JqZWN0XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9wcm90b3R5cGVfZml4ZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfcHJvdG90eXBlX2ZpeGVkXFxuQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgXFxgJHN0YXRlXFxgIG9iamVjdFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Byb3RvdHlwZV9maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9wcm90b3R5cGVfZml4ZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIFVwZGF0aW5nIHN0YXRlIGluc2lkZSBgJGRlcml2ZWQoLi4uKWAsIGAkaW5zcGVjdCguLi4pYCBvciBhIHRlbXBsYXRlIGV4cHJlc3Npb24gaXMgZm9yYmlkZGVuLiBJZiB0aGUgdmFsdWUgc2hvdWxkIG5vdCBiZSByZWFjdGl2ZSwgZGVjbGFyZSBpdCB3aXRob3V0IGAkc3RhdGVgXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV91bnNhZmVfbXV0YXRpb24oKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfdW5zYWZlX211dGF0aW9uXFxuVXBkYXRpbmcgc3RhdGUgaW5zaWRlIFxcYCRkZXJpdmVkKC4uLilcXGAsIFxcYCRpbnNwZWN0KC4uLilcXGAgb3IgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGlzIGZvcmJpZGRlbi4gSWYgdGhlIHZhbHVlIHNob3VsZCBub3QgYmUgcmVhY3RpdmUsIGRlY2xhcmUgaXQgd2l0aG91dCBcXGAkc3RhdGVcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV91bnNhZmVfbXV0YXRpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2Uvc3RhdGVfdW5zYWZlX211dGF0aW9uYCk7XG5cdH1cbn0iLCIvKiogQGltcG9ydCB7IENvbXBvbmVudENvbnRleHQsIENvbXBvbmVudENvbnRleHRMZWdhY3kgfSBmcm9tICcjY2xpZW50JyAqL1xuLyoqIEBpbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuL2luZGV4LmpzJyAqL1xuLyoqIEBpbXBvcnQgeyBOb3RGdW5jdGlvbiB9IGZyb20gJy4vaW50ZXJuYWwvdHlwZXMuanMnICovXG5pbXBvcnQgeyBhY3RpdmVfcmVhY3Rpb24sIHVudHJhY2sgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9ydW50aW1lLmpzJztcbmltcG9ydCB7IGlzX2FycmF5IH0gZnJvbSAnLi9pbnRlcm5hbC9zaGFyZWQvdXRpbHMuanMnO1xuaW1wb3J0IHsgdXNlcl9lZmZlY3QgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9pbmRleC5qcyc7XG5pbXBvcnQgKiBhcyBlIGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZC9lcnJvcnMuanMnO1xuaW1wb3J0IHsgbGVnYWN5X21vZGVfZmxhZyB9IGZyb20gJy4vaW50ZXJuYWwvZmxhZ3MvaW5kZXguanMnO1xuaW1wb3J0IHsgY29tcG9uZW50X2NvbnRleHQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9jb250ZXh0LmpzJztcbmltcG9ydCB7IERFViB9IGZyb20gJ2VzbS1lbnYnO1xuXG5pZiAoREVWKSB7XG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuXHQgKi9cblx0ZnVuY3Rpb24gdGhyb3dfcnVuZV9lcnJvcihydW5lKSB7XG5cdFx0aWYgKCEocnVuZSBpbiBnbG9iYWxUaGlzKSkge1xuXHRcdFx0Ly8gVE9ETyBpZiBwZW9wbGUgc3RhcnQgYWRqdXN0aW5nIHRoZSBcInRoaXMgY2FuIGNvbnRhaW4gcnVuZXNcIiBjb25maWcgdGhyb3VnaCB2LXAtcyBtb3JlLCBhZGp1c3QgdGhpcyBtZXNzYWdlXG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi9cblx0XHRcdGxldCB2YWx1ZTsgLy8gbGV0J3MgaG9wZSBub29uZSBtb2RpZmllcyB0aGlzIGdsb2JhbCwgYnV0IGJlbHRzIGFuZCBicmFjZXNcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCBydW5lLCB7XG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdldHRlci1yZXR1cm5cblx0XHRcdFx0Z2V0OiAoKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlLnJ1bmVfb3V0c2lkZV9zdmVsdGUocnVuZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldDogKHYpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IHY7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHRocm93X3J1bmVfZXJyb3IoJyRzdGF0ZScpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckZWZmZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRkZXJpdmVkJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRpbnNwZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRwcm9wcycpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckYmluZGFibGUnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFtgQWJvcnRTaWduYWxgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRTaWduYWwpIHRoYXQgYWJvcnRzIHdoZW4gdGhlIGN1cnJlbnQgW2Rlcml2ZWRdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZGVyaXZlZCkgb3IgW2VmZmVjdF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIHJlLXJ1bnMgb3IgaXMgZGVzdHJveWVkLlxuICpcbiAqIE11c3QgYmUgY2FsbGVkIHdoaWxlIGEgZGVyaXZlZCBvciBlZmZlY3QgaXMgcnVubmluZy5cbiAqXG4gKiBgYGBzdmVsdGVcbiAqIDxzY3JpcHQ+XG4gKiBcdGltcG9ydCB7IGdldEFib3J0U2lnbmFsIH0gZnJvbSAnc3ZlbHRlJztcbiAqXG4gKiBcdGxldCB7IGlkIH0gPSAkcHJvcHMoKTtcbiAqXG4gKiBcdGFzeW5jIGZ1bmN0aW9uIGdldERhdGEoaWQpIHtcbiAqIFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvaXRlbXMvJHtpZH1gLCB7XG4gKiBcdFx0XHRzaWduYWw6IGdldEFib3J0U2lnbmFsKClcbiAqIFx0XHR9KTtcbiAqXG4gKiBcdFx0cmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAqIFx0fVxuICpcbiAqIFx0Y29uc3QgZGF0YSA9ICRkZXJpdmVkKGF3YWl0IGdldERhdGEoaWQpKTtcbiAqIDwvc2NyaXB0PlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm9ydFNpZ25hbCgpIHtcblx0aWYgKGFjdGl2ZV9yZWFjdGlvbiA9PT0gbnVsbCkge1xuXHRcdGUuZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uKCk7XG5cdH1cblxuXHRyZXR1cm4gKGFjdGl2ZV9yZWFjdGlvbi5hYyA/Pz0gbmV3IEFib3J0Q29udHJvbGxlcigpKS5zaWduYWw7XG59XG5cbi8qKlxuICogYG9uTW91bnRgLCBsaWtlIFtgJGVmZmVjdGBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0KSwgc2NoZWR1bGVzIGEgZnVuY3Rpb24gdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBVbmxpa2UgYCRlZmZlY3RgLCB0aGUgcHJvdmlkZWQgZnVuY3Rpb24gb25seSBydW5zIG9uY2UuXG4gKlxuICogSXQgbXVzdCBiZSBjYWxsZWQgZHVyaW5nIHRoZSBjb21wb25lbnQncyBpbml0aWFsaXNhdGlvbiAoYnV0IGRvZXNuJ3QgbmVlZCB0byBsaXZlIF9pbnNpZGVfIHRoZSBjb21wb25lbnQ7XG4gKiBpdCBjYW4gYmUgY2FsbGVkIGZyb20gYW4gZXh0ZXJuYWwgbW9kdWxlKS4gSWYgYSBmdW5jdGlvbiBpcyByZXR1cm5lZCBfc3luY2hyb25vdXNseV8gZnJvbSBgb25Nb3VudGAsXG4gKiBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBmdW5jdGlvbnMgZG8gbm90IHJ1biBkdXJpbmcgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL3N2ZWx0ZS1zZXJ2ZXIjcmVuZGVyKS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHsoKSA9PiBOb3RGdW5jdGlvbjxUPiB8IFByb21pc2U8Tm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbk1vdW50Jyk7XG5cdH1cblxuXHRpZiAobGVnYWN5X21vZGVfZmxhZyAmJiBjb21wb25lbnRfY29udGV4dC5sICE9PSBudWxsKSB7XG5cdFx0aW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbXBvbmVudF9jb250ZXh0KS5tLnB1c2goZm4pO1xuXHR9IGVsc2Uge1xuXHRcdHVzZXJfZWZmZWN0KCgpID0+IHtcblx0XHRcdGNvbnN0IGNsZWFudXAgPSB1bnRyYWNrKGZuKTtcblx0XHRcdGlmICh0eXBlb2YgY2xlYW51cCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIC8qKiBAdHlwZSB7KCkgPT4gdm9pZH0gKi8gKGNsZWFudXApO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHVubW91bnRlZC5cbiAqXG4gKiBPdXQgb2YgYG9uTW91bnRgLCBgYmVmb3JlVXBkYXRlYCwgYGFmdGVyVXBkYXRlYCBhbmQgYG9uRGVzdHJveWAsIHRoaXMgaXMgdGhlXG4gKiBvbmx5IG9uZSB0aGF0IHJ1bnMgaW5zaWRlIGEgc2VydmVyLXNpZGUgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7KCkgPT4gYW55fSBmblxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbkRlc3Ryb3koZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbkRlc3Ryb3knKTtcblx0fVxuXG5cdG9uTW91bnQoKCkgPT4gKCkgPT4gdW50cmFjayhmbikpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHthbnl9cGFyYW1zXzBcbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlX2N1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBldmVudCBkaXNwYXRjaGVyIHRoYXQgY2FuIGJlIHVzZWQgdG8gZGlzcGF0Y2ggW2NvbXBvbmVudCBldmVudHNdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS9sZWdhY3ktb24jQ29tcG9uZW50LWV2ZW50cykuXG4gKiBFdmVudCBkaXNwYXRjaGVycyBhcmUgZnVuY3Rpb25zIHRoYXQgY2FuIHRha2UgdHdvIGFyZ3VtZW50czogYG5hbWVgIGFuZCBgZGV0YWlsYC5cbiAqXG4gKiBDb21wb25lbnQgZXZlbnRzIGNyZWF0ZWQgd2l0aCBgY3JlYXRlRXZlbnREaXNwYXRjaGVyYCBjcmVhdGUgYVxuICogW0N1c3RvbUV2ZW50XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQpLlxuICogVGhlc2UgZXZlbnRzIGRvIG5vdCBbYnViYmxlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0xlYXJuL0phdmFTY3JpcHQvQnVpbGRpbmdfYmxvY2tzL0V2ZW50cyNFdmVudF9idWJibGluZ19hbmRfY2FwdHVyZSkuXG4gKiBUaGUgYGRldGFpbGAgYXJndW1lbnQgY29ycmVzcG9uZHMgdG8gdGhlIFtDdXN0b21FdmVudC5kZXRhaWxdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC9kZXRhaWwpXG4gKiBwcm9wZXJ0eSBhbmQgY2FuIGNvbnRhaW4gYW55IHR5cGUgb2YgZGF0YS5cbiAqXG4gKiBUaGUgZXZlbnQgZGlzcGF0Y2hlciBjYW4gYmUgdHlwZWQgdG8gbmFycm93IHRoZSBhbGxvd2VkIGV2ZW50IG5hbWVzIGFuZCB0aGUgdHlwZSBvZiB0aGUgYGRldGFpbGAgYXJndW1lbnQ6XG4gKiBgYGB0c1xuICogY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXI8e1xuICogIGxvYWRlZDogbnVsbDsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogQGRlcHJlY2F0ZWQgVXNlIGNhbGxiYWNrIHByb3BzIGFuZC9vciB0aGUgYCRob3N0KClgIHJ1bmUgaW5zdGVhZCDigJQgc2VlIFttaWdyYXRpb24gZ3VpZGVdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS92NS1taWdyYXRpb24tZ3VpZGUjRXZlbnQtY2hhbmdlcy1Db21wb25lbnQtZXZlbnRzKVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXAgPSBhbnldXG4gKiBAcmV0dXJucyB7RXZlbnREaXNwYXRjaGVyPEV2ZW50TWFwPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpIHtcblx0Y29uc3QgYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0ID0gY29tcG9uZW50X2NvbnRleHQ7XG5cdGlmIChhY3RpdmVfY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2NyZWF0ZUV2ZW50RGlzcGF0Y2hlcicpO1xuXHR9XG5cblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBldmVudHMgPSAvKiogQHR5cGUge1JlY29yZDxzdHJpbmcsIEZ1bmN0aW9uIHwgRnVuY3Rpb25bXT59ICovIChcblx0XHRcdGFjdGl2ZV9jb21wb25lbnRfY29udGV4dC5zLiQkZXZlbnRzXG5cdFx0KT8uWy8qKiBAdHlwZSB7YW55fSAqLyAodHlwZSldO1xuXG5cdFx0aWYgKGV2ZW50cykge1xuXHRcdFx0Y29uc3QgY2FsbGJhY2tzID0gaXNfYXJyYXkoZXZlbnRzKSA/IGV2ZW50cy5zbGljZSgpIDogW2V2ZW50c107XG5cdFx0XHQvLyBUT0RPIGFyZSB0aGVyZSBzaXR1YXRpb25zIHdoZXJlIGV2ZW50cyBjb3VsZCBiZSBkaXNwYXRjaGVkXG5cdFx0XHQvLyBpbiBhIHNlcnZlciAobm9uLURPTSkgZW52aXJvbm1lbnQ/XG5cdFx0XHRjb25zdCBldmVudCA9IGNyZWF0ZV9jdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCBvcHRpb25zKTtcblx0XHRcdGZvciAoY29uc3QgZm4gb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRcdGZuLmNhbGwoYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0LngsIGV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcbn1cblxuLy8gVE9ETyBtYXJrIGJlZm9yZVVwZGF0ZSBhbmQgYWZ0ZXJVcGRhdGUgYXMgZGVwcmVjYXRlZCBpbiBTdmVsdGUgNlxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgLlxuICpcbiAqIEluIHJ1bmVzIG1vZGUgdXNlIGAkZWZmZWN0LnByZWAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0LnByZWBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0IyRlZmZlY3QucHJlKSBpbnN0ZWFkXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2JlZm9yZVVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYmVmb3JlVXBkYXRlJyk7XG5cdH1cblxuXHRpbml0X3VwZGF0ZV9jYWxsYmFja3MoY29tcG9uZW50X2NvbnRleHQpLmIucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YC5cbiAqXG4gKiBJbiBydW5lcyBtb2RlIHVzZSBgJGVmZmVjdGAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0YF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIGluc3RlYWRcbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWZ0ZXJVcGRhdGUoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdhZnRlclVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYWZ0ZXJVcGRhdGUnKTtcblx0fVxuXG5cdGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb21wb25lbnRfY29udGV4dCkuYS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBMZWdhY3ktbW9kZTogSW5pdCBjYWxsYmFja3Mgb2JqZWN0IGZvciBvbk1vdW50L2JlZm9yZVVwZGF0ZS9hZnRlclVwZGF0ZVxuICogQHBhcmFtIHtDb21wb25lbnRDb250ZXh0fSBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb250ZXh0KSB7XG5cdHZhciBsID0gLyoqIEB0eXBlIHtDb21wb25lbnRDb250ZXh0TGVnYWN5fSAqLyAoY29udGV4dCkubDtcblx0cmV0dXJuIChsLnUgPz89IHsgYTogW10sIGI6IFtdLCBtOiBbXSB9KTtcbn1cblxuZXhwb3J0IHsgZmx1c2hTeW5jIH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvcnVudGltZS5qcyc7XG5leHBvcnQgeyBnZXRDb250ZXh0LCBnZXRBbGxDb250ZXh0cywgaGFzQ29udGV4dCwgc2V0Q29udGV4dCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2NvbnRleHQuanMnO1xuZXhwb3J0IHsgaHlkcmF0ZSwgbW91bnQsIHVubW91bnQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9yZW5kZXIuanMnO1xuZXhwb3J0IHsgdGljaywgdW50cmFjayB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3J1bnRpbWUuanMnO1xuZXhwb3J0IHsgY3JlYXRlUmF3U25pcHBldCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2RvbS9ibG9ja3Mvc25pcHBldC5qcyc7XG4iLCIvKiogQGltcG9ydCB7IFJlYWRhYmxlLCBTdGFydFN0b3BOb3RpZmllciwgU3Vic2NyaWJlciwgVW5zdWJzY3JpYmVyLCBVcGRhdGVyLCBXcml0YWJsZSB9IGZyb20gJy4uL3B1YmxpYy5qcycgKi9cbi8qKiBAaW1wb3J0IHsgU3RvcmVzLCBTdG9yZXNWYWx1ZXMsIFN1YnNjcmliZUludmFsaWRhdGVUdXBsZSB9IGZyb20gJy4uL3ByaXZhdGUuanMnICovXG5pbXBvcnQgeyBub29wLCBydW5fYWxsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzJztcbmltcG9ydCB7IHNhZmVfbm90X2VxdWFsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMnO1xuaW1wb3J0IHsgc3Vic2NyaWJlX3RvX3N0b3JlIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG4vKipcbiAqIEB0eXBlIHtBcnJheTxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8YW55PiB8IGFueT59XG4gKi9cbmNvbnN0IHN1YnNjcmliZXJfcXVldWUgPSBbXTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI8VD59IFtzdGFydF1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlKHZhbHVlLCBzdGFydCkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogd3JpdGFibGUodmFsdWUsIHN0YXJ0KS5zdWJzY3JpYmVcblx0fTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgV3JpdGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIGJvdGggdXBkYXRpbmcgYW5kIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1R9IFt2YWx1ZV0gaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcjxUPn0gW3N0YXJ0XVxuICogQHJldHVybnMge1dyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge1Vuc3Vic2NyaWJlciB8IG51bGx9ICovXG5cdGxldCBzdG9wID0gbnVsbDtcblxuXHQvKiogQHR5cGUge1NldDxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8VD4+fSAqL1xuXHRjb25zdCBzdWJzY3JpYmVycyA9IG5ldyBTZXQoKTtcblxuXHQvKipcblx0ICogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1VwZGF0ZXI8VD59IGZuXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG5cdFx0c2V0KGZuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7U3Vic2NyaWJlcjxUPn0gcnVuXG5cdCAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2ludmFsaWRhdGVdXG5cdCAqIEByZXR1cm5zIHtVbnN1YnNjcmliZXJ9XG5cdCAqL1xuXHRmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuXHRcdC8qKiBAdHlwZSB7U3Vic2NyaWJlSW52YWxpZGF0ZVR1cGxlPFQ+fSAqL1xuXHRcdGNvbnN0IHN1YnNjcmliZXIgPSBbcnVuLCBpbnZhbGlkYXRlXTtcblx0XHRzdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJzLnNpemUgPT09IDEpIHtcblx0XHRcdHN0b3AgPSBzdGFydChzZXQsIHVwZGF0ZSkgfHwgbm9vcDtcblx0XHR9XG5cdFx0cnVuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBTdG9yZXNWYWx1ZXM8Uz4sIHNldDogKHZhbHVlOiBUKSA9PiB2b2lkLCB1cGRhdGU6IChmbjogVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gVW5zdWJzY3JpYmVyIHwgdm9pZH0gZm5cbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdXG4gKiBAcmV0dXJucyB7UmVhZGFibGU8VD59XG4gKi9cbi8qKlxuICogRGVyaXZlZCB2YWx1ZSBzdG9yZSBieSBzeW5jaHJvbml6aW5nIG9uZSBvciBtb3JlIHJlYWRhYmxlIHN0b3JlcyBhbmRcbiAqIGFwcGx5aW5nIGFuIGFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIG92ZXIgaXRzIGlucHV0IHZhbHVlcy5cbiAqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBvdmVybG9hZFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7KHZhbHVlczogU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuLyoqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7U30gc3RvcmVzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PFJlYWRhYmxlPGFueT4+fSAqL1xuXHRjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGUgPyBbc3RvcmVzXSA6IHN0b3Jlcztcblx0aWYgKCFzdG9yZXNfYXJyYXkuZXZlcnkoQm9vbGVhbikpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2Rlcml2ZWQoKSBleHBlY3RzIHN0b3JlcyBhcyBpbnB1dCwgZ290IGEgZmFsc3kgdmFsdWUnKTtcblx0fVxuXHRjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcblx0cmV0dXJuIHJlYWRhYmxlKGluaXRpYWxfdmFsdWUsIChzZXQsIHVwZGF0ZSkgPT4ge1xuXHRcdGxldCBzdGFydGVkID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtUW119ICovXG5cdFx0Y29uc3QgdmFsdWVzID0gW107XG5cdFx0bGV0IHBlbmRpbmcgPSAwO1xuXHRcdGxldCBjbGVhbnVwID0gbm9vcDtcblx0XHRjb25zdCBzeW5jID0gKCkgPT4ge1xuXHRcdFx0aWYgKHBlbmRpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQsIHVwZGF0ZSk7XG5cdFx0XHRpZiAoYXV0bykge1xuXHRcdFx0XHRzZXQocmVzdWx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNsZWFudXAgPSB0eXBlb2YgcmVzdWx0ID09PSAnZnVuY3Rpb24nID8gcmVzdWx0IDogbm9vcDtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGNvbnN0IHVuc3Vic2NyaWJlcnMgPSBzdG9yZXNfYXJyYXkubWFwKChzdG9yZSwgaSkgPT5cblx0XHRcdHN1YnNjcmliZV90b19zdG9yZShcblx0XHRcdFx0c3RvcmUsXG5cdFx0XHRcdCh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlc1tpXSA9IHZhbHVlO1xuXHRcdFx0XHRcdHBlbmRpbmcgJj0gfigxIDw8IGkpO1xuXHRcdFx0XHRcdGlmIChzdGFydGVkKSB7XG5cdFx0XHRcdFx0XHRzeW5jKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0cGVuZGluZyB8PSAxIDw8IGk7XG5cdFx0XHRcdH1cblx0XHRcdClcblx0XHQpO1xuXHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdHN5bmMoKTtcblx0XHRyZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRcdHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG5cdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHQvLyBXZSBuZWVkIHRvIHNldCB0aGlzIHRvIGZhbHNlIGJlY2F1c2UgY2FsbGJhY2tzIGNhbiBzdGlsbCBoYXBwZW4gZGVzcGl0ZSBoYXZpbmcgdW5zdWJzY3JpYmVkOlxuXHRcdFx0Ly8gQ2FsbGJhY2tzIG1pZ2h0IGFscmVhZHkgYmUgcGxhY2VkIGluIHRoZSBxdWV1ZSB3aGljaCBkb2Vzbid0IGtub3cgaXQgc2hvdWxkIG5vIGxvbmdlclxuXHRcdFx0Ly8gaW52b2tlIHRoaXMgZGVyaXZlZCBzdG9yZS5cblx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcblx0XHR9O1xuXHR9KTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHN0b3JlIGFuZCByZXR1cm5zIGEgbmV3IG9uZSBkZXJpdmVkIGZyb20gdGhlIG9sZCBvbmUgdGhhdCBpcyByZWFkYWJsZS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtSZWFkYWJsZTxUPn0gc3RvcmUgIC0gc3RvcmUgdG8gbWFrZSByZWFkb25seVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZG9ubHkoc3RvcmUpIHtcblx0cmV0dXJuIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIFRPRE8gaSBzdXNwZWN0IHRoZSBiaW5kIGlzIHVubmVjZXNzYXJ5XG5cdFx0c3Vic2NyaWJlOiBzdG9yZS5zdWJzY3JpYmUuYmluZChzdG9yZSlcblx0fTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgZnJvbSBhIHN0b3JlIGJ5IHN1YnNjcmliaW5nIGFuZCBpbW1lZGlhdGVseSB1bnN1YnNjcmliaW5nLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1JlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmVfdG9fc3RvcmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0Ly8gQHRzLWV4cGVjdC1lcnJvclxuXHRyZXR1cm4gdmFsdWU7XG59XG4iLCJpbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xyXG5cclxuLyoqXHJcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdHVzIG9mIHRoZSBhcHBsaWNhdGlvbi5cclxuICovXHJcbmV4cG9ydCB0eXBlIFN5bmNTdGF0dXMgPSAnaWRsZScgfCAnc3luY2luZycgfCAnc3luY2VkJyB8ICdlcnJvcicgfCAndW5hdXRoZW50aWNhdGVkJztcclxuXHJcbi8qKlxyXG4gKiBSZXByZXNlbnRzIHRoZSBzeW5jIHN0YXRlIGluZm9ybWF0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBTeW5jU3RhdGUge1xyXG4gIHN0YXR1czogU3luY1N0YXR1cztcclxuICBsYXN0U3luY1RpbWU/OiBudW1iZXI7XHJcbiAgbGFzdEVycm9yTWVzc2FnZT86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBtYWluIGRhdGEgc3RydWN0dXJlIGZvciB0aGUgYXBwbGljYXRpb24ncyBzdG9yYWdlLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBBcHBEYXRhIHtcclxuICBmb2xkZXJzOiBGb2xkZXJbXTtcclxuICB0YWdzOiBUYWdbXTtcclxuICAvLyBCb29rbWFya3Mgd2lsbCBiZSBuZXN0ZWQgd2l0aGluIGZvbGRlcnMsIGJ1dCB3ZSBjYW4gaGF2ZSBhIGZsYXQgbGlzdCBmb3IgZWFzeSBhY2Nlc3MgaWYgbmVlZGVkLlxyXG59XHJcblxyXG5jb25zdCBTVE9SQUdFX0tFWSA9ICdhcHBEYXRhJztcclxuY29uc3QgU1lOQ19TVEFUVVNfS0VZID0gJ3N5bmNTdGF0dXMnO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBkZWZhdWx0IHN0YXRlIG9mIHRoZSBhcHBsaWNhdGlvbiBkYXRhLlxyXG4gKi9cclxuY29uc3QgZGVmYXVsdERhdGE6IEFwcERhdGEgPSB7XHJcbiAgZm9sZGVyczogW1xyXG4gICAge1xyXG4gICAgICBpZDogJ3Jvb3QnLFxyXG4gICAgICBuYW1lOiAnUm9vdCcsXHJcbiAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgfVxyXG4gIF0sXHJcbiAgdGFnczogW10sXHJcbn07XHJcblxyXG4vKipcclxuICogUmV0cmlldmVzIGFsbCBhcHBsaWNhdGlvbiBkYXRhIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXHJcbiAqIElmIG5vIGRhdGEgaXMgZm91bmQsIGl0IGluaXRpYWxpemVzIHdpdGggdGhlIGRlZmF1bHQgc3RydWN0dXJlLlxyXG4gKlxyXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgQXBwRGF0YSBvYmplY3QuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwRGF0YSgpOiBQcm9taXNlPEFwcERhdGE+IHtcclxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoU1RPUkFHRV9LRVkpO1xyXG4gIGlmIChyZXN1bHRbU1RPUkFHRV9LRVldKSB7XHJcbiAgICByZXR1cm4gcmVzdWx0W1NUT1JBR0VfS0VZXSBhcyBBcHBEYXRhO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBJbml0aWFsaXplIHN0b3JhZ2Ugd2l0aCBkZWZhdWx0IGRhdGEgaWYgaXQncyB0aGUgZmlyc3QgcnVuXHJcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGRlZmF1bHREYXRhKTtcclxuICAgIHJldHVybiBkZWZhdWx0RGF0YTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYXZlcyB0aGUgZW50aXJlIGFwcGxpY2F0aW9uIGRhdGEgb2JqZWN0IHRvIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxyXG4gKlxyXG4gKiBAcGFyYW0gZGF0YSBUaGUgQXBwRGF0YSBvYmplY3QgdG8gc2F2ZS5cclxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgZGF0YSBpcyBzYXZlZC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRBcHBEYXRhKGRhdGE6IEFwcERhdGEpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVldOiBkYXRhIH0pO1xyXG59XHJcblxyXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBGb2xkZXJzIC0tLVxyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgZm9sZGVyIHRvIGEgcGFyZW50IGZvbGRlci5cclxuICogQHBhcmFtIHBhcmVudEZvbGRlcklkIFRoZSBJRCBvZiB0aGUgcGFyZW50IGZvbGRlci5cclxuICogQHBhcmFtIG5ld0ZvbGRlciBUaGUgZm9sZGVyIG9iamVjdCB0byBhZGQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRm9sZGVyKHBhcmVudEZvbGRlcklkOiBzdHJpbmcsIG5ld0ZvbGRlcjogT21pdDxGb2xkZXIsICdpZCcgfCAnY2hpbGRyZW4nIHwgJ2NyZWF0ZWRBdCc+KTogUHJvbWlzZTxGb2xkZXI+IHtcclxuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGNyZWF0ZWRGb2xkZXI6IEZvbGRlciA9IHtcclxuICAgICAgICAuLi5uZXdGb2xkZXIsXHJcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXHJcbiAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBzZWFyY2guIEEgcmVjdXJzaXZlIHNlYXJjaCB3b3VsZCBiZSBiZXR0ZXIuXHJcbiAgICBjb25zdCBwYXJlbnQgPSBmaW5kRm9sZGVyQnlJZChhcHBEYXRhLmZvbGRlcnMsIHBhcmVudEZvbGRlcklkKTtcclxuXHJcbiAgICBpZiAocGFyZW50KSB7XHJcbiAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goY3JlYXRlZEZvbGRlcik7XHJcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICByZXR1cm4gY3JlYXRlZEZvbGRlcjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJlbnQgZm9sZGVyIHdpdGggaWQgJHtwYXJlbnRGb2xkZXJJZH0gbm90IGZvdW5kLmApO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZmluZCBhIGZvbGRlciByZWN1cnNpdmVseVxyXG5mdW5jdGlvbiBmaW5kRm9sZGVyQnlJZChmb2xkZXJzOiBGb2xkZXJbXSwgaWQ6IHN0cmluZyk6IEZvbGRlciB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xyXG4gICAgICAgIGlmIChmb2xkZXIuaWQgPT09IGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmb2xkZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEZvbGRlckJ5SWQoZm9sZGVyLmNoaWxkcmVuLmZpbHRlcihjID0+ICdjaGlsZHJlbicgaW4gYykgYXMgRm9sZGVyW10sIGlkKTtcclxuICAgICAgICBpZiAoZm91bmQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBCb29rbWFya3MgLS0tXHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBib29rbWFyayB0byBhIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBwYXJlbnRGb2xkZXJJZCBUaGUgSUQgb2YgdGhlIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBuZXdCb29rbWFyayBUaGUgYm9va21hcmsgb2JqZWN0IHRvIGFkZC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRCb29rbWFyayhwYXJlbnRGb2xkZXJJZDogc3RyaW5nLCBuZXdCb29rbWFyazogT21pdDxCb29rbWFya0l0ZW0sICdpZCcgfCAnY3JlYXRlZEF0JyB8ICdhY2Nlc3NIaXN0b3J5Jz4pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuXHJcbiAgICAvLyBHZXQgaGlzdG9yeSBmb3IgdGhlIFVSTFxyXG4gICAgY29uc3QgdmlzaXRzID0gYXdhaXQgY2hyb21lLmhpc3RvcnkuZ2V0VmlzaXRzKHsgdXJsOiBuZXdCb29rbWFyay51cmwgfSk7XHJcbiAgICBjb25zdCBhY2Nlc3NIaXN0b3J5OiBBY2Nlc3NSZWNvcmRbXSA9IHZpc2l0cy5tYXAodmlzaXQgPT4gKHtcclxuICAgICAgICB0aW1lc3RhbXA6IHZpc2l0LnZpc2l0VGltZSFcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVkQm9va21hcms6IEJvb2ttYXJrSXRlbSA9IHtcclxuICAgICAgICAuLi5uZXdCb29rbWFyayxcclxuICAgICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcclxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgYWNjZXNzSGlzdG9yeTogYWNjZXNzSGlzdG9yeSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcGFyZW50ID0gZmluZEZvbGRlckJ5SWQoYXBwRGF0YS5mb2xkZXJzLCBwYXJlbnRGb2xkZXJJZCk7XHJcblxyXG4gICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNyZWF0ZWRCb29rbWFyayk7XHJcblxyXG4gICAgICAgIC8vIElmIGEgcmVtaW5kZXIgaXMgc2V0LCBjcmVhdGUgYSBDaHJvbWUgYWxhcm1cclxuICAgICAgICBpZiAoY3JlYXRlZEJvb2ttYXJrLnJlbWluZGVyKSB7XHJcbiAgICAgICAgICAgIGNocm9tZS5hbGFybXMuY3JlYXRlKGByZW1pbmRlci0ke2NyZWF0ZWRCb29rbWFyay5pZH1gLCB7XHJcbiAgICAgICAgICAgICAgICB3aGVuOiBjcmVhdGVkQm9va21hcmsucmVtaW5kZXIsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICByZXR1cm4gY3JlYXRlZEJvb2ttYXJrO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmVudCBmb2xkZXIgd2l0aCBpZCAke3BhcmVudEZvbGRlcklkfSBub3QgZm91bmQuYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIC0tLSBDUlVEIE9wZXJhdGlvbnMgZm9yIFRhZ3MgLS0tXHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyB0YWcgdG8gdGhlIGFwcGxpY2F0aW9uIGRhdGEuXHJcbiAqIEBwYXJhbSBuZXdUYWcgVGhlIHRhZyBvYmplY3QgdG8gYWRkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFRhZyhuZXdUYWc6IE9taXQ8VGFnLCAnaWQnPik6IFByb21pc2U8VGFnPiB7XHJcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZWRUYWc6IFRhZyA9IHtcclxuICAgICAgICAuLi5uZXdUYWcsXHJcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSB0YWcgbmFtZXNcclxuICAgIGlmIChhcHBEYXRhLnRhZ3Muc29tZSh0YWcgPT4gdGFnLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gY3JlYXRlZFRhZy5uYW1lLnRvTG93ZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYWcgd2l0aCBuYW1lIFwiJHtjcmVhdGVkVGFnLm5hbWV9XCIgYWxyZWFkeSBleGlzdHMuYCk7XHJcbiAgICB9XHJcblxyXG4gICAgYXBwRGF0YS50YWdzLnB1c2goY3JlYXRlZFRhZyk7XHJcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xyXG4gICAgcmV0dXJuIGNyZWF0ZWRUYWc7XHJcbn1cclxuXHJcbi8vIC0tLSBIZWxwZXIgZnVuY3Rpb25zIHRvIGZpbmQgaXRlbXMgLS0tXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb2ttYXJrQnlJZChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgaWQ6IHN0cmluZyk6IEJvb2ttYXJrSXRlbSB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kQm9va21hcmtCeUlkKG5vZGUuY2hpbGRyZW4sIGlkKTtcclxuICAgICAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XHJcbiAgICAgICAgfSBlbHNlIHsgLy8gQm9va21hcmtJdGVtXHJcbiAgICAgICAgICAgIGlmIChub2RlLmlkID09PSBpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb29rbWFya0J5VXJsKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdLCB1cmw6IHN0cmluZyk6IEJvb2ttYXJrSXRlbSB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kQm9va21hcmtCeVVybChub2RlLmNoaWxkcmVuLCB1cmwpO1xyXG4gICAgICAgICAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcclxuICAgICAgICB9IGVsc2UgeyAvLyBCb29rbWFya0l0ZW1cclxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIFVSTHMgdG8gY29tcGFyZSB0aGVtIG1vcmUgcmVsaWFibHlcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChuZXcgVVJMKG5vZGUudXJsKS5ocmVmID09PSBuZXcgVVJMKHVybCkuaHJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgaW52YWxpZCBVUkxzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gLS0tIFVwZGF0ZSBmdW5jdGlvbnMgLS0tXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va21hcmsodXBkYXRlZEJvb2ttYXJrOiBCb29rbWFya0l0ZW0pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgIFxyXG4gICAgLy8gV2UgbmVlZCB0byBmaW5kIHRoZSBvcmlnaW5hbCBib29rbWFyayB0byB1cGRhdGUgaXQuXHJcbiAgICAvLyBUaGlzIGlzIG5vdCBlZmZpY2llbnQsIGEgZmxhdCBtYXAgd291bGQgYmUgYmV0dGVyIGZvciBwZXJmb3JtYW5jZSBvbiBsYXJnZSBkYXRhc2V0cy5cclxuICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIHVwZGF0ZWRCb29rbWFyay5pZCk7XHJcblxyXG4gICAgaWYgKGJvb2ttYXJrKSB7XHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihib29rbWFyaywgdXBkYXRlZEJvb2ttYXJrKTtcclxuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xyXG4gICAgICAgIHJldHVybiBib29rbWFyaztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCb29rbWFyayB3aXRoIGlkICR7dXBkYXRlZEJvb2ttYXJrLmlkfSBub3QgZm91bmQuYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUJvb2ttYXJrQnlJZChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgaWQ6IHN0cmluZyk6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10ge1xyXG4gICAgcmV0dXJuIG5vZGVzLmZpbHRlcihub2RlID0+IHtcclxuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlKSB7IC8vIEZvbGRlclxyXG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuID0gcmVtb3ZlQm9va21hcmtCeUlkKG5vZGUuY2hpbGRyZW4sIGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIGZvbGRlclxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBJdCdzIGEgYm9va21hcmssIGZpbHRlciBpdCBvdXQgaWYgSURzIG1hdGNoXHJcbiAgICAgICAgcmV0dXJuIG5vZGUuaWQgIT09IGlkOyBcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlQm9va21hcmsoaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgIGFwcERhdGEuZm9sZGVycyA9IHJlbW92ZUJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGlkKSBhcyBGb2xkZXJbXTtcclxuICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XHJcbn1cclxuXHJcbi8vIC0tLSBTeW5jIFN0YXR1cyBNYW5hZ2VtZW50IC0tLVxyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIGN1cnJlbnQgc3luYyBzdGF0dXMgZnJvbSBzdG9yYWdlLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFN5bmNTdGF0dXMoKTogUHJvbWlzZTxTeW5jU3RhdGU+IHtcclxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoU1lOQ19TVEFUVVNfS0VZKTtcclxuICByZXR1cm4gcmVzdWx0W1NZTkNfU1RBVFVTX0tFWV0gfHwgeyBzdGF0dXM6ICdpZGxlJyB9O1xyXG59XHJcblxyXG4vKipcclxuICogU2V0cyB0aGUgc3luYyBzdGF0dXMgaW4gc3RvcmFnZS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRTeW5jU3RhdHVzKHN0YXR1czogU3luY1N0YXR1cywgZXJyb3JNZXNzYWdlPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3Qgc3luY1N0YXRlOiBTeW5jU3RhdGUgPSB7XHJcbiAgICBzdGF0dXMsXHJcbiAgICBsYXN0U3luY1RpbWU6IHN0YXR1cyA9PT0gJ3N5bmNlZCcgPyBEYXRlLm5vdygpIDogdW5kZWZpbmVkLFxyXG4gICAgbGFzdEVycm9yTWVzc2FnZTogc3RhdHVzID09PSAnZXJyb3InID8gZXJyb3JNZXNzYWdlIDogdW5kZWZpbmVkXHJcbiAgfTtcclxuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1lOQ19TVEFUVVNfS0VZXTogc3luY1N0YXRlIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQSByZWFkYWJsZSBTdmVsdGUgc3RvcmUgZm9yIHN5bmMgc3RhdHVzIHRoYXQgc3RheXMgaW4gc3luYyB3aXRoIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHN5bmNTdGF0dXNTdG9yZSA9IHJlYWRhYmxlPFN5bmNTdGF0ZT4oeyBzdGF0dXM6ICdpZGxlJyB9LCAoc2V0KSA9PiB7XHJcbiAgLy8gR2V0IHRoZSBpbml0aWFsIHZhbHVlIGZyb20gc3RvcmFnZVxyXG4gIGdldFN5bmNTdGF0dXMoKS50aGVuKHNldCkuY2F0Y2goZXJyID0+IHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSBzeW5jU3RhdHVzU3RvcmU6XCIsIGVycik7XHJcbiAgICBzZXQoeyBzdGF0dXM6ICdlcnJvcicsIGxhc3RFcnJvck1lc3NhZ2U6ICdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBzeW5jIHN0YXR1cycgfSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIFNldCB1cCBhIGxpc3RlbmVyIGZvciBjaGFuZ2VzXHJcbiAgY29uc3QgbGlzdGVuZXIgPSAoY2hhbmdlczogeyBba2V5OiBzdHJpbmddOiBjaHJvbWUuc3RvcmFnZS5TdG9yYWdlQ2hhbmdlIH0sIGFyZWFOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgIGlmIChhcmVhTmFtZSA9PT0gJ2xvY2FsJyAmJiBjaGFuZ2VzW1NZTkNfU1RBVFVTX0tFWV0pIHtcclxuICAgICAgc2V0KGNoYW5nZXNbU1lOQ19TVEFUVVNfS0VZXS5uZXdWYWx1ZSBhcyBTeW5jU3RhdGUpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblxyXG4gIHJldHVybiAoKSA9PiB7XHJcbiAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xyXG4gIH07XHJcbn0pO1xyXG5cclxuLy8gLS0tIFJlYWN0aXZlIFN2ZWx0ZSBTdG9yZSAtLS1cclxuaW1wb3J0IHsgcmVhZGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xyXG5cclxuLyoqXHJcbiAqIEEgcmVhZGFibGUgU3ZlbHRlIHN0b3JlIHRoYXQgc3RheXMgaW4gc3luYyB3aXRoIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGFwcERhdGFTdG9yZSA9IHJlYWRhYmxlPEFwcERhdGEgfCBudWxsPihudWxsLCAoc2V0KSA9PiB7XHJcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBmaXJzdCBzdWJzY3JpYmVyIHN1YnNjcmliZXMuXHJcblxyXG4gICAgLy8gMS4gR2V0IHRoZSBpbml0aWFsIHZhbHVlIGZyb20gc3RvcmFnZSBhbmQgc2V0IHRoZSBzdG9yZSdzIHZhbHVlLlxyXG4gICAgZ2V0QXBwRGF0YSgpLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgc2V0KGRhdGEpO1xyXG4gICAgfSkuY2F0Y2goZXJyID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgYXBwRGF0YVN0b3JlOlwiLCBlcnIpO1xyXG4gICAgICAgIC8vIE9wdGlvbmFsbHkgc2V0IGEgZGVmYXVsdCB2YWx1ZSBvciBhbiBlcnJvciBzdGF0ZVxyXG4gICAgICAgIHNldChkZWZhdWx0RGF0YSk7IFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gMi4gU2V0IHVwIGEgbGlzdGVuZXIgZm9yIGFueSBzdWJzZXF1ZW50IGNoYW5nZXMgaW4gc3RvcmFnZS5cclxuICAgIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXM6IHsgW2tleTogc3RyaW5nXTogY2hyb21lLnN0b3JhZ2UuU3RvcmFnZUNoYW5nZSB9LCBhcmVhTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgaWYgKGFyZWFOYW1lID09PSAnbG9jYWwnICYmIGNoYW5nZXNbU1RPUkFHRV9LRVldKSB7XHJcbiAgICAgICAgICAgIHNldChjaGFuZ2VzW1NUT1JBR0VfS0VZXS5uZXdWYWx1ZSBhcyBBcHBEYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XHJcblxyXG4gICAgLy8gMy4gUmV0dXJuIGEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBsYXN0IHN1YnNjcmliZXIgdW5zdWJzY3JpYmVzLlxyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xyXG4gICAgfTtcclxufSk7ICIsIi8qKlxuICogVGhpcyBmaWxlIGNvbnRhaW5zIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBpbnRlcmFjdGluZyB3aXRoIHRoZSBHb29nbGUgRHJpdmUgQVBJLlxuICovXG5cbmltcG9ydCB0eXBlIHsgRm9sZGVyLCBCb29rbWFya0l0ZW0sIFRhZywgQWNjZXNzUmVjb3JkIH0gZnJvbSAnJGxpYi90eXBlcyc7XG5cbi8vIFRoaXMgaXMgdGhlIENsaWVudCBJRCBmb3IgdGhlIFwiV2ViIEFwcGxpY2F0aW9uXCIgdHlwZSBjcmVkZW50aWFsIGluIEdvb2dsZSBDbG91ZCBDb25zb2xlLlxuLy8gSXQgaXMgdXNlZCBhcyBhIGZhbGxiYWNrIGZvciBicm93c2VycyB0aGF0IGRvIG5vdCBzdXBwb3J0IGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4gKGUuZy4sIEJyYXZlKS5cbmNvbnN0IFdFQl9BUFBfQ0xJRU5UX0lEID0gJzUxOTcyOTMwOTUxMS1qYmZ2OGYxY3MwOGZtMXQ3NGZiMmV2dHQxMmhuYmFuay5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSc7XG5cbmNvbnN0IERJU0NPVkVSWV9ET0MgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vZGlzY292ZXJ5L3YxL2FwaXMvZHJpdmUvdjMvcmVzdCc7XG5cbmNvbnN0IEJPVU5EQVJZID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnO1xuY29uc3QgVVBMT0FEX1VSTCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS91cGxvYWQvZHJpdmUvdjMvZmlsZXMnO1xuY29uc3QgRFJJVkVfRklMRVNfVVJMID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2RyaXZlL3YzL2ZpbGVzJztcbmNvbnN0IEZJTEVfTkFNRSA9ICdjaHJvbWUtZXh0ZW5zaW9uLXN2ZWx0ZS10eXBlc2NyaXB0LWJvaWxlcnBsYXRlLWJhY2t1cC5qc29uJztcbmNvbnN0IE1BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWSA9ICdnZHJpdmVfbWFudWFsX3Rva2VuJztcblxuLyoqXG4gKiBDdXN0b20gZXJyb3IgY2xhc3MgZm9yIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmVzLlxuICovXG5leHBvcnQgY2xhc3MgQXV0aEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcpIHtcblx0XHRzdXBlcihtZXNzYWdlKTtcblx0XHR0aGlzLm5hbWUgPSAnQXV0aEVycm9yJztcblx0fVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY3VycmVudCBicm93c2VyIGlzIEdvb2dsZSBDaHJvbWUuXG4gKiBUaGlzIGlzIGEgc2ltcGxpZmllZCBjaGVjayBhbmQgbWlnaHQgbmVlZCBpbXByb3ZlbWVudC5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRydWUgaWYgdGhlIGJyb3dzZXIgaXMgbGlrZWx5IENocm9tZSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG5hc3luYyBmdW5jdGlvbiBpc0Nocm9tZUJyb3dzZXIoKTogUHJvbWlzZTxib29sZWFuPiB7XG5cdC8vIEB0cy1pZ25vcmVcblx0aWYgKG5hdmlnYXRvci5icmF2ZSAmJiAoYXdhaXQgbmF2aWdhdG9yLmJyYXZlLmlzQnJhdmUoKSkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0Ly8gVGhpcyBpcyBub3QgYSBmb29scHJvb2Ygd2F5IHRvIGRldGVjdCBDaHJvbWUsIGJ1dCBpdCdzIGEgY29tbW9uIG1ldGhvZC5cblx0Ly8gSXQgY2hlY2tzIGZvciB0aGUgcHJlc2VuY2Ugb2YgJ0Nocm9tZScgYW5kIHRoZSBhYnNlbmNlIG9mICdFZGcnIChmb3IgRWRnZSkgaW4gdGhlIHVzZXIgYWdlbnQgc3RyaW5nLlxuXHQvLyBJdCdzIGEgcmVhc29uYWJsZSBoZXVyaXN0aWMgZm9yIGRpc3Rpbmd1aXNoaW5nIENocm9tZSBmcm9tIG90aGVyIENocm9taXVtLWJhc2VkIGJyb3dzZXJzLlxuXHRyZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmNsdWRlcygnQ2hyb21lJykgJiYgIW5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0VkZycpO1xufVxuXG5mdW5jdGlvbiBsYXVuY2hXZWJBdXRoRmxvdyhpbnRlcmFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0aWYgKFdFQl9BUFBfQ0xJRU5UX0lELnN0YXJ0c1dpdGgoJ0NPTEVfT19TRVVfSURfREVfQ0xJRU5URScpKSB7XG5cdFx0XHRyZXR1cm4gcmVqZWN0KFxuXHRcdFx0XHRuZXcgRXJyb3IoJ1BsZWFzZSBwcm92aWRlIHRoZSBXZWIgQXBwbGljYXRpb24gQ2xpZW50IElEIGluIHNyYy9saWIvZ2RyaXZlLnRzJylcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZXh0ZW5zaW9uSWQgPSBjaHJvbWUucnVudGltZS5pZDtcblx0XHRjb25zdCByZWRpcmVjdFVyaSA9IGBodHRwczovLyR7ZXh0ZW5zaW9uSWR9LmNocm9taXVtYXBwLm9yZ2A7XG5cdFx0Y29uc29sZS5sb2coXG5cdFx0XHQnUGFyYSBvIGZsdXhvIGRlIGF1dGVudGljYcOnw6NvIGRhIHdlYiwgY2VydGlmaXF1ZS1zZSBkZSBxdWUgZXN0ZSBVUkkgZGUgcmVkaXJlY2lvbmFtZW50byBlc3TDoSBhZGljaW9uYWRvIMOgcyBzdWFzIGNyZWRlbmNpYWlzIGRlIE9BdXRoIDIuMCBkbyB0aXBvIFwiQXBsaWNhw6fDo28gV2ViXCIgbmEgR29vZ2xlIENsb3VkIENvbnNvbGU6Jyxcblx0XHRcdHJlZGlyZWN0VXJpXG5cdFx0KTtcblx0XHRjb25zdCBzY29wZXMgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZS5maWxlIGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8uZW1haWwgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJztcblx0XHRsZXQgYXV0aFVybCA9IGBodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvdjIvYXV0aGA7XG5cdFx0YXV0aFVybCArPSBgP2NsaWVudF9pZD0ke1dFQl9BUFBfQ0xJRU5UX0lEfWA7XG5cdFx0YXV0aFVybCArPSBgJnJlc3BvbnNlX3R5cGU9dG9rZW5gO1xuXHRcdGF1dGhVcmwgKz0gYCZyZWRpcmVjdF91cmk9JHtlbmNvZGVVUklDb21wb25lbnQocmVkaXJlY3RVcmkpfWA7XG5cdFx0YXV0aFVybCArPSBgJnNjb3BlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNjb3Blcyl9YDtcblxuXHRcdGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdyh7IHVybDogYXV0aFVybCwgaW50ZXJhY3RpdmUgfSwgKHJlc3BvbnNlVXJsKSA9PiB7XG5cdFx0XHRpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZVVybCkge1xuXHRcdFx0XHRjb25zdCB1cmwgPSBuZXcgVVJMKHJlc3BvbnNlVXJsKTtcblx0XHRcdFx0Y29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh1cmwuaGFzaC5zdWJzdHJpbmcoMSkpOyAvLyBSZW1vdmUgdGhlICcjJ1xuXHRcdFx0XHRjb25zdCBhY2Nlc3NUb2tlbiA9IHBhcmFtcy5nZXQoJ2FjY2Vzc190b2tlbicpO1xuXHRcdFx0XHRpZiAoYWNjZXNzVG9rZW4pIHtcblx0XHRcdFx0XHRjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXTogYWNjZXNzVG9rZW4gfSwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gVGhlIGxpc3RlbmVyIGFib3ZlIHdpbGwgYXV0b21hdGljYWxseSB1cGRhdGUgdGhlIHN0b3JlXG5cdFx0XHRcdFx0XHRyZXNvbHZlKGFjY2Vzc1Rva2VuKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQ6IEFjY2VzcyB0b2tlbiBub3QgZm91bmQgaW4gcmVzcG9uc2UuJykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQ6IE5vIHJlc3BvbnNlIFVSTC4nKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG4vKipcbiAqIEluaXRpYXRlcyB0aGUgT0F1dGggMi4wIGZsb3cgdG8gZ2V0IGFuIGFjY2VzcyB0b2tlbi5cbiAqIEBwYXJhbSBpbnRlcmFjdGl2ZSBJZiB0cnVlLCB0aGUgdXNlciB3aWxsIGJlIHByb21wdGVkIHRvIGxvZyBpbiBpZiBuZWNlc3NhcnkuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgYWNjZXNzIHRva2VuLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXV0aFRva2VuKGludGVyYWN0aXZlOiBib29sZWFuKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0Y29uc3QgaXNDaHJvbWUgPSBhd2FpdCBpc0Nocm9tZUJyb3dzZXIoKTtcblxuXHRpZiAoaXNDaHJvbWUpIHtcblx0XHRjb25zb2xlLmxvZygnRGV0ZWN0ZWQgQ2hyb21lIGJyb3dzZXIsIHVzaW5nIGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4uJyk7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGNocm9tZS5pZGVudGl0eS5nZXRBdXRoVG9rZW4oeyBpbnRlcmFjdGl2ZSB9LCAodG9rZW4pID0+IHtcblx0XHRcdFx0aWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXNvbHZlKHRva2VuIGFzIHN0cmluZyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdGNvbnNvbGUubG9nKCdEZXRlY3RlZCBhIG5vbi1DaHJvbWUgYnJvd3NlciwgdXNpbmcgY2hyb21lLmlkZW50aXR5LmxhdW5jaFdlYkF1dGhGbG93LicpO1xuXHRcdGlmIChpbnRlcmFjdGl2ZSkge1xuXHRcdFx0cmV0dXJuIGxhdW5jaFdlYkF1dGhGbG93KGludGVyYWN0aXZlKTtcblx0XHR9XG5cdFx0Ly8gVHJ5IHRvIGdldCBmcm9tIHN0b3JhZ2UgaWYgbm90IGludGVyYWN0aXZlXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVksIChyZXN1bHQpID0+IHtcblx0XHRcdFx0aWYgKHJlc3VsdFtNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVldKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZShyZXN1bHRbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignTm90IGxvZ2dlZCBpbi4nKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhIGNhY2hlZCBPQXV0aCAyLjAgdG9rZW4uXG4gKiBAcGFyYW0gdG9rZW4gVGhlIHRva2VuIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIHRva2VuIGlzIHJlbW92ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDYWNoZWRBdXRoVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjaHJvbWUuaWRlbnRpdHkucmVtb3ZlQ2FjaGVkQXV0aFRva2VuKHsgdG9rZW4gfSwgKCkgPT4ge1xuXHRcdFx0Y2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKE1BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWSwgKCkgPT4ge1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEhlYWRlcnModG9rZW46IHN0cmluZykge1xuICAgIHJldHVybiB7XG4gICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke3Rva2VufWAsXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgfTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgYmFja3VwIGZpbGUgaW4gdGhlIHVzZXIncyBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBtZXRhZGF0YSBpZiBmb3VuZCwgb3RoZXJ3aXNlIG51bGwuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGZpbmRCYWNrdXBGaWxlKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICBjb25zdCBoZWFkZXJzID0gYXdhaXQgZ2V0SGVhZGVycyh0b2tlbik7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtEUklWRV9GSUxFU19VUkx9P3E9bmFtZT0nJHtGSUxFX05BTUV9JyBhbmQgJ3Jvb3QnIGluIHBhcmVudHMgYW5kIHRyYXNoZWQ9ZmFsc2VgLCB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuXHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSkge1xuXHRcdFx0dGhyb3cgbmV3IEF1dGhFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkLiBQbGVhc2UgbG9nIGluIGFnYWluLicpO1xuXHRcdH1cbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGZpbmRCYWNrdXBGaWxlOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHNlYXJjaCBmb3IgYmFja3VwIGZpbGU6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gZGF0YS5maWxlcy5sZW5ndGggPiAwID8gZGF0YS5maWxlc1swXSA6IG51bGw7XG59XG5cbi8qKlxuICogVXBsb2FkcyB0aGUgYXBwbGljYXRpb24gZGF0YSB0byBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gZGF0YSBUaGUgYXBwbGljYXRpb24gZGF0YSB0byB1cGxvYWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRCYWNrdXAodG9rZW46IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBcbiAgICBjb25zdCBmaWxlTWV0YWRhdGE6IHsgbmFtZTogc3RyaW5nLCBwYXJlbnRzPzogc3RyaW5nW10gfSA9IHtcbiAgICAgICAgbmFtZTogRklMRV9OQU1FLFxuICAgIH07XG5cbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgLy8gUGFyZW50cyBmaWVsZCBpcyBub3QgbmVlZGVkIGlmIHRoZSBmaWxlIGlzIGluIHRoZSByb290LlxuICAgICAgICAvLyBJdCBkZWZhdWx0cyB0byB0aGUgcm9vdCBpZiBub3Qgc3BlY2lmaWVkLlxuICAgIH1cblxuICAgIGNvbnN0IG11bHRpcGFydFJlcXVlc3RCb2R5ID1cbiAgICAgICAgYC0tJHtCT1VOREFSWX1cXHJcXG5gICtcbiAgICAgICAgYENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFxcclxcblxcclxcbmAgK1xuICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShmaWxlTWV0YWRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfVxcclxcbmAgK1xuICAgICAgICBgQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuYCArXG4gICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfS0tYDtcblxuICAgIGNvbnN0IG1ldGhvZCA9IGZpbGUgPyAnUEFUQ0gnIDogJ1BPU1QnO1xuICAgIGNvbnN0IHVybCA9IGZpbGUgPyBgJHtVUExPQURfVVJMfS8ke2ZpbGUuaWR9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YCA6IGAke1VQTE9BRF9VUkx9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW59YCxcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiBgbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PSR7Qk9VTkRBUll9YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogbXVsdGlwYXJ0UmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgQXV0aEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyk7XG5cdFx0fVxuICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBBUEkgRXJyb3Igb24gdXBsb2FkQmFja3VwOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHVwbG9hZCBiYWNrdXA6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG59XG5cbi8qKlxuICogRG93bmxvYWRzIHRoZSBiYWNrdXAgZmlsZSBmcm9tIEdvb2dsZSBEcml2ZS5cbiAqIEBwYXJhbSB0b2tlbiBUaGUgT0F1dGggMi4wIGFjY2VzcyB0b2tlbi5cbiAqIEByZXR1cm5zIFRoZSBhcHBsaWNhdGlvbiBkYXRhIGZyb20gdGhlIGJhY2t1cCBmaWxlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRCYWNrdXAodG9rZW46IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xuICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBmaW5kQmFja3VwRmlsZSh0b2tlbik7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGhlYWRlcnMgPSBhd2FpdCBnZXRIZWFkZXJzKHRva2VuKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0RSSVZFX0ZJTEVTX1VSTH0vJHtmaWxlLmlkfT9hbHQ9bWVkaWFgLCB7XG4gICAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XG5cdFx0XHR0aHJvdyBuZXcgQXV0aEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyk7XG5cdFx0fVxuICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBBUEkgRXJyb3Igb24gZG93bmxvYWRCYWNrdXA6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZG93bmxvYWQgYmFja3VwOiAnICsgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbn1cblxuLy8gRnVuY3Rpb25zIGZvciBiYWNrdXAgYW5kIHJlc3RvcmUgd2lsbCBiZSBhZGRlZCBiZWxvdy4gIiwiaW1wb3J0IHsgdHlwZSBDbGFzc1ZhbHVlLCBjbHN4IH0gZnJvbSBcImNsc3hcIjtcbmltcG9ydCB7IHR3TWVyZ2UgfSBmcm9tIFwidGFpbHdpbmQtbWVyZ2VcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNuKC4uLmlucHV0czogQ2xhc3NWYWx1ZVtdKSB7XG5cdHJldHVybiB0d01lcmdlKGNsc3goaW5wdXRzKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWRcbiAqIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXMgaW52b2tlZC5cbiAqIEBwYXJhbSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHJldHVybnMgUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlPFQgZXh0ZW5kcyAoLi4uYXJnczogYW55W10pID0+IGFueT4oZnVuYzogVCwgd2FpdDogbnVtYmVyKTogKC4uLmFyZ3M6IFBhcmFtZXRlcnM8VD4pID0+IHZvaWQge1xuICAgIGxldCB0aW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24odGhpczogVGhpc1BhcmFtZXRlclR5cGU8VD4sIC4uLmFyZ3M6IFBhcmFtZXRlcnM8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHRoaXM7XG4gICAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICB9LCB3YWl0KTtcbiAgICB9O1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkPFQ+ID0gVCBleHRlbmRzIHsgY2hpbGQ/OiBhbnkgfSA/IE9taXQ8VCwgXCJjaGlsZFwiPiA6IFQ7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkcmVuPFQ+ID0gVCBleHRlbmRzIHsgY2hpbGRyZW4/OiBhbnkgfSA/IE9taXQ8VCwgXCJjaGlsZHJlblwiPiA6IFQ7XG5leHBvcnQgdHlwZSBXaXRob3V0Q2hpbGRyZW5PckNoaWxkPFQ+ID0gV2l0aG91dENoaWxkcmVuPFdpdGhvdXRDaGlsZDxUPj47XG5leHBvcnQgdHlwZSBXaXRoRWxlbWVudFJlZjxULCBVIGV4dGVuZHMgSFRNTEVsZW1lbnQgPSBIVE1MRWxlbWVudD4gPSBUICYgeyByZWY/OiBVIHwgbnVsbCB9O1xuIiwiaW1wb3J0IHsgYXBwRGF0YVN0b3JlLCBzZXRTeW5jU3RhdHVzIH0gZnJvbSAnLi9zdG9yYWdlJztcclxuaW1wb3J0IHsgZ2V0QXV0aFRva2VuLCB1cGxvYWRCYWNrdXAsIEF1dGhFcnJvciB9IGZyb20gJy4vZ2RyaXZlJztcclxuaW1wb3J0IHsgZGVib3VuY2UgfSBmcm9tICcuL3V0aWxzJztcclxuXHJcbmxldCBpc0ZpcnN0Q2hhbmdlID0gdHJ1ZTtcclxuXHJcbmNvbnN0IGRlYm91bmNlZFVwbG9hZCA9IGRlYm91bmNlKGFzeW5jICh0b2tlbjogc3RyaW5nLCBkYXRhOiBhbnkpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKCdEZWJvdW5jZWQgYmFja3VwIHRyaWdnZXJlZC4nKTtcclxuICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3N5bmNpbmcnKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCB1cGxvYWRCYWNrdXAodG9rZW4sIGRhdGEpO1xyXG4gICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3N5bmNlZCcpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBzdWNjZXNzZnVsLicpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dG8tYmFja3VwIGZhaWxlZDonLCBlKTtcclxuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEF1dGhFcnJvcikge1xyXG4gICAgICAgICAgICBhd2FpdCBzZXRTeW5jU3RhdHVzKCd1bmF1dGhlbnRpY2F0ZWQnLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ2Vycm9yJywgZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0sIDUwMDApOyAvLyBEZWJvdW5jZSBmb3IgNSBzZWNvbmRzXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVEYXRhQ2hhbmdlKGRhdGE6IGFueSkge1xyXG4gICAgaWYgKGlzRmlyc3RDaGFuZ2UpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnSW5pdGlhbCBkYXRhIGxvYWRlZCwgc2tpcHBpbmcgZmlyc3QgYXV0by1iYWNrdXAuJyk7XHJcbiAgICAgICAgaXNGaXJzdENoYW5nZSA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBhIHRva2VuIG5vbi1pbnRlcmFjdGl2ZWx5LlxyXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IGF3YWl0IGdldEF1dGhUb2tlbihmYWxzZSk7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RhdGEgY2hhbmdlZCwgc2NoZWR1bGluZyBhdXRvLWJhY2t1cC4uLicpO1xyXG4gICAgICAgICAgICAgICAgZGVib3VuY2VkVXBsb2FkKHRva2VuLCBkYXRhKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIE5vIHRva2VuLCB3aGljaCBtZWFucyB3ZSBhcmUgbG9nZ2VkIG91dC5cclxuICAgICAgICAgICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ3VuYXV0aGVudGljYXRlZCcsICdVc2VyIGlzIG5vdCBsb2dnZWQgaW4uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbiBoYXBwZW4gaWYgZ2V0QXV0aFRva2VuIGZhaWxzIChlLmcuIG5vdCBsb2dnZWQgaW4gb24gbm9uLWNocm9tZSlcclxuICAgICAgICAgICAgYXdhaXQgc2V0U3luY1N0YXR1cygndW5hdXRoZW50aWNhdGVkJywgJ1VzZXIgaXMgbm90IGxvZ2dlZCBpbi4nKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFN1YnNjcmliZSB0byB0aGUgc3RvcmUgdG8gbGlzdGVuIGZvciBjaGFuZ2VzLlxyXG5hcHBEYXRhU3RvcmUuc3Vic2NyaWJlKGhhbmRsZURhdGFDaGFuZ2UpO1xyXG5cclxuY29uc29sZS5sb2coJ0F1dG8tYmFja3VwIG1vZHVsZSBpbml0aWFsaXplZC4nKTsgIiwiaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gXCIjaW1wb3J0c1wiO1xuaW1wb3J0IHsgZmluZEJvb2ttYXJrQnlJZCwgZ2V0QXBwRGF0YSwgZmluZEJvb2ttYXJrQnlVcmwsIHNldEFwcERhdGEgfSBmcm9tIFwiLi4vbGliL3N0b3JhZ2VcIjtcblxuLy8gSW1wb3J0IHRoZSBhdXRvLWJhY2t1cCBtb2R1bGUgdG8gaW5pdGlhbGl6ZSBpdC5cbmltcG9ydCAnJGxpYi9hdXRvLWJhY2t1cCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQmFja2dyb3VuZCBzY3JpcHQgbG9hZGVkLlwiKTtcblxuICAgIC8vIExpc3RlbmVyIGZvciB3aGVuIGFuIGFsYXJtIGdvZXMgb2ZmXG4gICAgY2hyb21lLmFsYXJtcy5vbkFsYXJtLmFkZExpc3RlbmVyKGFzeW5jIChhbGFybSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkFsYXJtIGZpcmVkOlwiLCBhbGFybSk7XG5cbiAgICAgICAgaWYgKGFsYXJtLm5hbWUuc3RhcnRzV2l0aChcInJlbWluZGVyLVwiKSkge1xuICAgICAgICAgICAgY29uc3QgYm9va21hcmtJZCA9IGFsYXJtLm5hbWUucmVwbGFjZShcInJlbWluZGVyLVwiLCBcIlwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgYm9va21hcmsgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcmVtaW5kZXJcbiAgICAgICAgICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XG4gICAgICAgICAgICBjb25zdCBib29rbWFyayA9IGZpbmRCb29rbWFya0J5SWQoYXBwRGF0YS5mb2xkZXJzLCBib29rbWFya0lkKTtcblxuICAgICAgICAgICAgaWYgKGJvb2ttYXJrKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKGBub3RpZmljYXRpb24tJHtib29rbWFyay5pZH1gLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYmFzaWNcIixcbiAgICAgICAgICAgICAgICAgICAgaWNvblVybDogXCJpY29uLTEyOC5wbmdcIiwgLy8gV1hUIGhhbmRsZXMgcGF0aGluZ1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJSZW1pbmRlcjogXCIgKyBib29rbWFyay50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJDbGljayB0byBvcGVuIHRoaXMgc2F2ZWQgcGFnZS5cIixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIExpc3RlbmVyIGZvciB3aGVuIGEgbm90aWZpY2F0aW9uIGlzIGNsaWNrZWRcbiAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKG5vdGlmaWNhdGlvbklkKSA9PiB7XG4gICAgICAgIGlmIChub3RpZmljYXRpb25JZC5zdGFydHNXaXRoKFwibm90aWZpY2F0aW9uLVwiKSkge1xuICAgICAgICAgICAgY29uc3QgYm9va21hcmtJZCA9IG5vdGlmaWNhdGlvbklkLnJlcGxhY2UoXCJub3RpZmljYXRpb24tXCIsIFwiXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGlzIHBhcnQgaXMgdHJpY2t5IGJlY2F1c2Ugd2UgY2FuJ3QgZGlyZWN0bHkgZ2V0IHRoZSBVUkwgaGVyZVxuICAgICAgICAgICAgLy8gd2l0aG91dCBhbm90aGVyIHN0b3JhZ2UgbG9va3VwLiBBIGJldHRlciBhcHByb2FjaCBmb3IgYSByZWFsIGFwcFxuICAgICAgICAgICAgLy8gbWlnaHQgYmUgdG8gc3RvcmUgdGhlIFVSTCBpbiB0aGUgYWxhcm0vbm90aWZpY2F0aW9uIGRldGFpbHMgaWYgcG9zc2libGUsXG4gICAgICAgICAgICAvLyBvciBwZXJmb3JtIHRoZSBsb29rdXAgYXMgd2UgZG8gaGVyZS5cbiAgICAgICAgICAgIGdldEFwcERhdGEoKS50aGVuKGFwcERhdGEgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGJvb2ttYXJrSWQpO1xuICAgICAgICAgICAgICAgIGlmIChib29rbWFyaz8udXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogYm9va21hcmsudXJsIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhIHVzZXIgdmlzaXRzIGEgcGFnZVxuICAgIGNocm9tZS5oaXN0b3J5Lm9uVmlzaXRlZC5hZGRMaXN0ZW5lcihhc3luYyAoaGlzdG9yeUl0ZW0pID0+IHtcbiAgICAgICAgaWYgKGhpc3RvcnlJdGVtLnVybCkge1xuICAgICAgICAgICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlVcmwoYXBwRGF0YS5mb2xkZXJzLCBoaXN0b3J5SXRlbS51cmwpO1xuXG4gICAgICAgICAgICBpZiAoYm9va21hcmspIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgaGlzdG9yeSBmb3IgYm9va21hcmtlZCBpdGVtOiAke2Jvb2ttYXJrLnRpdGxlfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZpc2l0cyA9IGF3YWl0IGNocm9tZS5oaXN0b3J5LmdldFZpc2l0cyh7IHVybDogaGlzdG9yeUl0ZW0udXJsIH0pO1xuICAgICAgICAgICAgICAgIGJvb2ttYXJrLmFjY2Vzc0hpc3RvcnkgPSB2aXNpdHMubWFwKHZpc2l0ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdmlzaXQudmlzaXRUaW1lIVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiZS5ydW5lX291dHNpZGVfc3ZlbHRlIiwicmVzdWx0IiwiYnJvd3NlciIsIl9icm93c2VyIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1Q7QUNtQk8sUUFBTSxPQUFPLE1BQU07QUFBQSxFQUFDO0FDVnBCLFdBQVMsZUFBZSxHQUFHLEdBQUc7QUFDcEMsV0FBTyxLQUFLLElBQ1QsS0FBSyxJQUNMLE1BQU0sS0FBTSxNQUFNLFFBQVEsT0FB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
