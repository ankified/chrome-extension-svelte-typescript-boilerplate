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
      await setSyncStatus("error", e instanceof Error ? e.message : "Unknown error");
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
        }
      } catch (error) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vc3ZlbHRlQDUuMzUuNi9ub2RlX21vZHVsZXMvc3ZlbHRlL3NyYy9pbnRlcm5hbC9jbGllbnQvZXJyb3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW5kZXgtY2xpZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvc3RvcmUvc2hhcmVkL2luZGV4LmpzIiwiLi4vLi4vc3JjL2xpYi9zdG9yYWdlLnRzIiwiLi4vLi4vc3JjL2xpYi9nZHJpdmUudHMiLCIuLi8uLi9zcmMvbGliL3V0aWxzLnRzIiwiLi4vLi4vc3JjL2xpYi9hdXRvLWJhY2t1cC50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQHdlYmV4dC1jb3JlK21hdGNoLXBhdHRlcm5zQDEuMC4zL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIFN0b3JlIHRoZSByZWZlcmVuY2VzIHRvIGdsb2JhbHMgaW4gY2FzZSBzb21lb25lIHRyaWVzIHRvIG1vbmtleSBwYXRjaCB0aGVzZSwgY2F1c2luZyB0aGUgYmVsb3dcbi8vIHRvIGRlLW9wdCAodGhpcyBvY2N1cnMgb2Z0ZW4gd2hlbiB1c2luZyBwb3B1bGFyIGV4dGVuc2lvbnMpLlxuZXhwb3J0IHZhciBpc19hcnJheSA9IEFycmF5LmlzQXJyYXk7XG5leHBvcnQgdmFyIGluZGV4X29mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG5leHBvcnQgdmFyIGFycmF5X2Zyb20gPSBBcnJheS5mcm9tO1xuZXhwb3J0IHZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzO1xuZXhwb3J0IHZhciBkZWZpbmVfcHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5leHBvcnQgdmFyIGdldF9kZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmV4cG9ydCB2YXIgZ2V0X2Rlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnM7XG5leHBvcnQgdmFyIG9iamVjdF9wcm90b3R5cGUgPSBPYmplY3QucHJvdG90eXBlO1xuZXhwb3J0IHZhciBhcnJheV9wcm90b3R5cGUgPSBBcnJheS5wcm90b3R5cGU7XG5leHBvcnQgdmFyIGdldF9wcm90b3R5cGVfb2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG5leHBvcnQgdmFyIGlzX2V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuXG4vKipcbiAqIEBwYXJhbSB7YW55fSB0aGluZ1xuICogQHJldHVybnMge3RoaW5nIGlzIEZ1bmN0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfZnVuY3Rpb24odGhpbmcpIHtcblx0cmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvaW5kZXguanNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIE1JVCBMaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS90aGVuL2lzLXByb21pc2UvYmxvYi9tYXN0ZXIvTElDRU5TRVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge2FueX0gdmFsdWVcbiAqIEByZXR1cm5zIHt2YWx1ZSBpcyBQcm9taXNlTGlrZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzX3Byb21pc2UodmFsdWUpIHtcblx0cmV0dXJuIHR5cGVvZiB2YWx1ZT8udGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqIEBwYXJhbSB7RnVuY3Rpb259IGZuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuKGZuKSB7XG5cdHJldHVybiBmbigpO1xufVxuXG4vKiogQHBhcmFtIHtBcnJheTwoKSA9PiB2b2lkPn0gYXJyICovXG5leHBvcnQgZnVuY3Rpb24gcnVuX2FsbChhcnIpIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcblx0XHRhcnJbaV0oKTtcblx0fVxufVxuXG4vKipcbiAqIFRPRE8gcmVwbGFjZSB3aXRoIFByb21pc2Uud2l0aFJlc29sdmVycyBvbmNlIHN1cHBvcnRlZCB3aWRlbHkgZW5vdWdoXG4gKiBAdGVtcGxhdGUgVFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmZXJyZWQoKSB7XG5cdC8qKiBAdHlwZSB7KHZhbHVlOiBUKSA9PiB2b2lkfSAqL1xuXHR2YXIgcmVzb2x2ZTtcblxuXHQvKiogQHR5cGUgeyhyZWFzb246IGFueSkgPT4gdm9pZH0gKi9cblx0dmFyIHJlamVjdDtcblxuXHQvKiogQHR5cGUge1Byb21pc2U8VD59ICovXG5cdHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG5cdFx0cmVzb2x2ZSA9IHJlcztcblx0XHRyZWplY3QgPSByZWo7XG5cdH0pO1xuXG5cdC8vIEB0cy1leHBlY3QtZXJyb3Jcblx0cmV0dXJuIHsgcHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0IH07XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFZcbiAqIEBwYXJhbSB7Vn0gdmFsdWVcbiAqIEBwYXJhbSB7ViB8ICgoKSA9PiBWKX0gZmFsbGJhY2tcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2xhenldXG4gKiBAcmV0dXJucyB7Vn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrKHZhbHVlLCBmYWxsYmFjaywgbGF6eSA9IGZhbHNlKSB7XG5cdHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkXG5cdFx0PyBsYXp5XG5cdFx0XHQ/IC8qKiBAdHlwZSB7KCkgPT4gVn0gKi8gKGZhbGxiYWNrKSgpXG5cdFx0XHQ6IC8qKiBAdHlwZSB7Vn0gKi8gKGZhbGxiYWNrKVxuXHRcdDogdmFsdWU7XG59XG5cbi8qKlxuICogV2hlbiBlbmNvdW50ZXJpbmcgYSBzaXR1YXRpb24gbGlrZSBgbGV0IFthLCBiLCBjXSA9ICRkZXJpdmVkKGJsYWgoKSlgLFxuICogd2UgbmVlZCB0byBzdGFzaCBhbiBpbnRlcm1lZGlhdGUgdmFsdWUgdGhhdCBgYWAsIGBiYCwgYW5kIGBjYCBkZXJpdmVcbiAqIGZyb20sIGluIGNhc2UgaXQncyBhbiBpdGVyYWJsZVxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7QXJyYXlMaWtlPFQ+IHwgSXRlcmFibGU8VD59IHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gW25dXG4gKiBAcmV0dXJucyB7QXJyYXk8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b19hcnJheSh2YWx1ZSwgbikge1xuXHQvLyByZXR1cm4gYXJyYXlzIHVuY2hhbmdlZFxuXHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHQvLyBpZiB2YWx1ZSBpcyBub3QgaXRlcmFibGUsIG9yIGBuYCBpcyB1bnNwZWNpZmllZCAoaW5kaWNhdGVzIGEgcmVzdFxuXHQvLyBlbGVtZW50LCB3aGljaCBtZWFucyB3ZSdyZSBub3QgY29uY2VybmVkIGFib3V0IHVuYm91bmRlZCBpdGVyYWJsZXMpXG5cdC8vIGNvbnZlcnQgdG8gYW4gYXJyYXkgd2l0aCBgQXJyYXkuZnJvbWBcblx0aWYgKG4gPT09IHVuZGVmaW5lZCB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiB2YWx1ZSkpIHtcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZSk7XG5cdH1cblxuXHQvLyBvdGhlcndpc2UsIHBvcHVsYXRlIGFuIGFycmF5IHdpdGggYG5gIHZhbHVlc1xuXG5cdC8qKiBAdHlwZSB7VFtdfSAqL1xuXHRjb25zdCBhcnJheSA9IFtdO1xuXG5cdGZvciAoY29uc3QgZWxlbWVudCBvZiB2YWx1ZSkge1xuXHRcdGFycmF5LnB1c2goZWxlbWVudCk7XG5cdFx0aWYgKGFycmF5Lmxlbmd0aCA9PT0gbikgYnJlYWs7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59XG4iLCIvKiogQGltcG9ydCB7IEVxdWFscyB9IGZyb20gJyNjbGllbnQnICovXG5cbi8qKiBAdHlwZSB7RXF1YWxzfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gdmFsdWUgPT09IHRoaXMudjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3Vua25vd259IGFcbiAqIEBwYXJhbSB7dW5rbm93bn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX25vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9IGFcblx0XHQ/IGIgPT0gYlxuXHRcdDogYSAhPT0gYiB8fCAoYSAhPT0gbnVsbCAmJiB0eXBlb2YgYSA9PT0gJ29iamVjdCcpIHx8IHR5cGVvZiBhID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7dW5rbm93bn0gYVxuICogQHBhcmFtIHt1bmtub3dufSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdF9lcXVhbChhLCBiKSB7XG5cdHJldHVybiBhICE9PSBiO1xufVxuXG4vKiogQHR5cGUge0VxdWFsc30gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYWZlX2VxdWFscyh2YWx1ZSkge1xuXHRyZXR1cm4gIXNhZmVfbm90X2VxdWFsKHZhbHVlLCB0aGlzLnYpO1xufVxuIiwiLyogVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBzY3JpcHRzL3Byb2Nlc3MtbWVzc2FnZXMvaW5kZXguanMuIERvIG5vdCBlZGl0ISAqL1xuXG5pbXBvcnQgeyBERVYgfSBmcm9tICdlc20tZW52JztcblxuLyoqXG4gKiBVc2luZyBgYmluZDp2YWx1ZWAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgYGJpbmQ6Y2hlY2tlZGAgaW5zdGVhZFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9jaGVja2JveF92YWx1ZVxcblVzaW5nIFxcYGJpbmQ6dmFsdWVcXGAgdG9nZXRoZXIgd2l0aCBhIGNoZWNrYm94IGlucHV0IGlzIG5vdCBhbGxvd2VkLiBVc2UgXFxgYmluZDpjaGVja2VkXFxgIGluc3RlYWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDb21wb25lbnQgJWNvbXBvbmVudCUgaGFzIGFuIGV4cG9ydCBuYW1lZCBgJWtleSVgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBgYmluZDola2V5JWAsIHdoaWNoIGlzIGRpc2FsbG93ZWQuIEluc3RlYWQsIHVzZSBgYmluZDp0aGlzYCAoZS5nLiBgPCVuYW1lJSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5gKSBhbmQgdGhlbiBhY2Nlc3MgdGhlIHByb3BlcnR5IG9uIHRoZSBib3VuZCBjb21wb25lbnQgaW5zdGFuY2UgKGUuZy4gYGNvbXBvbmVudC4la2V5JWApXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9pbnZhbGlkX2V4cG9ydChjb21wb25lbnQsIGtleSwgbmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGJpbmRfaW52YWxpZF9leHBvcnRcXG5Db21wb25lbnQgJHtjb21wb25lbnR9IGhhcyBhbiBleHBvcnQgbmFtZWQgXFxgJHtrZXl9XFxgIHRoYXQgYSBjb25zdW1lciBjb21wb25lbnQgaXMgdHJ5aW5nIHRvIGFjY2VzcyB1c2luZyBcXGBiaW5kOiR7a2V5fVxcYCwgd2hpY2ggaXMgZGlzYWxsb3dlZC4gSW5zdGVhZCwgdXNlIFxcYGJpbmQ6dGhpc1xcYCAoZS5nLiBcXGA8JHtuYW1lfSBiaW5kOnRoaXM9e2NvbXBvbmVudH0gLz5cXGApIGFuZCB0aGVuIGFjY2VzcyB0aGUgcHJvcGVydHkgb24gdGhlIGJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZSAoZS5nLiBcXGBjb21wb25lbnQuJHtrZXl9XFxgKVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfaW52YWxpZF9leHBvcnRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2V4cG9ydGApO1xuXHR9XG59XG5cbi8qKlxuICogQSBjb21wb25lbnQgaXMgYXR0ZW1wdGluZyB0byBiaW5kIHRvIGEgbm9uLWJpbmRhYmxlIHByb3BlcnR5IGAla2V5JWAgYmVsb25naW5nIHRvICVjb21wb25lbnQlIChpLmUuIGA8JW5hbWUlIGJpbmQ6JWtleSU9ey4uLn0+YCkuIFRvIG1hcmsgYSBwcm9wZXJ0eSBhcyBiaW5kYWJsZTogYGxldCB7ICVrZXklID0gJGJpbmRhYmxlKCkgfSA9ICRwcm9wcygpYFxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmRfbm90X2JpbmRhYmxlKGtleSwgY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9ub3RfYmluZGFibGVcXG5BIGNvbXBvbmVudCBpcyBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYSBub24tYmluZGFibGUgcHJvcGVydHkgXFxgJHtrZXl9XFxgIGJlbG9uZ2luZyB0byAke2NvbXBvbmVudH0gKGkuZS4gXFxgPCR7bmFtZX0gYmluZDoke2tleX09ey4uLn0+XFxgKS4gVG8gbWFyayBhIHByb3BlcnR5IGFzIGJpbmRhYmxlOiBcXGBsZXQgeyAke2tleX0gPSAkYmluZGFibGUoKSB9ID0gJHByb3BzKClcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX25vdF9iaW5kYWJsZWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2FsbGluZyBgJW1ldGhvZCVgIG9uIGEgY29tcG9uZW50IGluc3RhbmNlIChvZiAlY29tcG9uZW50JSkgaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1XG4gKiBAcGFyYW0ge3N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb25lbnRfYXBpX2NoYW5nZWQobWV0aG9kLCBjb21wb25lbnQpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBjb21wb25lbnRfYXBpX2NoYW5nZWRcXG5DYWxsaW5nIFxcYCR7bWV0aG9kfVxcYCBvbiBhIGNvbXBvbmVudCBpbnN0YW5jZSAob2YgJHtjb21wb25lbnR9KSBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDVcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2NoYW5nZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvY29tcG9uZW50X2FwaV9jaGFuZ2VkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBdHRlbXB0ZWQgdG8gaW5zdGFudGlhdGUgJWNvbXBvbmVudCUgd2l0aCBgbmV3ICVuYW1lJWAsIHdoaWNoIGlzIG5vIGxvbmdlciB2YWxpZCBpbiBTdmVsdGUgNS4gSWYgdGhpcyBjb21wb25lbnQgaXMgbm90IHVuZGVyIHlvdXIgY29udHJvbCwgc2V0IHRoZSBgY29tcGF0aWJpbGl0eS5jb21wb25lbnRBcGlgIGNvbXBpbGVyIG9wdGlvbiB0byBgNGAgdG8ga2VlcCBpdCB3b3JraW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvbmVudF9hcGlfaW52YWxpZF9uZXcoY29tcG9uZW50LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgY29tcG9uZW50X2FwaV9pbnZhbGlkX25ld1xcbkF0dGVtcHRlZCB0byBpbnN0YW50aWF0ZSAke2NvbXBvbmVudH0gd2l0aCBcXGBuZXcgJHtuYW1lfVxcYCwgd2hpY2ggaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1LiBJZiB0aGlzIGNvbXBvbmVudCBpcyBub3QgdW5kZXIgeW91ciBjb250cm9sLCBzZXQgdGhlIFxcYGNvbXBhdGliaWxpdHkuY29tcG9uZW50QXBpXFxgIGNvbXBpbGVyIG9wdGlvbiB0byBcXGA0XFxgIHRvIGtlZXAgaXQgd29ya2luZy5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2ludmFsaWRfbmV3YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfaW52YWxpZF9uZXdgKTtcblx0fVxufVxuXG4vKipcbiAqIEEgZGVyaXZlZCB2YWx1ZSBjYW5ub3QgcmVmZXJlbmNlIGl0c2VsZiByZWN1cnNpdmVseVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGYoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZGVyaXZlZF9yZWZlcmVuY2VzX3NlbGZcXG5BIGRlcml2ZWQgdmFsdWUgY2Fubm90IHJlZmVyZW5jZSBpdHNlbGYgcmVjdXJzaXZlbHlcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9kZXJpdmVkX3JlZmVyZW5jZXNfc2VsZmApO1xuXHR9XG59XG5cbi8qKlxuICogS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBgJXZhbHVlJWAgYXQgaW5kZXhlcyAlYSUgYW5kICViJVxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXG4gKiBAcGFyYW0ge3N0cmluZyB8IHVuZGVmaW5lZCB8IG51bGx9IFt2YWx1ZV1cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hfa2V5X2R1cGxpY2F0ZShhLCBiLCB2YWx1ZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVhY2hfa2V5X2R1cGxpY2F0ZVxcbiR7dmFsdWVcblx0XHRcdD8gYEtleWVkIGVhY2ggYmxvY2sgaGFzIGR1cGxpY2F0ZSBrZXkgXFxgJHt2YWx1ZX1cXGAgYXQgaW5kZXhlcyAke2F9IGFuZCAke2J9YFxuXHRcdFx0OiBgS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBhdCBpbmRleGVzICR7YX0gYW5kICR7Yn1gfVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VhY2hfa2V5X2R1cGxpY2F0ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lYWNoX2tleV9kdXBsaWNhdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlcnVuZSVgIGNhbm5vdCBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgY2xlYW51cCBmdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bmVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF9pbl90ZWFyZG93bihydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWZmZWN0X2luX3RlYXJkb3duXFxuXFxgJHtydW5lfVxcYCBjYW5ub3QgYmUgdXNlZCBpbnNpZGUgYW4gZWZmZWN0IGNsZWFudXAgZnVuY3Rpb25cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdGVhcmRvd25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3RlYXJkb3duYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBFZmZlY3QgY2Fubm90IGJlIGNyZWF0ZWQgaW5zaWRlIGEgYCRkZXJpdmVkYCB2YWx1ZSB0aGF0IHdhcyBub3QgaXRzZWxmIGNyZWF0ZWQgaW5zaWRlIGFuIGVmZmVjdFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkXFxuRWZmZWN0IGNhbm5vdCBiZSBjcmVhdGVkIGluc2lkZSBhIFxcYCRkZXJpdmVkXFxgIHZhbHVlIHRoYXQgd2FzIG5vdCBpdHNlbGYgY3JlYXRlZCBpbnNpZGUgYW4gZWZmZWN0XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X2luX3Vub3duZWRfZGVyaXZlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJXJ1bmUlYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcbiAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3Rfb3JwaGFuKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3Rfb3JwaGFuXFxuXFxgJHtydW5lfVxcYCBjYW4gb25seSBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgKGUuZy4gZHVyaW5nIGNvbXBvbmVudCBpbml0aWFsaXNhdGlvbilcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3Rfb3JwaGFuYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9vcnBoYW5gKTtcblx0fVxufVxuXG4vKipcbiAqIE1heGltdW0gdXBkYXRlIGRlcHRoIGV4Y2VlZGVkLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBhIHJlYWN0aXZlIGJsb2NrIG9yIGVmZmVjdCByZXBlYXRlZGx5IHNldHMgYSBuZXcgdmFsdWUuIFN2ZWx0ZSBsaW1pdHMgdGhlIG51bWJlciBvZiBuZXN0ZWQgdXBkYXRlcyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RfdXBkYXRlX2RlcHRoX2V4Y2VlZGVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRcXG5NYXhpbXVtIHVwZGF0ZSBkZXB0aCBleGNlZWRlZC4gVGhpcyBjYW4gaGFwcGVuIHdoZW4gYSByZWFjdGl2ZSBibG9jayBvciBlZmZlY3QgcmVwZWF0ZWRseSBzZXRzIGEgbmV3IHZhbHVlLiBTdmVsdGUgbGltaXRzIHRoZSBudW1iZXIgb2YgbmVzdGVkIHVwZGF0ZXMgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZGApO1xuXHR9XG59XG5cbi8qKlxuICogYGdldEFib3J0U2lnbmFsKClgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvbigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBnZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25cXG5cXGBnZXRBYm9ydFNpZ25hbCgpXFxgIGNhbiBvbmx5IGJlIGNhbGxlZCBpbnNpZGUgYW4gZWZmZWN0IG9yIGRlcml2ZWRcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBGYWlsZWQgdG8gaHlkcmF0ZSB0aGUgYXBwbGljYXRpb25cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGh5ZHJhdGlvbl9mYWlsZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgaHlkcmF0aW9uX2ZhaWxlZFxcbkZhaWxlZCB0byBoeWRyYXRlIHRoZSBhcHBsaWNhdGlvblxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2h5ZHJhdGlvbl9mYWlsZWRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaHlkcmF0aW9uX2ZhaWxlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ291bGQgbm90IGB7QHJlbmRlcn1gIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIGBudWxsYCBvciBgdW5kZWZpbmVkYC4gQ29uc2lkZXIgdXNpbmcgb3B0aW9uYWwgY2hhaW5pbmcgYHtAcmVuZGVyIHNuaXBwZXQ/LigpfWBcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRfc25pcHBldCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBpbnZhbGlkX3NuaXBwZXRcXG5Db3VsZCBub3QgXFxge0ByZW5kZXJ9XFxgIHNuaXBwZXQgZHVlIHRvIHRoZSBleHByZXNzaW9uIGJlaW5nIFxcYG51bGxcXGAgb3IgXFxgdW5kZWZpbmVkXFxgLiBDb25zaWRlciB1c2luZyBvcHRpb25hbCBjaGFpbmluZyBcXGB7QHJlbmRlciBzbmlwcGV0Py4oKX1cXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9pbnZhbGlkX3NuaXBwZXRgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaW52YWxpZF9zbmlwcGV0YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgJW5hbWUlKC4uLilgIGNhbm5vdCBiZSB1c2VkIGluIHJ1bmVzIG1vZGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWZlY3ljbGVfbGVnYWN5X29ubHkobmFtZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGxpZmVjeWNsZV9sZWdhY3lfb25seVxcblxcYCR7bmFtZX0oLi4uKVxcYCBjYW5ub3QgYmUgdXNlZCBpbiBydW5lcyBtb2RlXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5YCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2xpZmVjeWNsZV9sZWdhY3lfb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IGRvIGBiaW5kOiVrZXklPXt1bmRlZmluZWR9YCB3aGVuIGAla2V5JWAgaGFzIGEgZmFsbGJhY2sgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3BzX2ludmFsaWRfdmFsdWUoa2V5KSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcHJvcHNfaW52YWxpZF92YWx1ZVxcbkNhbm5vdCBkbyBcXGBiaW5kOiR7a2V5fT17dW5kZWZpbmVkfVxcYCB3aGVuIFxcYCR7a2V5fVxcYCBoYXMgYSBmYWxsYmFjayB2YWx1ZVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX2ludmFsaWRfdmFsdWVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfaW52YWxpZF92YWx1ZWApO1xuXHR9XG59XG5cbi8qKlxuICogUmVzdCBlbGVtZW50IHByb3BlcnRpZXMgb2YgYCRwcm9wcygpYCBzdWNoIGFzIGAlcHJvcGVydHklYCBhcmUgcmVhZG9ubHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcHNfcmVzdF9yZWFkb25seShwcm9wZXJ0eSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYHByb3BzX3Jlc3RfcmVhZG9ubHlcXG5SZXN0IGVsZW1lbnQgcHJvcGVydGllcyBvZiBcXGAkcHJvcHMoKVxcYCBzdWNoIGFzIFxcYCR7cHJvcGVydHl9XFxgIGFyZSByZWFkb25seVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3Byb3BzX3Jlc3RfcmVhZG9ubHlgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfcmVzdF9yZWFkb25seWApO1xuXHR9XG59XG5cbi8qKlxuICogVGhlIGAlcnVuZSVgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIGAuc3ZlbHRlYCBhbmQgYC5zdmVsdGUuanMvdHNgIGZpbGVzXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuZV9vdXRzaWRlX3N2ZWx0ZShydW5lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcnVuZV9vdXRzaWRlX3N2ZWx0ZVxcblRoZSBcXGAke3J1bmV9XFxgIHJ1bmUgaXMgb25seSBhdmFpbGFibGUgaW5zaWRlIFxcYC5zdmVsdGVcXGAgYW5kIFxcYC5zdmVsdGUuanMvdHNcXGAgZmlsZXNcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9ydW5lX291dHNpZGVfc3ZlbHRlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3J1bmVfb3V0c2lkZV9zdmVsdGVgKTtcblx0fVxufVxuXG4vKipcbiAqIFByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gYCRzdGF0ZWAgb2JqZWN0cyBtdXN0IGNvbnRhaW4gYHZhbHVlYCBhbmQgYWx3YXlzIGJlIGBlbnVtZXJhYmxlYCwgYGNvbmZpZ3VyYWJsZWAgYW5kIGB3cml0YWJsZWAuXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV9kZXNjcmlwdG9yc19maXhlZFxcblByb3BlcnR5IGRlc2NyaXB0b3JzIGRlZmluZWQgb24gXFxgJHN0YXRlXFxgIG9iamVjdHMgbXVzdCBjb250YWluIFxcYHZhbHVlXFxgIGFuZCBhbHdheXMgYmUgXFxgZW51bWVyYWJsZVxcYCwgXFxgY29uZmlndXJhYmxlXFxgIGFuZCBcXGB3cml0YWJsZVxcYC5cXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9kZXNjcmlwdG9yc19maXhlZGApO1xuXHR9XG59XG5cbi8qKlxuICogQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgYCRzdGF0ZWAgb2JqZWN0XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV9wcm90b3R5cGVfZml4ZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfcHJvdG90eXBlX2ZpeGVkXFxuQ2Fubm90IHNldCBwcm90b3R5cGUgb2YgXFxgJHN0YXRlXFxgIG9iamVjdFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Byb3RvdHlwZV9maXhlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV9wcm90b3R5cGVfZml4ZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIFVwZGF0aW5nIHN0YXRlIGluc2lkZSBgJGRlcml2ZWQoLi4uKWAsIGAkaW5zcGVjdCguLi4pYCBvciBhIHRlbXBsYXRlIGV4cHJlc3Npb24gaXMgZm9yYmlkZGVuLiBJZiB0aGUgdmFsdWUgc2hvdWxkIG5vdCBiZSByZWFjdGl2ZSwgZGVjbGFyZSBpdCB3aXRob3V0IGAkc3RhdGVgXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0ZV91bnNhZmVfbXV0YXRpb24oKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc3RhdGVfdW5zYWZlX211dGF0aW9uXFxuVXBkYXRpbmcgc3RhdGUgaW5zaWRlIFxcYCRkZXJpdmVkKC4uLilcXGAsIFxcYCRpbnNwZWN0KC4uLilcXGAgb3IgYSB0ZW1wbGF0ZSBleHByZXNzaW9uIGlzIGZvcmJpZGRlbi4gSWYgdGhlIHZhbHVlIHNob3VsZCBub3QgYmUgcmVhY3RpdmUsIGRlY2xhcmUgaXQgd2l0aG91dCBcXGAkc3RhdGVcXGBcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV91bnNhZmVfbXV0YXRpb25gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2Uvc3RhdGVfdW5zYWZlX211dGF0aW9uYCk7XG5cdH1cbn0iLCIvKiogQGltcG9ydCB7IENvbXBvbmVudENvbnRleHQsIENvbXBvbmVudENvbnRleHRMZWdhY3kgfSBmcm9tICcjY2xpZW50JyAqL1xuLyoqIEBpbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuL2luZGV4LmpzJyAqL1xuLyoqIEBpbXBvcnQgeyBOb3RGdW5jdGlvbiB9IGZyb20gJy4vaW50ZXJuYWwvdHlwZXMuanMnICovXG5pbXBvcnQgeyBhY3RpdmVfcmVhY3Rpb24sIHVudHJhY2sgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9ydW50aW1lLmpzJztcbmltcG9ydCB7IGlzX2FycmF5IH0gZnJvbSAnLi9pbnRlcm5hbC9zaGFyZWQvdXRpbHMuanMnO1xuaW1wb3J0IHsgdXNlcl9lZmZlY3QgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9pbmRleC5qcyc7XG5pbXBvcnQgKiBhcyBlIGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZC9lcnJvcnMuanMnO1xuaW1wb3J0IHsgbGVnYWN5X21vZGVfZmxhZyB9IGZyb20gJy4vaW50ZXJuYWwvZmxhZ3MvaW5kZXguanMnO1xuaW1wb3J0IHsgY29tcG9uZW50X2NvbnRleHQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9jb250ZXh0LmpzJztcbmltcG9ydCB7IERFViB9IGZyb20gJ2VzbS1lbnYnO1xuXG5pZiAoREVWKSB7XG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuXHQgKi9cblx0ZnVuY3Rpb24gdGhyb3dfcnVuZV9lcnJvcihydW5lKSB7XG5cdFx0aWYgKCEocnVuZSBpbiBnbG9iYWxUaGlzKSkge1xuXHRcdFx0Ly8gVE9ETyBpZiBwZW9wbGUgc3RhcnQgYWRqdXN0aW5nIHRoZSBcInRoaXMgY2FuIGNvbnRhaW4gcnVuZXNcIiBjb25maWcgdGhyb3VnaCB2LXAtcyBtb3JlLCBhZGp1c3QgdGhpcyBtZXNzYWdlXG5cdFx0XHQvKiogQHR5cGUge2FueX0gKi9cblx0XHRcdGxldCB2YWx1ZTsgLy8gbGV0J3MgaG9wZSBub29uZSBtb2RpZmllcyB0aGlzIGdsb2JhbCwgYnV0IGJlbHRzIGFuZCBicmFjZXNcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWxUaGlzLCBydW5lLCB7XG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdldHRlci1yZXR1cm5cblx0XHRcdFx0Z2V0OiAoKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlLnJ1bmVfb3V0c2lkZV9zdmVsdGUocnVuZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldDogKHYpID0+IHtcblx0XHRcdFx0XHR2YWx1ZSA9IHY7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHRocm93X3J1bmVfZXJyb3IoJyRzdGF0ZScpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckZWZmZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRkZXJpdmVkJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRpbnNwZWN0Jyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRwcm9wcycpO1xuXHR0aHJvd19ydW5lX2Vycm9yKCckYmluZGFibGUnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFtgQWJvcnRTaWduYWxgXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQWJvcnRTaWduYWwpIHRoYXQgYWJvcnRzIHdoZW4gdGhlIGN1cnJlbnQgW2Rlcml2ZWRdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZGVyaXZlZCkgb3IgW2VmZmVjdF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIHJlLXJ1bnMgb3IgaXMgZGVzdHJveWVkLlxuICpcbiAqIE11c3QgYmUgY2FsbGVkIHdoaWxlIGEgZGVyaXZlZCBvciBlZmZlY3QgaXMgcnVubmluZy5cbiAqXG4gKiBgYGBzdmVsdGVcbiAqIDxzY3JpcHQ+XG4gKiBcdGltcG9ydCB7IGdldEFib3J0U2lnbmFsIH0gZnJvbSAnc3ZlbHRlJztcbiAqXG4gKiBcdGxldCB7IGlkIH0gPSAkcHJvcHMoKTtcbiAqXG4gKiBcdGFzeW5jIGZ1bmN0aW9uIGdldERhdGEoaWQpIHtcbiAqIFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAvaXRlbXMvJHtpZH1gLCB7XG4gKiBcdFx0XHRzaWduYWw6IGdldEFib3J0U2lnbmFsKClcbiAqIFx0XHR9KTtcbiAqXG4gKiBcdFx0cmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAqIFx0fVxuICpcbiAqIFx0Y29uc3QgZGF0YSA9ICRkZXJpdmVkKGF3YWl0IGdldERhdGEoaWQpKTtcbiAqIDwvc2NyaXB0PlxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm9ydFNpZ25hbCgpIHtcblx0aWYgKGFjdGl2ZV9yZWFjdGlvbiA9PT0gbnVsbCkge1xuXHRcdGUuZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uKCk7XG5cdH1cblxuXHRyZXR1cm4gKGFjdGl2ZV9yZWFjdGlvbi5hYyA/Pz0gbmV3IEFib3J0Q29udHJvbGxlcigpKS5zaWduYWw7XG59XG5cbi8qKlxuICogYG9uTW91bnRgLCBsaWtlIFtgJGVmZmVjdGBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0KSwgc2NoZWR1bGVzIGEgZnVuY3Rpb24gdG8gcnVuIGFzIHNvb24gYXMgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiBtb3VudGVkIHRvIHRoZSBET00uXG4gKiBVbmxpa2UgYCRlZmZlY3RgLCB0aGUgcHJvdmlkZWQgZnVuY3Rpb24gb25seSBydW5zIG9uY2UuXG4gKlxuICogSXQgbXVzdCBiZSBjYWxsZWQgZHVyaW5nIHRoZSBjb21wb25lbnQncyBpbml0aWFsaXNhdGlvbiAoYnV0IGRvZXNuJ3QgbmVlZCB0byBsaXZlIF9pbnNpZGVfIHRoZSBjb21wb25lbnQ7XG4gKiBpdCBjYW4gYmUgY2FsbGVkIGZyb20gYW4gZXh0ZXJuYWwgbW9kdWxlKS4gSWYgYSBmdW5jdGlvbiBpcyByZXR1cm5lZCBfc3luY2hyb25vdXNseV8gZnJvbSBgb25Nb3VudGAsXG4gKiBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIGBvbk1vdW50YCBmdW5jdGlvbnMgZG8gbm90IHJ1biBkdXJpbmcgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL3N2ZWx0ZS1zZXJ2ZXIjcmVuZGVyKS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHsoKSA9PiBOb3RGdW5jdGlvbjxUPiB8IFByb21pc2U8Tm90RnVuY3Rpb248VD4+IHwgKCgpID0+IGFueSl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uTW91bnQoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbk1vdW50Jyk7XG5cdH1cblxuXHRpZiAobGVnYWN5X21vZGVfZmxhZyAmJiBjb21wb25lbnRfY29udGV4dC5sICE9PSBudWxsKSB7XG5cdFx0aW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbXBvbmVudF9jb250ZXh0KS5tLnB1c2goZm4pO1xuXHR9IGVsc2Uge1xuXHRcdHVzZXJfZWZmZWN0KCgpID0+IHtcblx0XHRcdGNvbnN0IGNsZWFudXAgPSB1bnRyYWNrKGZuKTtcblx0XHRcdGlmICh0eXBlb2YgY2xlYW51cCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIC8qKiBAdHlwZSB7KCkgPT4gdm9pZH0gKi8gKGNsZWFudXApO1xuXHRcdH0pO1xuXHR9XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHVubW91bnRlZC5cbiAqXG4gKiBPdXQgb2YgYG9uTW91bnRgLCBgYmVmb3JlVXBkYXRlYCwgYGFmdGVyVXBkYXRlYCBhbmQgYG9uRGVzdHJveWAsIHRoaXMgaXMgdGhlXG4gKiBvbmx5IG9uZSB0aGF0IHJ1bnMgaW5zaWRlIGEgc2VydmVyLXNpZGUgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7KCkgPT4gYW55fSBmblxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvbkRlc3Ryb3koZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdvbkRlc3Ryb3knKTtcblx0fVxuXG5cdG9uTW91bnQoKCkgPT4gKCkgPT4gdW50cmFjayhmbikpO1xufVxuXG4vKipcbiAqIEB0ZW1wbGF0ZSBbVD1hbnldXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtUfSBbZGV0YWlsXVxuICogQHBhcmFtIHthbnl9cGFyYW1zXzBcbiAqIEByZXR1cm5zIHtDdXN0b21FdmVudDxUPn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlX2N1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwsIHsgYnViYmxlcyA9IGZhbHNlLCBjYW5jZWxhYmxlID0gZmFsc2UgfSA9IHt9KSB7XG5cdHJldHVybiBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBkZXRhaWwsIGJ1YmJsZXMsIGNhbmNlbGFibGUgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBldmVudCBkaXNwYXRjaGVyIHRoYXQgY2FuIGJlIHVzZWQgdG8gZGlzcGF0Y2ggW2NvbXBvbmVudCBldmVudHNdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS9sZWdhY3ktb24jQ29tcG9uZW50LWV2ZW50cykuXG4gKiBFdmVudCBkaXNwYXRjaGVycyBhcmUgZnVuY3Rpb25zIHRoYXQgY2FuIHRha2UgdHdvIGFyZ3VtZW50czogYG5hbWVgIGFuZCBgZGV0YWlsYC5cbiAqXG4gKiBDb21wb25lbnQgZXZlbnRzIGNyZWF0ZWQgd2l0aCBgY3JlYXRlRXZlbnREaXNwYXRjaGVyYCBjcmVhdGUgYVxuICogW0N1c3RvbUV2ZW50XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQpLlxuICogVGhlc2UgZXZlbnRzIGRvIG5vdCBbYnViYmxlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0xlYXJuL0phdmFTY3JpcHQvQnVpbGRpbmdfYmxvY2tzL0V2ZW50cyNFdmVudF9idWJibGluZ19hbmRfY2FwdHVyZSkuXG4gKiBUaGUgYGRldGFpbGAgYXJndW1lbnQgY29ycmVzcG9uZHMgdG8gdGhlIFtDdXN0b21FdmVudC5kZXRhaWxdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC9kZXRhaWwpXG4gKiBwcm9wZXJ0eSBhbmQgY2FuIGNvbnRhaW4gYW55IHR5cGUgb2YgZGF0YS5cbiAqXG4gKiBUaGUgZXZlbnQgZGlzcGF0Y2hlciBjYW4gYmUgdHlwZWQgdG8gbmFycm93IHRoZSBhbGxvd2VkIGV2ZW50IG5hbWVzIGFuZCB0aGUgdHlwZSBvZiB0aGUgYGRldGFpbGAgYXJndW1lbnQ6XG4gKiBgYGB0c1xuICogY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXI8e1xuICogIGxvYWRlZDogbnVsbDsgLy8gZG9lcyBub3QgdGFrZSBhIGRldGFpbCBhcmd1bWVudFxuICogIGNoYW5nZTogc3RyaW5nOyAvLyB0YWtlcyBhIGRldGFpbCBhcmd1bWVudCBvZiB0eXBlIHN0cmluZywgd2hpY2ggaXMgcmVxdWlyZWRcbiAqICBvcHRpb25hbDogbnVtYmVyIHwgbnVsbDsgLy8gdGFrZXMgYW4gb3B0aW9uYWwgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgbnVtYmVyXG4gKiB9PigpO1xuICogYGBgXG4gKlxuICogQGRlcHJlY2F0ZWQgVXNlIGNhbGxiYWNrIHByb3BzIGFuZC9vciB0aGUgYCRob3N0KClgIHJ1bmUgaW5zdGVhZCDigJQgc2VlIFttaWdyYXRpb24gZ3VpZGVdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS92NS1taWdyYXRpb24tZ3VpZGUjRXZlbnQtY2hhbmdlcy1Db21wb25lbnQtZXZlbnRzKVxuICogQHRlbXBsYXRlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSBbRXZlbnRNYXAgPSBhbnldXG4gKiBAcmV0dXJucyB7RXZlbnREaXNwYXRjaGVyPEV2ZW50TWFwPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcigpIHtcblx0Y29uc3QgYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0ID0gY29tcG9uZW50X2NvbnRleHQ7XG5cdGlmIChhY3RpdmVfY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2NyZWF0ZUV2ZW50RGlzcGF0Y2hlcicpO1xuXHR9XG5cblx0cmV0dXJuICh0eXBlLCBkZXRhaWwsIG9wdGlvbnMpID0+IHtcblx0XHRjb25zdCBldmVudHMgPSAvKiogQHR5cGUge1JlY29yZDxzdHJpbmcsIEZ1bmN0aW9uIHwgRnVuY3Rpb25bXT59ICovIChcblx0XHRcdGFjdGl2ZV9jb21wb25lbnRfY29udGV4dC5zLiQkZXZlbnRzXG5cdFx0KT8uWy8qKiBAdHlwZSB7YW55fSAqLyAodHlwZSldO1xuXG5cdFx0aWYgKGV2ZW50cykge1xuXHRcdFx0Y29uc3QgY2FsbGJhY2tzID0gaXNfYXJyYXkoZXZlbnRzKSA/IGV2ZW50cy5zbGljZSgpIDogW2V2ZW50c107XG5cdFx0XHQvLyBUT0RPIGFyZSB0aGVyZSBzaXR1YXRpb25zIHdoZXJlIGV2ZW50cyBjb3VsZCBiZSBkaXNwYXRjaGVkXG5cdFx0XHQvLyBpbiBhIHNlcnZlciAobm9uLURPTSkgZW52aXJvbm1lbnQ/XG5cdFx0XHRjb25zdCBldmVudCA9IGNyZWF0ZV9jdXN0b21fZXZlbnQoLyoqIEB0eXBlIHtzdHJpbmd9ICovICh0eXBlKSwgZGV0YWlsLCBvcHRpb25zKTtcblx0XHRcdGZvciAoY29uc3QgZm4gb2YgY2FsbGJhY2tzKSB7XG5cdFx0XHRcdGZuLmNhbGwoYWN0aXZlX2NvbXBvbmVudF9jb250ZXh0LngsIGV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcbn1cblxuLy8gVE9ETyBtYXJrIGJlZm9yZVVwZGF0ZSBhbmQgYWZ0ZXJVcGRhdGUgYXMgZGVwcmVjYXRlZCBpbiBTdmVsdGUgNlxuXG4vKipcbiAqIFNjaGVkdWxlcyBhIGNhbGxiYWNrIHRvIHJ1biBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyB1cGRhdGVkIGFmdGVyIGFueSBzdGF0ZSBjaGFuZ2UuXG4gKlxuICogVGhlIGZpcnN0IHRpbWUgdGhlIGNhbGxiYWNrIHJ1bnMgd2lsbCBiZSBiZWZvcmUgdGhlIGluaXRpYWwgYG9uTW91bnRgLlxuICpcbiAqIEluIHJ1bmVzIG1vZGUgdXNlIGAkZWZmZWN0LnByZWAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0LnByZWBdKGh0dHBzOi8vc3ZlbHRlLmRldi9kb2NzL3N2ZWx0ZS8kZWZmZWN0IyRlZmZlY3QucHJlKSBpbnN0ZWFkXG4gKiBAcGFyYW0geygpID0+IHZvaWR9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2JlZm9yZVVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYmVmb3JlVXBkYXRlJyk7XG5cdH1cblxuXHRpbml0X3VwZGF0ZV9jYWxsYmFja3MoY29tcG9uZW50X2NvbnRleHQpLmIucHVzaChmbik7XG59XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdXBkYXRlZC5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGFmdGVyIHRoZSBpbml0aWFsIGBvbk1vdW50YC5cbiAqXG4gKiBJbiBydW5lcyBtb2RlIHVzZSBgJGVmZmVjdGAgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgW2AkZWZmZWN0YF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpIGluc3RlYWRcbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWZ0ZXJVcGRhdGUoZm4pIHtcblx0aWYgKGNvbXBvbmVudF9jb250ZXh0ID09PSBudWxsKSB7XG5cdFx0bGlmZWN5Y2xlX291dHNpZGVfY29tcG9uZW50KCdhZnRlclVwZGF0ZScpO1xuXHR9XG5cblx0aWYgKGNvbXBvbmVudF9jb250ZXh0LmwgPT09IG51bGwpIHtcblx0XHRlLmxpZmVjeWNsZV9sZWdhY3lfb25seSgnYWZ0ZXJVcGRhdGUnKTtcblx0fVxuXG5cdGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb21wb25lbnRfY29udGV4dCkuYS5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBMZWdhY3ktbW9kZTogSW5pdCBjYWxsYmFja3Mgb2JqZWN0IGZvciBvbk1vdW50L2JlZm9yZVVwZGF0ZS9hZnRlclVwZGF0ZVxuICogQHBhcmFtIHtDb21wb25lbnRDb250ZXh0fSBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb250ZXh0KSB7XG5cdHZhciBsID0gLyoqIEB0eXBlIHtDb21wb25lbnRDb250ZXh0TGVnYWN5fSAqLyAoY29udGV4dCkubDtcblx0cmV0dXJuIChsLnUgPz89IHsgYTogW10sIGI6IFtdLCBtOiBbXSB9KTtcbn1cblxuZXhwb3J0IHsgZmx1c2hTeW5jIH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvcnVudGltZS5qcyc7XG5leHBvcnQgeyBnZXRDb250ZXh0LCBnZXRBbGxDb250ZXh0cywgaGFzQ29udGV4dCwgc2V0Q29udGV4dCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2NvbnRleHQuanMnO1xuZXhwb3J0IHsgaHlkcmF0ZSwgbW91bnQsIHVubW91bnQgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9yZW5kZXIuanMnO1xuZXhwb3J0IHsgdGljaywgdW50cmFjayB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3J1bnRpbWUuanMnO1xuZXhwb3J0IHsgY3JlYXRlUmF3U25pcHBldCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2RvbS9ibG9ja3Mvc25pcHBldC5qcyc7XG4iLCIvKiogQGltcG9ydCB7IFJlYWRhYmxlLCBTdGFydFN0b3BOb3RpZmllciwgU3Vic2NyaWJlciwgVW5zdWJzY3JpYmVyLCBVcGRhdGVyLCBXcml0YWJsZSB9IGZyb20gJy4uL3B1YmxpYy5qcycgKi9cbi8qKiBAaW1wb3J0IHsgU3RvcmVzLCBTdG9yZXNWYWx1ZXMsIFN1YnNjcmliZUludmFsaWRhdGVUdXBsZSB9IGZyb20gJy4uL3ByaXZhdGUuanMnICovXG5pbXBvcnQgeyBub29wLCBydW5fYWxsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvc2hhcmVkL3V0aWxzLmpzJztcbmltcG9ydCB7IHNhZmVfbm90X2VxdWFsIH0gZnJvbSAnLi4vLi4vaW50ZXJuYWwvY2xpZW50L3JlYWN0aXZpdHkvZXF1YWxpdHkuanMnO1xuaW1wb3J0IHsgc3Vic2NyaWJlX3RvX3N0b3JlIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG4vKipcbiAqIEB0eXBlIHtBcnJheTxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8YW55PiB8IGFueT59XG4gKi9cbmNvbnN0IHN1YnNjcmliZXJfcXVldWUgPSBbXTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtUfSBbdmFsdWVdIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI8VD59IFtzdGFydF1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRhYmxlKHZhbHVlLCBzdGFydCkge1xuXHRyZXR1cm4ge1xuXHRcdHN1YnNjcmliZTogd3JpdGFibGUodmFsdWUsIHN0YXJ0KS5zdWJzY3JpYmVcblx0fTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgV3JpdGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIGJvdGggdXBkYXRpbmcgYW5kIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1R9IFt2YWx1ZV0gaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcjxUPn0gW3N0YXJ0XVxuICogQHJldHVybnMge1dyaXRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuXHQvKiogQHR5cGUge1Vuc3Vic2NyaWJlciB8IG51bGx9ICovXG5cdGxldCBzdG9wID0gbnVsbDtcblxuXHQvKiogQHR5cGUge1NldDxTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8VD4+fSAqL1xuXHRjb25zdCBzdWJzY3JpYmVycyA9IG5ldyBTZXQoKTtcblxuXHQvKipcblx0ICogQHBhcmFtIHtUfSBuZXdfdmFsdWVcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XG5cdFx0aWYgKHNhZmVfbm90X2VxdWFsKHZhbHVlLCBuZXdfdmFsdWUpKSB7XG5cdFx0XHR2YWx1ZSA9IG5ld192YWx1ZTtcblx0XHRcdGlmIChzdG9wKSB7XG5cdFx0XHRcdC8vIHN0b3JlIGlzIHJlYWR5XG5cdFx0XHRcdGNvbnN0IHJ1bl9xdWV1ZSA9ICFzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChjb25zdCBzdWJzY3JpYmVyIG9mIHN1YnNjcmliZXJzKSB7XG5cdFx0XHRcdFx0c3Vic2NyaWJlclsxXSgpO1xuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUucHVzaChzdWJzY3JpYmVyLCB2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJ1bl9xdWV1ZSkge1xuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7IGkgKz0gMikge1xuXHRcdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZVtpXVswXShzdWJzY3JpYmVyX3F1ZXVlW2kgKyAxXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1VwZGF0ZXI8VD59IGZuXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG5cdFx0c2V0KGZuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7U3Vic2NyaWJlcjxUPn0gcnVuXG5cdCAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gW2ludmFsaWRhdGVdXG5cdCAqIEByZXR1cm5zIHtVbnN1YnNjcmliZXJ9XG5cdCAqL1xuXHRmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuXHRcdC8qKiBAdHlwZSB7U3Vic2NyaWJlSW52YWxpZGF0ZVR1cGxlPFQ+fSAqL1xuXHRcdGNvbnN0IHN1YnNjcmliZXIgPSBbcnVuLCBpbnZhbGlkYXRlXTtcblx0XHRzdWJzY3JpYmVycy5hZGQoc3Vic2NyaWJlcik7XG5cdFx0aWYgKHN1YnNjcmliZXJzLnNpemUgPT09IDEpIHtcblx0XHRcdHN0b3AgPSBzdGFydChzZXQsIHVwZGF0ZSkgfHwgbm9vcDtcblx0XHR9XG5cdFx0cnVuKC8qKiBAdHlwZSB7VH0gKi8gKHZhbHVlKSk7XG5cdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdHN1YnNjcmliZXJzLmRlbGV0ZShzdWJzY3JpYmVyKTtcblx0XHRcdGlmIChzdWJzY3JpYmVycy5zaXplID09PSAwICYmIHN0b3ApIHtcblx0XHRcdFx0c3RvcCgpO1xuXHRcdFx0XHRzdG9wID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiB7IHNldCwgdXBkYXRlLCBzdWJzY3JpYmUgfTtcbn1cblxuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBTdG9yZXNWYWx1ZXM8Uz4sIHNldDogKHZhbHVlOiBUKSA9PiB2b2lkLCB1cGRhdGU6IChmbjogVXBkYXRlcjxUPikgPT4gdm9pZCkgPT4gVW5zdWJzY3JpYmVyIHwgdm9pZH0gZm5cbiAqIEBwYXJhbSB7VH0gW2luaXRpYWxfdmFsdWVdXG4gKiBAcmV0dXJucyB7UmVhZGFibGU8VD59XG4gKi9cbi8qKlxuICogRGVyaXZlZCB2YWx1ZSBzdG9yZSBieSBzeW5jaHJvbml6aW5nIG9uZSBvciBtb3JlIHJlYWRhYmxlIHN0b3JlcyBhbmRcbiAqIGFwcGx5aW5nIGFuIGFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIG92ZXIgaXRzIGlucHV0IHZhbHVlcy5cbiAqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBvdmVybG9hZFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7KHZhbHVlczogU3RvcmVzVmFsdWVzPFM+KSA9PiBUfSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuLyoqXG4gKiBAdGVtcGxhdGUge1N0b3Jlc30gU1xuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7U30gc3RvcmVzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZWQoc3RvcmVzLCBmbiwgaW5pdGlhbF92YWx1ZSkge1xuXHRjb25zdCBzaW5nbGUgPSAhQXJyYXkuaXNBcnJheShzdG9yZXMpO1xuXHQvKiogQHR5cGUge0FycmF5PFJlYWRhYmxlPGFueT4+fSAqL1xuXHRjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGUgPyBbc3RvcmVzXSA6IHN0b3Jlcztcblx0aWYgKCFzdG9yZXNfYXJyYXkuZXZlcnkoQm9vbGVhbikpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2Rlcml2ZWQoKSBleHBlY3RzIHN0b3JlcyBhcyBpbnB1dCwgZ290IGEgZmFsc3kgdmFsdWUnKTtcblx0fVxuXHRjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcblx0cmV0dXJuIHJlYWRhYmxlKGluaXRpYWxfdmFsdWUsIChzZXQsIHVwZGF0ZSkgPT4ge1xuXHRcdGxldCBzdGFydGVkID0gZmFsc2U7XG5cdFx0LyoqIEB0eXBlIHtUW119ICovXG5cdFx0Y29uc3QgdmFsdWVzID0gW107XG5cdFx0bGV0IHBlbmRpbmcgPSAwO1xuXHRcdGxldCBjbGVhbnVwID0gbm9vcDtcblx0XHRjb25zdCBzeW5jID0gKCkgPT4ge1xuXHRcdFx0aWYgKHBlbmRpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y2xlYW51cCgpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQsIHVwZGF0ZSk7XG5cdFx0XHRpZiAoYXV0bykge1xuXHRcdFx0XHRzZXQocmVzdWx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNsZWFudXAgPSB0eXBlb2YgcmVzdWx0ID09PSAnZnVuY3Rpb24nID8gcmVzdWx0IDogbm9vcDtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGNvbnN0IHVuc3Vic2NyaWJlcnMgPSBzdG9yZXNfYXJyYXkubWFwKChzdG9yZSwgaSkgPT5cblx0XHRcdHN1YnNjcmliZV90b19zdG9yZShcblx0XHRcdFx0c3RvcmUsXG5cdFx0XHRcdCh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdHZhbHVlc1tpXSA9IHZhbHVlO1xuXHRcdFx0XHRcdHBlbmRpbmcgJj0gfigxIDw8IGkpO1xuXHRcdFx0XHRcdGlmIChzdGFydGVkKSB7XG5cdFx0XHRcdFx0XHRzeW5jKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0cGVuZGluZyB8PSAxIDw8IGk7XG5cdFx0XHRcdH1cblx0XHRcdClcblx0XHQpO1xuXHRcdHN0YXJ0ZWQgPSB0cnVlO1xuXHRcdHN5bmMoKTtcblx0XHRyZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRcdHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG5cdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHQvLyBXZSBuZWVkIHRvIHNldCB0aGlzIHRvIGZhbHNlIGJlY2F1c2UgY2FsbGJhY2tzIGNhbiBzdGlsbCBoYXBwZW4gZGVzcGl0ZSBoYXZpbmcgdW5zdWJzY3JpYmVkOlxuXHRcdFx0Ly8gQ2FsbGJhY2tzIG1pZ2h0IGFscmVhZHkgYmUgcGxhY2VkIGluIHRoZSBxdWV1ZSB3aGljaCBkb2Vzbid0IGtub3cgaXQgc2hvdWxkIG5vIGxvbmdlclxuXHRcdFx0Ly8gaW52b2tlIHRoaXMgZGVyaXZlZCBzdG9yZS5cblx0XHRcdHN0YXJ0ZWQgPSBmYWxzZTtcblx0XHR9O1xuXHR9KTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHN0b3JlIGFuZCByZXR1cm5zIGEgbmV3IG9uZSBkZXJpdmVkIGZyb20gdGhlIG9sZCBvbmUgdGhhdCBpcyByZWFkYWJsZS5cbiAqXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtSZWFkYWJsZTxUPn0gc3RvcmUgIC0gc3RvcmUgdG8gbWFrZSByZWFkb25seVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZG9ubHkoc3RvcmUpIHtcblx0cmV0dXJuIHtcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yIFRPRE8gaSBzdXNwZWN0IHRoZSBiaW5kIGlzIHVubmVjZXNzYXJ5XG5cdFx0c3Vic2NyaWJlOiBzdG9yZS5zdWJzY3JpYmUuYmluZChzdG9yZSlcblx0fTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgZnJvbSBhIHN0b3JlIGJ5IHN1YnNjcmliaW5nIGFuZCBpbW1lZGlhdGVseSB1bnN1YnNjcmliaW5nLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1JlYWRhYmxlPFQ+fSBzdG9yZVxuICogQHJldHVybnMge1R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQoc3RvcmUpIHtcblx0bGV0IHZhbHVlO1xuXHRzdWJzY3JpYmVfdG9fc3RvcmUoc3RvcmUsIChfKSA9PiAodmFsdWUgPSBfKSkoKTtcblx0Ly8gQHRzLWV4cGVjdC1lcnJvclxuXHRyZXR1cm4gdmFsdWU7XG59XG4iLCJpbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xyXG5cclxuLyoqXHJcbiAqIFJlcHJlc2VudHMgdGhlIHN5bmMgc3RhdHVzIG9mIHRoZSBhcHBsaWNhdGlvbi5cclxuICovXHJcbmV4cG9ydCB0eXBlIFN5bmNTdGF0dXMgPSAnaWRsZScgfCAnc3luY2luZycgfCAnc3luY2VkJyB8ICdlcnJvcic7XHJcblxyXG4vKipcclxuICogUmVwcmVzZW50cyB0aGUgc3luYyBzdGF0ZSBpbmZvcm1hdGlvbi5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3luY1N0YXRlIHtcclxuICBzdGF0dXM6IFN5bmNTdGF0dXM7XHJcbiAgbGFzdFN5bmNUaW1lPzogbnVtYmVyO1xyXG4gIGxhc3RFcnJvck1lc3NhZ2U/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgbWFpbiBkYXRhIHN0cnVjdHVyZSBmb3IgdGhlIGFwcGxpY2F0aW9uJ3Mgc3RvcmFnZS5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXBwRGF0YSB7XHJcbiAgZm9sZGVyczogRm9sZGVyW107XHJcbiAgdGFnczogVGFnW107XHJcbiAgLy8gQm9va21hcmtzIHdpbGwgYmUgbmVzdGVkIHdpdGhpbiBmb2xkZXJzLCBidXQgd2UgY2FuIGhhdmUgYSBmbGF0IGxpc3QgZm9yIGVhc3kgYWNjZXNzIGlmIG5lZWRlZC5cclxufVxyXG5cclxuY29uc3QgU1RPUkFHRV9LRVkgPSAnYXBwRGF0YSc7XHJcbmNvbnN0IFNZTkNfU1RBVFVTX0tFWSA9ICdzeW5jU3RhdHVzJztcclxuXHJcbi8qKlxyXG4gKiBUaGUgZGVmYXVsdCBzdGF0ZSBvZiB0aGUgYXBwbGljYXRpb24gZGF0YS5cclxuICovXHJcbmNvbnN0IGRlZmF1bHREYXRhOiBBcHBEYXRhID0ge1xyXG4gIGZvbGRlcnM6IFtcclxuICAgIHtcclxuICAgICAgaWQ6ICdyb290JyxcclxuICAgICAgbmFtZTogJ1Jvb3QnLFxyXG4gICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgIH1cclxuICBdLFxyXG4gIHRhZ3M6IFtdLFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlcyBhbGwgYXBwbGljYXRpb24gZGF0YSBmcm9tIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxyXG4gKiBJZiBubyBkYXRhIGlzIGZvdW5kLCBpdCBpbml0aWFsaXplcyB3aXRoIHRoZSBkZWZhdWx0IHN0cnVjdHVyZS5cclxuICpcclxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIEFwcERhdGEgb2JqZWN0LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFwcERhdGEoKTogUHJvbWlzZTxBcHBEYXRhPiB7XHJcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFNUT1JBR0VfS0VZKTtcclxuICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZXSkge1xyXG4gICAgcmV0dXJuIHJlc3VsdFtTVE9SQUdFX0tFWV0gYXMgQXBwRGF0YTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSBzdG9yYWdlIHdpdGggZGVmYXVsdCBkYXRhIGlmIGl0J3MgdGhlIGZpcnN0IHJ1blxyXG4gICAgYXdhaXQgc2V0QXBwRGF0YShkZWZhdWx0RGF0YSk7XHJcbiAgICByZXR1cm4gZGVmYXVsdERhdGE7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU2F2ZXMgdGhlIGVudGlyZSBhcHBsaWNhdGlvbiBkYXRhIG9iamVjdCB0byBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cclxuICpcclxuICogQHBhcmFtIGRhdGEgVGhlIEFwcERhdGEgb2JqZWN0IHRvIHNhdmUuXHJcbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGRhdGEgaXMgc2F2ZWQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0QXBwRGF0YShkYXRhOiBBcHBEYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZXTogZGF0YSB9KTtcclxufVxyXG5cclxuLy8gLS0tIENSVUQgT3BlcmF0aW9ucyBmb3IgRm9sZGVycyAtLS1cclxuXHJcbi8qKlxyXG4gKiBBZGRzIGEgbmV3IGZvbGRlciB0byBhIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBwYXJlbnRGb2xkZXJJZCBUaGUgSUQgb2YgdGhlIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBuZXdGb2xkZXIgVGhlIGZvbGRlciBvYmplY3QgdG8gYWRkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZEZvbGRlcihwYXJlbnRGb2xkZXJJZDogc3RyaW5nLCBuZXdGb2xkZXI6IE9taXQ8Rm9sZGVyLCAnaWQnIHwgJ2NoaWxkcmVuJyB8ICdjcmVhdGVkQXQnPik6IFByb21pc2U8Rm9sZGVyPiB7XHJcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xyXG4gICAgXHJcbiAgICBjb25zdCBjcmVhdGVkRm9sZGVyOiBGb2xkZXIgPSB7XHJcbiAgICAgICAgLi4ubmV3Rm9sZGVyLFxyXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxyXG4gICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KClcclxuICAgIH07XHJcblxyXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgc2VhcmNoLiBBIHJlY3Vyc2l2ZSBzZWFyY2ggd291bGQgYmUgYmV0dGVyLlxyXG4gICAgY29uc3QgcGFyZW50ID0gZmluZEZvbGRlckJ5SWQoYXBwRGF0YS5mb2xkZXJzLCBwYXJlbnRGb2xkZXJJZCk7XHJcblxyXG4gICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNyZWF0ZWRGb2xkZXIpO1xyXG4gICAgICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZWRGb2xkZXI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUGFyZW50IGZvbGRlciB3aXRoIGlkICR7cGFyZW50Rm9sZGVySWR9IG5vdCBmb3VuZC5gKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGZpbmQgYSBmb2xkZXIgcmVjdXJzaXZlbHlcclxuZnVuY3Rpb24gZmluZEZvbGRlckJ5SWQoZm9sZGVyczogRm9sZGVyW10sIGlkOiBzdHJpbmcpOiBGb2xkZXIgfCBudWxsIHtcclxuICAgIGZvciAoY29uc3QgZm9sZGVyIG9mIGZvbGRlcnMpIHtcclxuICAgICAgICBpZiAoZm9sZGVyLmlkID09PSBpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZm9sZGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmRGb2xkZXJCeUlkKGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoYyA9PiAnY2hpbGRyZW4nIGluIGMpIGFzIEZvbGRlcltdLCBpZCk7XHJcbiAgICAgICAgaWYgKGZvdW5kKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gLS0tIENSVUQgT3BlcmF0aW9ucyBmb3IgQm9va21hcmtzIC0tLVxyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgYm9va21hcmsgdG8gYSBwYXJlbnQgZm9sZGVyLlxyXG4gKiBAcGFyYW0gcGFyZW50Rm9sZGVySWQgVGhlIElEIG9mIHRoZSBwYXJlbnQgZm9sZGVyLlxyXG4gKiBAcGFyYW0gbmV3Qm9va21hcmsgVGhlIGJvb2ttYXJrIG9iamVjdCB0byBhZGQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va21hcmsocGFyZW50Rm9sZGVySWQ6IHN0cmluZywgbmV3Qm9va21hcms6IE9taXQ8Qm9va21hcmtJdGVtLCAnaWQnIHwgJ2NyZWF0ZWRBdCcgfCAnYWNjZXNzSGlzdG9yeSc+KTogUHJvbWlzZTxCb29rbWFya0l0ZW0+IHtcclxuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcblxyXG4gICAgLy8gR2V0IGhpc3RvcnkgZm9yIHRoZSBVUkxcclxuICAgIGNvbnN0IHZpc2l0cyA9IGF3YWl0IGNocm9tZS5oaXN0b3J5LmdldFZpc2l0cyh7IHVybDogbmV3Qm9va21hcmsudXJsIH0pO1xyXG4gICAgY29uc3QgYWNjZXNzSGlzdG9yeTogQWNjZXNzUmVjb3JkW10gPSB2aXNpdHMubWFwKHZpc2l0ID0+ICh7XHJcbiAgICAgICAgdGltZXN0YW1wOiB2aXNpdC52aXNpdFRpbWUhXHJcbiAgICB9KSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlZEJvb2ttYXJrOiBCb29rbWFya0l0ZW0gPSB7XHJcbiAgICAgICAgLi4ubmV3Qm9va21hcmssXHJcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXHJcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIGFjY2Vzc0hpc3Rvcnk6IGFjY2Vzc0hpc3RvcnksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHBhcmVudCA9IGZpbmRGb2xkZXJCeUlkKGFwcERhdGEuZm9sZGVycywgcGFyZW50Rm9sZGVySWQpO1xyXG5cclxuICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChjcmVhdGVkQm9va21hcmspO1xyXG5cclxuICAgICAgICAvLyBJZiBhIHJlbWluZGVyIGlzIHNldCwgY3JlYXRlIGEgQ2hyb21lIGFsYXJtXHJcbiAgICAgICAgaWYgKGNyZWF0ZWRCb29rbWFyay5yZW1pbmRlcikge1xyXG4gICAgICAgICAgICBjaHJvbWUuYWxhcm1zLmNyZWF0ZShgcmVtaW5kZXItJHtjcmVhdGVkQm9va21hcmsuaWR9YCwge1xyXG4gICAgICAgICAgICAgICAgd2hlbjogY3JlYXRlZEJvb2ttYXJrLnJlbWluZGVyLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZWRCb29rbWFyaztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJlbnQgZm9sZGVyIHdpdGggaWQgJHtwYXJlbnRGb2xkZXJJZH0gbm90IGZvdW5kLmApO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBUYWdzIC0tLVxyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgdGFnIHRvIHRoZSBhcHBsaWNhdGlvbiBkYXRhLlxyXG4gKiBAcGFyYW0gbmV3VGFnIFRoZSB0YWcgb2JqZWN0IHRvIGFkZC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRUYWcobmV3VGFnOiBPbWl0PFRhZywgJ2lkJz4pOiBQcm9taXNlPFRhZz4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVkVGFnOiBUYWcgPSB7XHJcbiAgICAgICAgLi4ubmV3VGFnLFxyXG4gICAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBdm9pZCBkdXBsaWNhdGUgdGFnIG5hbWVzXHJcbiAgICBpZiAoYXBwRGF0YS50YWdzLnNvbWUodGFnID0+IHRhZy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IGNyZWF0ZWRUYWcubmFtZS50b0xvd2VyQ2FzZSgpKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFnIHdpdGggbmFtZSBcIiR7Y3JlYXRlZFRhZy5uYW1lfVwiIGFscmVhZHkgZXhpc3RzLmApO1xyXG4gICAgfVxyXG5cclxuICAgIGFwcERhdGEudGFncy5wdXNoKGNyZWF0ZWRUYWcpO1xyXG4gICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgIHJldHVybiBjcmVhdGVkVGFnO1xyXG59XHJcblxyXG4vLyAtLS0gSGVscGVyIGZ1bmN0aW9ucyB0byBmaW5kIGl0ZW1zIC0tLVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb29rbWFya0J5SWQobm9kZXM6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10sIGlkOiBzdHJpbmcpOiBCb29rbWFya0l0ZW0gfCBudWxsIHtcclxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUpIHsgLy8gRm9sZGVyXHJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEJvb2ttYXJrQnlJZChub2RlLmNoaWxkcmVuLCBpZCk7XHJcbiAgICAgICAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xyXG4gICAgICAgIH0gZWxzZSB7IC8vIEJvb2ttYXJrSXRlbVxyXG4gICAgICAgICAgICBpZiAobm9kZS5pZCA9PT0gaWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kQm9va21hcmtCeVVybChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgdXJsOiBzdHJpbmcpOiBCb29rbWFya0l0ZW0gfCBudWxsIHtcclxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUpIHsgLy8gRm9sZGVyXHJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEJvb2ttYXJrQnlVcmwobm9kZS5jaGlsZHJlbiwgdXJsKTtcclxuICAgICAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XHJcbiAgICAgICAgfSBlbHNlIHsgLy8gQm9va21hcmtJdGVtXHJcbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBVUkxzIHRvIGNvbXBhcmUgdGhlbSBtb3JlIHJlbGlhYmx5XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmV3IFVSTChub2RlLnVybCkuaHJlZiA9PT0gbmV3IFVSTCh1cmwpLmhyZWYpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGludmFsaWQgVVJMc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbi8vIC0tLSBVcGRhdGUgZnVuY3Rpb25zIC0tLVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUJvb2ttYXJrKHVwZGF0ZWRCb29rbWFyazogQm9va21hcmtJdGVtKTogUHJvbWlzZTxCb29rbWFya0l0ZW0+IHtcclxuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICBcclxuICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgb3JpZ2luYWwgYm9va21hcmsgdG8gdXBkYXRlIGl0LlxyXG4gICAgLy8gVGhpcyBpcyBub3QgZWZmaWNpZW50LCBhIGZsYXQgbWFwIHdvdWxkIGJlIGJldHRlciBmb3IgcGVyZm9ybWFuY2Ugb24gbGFyZ2UgZGF0YXNldHMuXHJcbiAgICBjb25zdCBib29rbWFyayA9IGZpbmRCb29rbWFya0J5SWQoYXBwRGF0YS5mb2xkZXJzLCB1cGRhdGVkQm9va21hcmsuaWQpO1xyXG5cclxuICAgIGlmIChib29rbWFyaykge1xyXG4gICAgICAgIE9iamVjdC5hc3NpZ24oYm9va21hcmssIHVwZGF0ZWRCb29rbWFyayk7XHJcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICByZXR1cm4gYm9va21hcms7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQm9va21hcmsgd2l0aCBpZCAke3VwZGF0ZWRCb29rbWFyay5pZH0gbm90IGZvdW5kLmApO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVCb29rbWFya0J5SWQobm9kZXM6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10sIGlkOiBzdHJpbmcpOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdIHtcclxuICAgIHJldHVybiBub2Rlcy5maWx0ZXIobm9kZSA9PiB7XHJcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcclxuICAgICAgICAgICAgbm9kZS5jaGlsZHJlbiA9IHJlbW92ZUJvb2ttYXJrQnlJZChub2RlLmNoaWxkcmVuLCBpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyAvLyBLZWVwIHRoZSBmb2xkZXJcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gSXQncyBhIGJvb2ttYXJrLCBmaWx0ZXIgaXQgb3V0IGlmIElEcyBtYXRjaFxyXG4gICAgICAgIHJldHVybiBub2RlLmlkICE9PSBpZDsgXHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUJvb2ttYXJrKGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICBhcHBEYXRhLmZvbGRlcnMgPSByZW1vdmVCb29rbWFya0J5SWQoYXBwRGF0YS5mb2xkZXJzLCBpZCkgYXMgRm9sZGVyW107XHJcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xyXG59XHJcblxyXG4vLyAtLS0gU3luYyBTdGF0dXMgTWFuYWdlbWVudCAtLS1cclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSBjdXJyZW50IHN5bmMgc3RhdHVzIGZyb20gc3RvcmFnZS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTeW5jU3RhdHVzKCk6IFByb21pc2U8U3luY1N0YXRlPiB7XHJcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFNZTkNfU1RBVFVTX0tFWSk7XHJcbiAgcmV0dXJuIHJlc3VsdFtTWU5DX1NUQVRVU19LRVldIHx8IHsgc3RhdHVzOiAnaWRsZScgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNldHMgdGhlIHN5bmMgc3RhdHVzIGluIHN0b3JhZ2UuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0U3luY1N0YXR1cyhzdGF0dXM6IFN5bmNTdGF0dXMsIGVycm9yTWVzc2FnZT86IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHN5bmNTdGF0ZTogU3luY1N0YXRlID0ge1xyXG4gICAgc3RhdHVzLFxyXG4gICAgbGFzdFN5bmNUaW1lOiBzdGF0dXMgPT09ICdzeW5jZWQnID8gRGF0ZS5ub3coKSA6IHVuZGVmaW5lZCxcclxuICAgIGxhc3RFcnJvck1lc3NhZ2U6IHN0YXR1cyA9PT0gJ2Vycm9yJyA/IGVycm9yTWVzc2FnZSA6IHVuZGVmaW5lZFxyXG4gIH07XHJcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NZTkNfU1RBVFVTX0tFWV06IHN5bmNTdGF0ZSB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEEgcmVhZGFibGUgU3ZlbHRlIHN0b3JlIGZvciBzeW5jIHN0YXR1cyB0aGF0IHN0YXlzIGluIHN5bmMgd2l0aCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cclxuICovXHJcbmV4cG9ydCBjb25zdCBzeW5jU3RhdHVzU3RvcmUgPSByZWFkYWJsZTxTeW5jU3RhdGU+KHsgc3RhdHVzOiAnaWRsZScgfSwgKHNldCkgPT4ge1xyXG4gIC8vIEdldCB0aGUgaW5pdGlhbCB2YWx1ZSBmcm9tIHN0b3JhZ2VcclxuICBnZXRTeW5jU3RhdHVzKCkudGhlbihzZXQpLmNhdGNoKGVyciA9PiB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGluaXRpYWxpemUgc3luY1N0YXR1c1N0b3JlOlwiLCBlcnIpO1xyXG4gICAgc2V0KHsgc3RhdHVzOiAnZXJyb3InLCBsYXN0RXJyb3JNZXNzYWdlOiAnRmFpbGVkIHRvIGluaXRpYWxpemUgc3luYyBzdGF0dXMnIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBTZXQgdXAgYSBsaXN0ZW5lciBmb3IgY2hhbmdlc1xyXG4gIGNvbnN0IGxpc3RlbmVyID0gKGNoYW5nZXM6IHsgW2tleTogc3RyaW5nXTogY2hyb21lLnN0b3JhZ2UuU3RvcmFnZUNoYW5nZSB9LCBhcmVhTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICBpZiAoYXJlYU5hbWUgPT09ICdsb2NhbCcgJiYgY2hhbmdlc1tTWU5DX1NUQVRVU19LRVldKSB7XHJcbiAgICAgIHNldChjaGFuZ2VzW1NZTkNfU1RBVFVTX0tFWV0ubmV3VmFsdWUgYXMgU3luY1N0YXRlKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cclxuICByZXR1cm4gKCkgPT4ge1xyXG4gICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcclxuICB9O1xyXG59KTtcclxuXHJcbi8vIC0tLSBSZWFjdGl2ZSBTdmVsdGUgU3RvcmUgLS0tXHJcbmltcG9ydCB7IHJlYWRhYmxlIH0gZnJvbSAnc3ZlbHRlL3N0b3JlJztcclxuXHJcbi8qKlxyXG4gKiBBIHJlYWRhYmxlIFN2ZWx0ZSBzdG9yZSB0aGF0IHN0YXlzIGluIHN5bmMgd2l0aCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cclxuICovXHJcbmV4cG9ydCBjb25zdCBhcHBEYXRhU3RvcmUgPSByZWFkYWJsZTxBcHBEYXRhIHwgbnVsbD4obnVsbCwgKHNldCkgPT4ge1xyXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgZmlyc3Qgc3Vic2NyaWJlciBzdWJzY3JpYmVzLlxyXG5cclxuICAgIC8vIDEuIEdldCB0aGUgaW5pdGlhbCB2YWx1ZSBmcm9tIHN0b3JhZ2UgYW5kIHNldCB0aGUgc3RvcmUncyB2YWx1ZS5cclxuICAgIGdldEFwcERhdGEoKS50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgIHNldChkYXRhKTtcclxuICAgIH0pLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIGFwcERhdGFTdG9yZTpcIiwgZXJyKTtcclxuICAgICAgICAvLyBPcHRpb25hbGx5IHNldCBhIGRlZmF1bHQgdmFsdWUgb3IgYW4gZXJyb3Igc3RhdGVcclxuICAgICAgICBzZXQoZGVmYXVsdERhdGEpOyBcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDIuIFNldCB1cCBhIGxpc3RlbmVyIGZvciBhbnkgc3Vic2VxdWVudCBjaGFuZ2VzIGluIHN0b3JhZ2UuXHJcbiAgICBjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzOiB7IFtrZXk6IHN0cmluZ106IGNocm9tZS5zdG9yYWdlLlN0b3JhZ2VDaGFuZ2UgfSwgYXJlYU5hbWU6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIGlmIChhcmVhTmFtZSA9PT0gJ2xvY2FsJyAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZXSkge1xyXG4gICAgICAgICAgICBzZXQoY2hhbmdlc1tTVE9SQUdFX0tFWV0ubmV3VmFsdWUgYXMgQXBwRGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cclxuICAgIC8vIDMuIFJldHVybiBhIGNsZWFudXAgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBzdWJzY3JpYmVyIHVuc3Vic2NyaWJlcy5cclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcclxuICAgIH07XHJcbn0pOyAiLCIvKipcbiAqIFRoaXMgZmlsZSBjb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgR29vZ2xlIERyaXZlIEFQSS5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xuXG4vLyBUaGlzIGlzIHRoZSBDbGllbnQgSUQgZm9yIHRoZSBcIldlYiBBcHBsaWNhdGlvblwiIHR5cGUgY3JlZGVudGlhbCBpbiBHb29nbGUgQ2xvdWQgQ29uc29sZS5cbi8vIEl0IGlzIHVzZWQgYXMgYSBmYWxsYmFjayBmb3IgYnJvd3NlcnMgdGhhdCBkbyBub3Qgc3VwcG9ydCBjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuIChlLmcuLCBCcmF2ZSkuXG5jb25zdCBXRUJfQVBQX0NMSUVOVF9JRCA9ICc1MTk3MjkzMDk1MTEtamJmdjhmMWNzMDhmbTF0NzRmYjJldnR0MTJobmJhbmsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xuXG5jb25zdCBESVNDT1ZFUllfRE9DID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2Rpc2NvdmVyeS92MS9hcGlzL2RyaXZlL3YzL3Jlc3QnO1xuXG5jb25zdCBCT1VOREFSWSA9ICctLS0tLS0tMzE0MTU5MjY1MzU4OTc5MzIzODQ2JztcbmNvbnN0IFVQTE9BRF9VUkwgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vdXBsb2FkL2RyaXZlL3YzL2ZpbGVzJztcbmNvbnN0IERSSVZFX0ZJTEVTX1VSTCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9kcml2ZS92My9maWxlcyc7XG5jb25zdCBGSUxFX05BTUUgPSAnY2hyb21lLWV4dGVuc2lvbi1zdmVsdGUtdHlwZXNjcmlwdC1ib2lsZXJwbGF0ZS1iYWNrdXAuanNvbic7XG5jb25zdCBNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVkgPSAnZ2RyaXZlX21hbnVhbF90b2tlbic7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBHb29nbGUgQ2hyb21lLlxuICogVGhpcyBpcyBhIHNpbXBsaWZpZWQgY2hlY2sgYW5kIG1pZ2h0IG5lZWQgaW1wcm92ZW1lbnQuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0cnVlIGlmIHRoZSBicm93c2VyIGlzIGxpa2VseSBDaHJvbWUsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaXNDaHJvbWVCcm93c2VyKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuXHQvLyBAdHMtaWdub3JlXG5cdGlmIChuYXZpZ2F0b3IuYnJhdmUgJiYgKGF3YWl0IG5hdmlnYXRvci5icmF2ZS5pc0JyYXZlKCkpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdC8vIFRoaXMgaXMgbm90IGEgZm9vbHByb29mIHdheSB0byBkZXRlY3QgQ2hyb21lLCBidXQgaXQncyBhIGNvbW1vbiBtZXRob2QuXG5cdC8vIEl0IGNoZWNrcyBmb3IgdGhlIHByZXNlbmNlIG9mICdDaHJvbWUnIGFuZCB0aGUgYWJzZW5jZSBvZiAnRWRnJyAoZm9yIEVkZ2UpIGluIHRoZSB1c2VyIGFnZW50IHN0cmluZy5cblx0Ly8gSXQncyBhIHJlYXNvbmFibGUgaGV1cmlzdGljIGZvciBkaXN0aW5ndWlzaGluZyBDaHJvbWUgZnJvbSBvdGhlciBDaHJvbWl1bS1iYXNlZCBicm93c2Vycy5cblx0cmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0Nocm9tZScpICYmICFuYXZpZ2F0b3IudXNlckFnZW50LmluY2x1ZGVzKCdFZGcnKTtcbn1cblxuZnVuY3Rpb24gbGF1bmNoV2ViQXV0aEZsb3coaW50ZXJhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHN0cmluZz4ge1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGlmIChXRUJfQVBQX0NMSUVOVF9JRC5zdGFydHNXaXRoKCdDT0xFX09fU0VVX0lEX0RFX0NMSUVOVEUnKSkge1xuXHRcdFx0cmV0dXJuIHJlamVjdChcblx0XHRcdFx0bmV3IEVycm9yKCdQbGVhc2UgcHJvdmlkZSB0aGUgV2ViIEFwcGxpY2F0aW9uIENsaWVudCBJRCBpbiBzcmMvbGliL2dkcml2ZS50cycpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGV4dGVuc2lvbklkID0gY2hyb21lLnJ1bnRpbWUuaWQ7XG5cdFx0Y29uc3QgcmVkaXJlY3RVcmkgPSBgaHR0cHM6Ly8ke2V4dGVuc2lvbklkfS5jaHJvbWl1bWFwcC5vcmdgO1xuXHRcdGNvbnNvbGUubG9nKFxuXHRcdFx0J1BhcmEgbyBmbHV4byBkZSBhdXRlbnRpY2HDp8OjbyBkYSB3ZWIsIGNlcnRpZmlxdWUtc2UgZGUgcXVlIGVzdGUgVVJJIGRlIHJlZGlyZWNpb25hbWVudG8gZXN0w6EgYWRpY2lvbmFkbyDDoHMgc3VhcyBjcmVkZW5jaWFpcyBkZSBPQXV0aCAyLjAgZG8gdGlwbyBcIkFwbGljYcOnw6NvIFdlYlwiIG5hIEdvb2dsZSBDbG91ZCBDb25zb2xlOicsXG5cdFx0XHRyZWRpcmVjdFVyaVxuXHRcdCk7XG5cdFx0Y29uc3Qgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUuZmlsZSBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLmVtYWlsIGh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSc7XG5cdFx0bGV0IGF1dGhVcmwgPSBgaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL3YyL2F1dGhgO1xuXHRcdGF1dGhVcmwgKz0gYD9jbGllbnRfaWQ9JHtXRUJfQVBQX0NMSUVOVF9JRH1gO1xuXHRcdGF1dGhVcmwgKz0gYCZyZXNwb25zZV90eXBlPXRva2VuYDtcblx0XHRhdXRoVXJsICs9IGAmcmVkaXJlY3RfdXJpPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJpKX1gO1xuXHRcdGF1dGhVcmwgKz0gYCZzY29wZT0ke2VuY29kZVVSSUNvbXBvbmVudChzY29wZXMpfWA7XG5cblx0XHRjaHJvbWUuaWRlbnRpdHkubGF1bmNoV2ViQXV0aEZsb3coeyB1cmw6IGF1dGhVcmwsIGludGVyYWN0aXZlIH0sIChyZXNwb25zZVVybCkgPT4ge1xuXHRcdFx0aWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2VVcmwpIHtcblx0XHRcdFx0Y29uc3QgdXJsID0gbmV3IFVSTChyZXNwb25zZVVybCk7XG5cdFx0XHRcdGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXModXJsLmhhc2guc3Vic3RyaW5nKDEpKTsgLy8gUmVtb3ZlIHRoZSAnIydcblx0XHRcdFx0Y29uc3QgYWNjZXNzVG9rZW4gPSBwYXJhbXMuZ2V0KCdhY2Nlc3NfdG9rZW4nKTtcblx0XHRcdFx0aWYgKGFjY2Vzc1Rva2VuKSB7XG5cdFx0XHRcdFx0Y2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW01BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWV06IGFjY2Vzc1Rva2VuIH0sICgpID0+IHtcblx0XHRcdFx0XHRcdC8vIFRoZSBsaXN0ZW5lciBhYm92ZSB3aWxsIGF1dG9tYXRpY2FsbHkgdXBkYXRlIHRoZSBzdG9yZVxuXHRcdFx0XHRcdFx0cmVzb2x2ZShhY2Nlc3NUb2tlbik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkOiBBY2Nlc3MgdG9rZW4gbm90IGZvdW5kIGluIHJlc3BvbnNlLicpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkOiBObyByZXNwb25zZSBVUkwuJykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBJbml0aWF0ZXMgdGhlIE9BdXRoIDIuMCBmbG93IHRvIGdldCBhbiBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gaW50ZXJhY3RpdmUgSWYgdHJ1ZSwgdGhlIHVzZXIgd2lsbCBiZSBwcm9tcHRlZCB0byBsb2cgaW4gaWYgbmVjZXNzYXJ5LlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIGFjY2VzcyB0b2tlbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEF1dGhUb2tlbihpbnRlcmFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cdGNvbnN0IGlzQ2hyb21lID0gYXdhaXQgaXNDaHJvbWVCcm93c2VyKCk7XG5cblx0aWYgKGlzQ2hyb21lKSB7XG5cdFx0Y29uc29sZS5sb2coJ0RldGVjdGVkIENocm9tZSBicm93c2VyLCB1c2luZyBjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuLicpO1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuKHsgaW50ZXJhY3RpdmUgfSwgKHRva2VuKSA9PiB7XG5cdFx0XHRcdGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzb2x2ZSh0b2tlbiBhcyBzdHJpbmcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmxvZygnRGV0ZWN0ZWQgYSBub24tQ2hyb21lIGJyb3dzZXIsIHVzaW5nIGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdy4nKTtcblx0XHRpZiAoaW50ZXJhY3RpdmUpIHtcblx0XHRcdHJldHVybiBsYXVuY2hXZWJBdXRoRmxvdyhpbnRlcmFjdGl2ZSk7XG5cdFx0fVxuXHRcdC8vIFRyeSB0byBnZXQgZnJvbSBzdG9yYWdlIGlmIG5vdCBpbnRlcmFjdGl2ZVxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZLCAocmVzdWx0KSA9PiB7XG5cdFx0XHRcdGlmIChyZXN1bHRbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXSkge1xuXHRcdFx0XHRcdHJlc29sdmUocmVzdWx0W01BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWV0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoJ05vdCBsb2dnZWQgaW4uJykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBjYWNoZWQgT0F1dGggMi4wIHRva2VuLlxuICogQHBhcmFtIHRva2VuIFRoZSB0b2tlbiB0byByZW1vdmUuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSB0b2tlbiBpcyByZW1vdmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FjaGVkQXV0aFRva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY2hyb21lLmlkZW50aXR5LnJlbW92ZUNhY2hlZEF1dGhUb2tlbih7IHRva2VuIH0sICgpID0+IHtcblx0XHRcdGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVksICgpID0+IHtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRIZWFkZXJzKHRva2VuOiBzdHJpbmcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0b2tlbn1gLFxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH07XG59XG5cbi8qKlxuICogRmluZHMgdGhlIGJhY2t1cCBmaWxlIGluIHRoZSB1c2VyJ3MgR29vZ2xlIERyaXZlLlxuICogQHBhcmFtIHRva2VuIFRoZSBPQXV0aCAyLjAgYWNjZXNzIHRva2VuLlxuICogQHJldHVybnMgVGhlIGZpbGUgbWV0YWRhdGEgaWYgZm91bmQsIG90aGVyd2lzZSBudWxsLlxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5kQmFja3VwRmlsZSh0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnModG9rZW4pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7RFJJVkVfRklMRVNfVVJMfT9xPW5hbWU9JyR7RklMRV9OQU1FfScgYW5kICdyb290JyBpbiBwYXJlbnRzIGFuZCB0cmFzaGVkPWZhbHNlYCwge1xuICAgICAgICBoZWFkZXJzLFxuICAgIH0pO1xuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGZpbmRCYWNrdXBGaWxlOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHNlYXJjaCBmb3IgYmFja3VwIGZpbGU6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gZGF0YS5maWxlcy5sZW5ndGggPiAwID8gZGF0YS5maWxlc1swXSA6IG51bGw7XG59XG5cbi8qKlxuICogVXBsb2FkcyB0aGUgYXBwbGljYXRpb24gZGF0YSB0byBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gZGF0YSBUaGUgYXBwbGljYXRpb24gZGF0YSB0byB1cGxvYWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRCYWNrdXAodG9rZW46IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBcbiAgICBjb25zdCBmaWxlTWV0YWRhdGE6IHsgbmFtZTogc3RyaW5nLCBwYXJlbnRzPzogc3RyaW5nW10gfSA9IHtcbiAgICAgICAgbmFtZTogRklMRV9OQU1FLFxuICAgIH07XG5cbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgLy8gUGFyZW50cyBmaWVsZCBpcyBub3QgbmVlZGVkIGlmIHRoZSBmaWxlIGlzIGluIHRoZSByb290LlxuICAgICAgICAvLyBJdCBkZWZhdWx0cyB0byB0aGUgcm9vdCBpZiBub3Qgc3BlY2lmaWVkLlxuICAgIH1cblxuICAgIGNvbnN0IG11bHRpcGFydFJlcXVlc3RCb2R5ID1cbiAgICAgICAgYC0tJHtCT1VOREFSWX1cXHJcXG5gICtcbiAgICAgICAgYENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFxcclxcblxcclxcbmAgK1xuICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShmaWxlTWV0YWRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfVxcclxcbmAgK1xuICAgICAgICBgQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuYCArXG4gICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfS0tYDtcblxuICAgIGNvbnN0IG1ldGhvZCA9IGZpbGUgPyAnUEFUQ0gnIDogJ1BPU1QnO1xuICAgIGNvbnN0IHVybCA9IGZpbGUgPyBgJHtVUExPQURfVVJMfS8ke2ZpbGUuaWR9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YCA6IGAke1VQTE9BRF9VUkx9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW59YCxcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiBgbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PSR7Qk9VTkRBUll9YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogbXVsdGlwYXJ0UmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignR29vZ2xlIEFQSSBFcnJvciBvbiB1cGxvYWRCYWNrdXA6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBsb2FkIGJhY2t1cDogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBEb3dubG9hZHMgdGhlIGJhY2t1cCBmaWxlIGZyb20gR29vZ2xlIERyaXZlLlxuICogQHBhcmFtIHRva2VuIFRoZSBPQXV0aCAyLjAgYWNjZXNzIHRva2VuLlxuICogQHJldHVybnMgVGhlIGFwcGxpY2F0aW9uIGRhdGEgZnJvbSB0aGUgYmFja3VwIGZpbGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZEJhY2t1cCh0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnModG9rZW4pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7RFJJVkVfRklMRVNfVVJMfS8ke2ZpbGUuaWR9P2FsdD1tZWRpYWAsIHtcbiAgICAgICAgaGVhZGVycyxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGRvd25sb2FkQmFja3VwOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGRvd25sb2FkIGJhY2t1cDogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG59XG5cbi8vIEZ1bmN0aW9ucyBmb3IgYmFja3VwIGFuZCByZXN0b3JlIHdpbGwgYmUgYWRkZWQgYmVsb3cuICIsImltcG9ydCB7IHR5cGUgQ2xhc3NWYWx1ZSwgY2xzeCB9IGZyb20gXCJjbHN4XCI7XG5pbXBvcnQgeyB0d01lcmdlIH0gZnJvbSBcInRhaWx3aW5kLW1lcmdlXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbiguLi5pbnB1dHM6IENsYXNzVmFsdWVbXSkge1xuXHRyZXR1cm4gdHdNZXJnZShjbHN4KGlucHV0cykpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YCBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkXG4gKiBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzIGludm9rZWQuXG4gKiBAcGFyYW0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAqIEByZXR1cm5zIFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWJvdW5jZTxUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk+KGZ1bmM6IFQsIHdhaXQ6IG51bWJlcik6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkIHtcbiAgICBsZXQgdGltZW91dDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFRoaXNQYXJhbWV0ZXJUeXBlPFQ+LCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzO1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgfTtcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCB0eXBlIFdpdGhvdXRDaGlsZDxUPiA9IFQgZXh0ZW5kcyB7IGNoaWxkPzogYW55IH0gPyBPbWl0PFQsIFwiY2hpbGRcIj4gOiBUO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCB0eXBlIFdpdGhvdXRDaGlsZHJlbjxUPiA9IFQgZXh0ZW5kcyB7IGNoaWxkcmVuPzogYW55IH0gPyBPbWl0PFQsIFwiY2hpbGRyZW5cIj4gOiBUO1xuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkcmVuT3JDaGlsZDxUPiA9IFdpdGhvdXRDaGlsZHJlbjxXaXRob3V0Q2hpbGQ8VD4+O1xuZXhwb3J0IHR5cGUgV2l0aEVsZW1lbnRSZWY8VCwgVSBleHRlbmRzIEhUTUxFbGVtZW50ID0gSFRNTEVsZW1lbnQ+ID0gVCAmIHsgcmVmPzogVSB8IG51bGwgfTtcbiIsImltcG9ydCB7IGFwcERhdGFTdG9yZSwgc2V0U3luY1N0YXR1cyB9IGZyb20gJy4vc3RvcmFnZSc7XHJcbmltcG9ydCB7IGdldEF1dGhUb2tlbiwgdXBsb2FkQmFja3VwIH0gZnJvbSAnLi9nZHJpdmUnO1xyXG5pbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxubGV0IGlzRmlyc3RDaGFuZ2UgPSB0cnVlO1xyXG5cclxuY29uc3QgZGVib3VuY2VkVXBsb2FkID0gZGVib3VuY2UoYXN5bmMgKHRva2VuOiBzdHJpbmcsIGRhdGE6IGFueSkgPT4ge1xyXG4gICAgY29uc29sZS5sb2coJ0RlYm91bmNlZCBiYWNrdXAgdHJpZ2dlcmVkLicpO1xyXG4gICAgYXdhaXQgc2V0U3luY1N0YXR1cygnc3luY2luZycpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHVwbG9hZEJhY2t1cCh0b2tlbiwgZGF0YSk7XHJcbiAgICAgICAgYXdhaXQgc2V0U3luY1N0YXR1cygnc3luY2VkJyk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0F1dG8tYmFja3VwIHN1Y2Nlc3NmdWwuJyk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignQXV0by1iYWNrdXAgZmFpbGVkOicsIGUpO1xyXG4gICAgICAgIGF3YWl0IHNldFN5bmNTdGF0dXMoJ2Vycm9yJywgZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InKTtcclxuICAgIH1cclxufSwgNTAwMCk7IC8vIERlYm91bmNlIGZvciA1IHNlY29uZHNcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURhdGFDaGFuZ2UoZGF0YTogYW55KSB7XHJcbiAgICBpZiAoaXNGaXJzdENoYW5nZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdJbml0aWFsIGRhdGEgbG9hZGVkLCBza2lwcGluZyBmaXJzdCBhdXRvLWJhY2t1cC4nKTtcclxuICAgICAgICBpc0ZpcnN0Q2hhbmdlID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGEgdG9rZW4gbm9uLWludGVyYWN0aXZlbHkuXHJcbiAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYXdhaXQgZ2V0QXV0aFRva2VuKGZhbHNlKTtcclxuICAgICAgICAgICAgaWYgKHRva2VuKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGF0YSBjaGFuZ2VkLCBzY2hlZHVsaW5nIGF1dG8tYmFja3VwLi4uJyk7XHJcbiAgICAgICAgICAgICAgICBkZWJvdW5jZWRVcGxvYWQodG9rZW4sIGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgLy8gTm8gdG9rZW4gZm91bmQsIGRvIG5vdGhpbmcuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyBTdWJzY3JpYmUgdG8gdGhlIHN0b3JlIHRvIGxpc3RlbiBmb3IgY2hhbmdlcy5cclxuYXBwRGF0YVN0b3JlLnN1YnNjcmliZShoYW5kbGVEYXRhQ2hhbmdlKTtcclxuXHJcbmNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBtb2R1bGUgaW5pdGlhbGl6ZWQuJyk7ICIsImltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tIFwiI2ltcG9ydHNcIjtcclxuaW1wb3J0IHsgZmluZEJvb2ttYXJrQnlJZCwgZ2V0QXBwRGF0YSwgZmluZEJvb2ttYXJrQnlVcmwsIHNldEFwcERhdGEgfSBmcm9tIFwiLi4vbGliL3N0b3JhZ2VcIjtcclxuXHJcbi8vIEltcG9ydCB0aGUgYXV0by1iYWNrdXAgbW9kdWxlIHRvIGluaXRpYWxpemUgaXQuXHJcbmltcG9ydCAnJGxpYi9hdXRvLWJhY2t1cCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKFwiQmFja2dyb3VuZCBzY3JpcHQgbG9hZGVkLlwiKTtcclxuXHJcbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhbiBhbGFybSBnb2VzIG9mZlxyXG4gICAgY2hyb21lLmFsYXJtcy5vbkFsYXJtLmFkZExpc3RlbmVyKGFzeW5jIChhbGFybSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQWxhcm0gZmlyZWQ6XCIsIGFsYXJtKTtcclxuXHJcbiAgICAgICAgaWYgKGFsYXJtLm5hbWUuc3RhcnRzV2l0aChcInJlbWluZGVyLVwiKSkge1xyXG4gICAgICAgICAgICBjb25zdCBib29rbWFya0lkID0gYWxhcm0ubmFtZS5yZXBsYWNlKFwicmVtaW5kZXItXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gRmluZCB0aGUgYm9va21hcmsgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcmVtaW5kZXJcclxuICAgICAgICAgICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgICAgICAgICAgY29uc3QgYm9va21hcmsgPSBmaW5kQm9va21hcmtCeUlkKGFwcERhdGEuZm9sZGVycywgYm9va21hcmtJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYm9va21hcmspIHtcclxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKGBub3RpZmljYXRpb24tJHtib29rbWFyay5pZH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiYXNpY1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGljb25Vcmw6IFwiaWNvbi0xMjgucG5nXCIsIC8vIFdYVCBoYW5kbGVzIHBhdGhpbmdcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJSZW1pbmRlcjogXCIgKyBib29rbWFyay50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNsaWNrIHRvIG9wZW4gdGhpcyBzYXZlZCBwYWdlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAyLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhIG5vdGlmaWNhdGlvbiBpcyBjbGlja2VkXHJcbiAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKG5vdGlmaWNhdGlvbklkKSA9PiB7XHJcbiAgICAgICAgaWYgKG5vdGlmaWNhdGlvbklkLnN0YXJ0c1dpdGgoXCJub3RpZmljYXRpb24tXCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrSWQgPSBub3RpZmljYXRpb25JZC5yZXBsYWNlKFwibm90aWZpY2F0aW9uLVwiLCBcIlwiKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFRoaXMgcGFydCBpcyB0cmlja3kgYmVjYXVzZSB3ZSBjYW4ndCBkaXJlY3RseSBnZXQgdGhlIFVSTCBoZXJlXHJcbiAgICAgICAgICAgIC8vIHdpdGhvdXQgYW5vdGhlciBzdG9yYWdlIGxvb2t1cC4gQSBiZXR0ZXIgYXBwcm9hY2ggZm9yIGEgcmVhbCBhcHBcclxuICAgICAgICAgICAgLy8gbWlnaHQgYmUgdG8gc3RvcmUgdGhlIFVSTCBpbiB0aGUgYWxhcm0vbm90aWZpY2F0aW9uIGRldGFpbHMgaWYgcG9zc2libGUsXHJcbiAgICAgICAgICAgIC8vIG9yIHBlcmZvcm0gdGhlIGxvb2t1cCBhcyB3ZSBkbyBoZXJlLlxyXG4gICAgICAgICAgICBnZXRBcHBEYXRhKCkudGhlbihhcHBEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGJvb2ttYXJrSWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJvb2ttYXJrPy51cmwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IGJvb2ttYXJrLnVybCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGlzdGVuZXIgZm9yIHdoZW4gYSB1c2VyIHZpc2l0cyBhIHBhZ2VcclxuICAgIGNocm9tZS5oaXN0b3J5Lm9uVmlzaXRlZC5hZGRMaXN0ZW5lcihhc3luYyAoaGlzdG9yeUl0ZW0pID0+IHtcclxuICAgICAgICBpZiAoaGlzdG9yeUl0ZW0udXJsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlVcmwoYXBwRGF0YS5mb2xkZXJzLCBoaXN0b3J5SXRlbS51cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJvb2ttYXJrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgaGlzdG9yeSBmb3IgYm9va21hcmtlZCBpdGVtOiAke2Jvb2ttYXJrLnRpdGxlfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmlzaXRzID0gYXdhaXQgY2hyb21lLmhpc3RvcnkuZ2V0VmlzaXRzKHsgdXJsOiBoaXN0b3J5SXRlbS51cmwgfSk7XHJcbiAgICAgICAgICAgICAgICBib29rbWFyay5hY2Nlc3NIaXN0b3J5ID0gdmlzaXRzLm1hcCh2aXNpdCA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdmlzaXQudmlzaXRUaW1lIVxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59KTtcclxuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBfYnJvd3NlciB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IF9icm93c2VyO1xuZXhwb3J0IHt9O1xuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJlLnJ1bmVfb3V0c2lkZV9zdmVsdGUiLCJyZXN1bHQiLCJicm93c2VyIiwiX2Jyb3dzZXIiXSwibWFwcGluZ3MiOiI7OztBQUFPLFdBQVMsaUJBQWlCLEtBQUs7QUFDcEMsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBRztBQUNoRSxXQUFPO0FBQUEsRUFDVDtBQ21CTyxRQUFNLE9BQU8sTUFBTTtBQUFBLEVBQUM7QUNWcEIsV0FBUyxlQUFlLEdBQUcsR0FBRztBQUNwQyxXQUFPLEtBQUssSUFDVCxLQUFLLElBQ0wsTUFBTSxLQUFN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QUFNLEVBQUU7QUFBQSxJQUM1RDtBQUFBLEVBQ0Y7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxDQUFDLGFBQWEsVUFBVSxTQUFTLFFBQVEsS0FBSyxhQUFhO0FBQzdELFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBLEdBQUcsUUFBUSwwQkFBMEIsYUFBYSxVQUFVLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDNUU7QUFBQSxFQUNBO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksU0FBUyxTQUFTLEdBQUc7QUFDdkIsWUFBTSxJQUFJLG9CQUFvQixjQUFjLGdDQUFnQztBQUM5RSxRQUFJLFNBQVMsU0FBUyxHQUFHLEtBQUssU0FBUyxTQUFTLEtBQUssQ0FBQyxTQUFTLFdBQVcsSUFBSTtBQUM1RSxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLE1BQ047QUFBQSxFQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSwxMSwxMiwxM119
