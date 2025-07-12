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
    try {
      await uploadBackup(token, data);
      console.log("Auto-backup successful.");
    } catch (e) {
      console.error("Auto-backup failed:", e);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMC4xM19qaXRpQDIuNC4yX3JvbGx1cEA0LjQ1LjAvbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9zdmVsdGVANS4zNS42L25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL2ludGVybmFsL3NoYXJlZC91dGlscy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9zdmVsdGVANS4zNS42L25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL2ludGVybmFsL2NsaWVudC9yZWFjdGl2aXR5L2VxdWFsaXR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3N2ZWx0ZUA1LjM1LjYvbm9kZV9tb2R1bGVzL3N2ZWx0ZS9zcmMvaW50ZXJuYWwvY2xpZW50L2Vycm9ycy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9zdmVsdGVANS4zNS42L25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL2luZGV4LWNsaWVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9zdmVsdGVANS4zNS42L25vZGVfbW9kdWxlcy9zdmVsdGUvc3JjL3N0b3JlL3NoYXJlZC9pbmRleC5qcyIsIi4uLy4uL3NyYy9saWIvc3RvcmFnZS50cyIsIi4uLy4uL3NyYy9saWIvZ2RyaXZlLnRzIiwiLi4vLi4vc3JjL2xpYi91dGlscy50cyIsIi4uLy4uL3NyYy9saWIvYXV0by1iYWNrdXAudHMiLCIuLi8uLi9zcmMvZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9Ad3h0LWRlditicm93c2VyQDAuMC4zMjYvbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC43X0B0eXBlcytub2RlQDI0LjAuMTNfaml0aUAyLjQuMl9yb2xsdXBANC40NS4wL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9Ad2ViZXh0LWNvcmUrbWF0Y2gtcGF0dGVybnNAMS4wLjMvbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUJhY2tncm91bmQoYXJnKSB7XG4gIGlmIChhcmcgPT0gbnVsbCB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7IG1haW46IGFyZyB9O1xuICByZXR1cm4gYXJnO1xufVxuIiwiLy8gU3RvcmUgdGhlIHJlZmVyZW5jZXMgdG8gZ2xvYmFscyBpbiBjYXNlIHNvbWVvbmUgdHJpZXMgdG8gbW9ua2V5IHBhdGNoIHRoZXNlLCBjYXVzaW5nIHRoZSBiZWxvd1xuLy8gdG8gZGUtb3B0ICh0aGlzIG9jY3VycyBvZnRlbiB3aGVuIHVzaW5nIHBvcHVsYXIgZXh0ZW5zaW9ucykuXG5leHBvcnQgdmFyIGlzX2FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmV4cG9ydCB2YXIgaW5kZXhfb2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcbmV4cG9ydCB2YXIgYXJyYXlfZnJvbSA9IEFycmF5LmZyb207XG5leHBvcnQgdmFyIG9iamVjdF9rZXlzID0gT2JqZWN0LmtleXM7XG5leHBvcnQgdmFyIGRlZmluZV9wcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbmV4cG9ydCB2YXIgZ2V0X2Rlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuZXhwb3J0IHZhciBnZXRfZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycztcbmV4cG9ydCB2YXIgb2JqZWN0X3Byb3RvdHlwZSA9IE9iamVjdC5wcm90b3R5cGU7XG5leHBvcnQgdmFyIGFycmF5X3Byb3RvdHlwZSA9IEFycmF5LnByb3RvdHlwZTtcbmV4cG9ydCB2YXIgZ2V0X3Byb3RvdHlwZV9vZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbmV4cG9ydCB2YXIgaXNfZXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGU7XG5cbi8qKlxuICogQHBhcmFtIHthbnl9IHRoaW5nXG4gKiBAcmV0dXJucyB7dGhpbmcgaXMgRnVuY3Rpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc19mdW5jdGlvbih0aGluZykge1xuXHRyZXR1cm4gdHlwZW9mIHRoaW5nID09PSAnZnVuY3Rpb24nO1xufVxuXG5leHBvcnQgY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG4vLyBBZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3RoZW4vaXMtcHJvbWlzZS9ibG9iL21hc3Rlci9pbmRleC5qc1xuLy8gRGlzdHJpYnV0ZWQgdW5kZXIgTUlUIExpY2Vuc2UgaHR0cHM6Ly9naXRodWIuY29tL3RoZW4vaXMtcHJvbWlzZS9ibG9iL21hc3Rlci9MSUNFTlNFXG5cbi8qKlxuICogQHRlbXBsYXRlIFtUPWFueV1cbiAqIEBwYXJhbSB7YW55fSB2YWx1ZVxuICogQHJldHVybnMge3ZhbHVlIGlzIFByb21pc2VMaWtlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNfcHJvbWlzZSh2YWx1ZSkge1xuXHRyZXR1cm4gdHlwZW9mIHZhbHVlPy50aGVuID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKiogQHBhcmFtIHtGdW5jdGlvbn0gZm4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW4oZm4pIHtcblx0cmV0dXJuIGZuKCk7XG59XG5cbi8qKiBAcGFyYW0ge0FycmF5PCgpID0+IHZvaWQ+fSBhcnIgKi9cbmV4cG9ydCBmdW5jdGlvbiBydW5fYWxsKGFycikge1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuXHRcdGFycltpXSgpO1xuXHR9XG59XG5cbi8qKlxuICogVE9ETyByZXBsYWNlIHdpdGggUHJvbWlzZS53aXRoUmVzb2x2ZXJzIG9uY2Ugc3VwcG9ydGVkIHdpZGVseSBlbm91Z2hcbiAqIEB0ZW1wbGF0ZSBUXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZlcnJlZCgpIHtcblx0LyoqIEB0eXBlIHsodmFsdWU6IFQpID0+IHZvaWR9ICovXG5cdHZhciByZXNvbHZlO1xuXG5cdC8qKiBAdHlwZSB7KHJlYXNvbjogYW55KSA9PiB2b2lkfSAqL1xuXHR2YXIgcmVqZWN0O1xuXG5cdC8qKiBAdHlwZSB7UHJvbWlzZTxUPn0gKi9cblx0dmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcblx0XHRyZXNvbHZlID0gcmVzO1xuXHRcdHJlamVjdCA9IHJlajtcblx0fSk7XG5cblx0Ly8gQHRzLWV4cGVjdC1lcnJvclxuXHRyZXR1cm4geyBwcm9taXNlLCByZXNvbHZlLCByZWplY3QgfTtcbn1cblxuLyoqXG4gKiBAdGVtcGxhdGUgVlxuICogQHBhcmFtIHtWfSB2YWx1ZVxuICogQHBhcmFtIHtWIHwgKCgpID0+IFYpfSBmYWxsYmFja1xuICogQHBhcmFtIHtib29sZWFufSBbbGF6eV1cbiAqIEByZXR1cm5zIHtWfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmFsbGJhY2sodmFsdWUsIGZhbGxiYWNrLCBsYXp5ID0gZmFsc2UpIHtcblx0cmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWRcblx0XHQ/IGxhenlcblx0XHRcdD8gLyoqIEB0eXBlIHsoKSA9PiBWfSAqLyAoZmFsbGJhY2spKClcblx0XHRcdDogLyoqIEB0eXBlIHtWfSAqLyAoZmFsbGJhY2spXG5cdFx0OiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBXaGVuIGVuY291bnRlcmluZyBhIHNpdHVhdGlvbiBsaWtlIGBsZXQgW2EsIGIsIGNdID0gJGRlcml2ZWQoYmxhaCgpKWAsXG4gKiB3ZSBuZWVkIHRvIHN0YXNoIGFuIGludGVybWVkaWF0ZSB2YWx1ZSB0aGF0IGBhYCwgYGJgLCBhbmQgYGNgIGRlcml2ZVxuICogZnJvbSwgaW4gY2FzZSBpdCdzIGFuIGl0ZXJhYmxlXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtBcnJheUxpa2U8VD4gfCBJdGVyYWJsZTxUPn0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBbbl1cbiAqIEByZXR1cm5zIHtBcnJheTxUPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvX2FycmF5KHZhbHVlLCBuKSB7XG5cdC8vIHJldHVybiBhcnJheXMgdW5jaGFuZ2VkXG5cdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdC8vIGlmIHZhbHVlIGlzIG5vdCBpdGVyYWJsZSwgb3IgYG5gIGlzIHVuc3BlY2lmaWVkIChpbmRpY2F0ZXMgYSByZXN0XG5cdC8vIGVsZW1lbnQsIHdoaWNoIG1lYW5zIHdlJ3JlIG5vdCBjb25jZXJuZWQgYWJvdXQgdW5ib3VuZGVkIGl0ZXJhYmxlcylcblx0Ly8gY29udmVydCB0byBhbiBhcnJheSB3aXRoIGBBcnJheS5mcm9tYFxuXHRpZiAobiA9PT0gdW5kZWZpbmVkIHx8ICEoU3ltYm9sLml0ZXJhdG9yIGluIHZhbHVlKSkge1xuXHRcdHJldHVybiBBcnJheS5mcm9tKHZhbHVlKTtcblx0fVxuXG5cdC8vIG90aGVyd2lzZSwgcG9wdWxhdGUgYW4gYXJyYXkgd2l0aCBgbmAgdmFsdWVzXG5cblx0LyoqIEB0eXBlIHtUW119ICovXG5cdGNvbnN0IGFycmF5ID0gW107XG5cblx0Zm9yIChjb25zdCBlbGVtZW50IG9mIHZhbHVlKSB7XG5cdFx0YXJyYXkucHVzaChlbGVtZW50KTtcblx0XHRpZiAoYXJyYXkubGVuZ3RoID09PSBuKSBicmVhaztcblx0fVxuXG5cdHJldHVybiBhcnJheTtcbn1cbiIsIi8qKiBAaW1wb3J0IHsgRXF1YWxzIH0gZnJvbSAnI2NsaWVudCcgKi9cblxuLyoqIEB0eXBlIHtFcXVhbHN9ICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxzKHZhbHVlKSB7XG5cdHJldHVybiB2YWx1ZSA9PT0gdGhpcy52O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7dW5rbm93bn0gYVxuICogQHBhcmFtIHt1bmtub3dufSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVfbm90X2VxdWFsKGEsIGIpIHtcblx0cmV0dXJuIGEgIT0gYVxuXHRcdD8gYiA9PSBiXG5cdFx0OiBhICE9PSBiIHx8IChhICE9PSBudWxsICYmIHR5cGVvZiBhID09PSAnb2JqZWN0JykgfHwgdHlwZW9mIGEgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQHBhcmFtIHt1bmtub3dufSBhXG4gKiBAcGFyYW0ge3Vua25vd259IGJcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90X2VxdWFsKGEsIGIpIHtcblx0cmV0dXJuIGEgIT09IGI7XG59XG5cbi8qKiBAdHlwZSB7RXF1YWxzfSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhZmVfZXF1YWxzKHZhbHVlKSB7XG5cdHJldHVybiAhc2FmZV9ub3RfZXF1YWwodmFsdWUsIHRoaXMudik7XG59XG4iLCIvKiBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IHNjcmlwdHMvcHJvY2Vzcy1tZXNzYWdlcy9pbmRleC5qcy4gRG8gbm90IGVkaXQhICovXG5cbmltcG9ydCB7IERFViB9IGZyb20gJ2VzbS1lbnYnO1xuXG4vKipcbiAqIFVzaW5nIGBiaW5kOnZhbHVlYCB0b2dldGhlciB3aXRoIGEgY2hlY2tib3ggaW5wdXQgaXMgbm90IGFsbG93ZWQuIFVzZSBgYmluZDpjaGVja2VkYCBpbnN0ZWFkXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWUoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9pbnZhbGlkX2NoZWNrYm94X3ZhbHVlXFxuVXNpbmcgXFxgYmluZDp2YWx1ZVxcYCB0b2dldGhlciB3aXRoIGEgY2hlY2tib3ggaW5wdXQgaXMgbm90IGFsbG93ZWQuIFVzZSBcXGBiaW5kOmNoZWNrZWRcXGAgaW5zdGVhZFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfaW52YWxpZF9jaGVja2JveF92YWx1ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfY2hlY2tib3hfdmFsdWVgKTtcblx0fVxufVxuXG4vKipcbiAqIENvbXBvbmVudCAlY29tcG9uZW50JSBoYXMgYW4gZXhwb3J0IG5hbWVkIGAla2V5JWAgdGhhdCBhIGNvbnN1bWVyIGNvbXBvbmVudCBpcyB0cnlpbmcgdG8gYWNjZXNzIHVzaW5nIGBiaW5kOiVrZXklYCwgd2hpY2ggaXMgZGlzYWxsb3dlZC4gSW5zdGVhZCwgdXNlIGBiaW5kOnRoaXNgIChlLmcuIGA8JW5hbWUlIGJpbmQ6dGhpcz17Y29tcG9uZW50fSAvPmApIGFuZCB0aGVuIGFjY2VzcyB0aGUgcHJvcGVydHkgb24gdGhlIGJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZSAoZS5nLiBgY29tcG9uZW50LiVrZXklYClcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb21wb25lbnRcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5kX2ludmFsaWRfZXhwb3J0KGNvbXBvbmVudCwga2V5LCBuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgYmluZF9pbnZhbGlkX2V4cG9ydFxcbkNvbXBvbmVudCAke2NvbXBvbmVudH0gaGFzIGFuIGV4cG9ydCBuYW1lZCBcXGAke2tleX1cXGAgdGhhdCBhIGNvbnN1bWVyIGNvbXBvbmVudCBpcyB0cnlpbmcgdG8gYWNjZXNzIHVzaW5nIFxcYGJpbmQ6JHtrZXl9XFxgLCB3aGljaCBpcyBkaXNhbGxvd2VkLiBJbnN0ZWFkLCB1c2UgXFxgYmluZDp0aGlzXFxgIChlLmcuIFxcYDwke25hbWV9IGJpbmQ6dGhpcz17Y29tcG9uZW50fSAvPlxcYCkgYW5kIHRoZW4gYWNjZXNzIHRoZSBwcm9wZXJ0eSBvbiB0aGUgYm91bmQgY29tcG9uZW50IGluc3RhbmNlIChlLmcuIFxcYGNvbXBvbmVudC4ke2tleX1cXGApXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvYmluZF9pbnZhbGlkX2V4cG9ydGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9iaW5kX2ludmFsaWRfZXhwb3J0YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBIGNvbXBvbmVudCBpcyBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYSBub24tYmluZGFibGUgcHJvcGVydHkgYCVrZXklYCBiZWxvbmdpbmcgdG8gJWNvbXBvbmVudCUgKGkuZS4gYDwlbmFtZSUgYmluZDola2V5JT17Li4ufT5gKS4gVG8gbWFyayBhIHByb3BlcnR5IGFzIGJpbmRhYmxlOiBgbGV0IHsgJWtleSUgPSAkYmluZGFibGUoKSB9ID0gJHByb3BzKClgXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluZF9ub3RfYmluZGFibGUoa2V5LCBjb21wb25lbnQsIG5hbWUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBiaW5kX25vdF9iaW5kYWJsZVxcbkEgY29tcG9uZW50IGlzIGF0dGVtcHRpbmcgdG8gYmluZCB0byBhIG5vbi1iaW5kYWJsZSBwcm9wZXJ0eSBcXGAke2tleX1cXGAgYmVsb25naW5nIHRvICR7Y29tcG9uZW50fSAoaS5lLiBcXGA8JHtuYW1lfSBiaW5kOiR7a2V5fT17Li4ufT5cXGApLiBUbyBtYXJrIGEgcHJvcGVydHkgYXMgYmluZGFibGU6IFxcYGxldCB7ICR7a2V5fSA9ICRiaW5kYWJsZSgpIH0gPSAkcHJvcHMoKVxcYFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfbm90X2JpbmRhYmxlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2JpbmRfbm90X2JpbmRhYmxlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDYWxsaW5nIGAlbWV0aG9kJWAgb24gYSBjb21wb25lbnQgaW5zdGFuY2UgKG9mICVjb21wb25lbnQlKSBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDVcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb21wb25lbnRcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvbmVudF9hcGlfY2hhbmdlZChtZXRob2QsIGNvbXBvbmVudCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGNvbXBvbmVudF9hcGlfY2hhbmdlZFxcbkNhbGxpbmcgXFxgJHttZXRob2R9XFxgIG9uIGEgY29tcG9uZW50IGluc3RhbmNlIChvZiAke2NvbXBvbmVudH0pIGlzIG5vIGxvbmdlciB2YWxpZCBpbiBTdmVsdGUgNVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfY2hhbmdlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9jb21wb25lbnRfYXBpX2NoYW5nZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIEF0dGVtcHRlZCB0byBpbnN0YW50aWF0ZSAlY29tcG9uZW50JSB3aXRoIGBuZXcgJW5hbWUlYCwgd2hpY2ggaXMgbm8gbG9uZ2VyIHZhbGlkIGluIFN2ZWx0ZSA1LiBJZiB0aGlzIGNvbXBvbmVudCBpcyBub3QgdW5kZXIgeW91ciBjb250cm9sLCBzZXQgdGhlIGBjb21wYXRpYmlsaXR5LmNvbXBvbmVudEFwaWAgY29tcGlsZXIgb3B0aW9uIHRvIGA0YCB0byBrZWVwIGl0IHdvcmtpbmcuXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50XG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcG9uZW50X2FwaV9pbnZhbGlkX25ldyhjb21wb25lbnQsIG5hbWUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBjb21wb25lbnRfYXBpX2ludmFsaWRfbmV3XFxuQXR0ZW1wdGVkIHRvIGluc3RhbnRpYXRlICR7Y29tcG9uZW50fSB3aXRoIFxcYG5ldyAke25hbWV9XFxgLCB3aGljaCBpcyBubyBsb25nZXIgdmFsaWQgaW4gU3ZlbHRlIDUuIElmIHRoaXMgY29tcG9uZW50IGlzIG5vdCB1bmRlciB5b3VyIGNvbnRyb2wsIHNldCB0aGUgXFxgY29tcGF0aWJpbGl0eS5jb21wb25lbnRBcGlcXGAgY29tcGlsZXIgb3B0aW9uIHRvIFxcYDRcXGAgdG8ga2VlcCBpdCB3b3JraW5nLlxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2NvbXBvbmVudF9hcGlfaW52YWxpZF9uZXdgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvY29tcG9uZW50X2FwaV9pbnZhbGlkX25ld2ApO1xuXHR9XG59XG5cbi8qKlxuICogQSBkZXJpdmVkIHZhbHVlIGNhbm5vdCByZWZlcmVuY2UgaXRzZWxmIHJlY3Vyc2l2ZWx5XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXJpdmVkX3JlZmVyZW5jZXNfc2VsZigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBkZXJpdmVkX3JlZmVyZW5jZXNfc2VsZlxcbkEgZGVyaXZlZCB2YWx1ZSBjYW5ub3QgcmVmZXJlbmNlIGl0c2VsZiByZWN1cnNpdmVseVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2Rlcml2ZWRfcmVmZXJlbmNlc19zZWxmYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2Rlcml2ZWRfcmVmZXJlbmNlc19zZWxmYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBLZXllZCBlYWNoIGJsb2NrIGhhcyBkdXBsaWNhdGUga2V5IGAldmFsdWUlYCBhdCBpbmRleGVzICVhJSBhbmQgJWIlXG4gKiBAcGFyYW0ge3N0cmluZ30gYVxuICogQHBhcmFtIHtzdHJpbmd9IGJcbiAqIEBwYXJhbSB7c3RyaW5nIHwgdW5kZWZpbmVkIHwgbnVsbH0gW3ZhbHVlXVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaF9rZXlfZHVwbGljYXRlKGEsIGIsIHZhbHVlKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWFjaF9rZXlfZHVwbGljYXRlXFxuJHt2YWx1ZVxuXHRcdFx0PyBgS2V5ZWQgZWFjaCBibG9jayBoYXMgZHVwbGljYXRlIGtleSBcXGAke3ZhbHVlfVxcYCBhdCBpbmRleGVzICR7YX0gYW5kICR7Yn1gXG5cdFx0XHQ6IGBLZXllZCBlYWNoIGJsb2NrIGhhcyBkdXBsaWNhdGUga2V5IGF0IGluZGV4ZXMgJHthfSBhbmQgJHtifWB9XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWFjaF9rZXlfZHVwbGljYXRlYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VhY2hfa2V5X2R1cGxpY2F0ZWApO1xuXHR9XG59XG5cbi8qKlxuICogYCVydW5lJWAgY2Fubm90IGJlIHVzZWQgaW5zaWRlIGFuIGVmZmVjdCBjbGVhbnVwIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gcnVuZVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZWZmZWN0X2luX3RlYXJkb3duKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBlZmZlY3RfaW5fdGVhcmRvd25cXG5cXGAke3J1bmV9XFxgIGNhbm5vdCBiZSB1c2VkIGluc2lkZSBhbiBlZmZlY3QgY2xlYW51cCBmdW5jdGlvblxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9pbl90ZWFyZG93bmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdGVhcmRvd25gKTtcblx0fVxufVxuXG4vKipcbiAqIEVmZmVjdCBjYW5ub3QgYmUgY3JlYXRlZCBpbnNpZGUgYSBgJGRlcml2ZWRgIHZhbHVlIHRoYXQgd2FzIG5vdCBpdHNlbGYgY3JlYXRlZCBpbnNpZGUgYW4gZWZmZWN0XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF9pbl91bm93bmVkX2Rlcml2ZWRcXG5FZmZlY3QgY2Fubm90IGJlIGNyZWF0ZWQgaW5zaWRlIGEgXFxgJGRlcml2ZWRcXGAgdmFsdWUgdGhhdCB3YXMgbm90IGl0c2VsZiBjcmVhdGVkIGluc2lkZSBhbiBlZmZlY3RcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfaW5fdW5vd25lZF9kZXJpdmVkYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9pbl91bm93bmVkX2Rlcml2ZWRgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlcnVuZSVgIGNhbiBvbmx5IGJlIHVzZWQgaW5zaWRlIGFuIGVmZmVjdCAoZS5nLiBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uKVxuICogQHBhcmFtIHtzdHJpbmd9IHJ1bmVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF9vcnBoYW4ocnVuZSkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGVmZmVjdF9vcnBoYW5cXG5cXGAke3J1bmV9XFxgIGNhbiBvbmx5IGJlIHVzZWQgaW5zaWRlIGFuIGVmZmVjdCAoZS5nLiBkdXJpbmcgY29tcG9uZW50IGluaXRpYWxpc2F0aW9uKVxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2VmZmVjdF9vcnBoYW5gKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X29ycGhhbmApO1xuXHR9XG59XG5cbi8qKlxuICogTWF4aW11bSB1cGRhdGUgZGVwdGggZXhjZWVkZWQuIFRoaXMgY2FuIGhhcHBlbiB3aGVuIGEgcmVhY3RpdmUgYmxvY2sgb3IgZWZmZWN0IHJlcGVhdGVkbHkgc2V0cyBhIG5ldyB2YWx1ZS4gU3ZlbHRlIGxpbWl0cyB0aGUgbnVtYmVyIG9mIG5lc3RlZCB1cGRhdGVzIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcHNcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVmZmVjdF91cGRhdGVfZGVwdGhfZXhjZWVkZWQoKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZFxcbk1heGltdW0gdXBkYXRlIGRlcHRoIGV4Y2VlZGVkLiBUaGlzIGNhbiBoYXBwZW4gd2hlbiBhIHJlYWN0aXZlIGJsb2NrIG9yIGVmZmVjdCByZXBlYXRlZGx5IHNldHMgYSBuZXcgdmFsdWUuIFN2ZWx0ZSBsaW1pdHMgdGhlIG51bWJlciBvZiBuZXN0ZWQgdXBkYXRlcyB0byBwcmV2ZW50IGluZmluaXRlIGxvb3BzXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvZWZmZWN0X3VwZGF0ZV9kZXB0aF9leGNlZWRlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9lZmZlY3RfdXBkYXRlX2RlcHRoX2V4Y2VlZGVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBgZ2V0QWJvcnRTaWduYWwoKWAgY2FuIG9ubHkgYmUgY2FsbGVkIGluc2lkZSBhbiBlZmZlY3Qgb3IgZGVyaXZlZFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0X2Fib3J0X3NpZ25hbF9vdXRzaWRlX3JlYWN0aW9uKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGdldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvblxcblxcYGdldEFib3J0U2lnbmFsKClcXGAgY2FuIG9ubHkgYmUgY2FsbGVkIGluc2lkZSBhbiBlZmZlY3Qgb3IgZGVyaXZlZFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2dldF9hYm9ydF9zaWduYWxfb3V0c2lkZV9yZWFjdGlvbmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb25gKTtcblx0fVxufVxuXG4vKipcbiAqIEZhaWxlZCB0byBoeWRyYXRlIHRoZSBhcHBsaWNhdGlvblxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gaHlkcmF0aW9uX2ZhaWxlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBoeWRyYXRpb25fZmFpbGVkXFxuRmFpbGVkIHRvIGh5ZHJhdGUgdGhlIGFwcGxpY2F0aW9uXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvaHlkcmF0aW9uX2ZhaWxlZGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9oeWRyYXRpb25fZmFpbGVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDb3VsZCBub3QgYHtAcmVuZGVyfWAgc25pcHBldCBkdWUgdG8gdGhlIGV4cHJlc3Npb24gYmVpbmcgYG51bGxgIG9yIGB1bmRlZmluZWRgLiBDb25zaWRlciB1c2luZyBvcHRpb25hbCBjaGFpbmluZyBge0ByZW5kZXIgc25pcHBldD8uKCl9YFxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW52YWxpZF9zbmlwcGV0KCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYGludmFsaWRfc25pcHBldFxcbkNvdWxkIG5vdCBcXGB7QHJlbmRlcn1cXGAgc25pcHBldCBkdWUgdG8gdGhlIGV4cHJlc3Npb24gYmVpbmcgXFxgbnVsbFxcYCBvciBcXGB1bmRlZmluZWRcXGAuIENvbnNpZGVyIHVzaW5nIG9wdGlvbmFsIGNoYWluaW5nIFxcYHtAcmVuZGVyIHNuaXBwZXQ/LigpfVxcYFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL2ludmFsaWRfc25pcHBldGApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9pbnZhbGlkX3NuaXBwZXRgKTtcblx0fVxufVxuXG4vKipcbiAqIGAlbmFtZSUoLi4uKWAgY2Fubm90IGJlIHVzZWQgaW4gcnVuZXMgbW9kZVxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpZmVjeWNsZV9sZWdhY3lfb25seShuYW1lKSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5XFxuXFxgJHtuYW1lfSguLi4pXFxgIGNhbm5vdCBiZSB1c2VkIGluIHJ1bmVzIG1vZGVcXG5odHRwczovL3N2ZWx0ZS5kZXYvZS9saWZlY3ljbGVfbGVnYWN5X29ubHlgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvbGlmZWN5Y2xlX2xlZ2FjeV9vbmx5YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDYW5ub3QgZG8gYGJpbmQ6JWtleSU9e3VuZGVmaW5lZH1gIHdoZW4gYCVrZXklYCBoYXMgYSBmYWxsYmFjayB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHJldHVybnMge25ldmVyfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvcHNfaW52YWxpZF92YWx1ZShrZXkpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBwcm9wc19pbnZhbGlkX3ZhbHVlXFxuQ2Fubm90IGRvIFxcYGJpbmQ6JHtrZXl9PXt1bmRlZmluZWR9XFxgIHdoZW4gXFxgJHtrZXl9XFxgIGhhcyBhIGZhbGxiYWNrIHZhbHVlXFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfaW52YWxpZF92YWx1ZWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9wcm9wc19pbnZhbGlkX3ZhbHVlYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBSZXN0IGVsZW1lbnQgcHJvcGVydGllcyBvZiBgJHByb3BzKClgIHN1Y2ggYXMgYCVwcm9wZXJ0eSVgIGFyZSByZWFkb25seVxuICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5XG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9wc19yZXN0X3JlYWRvbmx5KHByb3BlcnR5KSB7XG5cdGlmIChERVYpIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgcHJvcHNfcmVzdF9yZWFkb25seVxcblJlc3QgZWxlbWVudCBwcm9wZXJ0aWVzIG9mIFxcYCRwcm9wcygpXFxgIHN1Y2ggYXMgXFxgJHtwcm9wZXJ0eX1cXGAgYXJlIHJlYWRvbmx5XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcHJvcHNfcmVzdF9yZWFkb25seWApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9wcm9wc19yZXN0X3JlYWRvbmx5YCk7XG5cdH1cbn1cblxuLyoqXG4gKiBUaGUgYCVydW5lJWAgcnVuZSBpcyBvbmx5IGF2YWlsYWJsZSBpbnNpZGUgYC5zdmVsdGVgIGFuZCBgLnN2ZWx0ZS5qcy90c2AgZmlsZXNcbiAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG4gKiBAcmV0dXJucyB7bmV2ZXJ9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW5lX291dHNpZGVfc3ZlbHRlKHJ1bmUpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBydW5lX291dHNpZGVfc3ZlbHRlXFxuVGhlIFxcYCR7cnVuZX1cXGAgcnVuZSBpcyBvbmx5IGF2YWlsYWJsZSBpbnNpZGUgXFxgLnN2ZWx0ZVxcYCBhbmQgXFxgLnN2ZWx0ZS5qcy90c1xcYCBmaWxlc1xcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3J1bmVfb3V0c2lkZV9zdmVsdGVgKTtcblxuXHRcdGVycm9yLm5hbWUgPSAnU3ZlbHRlIGVycm9yJztcblxuXHRcdHRocm93IGVycm9yO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihgaHR0cHM6Ly9zdmVsdGUuZGV2L2UvcnVuZV9vdXRzaWRlX3N2ZWx0ZWApO1xuXHR9XG59XG5cbi8qKlxuICogUHJvcGVydHkgZGVzY3JpcHRvcnMgZGVmaW5lZCBvbiBgJHN0YXRlYCBvYmplY3RzIG11c3QgY29udGFpbiBgdmFsdWVgIGFuZCBhbHdheXMgYmUgYGVudW1lcmFibGVgLCBgY29uZmlndXJhYmxlYCBhbmQgYHdyaXRhYmxlYC5cbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXRlX2Rlc2NyaXB0b3JzX2ZpeGVkKCkge1xuXHRpZiAoREVWKSB7XG5cdFx0Y29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYHN0YXRlX2Rlc2NyaXB0b3JzX2ZpeGVkXFxuUHJvcGVydHkgZGVzY3JpcHRvcnMgZGVmaW5lZCBvbiBcXGAkc3RhdGVcXGAgb2JqZWN0cyBtdXN0IGNvbnRhaW4gXFxgdmFsdWVcXGAgYW5kIGFsd2F5cyBiZSBcXGBlbnVtZXJhYmxlXFxgLCBcXGBjb25maWd1cmFibGVcXGAgYW5kIFxcYHdyaXRhYmxlXFxgLlxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX2Rlc2NyaXB0b3JzX2ZpeGVkYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX2Rlc2NyaXB0b3JzX2ZpeGVkYCk7XG5cdH1cbn1cblxuLyoqXG4gKiBDYW5ub3Qgc2V0IHByb3RvdHlwZSBvZiBgJHN0YXRlYCBvYmplY3RcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXRlX3Byb3RvdHlwZV9maXhlZCgpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV9wcm90b3R5cGVfZml4ZWRcXG5DYW5ub3Qgc2V0IHByb3RvdHlwZSBvZiBcXGAkc3RhdGVcXGAgb2JqZWN0XFxuaHR0cHM6Ly9zdmVsdGUuZGV2L2Uvc3RhdGVfcHJvdG90eXBlX2ZpeGVkYCk7XG5cblx0XHRlcnJvci5uYW1lID0gJ1N2ZWx0ZSBlcnJvcic7XG5cblx0XHR0aHJvdyBlcnJvcjtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYGh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Byb3RvdHlwZV9maXhlZGApO1xuXHR9XG59XG5cbi8qKlxuICogVXBkYXRpbmcgc3RhdGUgaW5zaWRlIGAkZGVyaXZlZCguLi4pYCwgYCRpbnNwZWN0KC4uLilgIG9yIGEgdGVtcGxhdGUgZXhwcmVzc2lvbiBpcyBmb3JiaWRkZW4uIElmIHRoZSB2YWx1ZSBzaG91bGQgbm90IGJlIHJlYWN0aXZlLCBkZWNsYXJlIGl0IHdpdGhvdXQgYCRzdGF0ZWBcbiAqIEByZXR1cm5zIHtuZXZlcn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YXRlX3Vuc2FmZV9tdXRhdGlvbigpIHtcblx0aWYgKERFVikge1xuXHRcdGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBzdGF0ZV91bnNhZmVfbXV0YXRpb25cXG5VcGRhdGluZyBzdGF0ZSBpbnNpZGUgXFxgJGRlcml2ZWQoLi4uKVxcYCwgXFxgJGluc3BlY3QoLi4uKVxcYCBvciBhIHRlbXBsYXRlIGV4cHJlc3Npb24gaXMgZm9yYmlkZGVuLiBJZiB0aGUgdmFsdWUgc2hvdWxkIG5vdCBiZSByZWFjdGl2ZSwgZGVjbGFyZSBpdCB3aXRob3V0IFxcYCRzdGF0ZVxcYFxcbmh0dHBzOi8vc3ZlbHRlLmRldi9lL3N0YXRlX3Vuc2FmZV9tdXRhdGlvbmApO1xuXG5cdFx0ZXJyb3IubmFtZSA9ICdTdmVsdGUgZXJyb3InO1xuXG5cdFx0dGhyb3cgZXJyb3I7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBodHRwczovL3N2ZWx0ZS5kZXYvZS9zdGF0ZV91bnNhZmVfbXV0YXRpb25gKTtcblx0fVxufSIsIi8qKiBAaW1wb3J0IHsgQ29tcG9uZW50Q29udGV4dCwgQ29tcG9uZW50Q29udGV4dExlZ2FjeSB9IGZyb20gJyNjbGllbnQnICovXG4vKiogQGltcG9ydCB7IEV2ZW50RGlzcGF0Y2hlciB9IGZyb20gJy4vaW5kZXguanMnICovXG4vKiogQGltcG9ydCB7IE5vdEZ1bmN0aW9uIH0gZnJvbSAnLi9pbnRlcm5hbC90eXBlcy5qcycgKi9cbmltcG9ydCB7IGFjdGl2ZV9yZWFjdGlvbiwgdW50cmFjayB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3J1bnRpbWUuanMnO1xuaW1wb3J0IHsgaXNfYXJyYXkgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZC91dGlscy5qcyc7XG5pbXBvcnQgeyB1c2VyX2VmZmVjdCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2luZGV4LmpzJztcbmltcG9ydCAqIGFzIGUgZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvZXJyb3JzLmpzJztcbmltcG9ydCB7IGxpZmVjeWNsZV9vdXRzaWRlX2NvbXBvbmVudCB9IGZyb20gJy4vaW50ZXJuYWwvc2hhcmVkL2Vycm9ycy5qcyc7XG5pbXBvcnQgeyBsZWdhY3lfbW9kZV9mbGFnIH0gZnJvbSAnLi9pbnRlcm5hbC9mbGFncy9pbmRleC5qcyc7XG5pbXBvcnQgeyBjb21wb25lbnRfY29udGV4dCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L2NvbnRleHQuanMnO1xuaW1wb3J0IHsgREVWIH0gZnJvbSAnZXNtLWVudic7XG5cbmlmIChERVYpIHtcblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBydW5lXG5cdCAqL1xuXHRmdW5jdGlvbiB0aHJvd19ydW5lX2Vycm9yKHJ1bmUpIHtcblx0XHRpZiAoIShydW5lIGluIGdsb2JhbFRoaXMpKSB7XG5cdFx0XHQvLyBUT0RPIGlmIHBlb3BsZSBzdGFydCBhZGp1c3RpbmcgdGhlIFwidGhpcyBjYW4gY29udGFpbiBydW5lc1wiIGNvbmZpZyB0aHJvdWdoIHYtcC1zIG1vcmUsIGFkanVzdCB0aGlzIG1lc3NhZ2Vcblx0XHRcdC8qKiBAdHlwZSB7YW55fSAqL1xuXHRcdFx0bGV0IHZhbHVlOyAvLyBsZXQncyBob3BlIG5vb25lIG1vZGlmaWVzIHRoaXMgZ2xvYmFsLCBidXQgYmVsdHMgYW5kIGJyYWNlc1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsIHJ1bmUsIHtcblx0XHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ2V0dGVyLXJldHVyblxuXHRcdFx0XHRnZXQ6ICgpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGUucnVuZV9vdXRzaWRlX3N2ZWx0ZShydW5lKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0OiAodikgPT4ge1xuXHRcdFx0XHRcdHZhbHVlID0gdjtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0dGhyb3dfcnVuZV9lcnJvcignJHN0YXRlJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRlZmZlY3QnKTtcblx0dGhyb3dfcnVuZV9lcnJvcignJGRlcml2ZWQnKTtcblx0dGhyb3dfcnVuZV9lcnJvcignJGluc3BlY3QnKTtcblx0dGhyb3dfcnVuZV9lcnJvcignJHByb3BzJyk7XG5cdHRocm93X3J1bmVfZXJyb3IoJyRiaW5kYWJsZScpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gW2BBYm9ydFNpZ25hbGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9BYm9ydFNpZ25hbCkgdGhhdCBhYm9ydHMgd2hlbiB0aGUgY3VycmVudCBbZGVyaXZlZF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRkZXJpdmVkKSBvciBbZWZmZWN0XShodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUvJGVmZmVjdCkgcmUtcnVucyBvciBpcyBkZXN0cm95ZWQuXG4gKlxuICogTXVzdCBiZSBjYWxsZWQgd2hpbGUgYSBkZXJpdmVkIG9yIGVmZmVjdCBpcyBydW5uaW5nLlxuICpcbiAqIGBgYHN2ZWx0ZVxuICogPHNjcmlwdD5cbiAqIFx0aW1wb3J0IHsgZ2V0QWJvcnRTaWduYWwgfSBmcm9tICdzdmVsdGUnO1xuICpcbiAqIFx0bGV0IHsgaWQgfSA9ICRwcm9wcygpO1xuICpcbiAqIFx0YXN5bmMgZnVuY3Rpb24gZ2V0RGF0YShpZCkge1xuICogXHRcdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYC9pdGVtcy8ke2lkfWAsIHtcbiAqIFx0XHRcdHNpZ25hbDogZ2V0QWJvcnRTaWduYWwoKVxuICogXHRcdH0pO1xuICpcbiAqIFx0XHRyZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICogXHR9XG4gKlxuICogXHRjb25zdCBkYXRhID0gJGRlcml2ZWQoYXdhaXQgZ2V0RGF0YShpZCkpO1xuICogPC9zY3JpcHQ+XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3J0U2lnbmFsKCkge1xuXHRpZiAoYWN0aXZlX3JlYWN0aW9uID09PSBudWxsKSB7XG5cdFx0ZS5nZXRfYWJvcnRfc2lnbmFsX291dHNpZGVfcmVhY3Rpb24oKTtcblx0fVxuXG5cdHJldHVybiAoYWN0aXZlX3JlYWN0aW9uLmFjID8/PSBuZXcgQWJvcnRDb250cm9sbGVyKCkpLnNpZ25hbDtcbn1cblxuLyoqXG4gKiBgb25Nb3VudGAsIGxpa2UgW2AkZWZmZWN0YF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QpLCBzY2hlZHVsZXMgYSBmdW5jdGlvbiB0byBydW4gYXMgc29vbiBhcyB0aGUgY29tcG9uZW50IGhhcyBiZWVuIG1vdW50ZWQgdG8gdGhlIERPTS5cbiAqIFVubGlrZSBgJGVmZmVjdGAsIHRoZSBwcm92aWRlZCBmdW5jdGlvbiBvbmx5IHJ1bnMgb25jZS5cbiAqXG4gKiBJdCBtdXN0IGJlIGNhbGxlZCBkdXJpbmcgdGhlIGNvbXBvbmVudCdzIGluaXRpYWxpc2F0aW9uIChidXQgZG9lc24ndCBuZWVkIHRvIGxpdmUgX2luc2lkZV8gdGhlIGNvbXBvbmVudDtcbiAqIGl0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbiBleHRlcm5hbCBtb2R1bGUpLiBJZiBhIGZ1bmN0aW9uIGlzIHJldHVybmVkIF9zeW5jaHJvbm91c2x5XyBmcm9tIGBvbk1vdW50YCxcbiAqIGl0IHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIGNvbXBvbmVudCBpcyB1bm1vdW50ZWQuXG4gKlxuICogYG9uTW91bnRgIGZ1bmN0aW9ucyBkbyBub3QgcnVuIGR1cmluZyBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUvc3ZlbHRlLXNlcnZlciNyZW5kZXIpLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0geygpID0+IE5vdEZ1bmN0aW9uPFQ+IHwgUHJvbWlzZTxOb3RGdW5jdGlvbjxUPj4gfCAoKCkgPT4gYW55KX0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gb25Nb3VudChmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ29uTW91bnQnKTtcblx0fVxuXG5cdGlmIChsZWdhY3lfbW9kZV9mbGFnICYmIGNvbXBvbmVudF9jb250ZXh0LmwgIT09IG51bGwpIHtcblx0XHRpbml0X3VwZGF0ZV9jYWxsYmFja3MoY29tcG9uZW50X2NvbnRleHQpLm0ucHVzaChmbik7XG5cdH0gZWxzZSB7XG5cdFx0dXNlcl9lZmZlY3QoKCkgPT4ge1xuXHRcdFx0Y29uc3QgY2xlYW51cCA9IHVudHJhY2soZm4pO1xuXHRcdFx0aWYgKHR5cGVvZiBjbGVhbnVwID09PSAnZnVuY3Rpb24nKSByZXR1cm4gLyoqIEB0eXBlIHsoKSA9PiB2b2lkfSAqLyAoY2xlYW51cCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuLyoqXG4gKiBTY2hlZHVsZXMgYSBjYWxsYmFjayB0byBydW4gaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxuICpcbiAqIE91dCBvZiBgb25Nb3VudGAsIGBiZWZvcmVVcGRhdGVgLCBgYWZ0ZXJVcGRhdGVgIGFuZCBgb25EZXN0cm95YCwgdGhpcyBpcyB0aGVcbiAqIG9ubHkgb25lIHRoYXQgcnVucyBpbnNpZGUgYSBzZXJ2ZXItc2lkZSBjb21wb25lbnQuXG4gKlxuICogQHBhcmFtIHsoKSA9PiBhbnl9IGZuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ29uRGVzdHJveScpO1xuXHR9XG5cblx0b25Nb3VudCgoKSA9PiAoKSA9PiB1bnRyYWNrKGZuKSk7XG59XG5cbi8qKlxuICogQHRlbXBsYXRlIFtUPWFueV1cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gKiBAcGFyYW0ge1R9IFtkZXRhaWxdXG4gKiBAcGFyYW0ge2FueX1wYXJhbXNfMFxuICogQHJldHVybnMge0N1c3RvbUV2ZW50PFQ+fVxuICovXG5mdW5jdGlvbiBjcmVhdGVfY3VzdG9tX2V2ZW50KHR5cGUsIGRldGFpbCwgeyBidWJibGVzID0gZmFsc2UsIGNhbmNlbGFibGUgPSBmYWxzZSB9ID0ge30pIHtcblx0cmV0dXJuIG5ldyBDdXN0b21FdmVudCh0eXBlLCB7IGRldGFpbCwgYnViYmxlcywgY2FuY2VsYWJsZSB9KTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGV2ZW50IGRpc3BhdGNoZXIgdGhhdCBjYW4gYmUgdXNlZCB0byBkaXNwYXRjaCBbY29tcG9uZW50IGV2ZW50c10oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL2xlZ2FjeS1vbiNDb21wb25lbnQtZXZlbnRzKS5cbiAqIEV2ZW50IGRpc3BhdGNoZXJzIGFyZSBmdW5jdGlvbnMgdGhhdCBjYW4gdGFrZSB0d28gYXJndW1lbnRzOiBgbmFtZWAgYW5kIGBkZXRhaWxgLlxuICpcbiAqIENvbXBvbmVudCBldmVudHMgY3JlYXRlZCB3aXRoIGBjcmVhdGVFdmVudERpc3BhdGNoZXJgIGNyZWF0ZSBhXG4gKiBbQ3VzdG9tRXZlbnRdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudCkuXG4gKiBUaGVzZSBldmVudHMgZG8gbm90IFtidWJibGVdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvTGVhcm4vSmF2YVNjcmlwdC9CdWlsZGluZ19ibG9ja3MvRXZlbnRzI0V2ZW50X2J1YmJsaW5nX2FuZF9jYXB0dXJlKS5cbiAqIFRoZSBgZGV0YWlsYCBhcmd1bWVudCBjb3JyZXNwb25kcyB0byB0aGUgW0N1c3RvbUV2ZW50LmRldGFpbF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50L2RldGFpbClcbiAqIHByb3BlcnR5IGFuZCBjYW4gY29udGFpbiBhbnkgdHlwZSBvZiBkYXRhLlxuICpcbiAqIFRoZSBldmVudCBkaXNwYXRjaGVyIGNhbiBiZSB0eXBlZCB0byBuYXJyb3cgdGhlIGFsbG93ZWQgZXZlbnQgbmFtZXMgYW5kIHRoZSB0eXBlIG9mIHRoZSBgZGV0YWlsYCBhcmd1bWVudDpcbiAqIGBgYHRzXG4gKiBjb25zdCBkaXNwYXRjaCA9IGNyZWF0ZUV2ZW50RGlzcGF0Y2hlcjx7XG4gKiAgbG9hZGVkOiBudWxsOyAvLyBkb2VzIG5vdCB0YWtlIGEgZGV0YWlsIGFyZ3VtZW50XG4gKiAgY2hhbmdlOiBzdHJpbmc7IC8vIHRha2VzIGEgZGV0YWlsIGFyZ3VtZW50IG9mIHR5cGUgc3RyaW5nLCB3aGljaCBpcyByZXF1aXJlZFxuICogIG9wdGlvbmFsOiBudW1iZXIgfCBudWxsOyAvLyB0YWtlcyBhbiBvcHRpb25hbCBkZXRhaWwgYXJndW1lbnQgb2YgdHlwZSBudW1iZXJcbiAqIH0+KCk7XG4gKiBgYGBcbiAqXG4gKiBAZGVwcmVjYXRlZCBVc2UgY2FsbGJhY2sgcHJvcHMgYW5kL29yIHRoZSBgJGhvc3QoKWAgcnVuZSBpbnN0ZWFkIOKAlCBzZWUgW21pZ3JhdGlvbiBndWlkZV0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlL3Y1LW1pZ3JhdGlvbi1ndWlkZSNFdmVudC1jaGFuZ2VzLUNvbXBvbmVudC1ldmVudHMpXG4gKiBAdGVtcGxhdGUge1JlY29yZDxzdHJpbmcsIGFueT59IFtFdmVudE1hcCA9IGFueV1cbiAqIEByZXR1cm5zIHtFdmVudERpc3BhdGNoZXI8RXZlbnRNYXA+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCkge1xuXHRjb25zdCBhY3RpdmVfY29tcG9uZW50X2NvbnRleHQgPSBjb21wb25lbnRfY29udGV4dDtcblx0aWYgKGFjdGl2ZV9jb21wb25lbnRfY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdGxpZmVjeWNsZV9vdXRzaWRlX2NvbXBvbmVudCgnY3JlYXRlRXZlbnREaXNwYXRjaGVyJyk7XG5cdH1cblxuXHRyZXR1cm4gKHR5cGUsIGRldGFpbCwgb3B0aW9ucykgPT4ge1xuXHRcdGNvbnN0IGV2ZW50cyA9IC8qKiBAdHlwZSB7UmVjb3JkPHN0cmluZywgRnVuY3Rpb24gfCBGdW5jdGlvbltdPn0gKi8gKFxuXHRcdFx0YWN0aXZlX2NvbXBvbmVudF9jb250ZXh0LnMuJCRldmVudHNcblx0XHQpPy5bLyoqIEB0eXBlIHthbnl9ICovICh0eXBlKV07XG5cblx0XHRpZiAoZXZlbnRzKSB7XG5cdFx0XHRjb25zdCBjYWxsYmFja3MgPSBpc19hcnJheShldmVudHMpID8gZXZlbnRzLnNsaWNlKCkgOiBbZXZlbnRzXTtcblx0XHRcdC8vIFRPRE8gYXJlIHRoZXJlIHNpdHVhdGlvbnMgd2hlcmUgZXZlbnRzIGNvdWxkIGJlIGRpc3BhdGNoZWRcblx0XHRcdC8vIGluIGEgc2VydmVyIChub24tRE9NKSBlbnZpcm9ubWVudD9cblx0XHRcdGNvbnN0IGV2ZW50ID0gY3JlYXRlX2N1c3RvbV9ldmVudCgvKiogQHR5cGUge3N0cmluZ30gKi8gKHR5cGUpLCBkZXRhaWwsIG9wdGlvbnMpO1xuXHRcdFx0Zm9yIChjb25zdCBmbiBvZiBjYWxsYmFja3MpIHtcblx0XHRcdFx0Zm4uY2FsbChhY3RpdmVfY29tcG9uZW50X2NvbnRleHQueCwgZXZlbnQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICFldmVudC5kZWZhdWx0UHJldmVudGVkO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xufVxuXG4vLyBUT0RPIG1hcmsgYmVmb3JlVXBkYXRlIGFuZCBhZnRlclVwZGF0ZSBhcyBkZXByZWNhdGVkIGluIFN2ZWx0ZSA2XG5cbi8qKlxuICogU2NoZWR1bGVzIGEgY2FsbGJhY2sgdG8gcnVuIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHVwZGF0ZWQgYWZ0ZXIgYW55IHN0YXRlIGNoYW5nZS5cbiAqXG4gKiBUaGUgZmlyc3QgdGltZSB0aGUgY2FsbGJhY2sgcnVucyB3aWxsIGJlIGJlZm9yZSB0aGUgaW5pdGlhbCBgb25Nb3VudGAuXG4gKlxuICogSW4gcnVuZXMgbW9kZSB1c2UgYCRlZmZlY3QucHJlYCBpbnN0ZWFkLlxuICpcbiAqIEBkZXByZWNhdGVkIFVzZSBbYCRlZmZlY3QucHJlYF0oaHR0cHM6Ly9zdmVsdGUuZGV2L2RvY3Mvc3ZlbHRlLyRlZmZlY3QjJGVmZmVjdC5wcmUpIGluc3RlYWRcbiAqIEBwYXJhbSB7KCkgPT4gdm9pZH0gZm5cbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYmVmb3JlVXBkYXRlKGZuKSB7XG5cdGlmIChjb21wb25lbnRfY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdGxpZmVjeWNsZV9vdXRzaWRlX2NvbXBvbmVudCgnYmVmb3JlVXBkYXRlJyk7XG5cdH1cblxuXHRpZiAoY29tcG9uZW50X2NvbnRleHQubCA9PT0gbnVsbCkge1xuXHRcdGUubGlmZWN5Y2xlX2xlZ2FjeV9vbmx5KCdiZWZvcmVVcGRhdGUnKTtcblx0fVxuXG5cdGluaXRfdXBkYXRlX2NhbGxiYWNrcyhjb21wb25lbnRfY29udGV4dCkuYi5wdXNoKGZuKTtcbn1cblxuLyoqXG4gKiBTY2hlZHVsZXMgYSBjYWxsYmFjayB0byBydW4gaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGNvbXBvbmVudCBoYXMgYmVlbiB1cGRhdGVkLlxuICpcbiAqIFRoZSBmaXJzdCB0aW1lIHRoZSBjYWxsYmFjayBydW5zIHdpbGwgYmUgYWZ0ZXIgdGhlIGluaXRpYWwgYG9uTW91bnRgLlxuICpcbiAqIEluIHJ1bmVzIG1vZGUgdXNlIGAkZWZmZWN0YCBpbnN0ZWFkLlxuICpcbiAqIEBkZXByZWNhdGVkIFVzZSBbYCRlZmZlY3RgXShodHRwczovL3N2ZWx0ZS5kZXYvZG9jcy9zdmVsdGUvJGVmZmVjdCkgaW5zdGVhZFxuICogQHBhcmFtIHsoKSA9PiB2b2lkfSBmblxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZnRlclVwZGF0ZShmbikge1xuXHRpZiAoY29tcG9uZW50X2NvbnRleHQgPT09IG51bGwpIHtcblx0XHRsaWZlY3ljbGVfb3V0c2lkZV9jb21wb25lbnQoJ2FmdGVyVXBkYXRlJyk7XG5cdH1cblxuXHRpZiAoY29tcG9uZW50X2NvbnRleHQubCA9PT0gbnVsbCkge1xuXHRcdGUubGlmZWN5Y2xlX2xlZ2FjeV9vbmx5KCdhZnRlclVwZGF0ZScpO1xuXHR9XG5cblx0aW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbXBvbmVudF9jb250ZXh0KS5hLnB1c2goZm4pO1xufVxuXG4vKipcbiAqIExlZ2FjeS1tb2RlOiBJbml0IGNhbGxiYWNrcyBvYmplY3QgZm9yIG9uTW91bnQvYmVmb3JlVXBkYXRlL2FmdGVyVXBkYXRlXG4gKiBAcGFyYW0ge0NvbXBvbmVudENvbnRleHR9IGNvbnRleHRcbiAqL1xuZnVuY3Rpb24gaW5pdF91cGRhdGVfY2FsbGJhY2tzKGNvbnRleHQpIHtcblx0dmFyIGwgPSAvKiogQHR5cGUge0NvbXBvbmVudENvbnRleHRMZWdhY3l9ICovIChjb250ZXh0KS5sO1xuXHRyZXR1cm4gKGwudSA/Pz0geyBhOiBbXSwgYjogW10sIG06IFtdIH0pO1xufVxuXG5leHBvcnQgeyBmbHVzaFN5bmMgfSBmcm9tICcuL2ludGVybmFsL2NsaWVudC9ydW50aW1lLmpzJztcbmV4cG9ydCB7IGdldENvbnRleHQsIGdldEFsbENvbnRleHRzLCBoYXNDb250ZXh0LCBzZXRDb250ZXh0IH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvY29udGV4dC5qcyc7XG5leHBvcnQgeyBoeWRyYXRlLCBtb3VudCwgdW5tb3VudCB9IGZyb20gJy4vaW50ZXJuYWwvY2xpZW50L3JlbmRlci5qcyc7XG5leHBvcnQgeyB0aWNrLCB1bnRyYWNrIH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvcnVudGltZS5qcyc7XG5leHBvcnQgeyBjcmVhdGVSYXdTbmlwcGV0IH0gZnJvbSAnLi9pbnRlcm5hbC9jbGllbnQvZG9tL2Jsb2Nrcy9zbmlwcGV0LmpzJztcbiIsIi8qKiBAaW1wb3J0IHsgUmVhZGFibGUsIFN0YXJ0U3RvcE5vdGlmaWVyLCBTdWJzY3JpYmVyLCBVbnN1YnNjcmliZXIsIFVwZGF0ZXIsIFdyaXRhYmxlIH0gZnJvbSAnLi4vcHVibGljLmpzJyAqL1xuLyoqIEBpbXBvcnQgeyBTdG9yZXMsIFN0b3Jlc1ZhbHVlcywgU3Vic2NyaWJlSW52YWxpZGF0ZVR1cGxlIH0gZnJvbSAnLi4vcHJpdmF0ZS5qcycgKi9cbmltcG9ydCB7IG5vb3AsIHJ1bl9hbGwgfSBmcm9tICcuLi8uLi9pbnRlcm5hbC9zaGFyZWQvdXRpbHMuanMnO1xuaW1wb3J0IHsgc2FmZV9ub3RfZXF1YWwgfSBmcm9tICcuLi8uLi9pbnRlcm5hbC9jbGllbnQvcmVhY3Rpdml0eS9lcXVhbGl0eS5qcyc7XG5pbXBvcnQgeyBzdWJzY3JpYmVfdG9fc3RvcmUgfSBmcm9tICcuLi91dGlscy5qcyc7XG5cbi8qKlxuICogQHR5cGUge0FycmF5PFN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxhbnk+IHwgYW55Pn1cbiAqL1xuY29uc3Qgc3Vic2NyaWJlcl9xdWV1ZSA9IFtdO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBgUmVhZGFibGVgIHN0b3JlIHRoYXQgYWxsb3dzIHJlYWRpbmcgYnkgc3Vic2NyaXB0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1R9IFt2YWx1ZV0gaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtTdGFydFN0b3BOb3RpZmllcjxUPn0gW3N0YXJ0XVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGFibGUodmFsdWUsIHN0YXJ0KSB7XG5cdHJldHVybiB7XG5cdFx0c3Vic2NyaWJlOiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQpLnN1YnNjcmliZVxuXHR9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBXcml0YWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgYm90aCB1cGRhdGluZyBhbmQgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKlxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7VH0gW3ZhbHVlXSBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge1N0YXJ0U3RvcE5vdGlmaWVyPFQ+fSBbc3RhcnRdXG4gKiBAcmV0dXJucyB7V3JpdGFibGU8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQgPSBub29wKSB7XG5cdC8qKiBAdHlwZSB7VW5zdWJzY3JpYmVyIHwgbnVsbH0gKi9cblx0bGV0IHN0b3AgPSBudWxsO1xuXG5cdC8qKiBAdHlwZSB7U2V0PFN1YnNjcmliZUludmFsaWRhdGVUdXBsZTxUPj59ICovXG5cdGNvbnN0IHN1YnNjcmliZXJzID0gbmV3IFNldCgpO1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1R9IG5ld192YWx1ZVxuXHQgKiBAcmV0dXJucyB7dm9pZH1cblx0ICovXG5cdGZ1bmN0aW9uIHNldChuZXdfdmFsdWUpIHtcblx0XHRpZiAoc2FmZV9ub3RfZXF1YWwodmFsdWUsIG5ld192YWx1ZSkpIHtcblx0XHRcdHZhbHVlID0gbmV3X3ZhbHVlO1xuXHRcdFx0aWYgKHN0b3ApIHtcblx0XHRcdFx0Ly8gc3RvcmUgaXMgcmVhZHlcblx0XHRcdFx0Y29uc3QgcnVuX3F1ZXVlID0gIXN1YnNjcmliZXJfcXVldWUubGVuZ3RoO1xuXHRcdFx0XHRmb3IgKGNvbnN0IHN1YnNjcmliZXIgb2Ygc3Vic2NyaWJlcnMpIHtcblx0XHRcdFx0XHRzdWJzY3JpYmVyWzFdKCk7XG5cdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZS5wdXNoKHN1YnNjcmliZXIsIHZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocnVuX3F1ZXVlKSB7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzdWJzY3JpYmVyX3F1ZXVlLmxlbmd0aDsgaSArPSAyKSB7XG5cdFx0XHRcdFx0XHRzdWJzY3JpYmVyX3F1ZXVlW2ldWzBdKHN1YnNjcmliZXJfcXVldWVbaSArIDFdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGggPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7VXBkYXRlcjxUPn0gZm5cblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRmdW5jdGlvbiB1cGRhdGUoZm4pIHtcblx0XHRzZXQoZm4oLyoqIEB0eXBlIHtUfSAqLyAodmFsdWUpKSk7XG5cdH1cblxuXHQvKipcblx0ICogQHBhcmFtIHtTdWJzY3JpYmVyPFQ+fSBydW5cblx0ICogQHBhcmFtIHsoKSA9PiB2b2lkfSBbaW52YWxpZGF0ZV1cblx0ICogQHJldHVybnMge1Vuc3Vic2NyaWJlcn1cblx0ICovXG5cdGZ1bmN0aW9uIHN1YnNjcmliZShydW4sIGludmFsaWRhdGUgPSBub29wKSB7XG5cdFx0LyoqIEB0eXBlIHtTdWJzY3JpYmVJbnZhbGlkYXRlVHVwbGU8VD59ICovXG5cdFx0Y29uc3Qgc3Vic2NyaWJlciA9IFtydW4sIGludmFsaWRhdGVdO1xuXHRcdHN1YnNjcmliZXJzLmFkZChzdWJzY3JpYmVyKTtcblx0XHRpZiAoc3Vic2NyaWJlcnMuc2l6ZSA9PT0gMSkge1xuXHRcdFx0c3RvcCA9IHN0YXJ0KHNldCwgdXBkYXRlKSB8fCBub29wO1xuXHRcdH1cblx0XHRydW4oLyoqIEB0eXBlIHtUfSAqLyAodmFsdWUpKTtcblx0XHRyZXR1cm4gKCkgPT4ge1xuXHRcdFx0c3Vic2NyaWJlcnMuZGVsZXRlKHN1YnNjcmliZXIpO1xuXHRcdFx0aWYgKHN1YnNjcmliZXJzLnNpemUgPT09IDAgJiYgc3RvcCkge1xuXHRcdFx0XHRzdG9wKCk7XG5cdFx0XHRcdHN0b3AgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cblx0cmV0dXJuIHsgc2V0LCB1cGRhdGUsIHN1YnNjcmliZSB9O1xufVxuXG4vKipcbiAqIERlcml2ZWQgdmFsdWUgc3RvcmUgYnkgc3luY2hyb25pemluZyBvbmUgb3IgbW9yZSByZWFkYWJsZSBzdG9yZXMgYW5kXG4gKiBhcHBseWluZyBhbiBhZ2dyZWdhdGlvbiBmdW5jdGlvbiBvdmVyIGl0cyBpbnB1dCB2YWx1ZXMuXG4gKlxuICogQHRlbXBsYXRlIHtTdG9yZXN9IFNcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAb3ZlcmxvYWRcbiAqIEBwYXJhbSB7U30gc3RvcmVzXG4gKiBAcGFyYW0geyh2YWx1ZXM6IFN0b3Jlc1ZhbHVlczxTPiwgc2V0OiAodmFsdWU6IFQpID0+IHZvaWQsIHVwZGF0ZTogKGZuOiBVcGRhdGVyPFQ+KSA9PiB2b2lkKSA9PiBVbnN1YnNjcmliZXIgfCB2b2lkfSBmblxuICogQHBhcmFtIHtUfSBbaW5pdGlhbF92YWx1ZV1cbiAqIEByZXR1cm5zIHtSZWFkYWJsZTxUPn1cbiAqL1xuLyoqXG4gKiBEZXJpdmVkIHZhbHVlIHN0b3JlIGJ5IHN5bmNocm9uaXppbmcgb25lIG9yIG1vcmUgcmVhZGFibGUgc3RvcmVzIGFuZFxuICogYXBwbHlpbmcgYW4gYWdncmVnYXRpb24gZnVuY3Rpb24gb3ZlciBpdHMgaW5wdXQgdmFsdWVzLlxuICpcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQG92ZXJsb2FkXG4gKiBAcGFyYW0ge1N9IHN0b3Jlc1xuICogQHBhcmFtIHsodmFsdWVzOiBTdG9yZXNWYWx1ZXM8Uz4pID0+IFR9IGZuXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG4vKipcbiAqIEB0ZW1wbGF0ZSB7U3RvcmVzfSBTXG4gKiBAdGVtcGxhdGUgVFxuICogQHBhcmFtIHtTfSBzdG9yZXNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0ge1R9IFtpbml0aWFsX3ZhbHVlXVxuICogQHJldHVybnMge1JlYWRhYmxlPFQ+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlZChzdG9yZXMsIGZuLCBpbml0aWFsX3ZhbHVlKSB7XG5cdGNvbnN0IHNpbmdsZSA9ICFBcnJheS5pc0FycmF5KHN0b3Jlcyk7XG5cdC8qKiBAdHlwZSB7QXJyYXk8UmVhZGFibGU8YW55Pj59ICovXG5cdGNvbnN0IHN0b3Jlc19hcnJheSA9IHNpbmdsZSA/IFtzdG9yZXNdIDogc3RvcmVzO1xuXHRpZiAoIXN0b3Jlc19hcnJheS5ldmVyeShCb29sZWFuKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignZGVyaXZlZCgpIGV4cGVjdHMgc3RvcmVzIGFzIGlucHV0LCBnb3QgYSBmYWxzeSB2YWx1ZScpO1xuXHR9XG5cdGNvbnN0IGF1dG8gPSBmbi5sZW5ndGggPCAyO1xuXHRyZXR1cm4gcmVhZGFibGUoaW5pdGlhbF92YWx1ZSwgKHNldCwgdXBkYXRlKSA9PiB7XG5cdFx0bGV0IHN0YXJ0ZWQgPSBmYWxzZTtcblx0XHQvKiogQHR5cGUge1RbXX0gKi9cblx0XHRjb25zdCB2YWx1ZXMgPSBbXTtcblx0XHRsZXQgcGVuZGluZyA9IDA7XG5cdFx0bGV0IGNsZWFudXAgPSBub29wO1xuXHRcdGNvbnN0IHN5bmMgPSAoKSA9PiB7XG5cdFx0XHRpZiAocGVuZGluZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRjbGVhbnVwKCk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBmbihzaW5nbGUgPyB2YWx1ZXNbMF0gOiB2YWx1ZXMsIHNldCwgdXBkYXRlKTtcblx0XHRcdGlmIChhdXRvKSB7XG5cdFx0XHRcdHNldChyZXN1bHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2xlYW51cCA9IHR5cGVvZiByZXN1bHQgPT09ICdmdW5jdGlvbicgPyByZXN1bHQgOiBub29wO1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Y29uc3QgdW5zdWJzY3JpYmVycyA9IHN0b3Jlc19hcnJheS5tYXAoKHN0b3JlLCBpKSA9PlxuXHRcdFx0c3Vic2NyaWJlX3RvX3N0b3JlKFxuXHRcdFx0XHRzdG9yZSxcblx0XHRcdFx0KHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0dmFsdWVzW2ldID0gdmFsdWU7XG5cdFx0XHRcdFx0cGVuZGluZyAmPSB+KDEgPDwgaSk7XG5cdFx0XHRcdFx0aWYgKHN0YXJ0ZWQpIHtcblx0XHRcdFx0XHRcdHN5bmMoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRwZW5kaW5nIHw9IDEgPDwgaTtcblx0XHRcdFx0fVxuXHRcdFx0KVxuXHRcdCk7XG5cdFx0c3RhcnRlZCA9IHRydWU7XG5cdFx0c3luYygpO1xuXHRcdHJldHVybiBmdW5jdGlvbiBzdG9wKCkge1xuXHRcdFx0cnVuX2FsbCh1bnN1YnNjcmliZXJzKTtcblx0XHRcdGNsZWFudXAoKTtcblx0XHRcdC8vIFdlIG5lZWQgdG8gc2V0IHRoaXMgdG8gZmFsc2UgYmVjYXVzZSBjYWxsYmFja3MgY2FuIHN0aWxsIGhhcHBlbiBkZXNwaXRlIGhhdmluZyB1bnN1YnNjcmliZWQ6XG5cdFx0XHQvLyBDYWxsYmFja3MgbWlnaHQgYWxyZWFkeSBiZSBwbGFjZWQgaW4gdGhlIHF1ZXVlIHdoaWNoIGRvZXNuJ3Qga25vdyBpdCBzaG91bGQgbm8gbG9uZ2VyXG5cdFx0XHQvLyBpbnZva2UgdGhpcyBkZXJpdmVkIHN0b3JlLlxuXHRcdFx0c3RhcnRlZCA9IGZhbHNlO1xuXHRcdH07XG5cdH0pO1xufVxuXG4vKipcbiAqIFRha2VzIGEgc3RvcmUgYW5kIHJldHVybnMgYSBuZXcgb25lIGRlcml2ZWQgZnJvbSB0aGUgb2xkIG9uZSB0aGF0IGlzIHJlYWRhYmxlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUXG4gKiBAcGFyYW0ge1JlYWRhYmxlPFQ+fSBzdG9yZSAgLSBzdG9yZSB0byBtYWtlIHJlYWRvbmx5XG4gKiBAcmV0dXJucyB7UmVhZGFibGU8VD59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkb25seShzdG9yZSkge1xuXHRyZXR1cm4ge1xuXHRcdC8vIEB0cy1leHBlY3QtZXJyb3IgVE9ETyBpIHN1c3BlY3QgdGhlIGJpbmQgaXMgdW5uZWNlc3Nhcnlcblx0XHRzdWJzY3JpYmU6IHN0b3JlLnN1YnNjcmliZS5iaW5kKHN0b3JlKVxuXHR9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCB2YWx1ZSBmcm9tIGEgc3RvcmUgYnkgc3Vic2NyaWJpbmcgYW5kIGltbWVkaWF0ZWx5IHVuc3Vic2NyaWJpbmcuXG4gKlxuICogQHRlbXBsYXRlIFRcbiAqIEBwYXJhbSB7UmVhZGFibGU8VD59IHN0b3JlXG4gKiBAcmV0dXJucyB7VH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldChzdG9yZSkge1xuXHRsZXQgdmFsdWU7XG5cdHN1YnNjcmliZV90b19zdG9yZShzdG9yZSwgKF8pID0+ICh2YWx1ZSA9IF8pKSgpO1xuXHQvLyBAdHMtZXhwZWN0LWVycm9yXG5cdHJldHVybiB2YWx1ZTtcbn1cbiIsImltcG9ydCB0eXBlIHsgRm9sZGVyLCBCb29rbWFya0l0ZW0sIFRhZywgQWNjZXNzUmVjb3JkIH0gZnJvbSAnJGxpYi90eXBlcyc7XHJcblxyXG4vKipcclxuICogVGhlIG1haW4gZGF0YSBzdHJ1Y3R1cmUgZm9yIHRoZSBhcHBsaWNhdGlvbidzIHN0b3JhZ2UuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEFwcERhdGEge1xyXG4gIGZvbGRlcnM6IEZvbGRlcltdO1xyXG4gIHRhZ3M6IFRhZ1tdO1xyXG4gIC8vIEJvb2ttYXJrcyB3aWxsIGJlIG5lc3RlZCB3aXRoaW4gZm9sZGVycywgYnV0IHdlIGNhbiBoYXZlIGEgZmxhdCBsaXN0IGZvciBlYXN5IGFjY2VzcyBpZiBuZWVkZWQuXHJcbn1cclxuXHJcbmNvbnN0IFNUT1JBR0VfS0VZID0gJ2FwcERhdGEnO1xyXG5cclxuLyoqXHJcbiAqIFRoZSBkZWZhdWx0IHN0YXRlIG9mIHRoZSBhcHBsaWNhdGlvbiBkYXRhLlxyXG4gKi9cclxuY29uc3QgZGVmYXVsdERhdGE6IEFwcERhdGEgPSB7XHJcbiAgZm9sZGVyczogW1xyXG4gICAge1xyXG4gICAgICBpZDogJ3Jvb3QnLFxyXG4gICAgICBuYW1lOiAnUm9vdCcsXHJcbiAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgfVxyXG4gIF0sXHJcbiAgdGFnczogW10sXHJcbn07XHJcblxyXG4vKipcclxuICogUmV0cmlldmVzIGFsbCBhcHBsaWNhdGlvbiBkYXRhIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXHJcbiAqIElmIG5vIGRhdGEgaXMgZm91bmQsIGl0IGluaXRpYWxpemVzIHdpdGggdGhlIGRlZmF1bHQgc3RydWN0dXJlLlxyXG4gKlxyXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgQXBwRGF0YSBvYmplY3QuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwRGF0YSgpOiBQcm9taXNlPEFwcERhdGE+IHtcclxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoU1RPUkFHRV9LRVkpO1xyXG4gIGlmIChyZXN1bHRbU1RPUkFHRV9LRVldKSB7XHJcbiAgICByZXR1cm4gcmVzdWx0W1NUT1JBR0VfS0VZXSBhcyBBcHBEYXRhO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBJbml0aWFsaXplIHN0b3JhZ2Ugd2l0aCBkZWZhdWx0IGRhdGEgaWYgaXQncyB0aGUgZmlyc3QgcnVuXHJcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGRlZmF1bHREYXRhKTtcclxuICAgIHJldHVybiBkZWZhdWx0RGF0YTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYXZlcyB0aGUgZW50aXJlIGFwcGxpY2F0aW9uIGRhdGEgb2JqZWN0IHRvIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxyXG4gKlxyXG4gKiBAcGFyYW0gZGF0YSBUaGUgQXBwRGF0YSBvYmplY3QgdG8gc2F2ZS5cclxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgZGF0YSBpcyBzYXZlZC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRBcHBEYXRhKGRhdGE6IEFwcERhdGEpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVldOiBkYXRhIH0pO1xyXG59XHJcblxyXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBGb2xkZXJzIC0tLVxyXG5cclxuLyoqXHJcbiAqIEFkZHMgYSBuZXcgZm9sZGVyIHRvIGEgcGFyZW50IGZvbGRlci5cclxuICogQHBhcmFtIHBhcmVudEZvbGRlcklkIFRoZSBJRCBvZiB0aGUgcGFyZW50IGZvbGRlci5cclxuICogQHBhcmFtIG5ld0ZvbGRlciBUaGUgZm9sZGVyIG9iamVjdCB0byBhZGQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRm9sZGVyKHBhcmVudEZvbGRlcklkOiBzdHJpbmcsIG5ld0ZvbGRlcjogT21pdDxGb2xkZXIsICdpZCcgfCAnY2hpbGRyZW4nIHwgJ2NyZWF0ZWRBdCc+KTogUHJvbWlzZTxGb2xkZXI+IHtcclxuICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGNyZWF0ZWRGb2xkZXI6IEZvbGRlciA9IHtcclxuICAgICAgICAuLi5uZXdGb2xkZXIsXHJcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXHJcbiAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBzZWFyY2guIEEgcmVjdXJzaXZlIHNlYXJjaCB3b3VsZCBiZSBiZXR0ZXIuXHJcbiAgICBjb25zdCBwYXJlbnQgPSBmaW5kRm9sZGVyQnlJZChhcHBEYXRhLmZvbGRlcnMsIHBhcmVudEZvbGRlcklkKTtcclxuXHJcbiAgICBpZiAocGFyZW50KSB7XHJcbiAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goY3JlYXRlZEZvbGRlcik7XHJcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICByZXR1cm4gY3JlYXRlZEZvbGRlcjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJlbnQgZm9sZGVyIHdpdGggaWQgJHtwYXJlbnRGb2xkZXJJZH0gbm90IGZvdW5kLmApO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZmluZCBhIGZvbGRlciByZWN1cnNpdmVseVxyXG5mdW5jdGlvbiBmaW5kRm9sZGVyQnlJZChmb2xkZXJzOiBGb2xkZXJbXSwgaWQ6IHN0cmluZyk6IEZvbGRlciB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xyXG4gICAgICAgIGlmIChmb2xkZXIuaWQgPT09IGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmb2xkZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZEZvbGRlckJ5SWQoZm9sZGVyLmNoaWxkcmVuLmZpbHRlcihjID0+ICdjaGlsZHJlbicgaW4gYykgYXMgRm9sZGVyW10sIGlkKTtcclxuICAgICAgICBpZiAoZm91bmQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vLyAtLS0gQ1JVRCBPcGVyYXRpb25zIGZvciBCb29rbWFya3MgLS0tXHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyBib29rbWFyayB0byBhIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBwYXJlbnRGb2xkZXJJZCBUaGUgSUQgb2YgdGhlIHBhcmVudCBmb2xkZXIuXHJcbiAqIEBwYXJhbSBuZXdCb29rbWFyayBUaGUgYm9va21hcmsgb2JqZWN0IHRvIGFkZC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRCb29rbWFyayhwYXJlbnRGb2xkZXJJZDogc3RyaW5nLCBuZXdCb29rbWFyazogT21pdDxCb29rbWFya0l0ZW0sICdpZCcgfCAnY3JlYXRlZEF0JyB8ICdhY2Nlc3NIaXN0b3J5Jz4pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuXHJcbiAgICAvLyBHZXQgaGlzdG9yeSBmb3IgdGhlIFVSTFxyXG4gICAgY29uc3QgdmlzaXRzID0gYXdhaXQgY2hyb21lLmhpc3RvcnkuZ2V0VmlzaXRzKHsgdXJsOiBuZXdCb29rbWFyay51cmwgfSk7XHJcbiAgICBjb25zdCBhY2Nlc3NIaXN0b3J5OiBBY2Nlc3NSZWNvcmRbXSA9IHZpc2l0cy5tYXAodmlzaXQgPT4gKHtcclxuICAgICAgICB0aW1lc3RhbXA6IHZpc2l0LnZpc2l0VGltZSFcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVkQm9va21hcms6IEJvb2ttYXJrSXRlbSA9IHtcclxuICAgICAgICAuLi5uZXdCb29rbWFyayxcclxuICAgICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcclxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgYWNjZXNzSGlzdG9yeTogYWNjZXNzSGlzdG9yeSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcGFyZW50ID0gZmluZEZvbGRlckJ5SWQoYXBwRGF0YS5mb2xkZXJzLCBwYXJlbnRGb2xkZXJJZCk7XHJcblxyXG4gICAgaWYgKHBhcmVudCkge1xyXG4gICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGNyZWF0ZWRCb29rbWFyayk7XHJcblxyXG4gICAgICAgIC8vIElmIGEgcmVtaW5kZXIgaXMgc2V0LCBjcmVhdGUgYSBDaHJvbWUgYWxhcm1cclxuICAgICAgICBpZiAoY3JlYXRlZEJvb2ttYXJrLnJlbWluZGVyKSB7XHJcbiAgICAgICAgICAgIGNocm9tZS5hbGFybXMuY3JlYXRlKGByZW1pbmRlci0ke2NyZWF0ZWRCb29rbWFyay5pZH1gLCB7XHJcbiAgICAgICAgICAgICAgICB3aGVuOiBjcmVhdGVkQm9va21hcmsucmVtaW5kZXIsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICByZXR1cm4gY3JlYXRlZEJvb2ttYXJrO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmVudCBmb2xkZXIgd2l0aCBpZCAke3BhcmVudEZvbGRlcklkfSBub3QgZm91bmQuYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIC0tLSBDUlVEIE9wZXJhdGlvbnMgZm9yIFRhZ3MgLS0tXHJcblxyXG4vKipcclxuICogQWRkcyBhIG5ldyB0YWcgdG8gdGhlIGFwcGxpY2F0aW9uIGRhdGEuXHJcbiAqIEBwYXJhbSBuZXdUYWcgVGhlIHRhZyBvYmplY3QgdG8gYWRkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFRhZyhuZXdUYWc6IE9taXQ8VGFnLCAnaWQnPik6IFByb21pc2U8VGFnPiB7XHJcbiAgICBjb25zdCBhcHBEYXRhID0gYXdhaXQgZ2V0QXBwRGF0YSgpO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZWRUYWc6IFRhZyA9IHtcclxuICAgICAgICAuLi5uZXdUYWcsXHJcbiAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSB0YWcgbmFtZXNcclxuICAgIGlmIChhcHBEYXRhLnRhZ3Muc29tZSh0YWcgPT4gdGFnLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gY3JlYXRlZFRhZy5uYW1lLnRvTG93ZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYWcgd2l0aCBuYW1lIFwiJHtjcmVhdGVkVGFnLm5hbWV9XCIgYWxyZWFkeSBleGlzdHMuYCk7XHJcbiAgICB9XHJcblxyXG4gICAgYXBwRGF0YS50YWdzLnB1c2goY3JlYXRlZFRhZyk7XHJcbiAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xyXG4gICAgcmV0dXJuIGNyZWF0ZWRUYWc7XHJcbn1cclxuXHJcbi8vIC0tLSBIZWxwZXIgZnVuY3Rpb25zIHRvIGZpbmQgaXRlbXMgLS0tXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb2ttYXJrQnlJZChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgaWQ6IHN0cmluZyk6IEJvb2ttYXJrSXRlbSB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kQm9va21hcmtCeUlkKG5vZGUuY2hpbGRyZW4sIGlkKTtcclxuICAgICAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XHJcbiAgICAgICAgfSBlbHNlIHsgLy8gQm9va21hcmtJdGVtXHJcbiAgICAgICAgICAgIGlmIChub2RlLmlkID09PSBpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb29rbWFya0J5VXJsKG5vZGVzOiAoRm9sZGVyIHwgQm9va21hcmtJdGVtKVtdLCB1cmw6IHN0cmluZyk6IEJvb2ttYXJrSXRlbSB8IG51bGwge1xyXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XHJcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSkgeyAvLyBGb2xkZXJcclxuICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kQm9va21hcmtCeVVybChub2RlLmNoaWxkcmVuLCB1cmwpO1xyXG4gICAgICAgICAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcclxuICAgICAgICB9IGVsc2UgeyAvLyBCb29rbWFya0l0ZW1cclxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIFVSTHMgdG8gY29tcGFyZSB0aGVtIG1vcmUgcmVsaWFibHlcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChuZXcgVVJMKG5vZGUudXJsKS5ocmVmID09PSBuZXcgVVJMKHVybCkuaHJlZikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgaW52YWxpZCBVUkxzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuLy8gLS0tIFVwZGF0ZSBmdW5jdGlvbnMgLS0tXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va21hcmsodXBkYXRlZEJvb2ttYXJrOiBCb29rbWFya0l0ZW0pOiBQcm9taXNlPEJvb2ttYXJrSXRlbT4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgIFxyXG4gICAgLy8gV2UgbmVlZCB0byBmaW5kIHRoZSBvcmlnaW5hbCBib29rbWFyayB0byB1cGRhdGUgaXQuXHJcbiAgICAvLyBUaGlzIGlzIG5vdCBlZmZpY2llbnQsIGEgZmxhdCBtYXAgd291bGQgYmUgYmV0dGVyIGZvciBwZXJmb3JtYW5jZSBvbiBsYXJnZSBkYXRhc2V0cy5cclxuICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIHVwZGF0ZWRCb29rbWFyay5pZCk7XHJcblxyXG4gICAgaWYgKGJvb2ttYXJrKSB7XHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihib29rbWFyaywgdXBkYXRlZEJvb2ttYXJrKTtcclxuICAgICAgICBhd2FpdCBzZXRBcHBEYXRhKGFwcERhdGEpO1xyXG4gICAgICAgIHJldHVybiBib29rbWFyaztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCb29rbWFyayB3aXRoIGlkICR7dXBkYXRlZEJvb2ttYXJrLmlkfSBub3QgZm91bmQuYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUJvb2ttYXJrQnlJZChub2RlczogKEZvbGRlciB8IEJvb2ttYXJrSXRlbSlbXSwgaWQ6IHN0cmluZyk6IChGb2xkZXIgfCBCb29rbWFya0l0ZW0pW10ge1xyXG4gICAgcmV0dXJuIG5vZGVzLmZpbHRlcihub2RlID0+IHtcclxuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlKSB7IC8vIEZvbGRlclxyXG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuID0gcmVtb3ZlQm9va21hcmtCeUlkKG5vZGUuY2hpbGRyZW4sIGlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIGZvbGRlclxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBJdCdzIGEgYm9va21hcmssIGZpbHRlciBpdCBvdXQgaWYgSURzIG1hdGNoXHJcbiAgICAgICAgcmV0dXJuIG5vZGUuaWQgIT09IGlkOyBcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlQm9va21hcmsoaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgIGFwcERhdGEuZm9sZGVycyA9IHJlbW92ZUJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGlkKSBhcyBGb2xkZXJbXTtcclxuICAgIGF3YWl0IHNldEFwcERhdGEoYXBwRGF0YSk7XHJcbn1cclxuXHJcbi8vIC0tLSBSZWFjdGl2ZSBTdmVsdGUgU3RvcmUgLS0tXHJcbmltcG9ydCB7IHJlYWRhYmxlIH0gZnJvbSAnc3ZlbHRlL3N0b3JlJztcclxuXHJcbi8qKlxyXG4gKiBBIHJlYWRhYmxlIFN2ZWx0ZSBzdG9yZSB0aGF0IHN0YXlzIGluIHN5bmMgd2l0aCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cclxuICovXHJcbmV4cG9ydCBjb25zdCBhcHBEYXRhU3RvcmUgPSByZWFkYWJsZTxBcHBEYXRhIHwgbnVsbD4obnVsbCwgKHNldCkgPT4ge1xyXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgZmlyc3Qgc3Vic2NyaWJlciBzdWJzY3JpYmVzLlxyXG5cclxuICAgIC8vIDEuIEdldCB0aGUgaW5pdGlhbCB2YWx1ZSBmcm9tIHN0b3JhZ2UgYW5kIHNldCB0aGUgc3RvcmUncyB2YWx1ZS5cclxuICAgIGdldEFwcERhdGEoKS50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgIHNldChkYXRhKTtcclxuICAgIH0pLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIGFwcERhdGFTdG9yZTpcIiwgZXJyKTtcclxuICAgICAgICAvLyBPcHRpb25hbGx5IHNldCBhIGRlZmF1bHQgdmFsdWUgb3IgYW4gZXJyb3Igc3RhdGVcclxuICAgICAgICBzZXQoZGVmYXVsdERhdGEpOyBcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDIuIFNldCB1cCBhIGxpc3RlbmVyIGZvciBhbnkgc3Vic2VxdWVudCBjaGFuZ2VzIGluIHN0b3JhZ2UuXHJcbiAgICBjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzOiB7IFtrZXk6IHN0cmluZ106IGNocm9tZS5zdG9yYWdlLlN0b3JhZ2VDaGFuZ2UgfSwgYXJlYU5hbWU6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIGlmIChhcmVhTmFtZSA9PT0gJ2xvY2FsJyAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZXSkge1xyXG4gICAgICAgICAgICBzZXQoY2hhbmdlc1tTVE9SQUdFX0tFWV0ubmV3VmFsdWUgYXMgQXBwRGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xyXG5cclxuICAgIC8vIDMuIFJldHVybiBhIGNsZWFudXAgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgbGFzdCBzdWJzY3JpYmVyIHVuc3Vic2NyaWJlcy5cclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcclxuICAgIH07XHJcbn0pOyAiLCIvKipcbiAqIFRoaXMgZmlsZSBjb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgR29vZ2xlIERyaXZlIEFQSS5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZvbGRlciwgQm9va21hcmtJdGVtLCBUYWcsIEFjY2Vzc1JlY29yZCB9IGZyb20gJyRsaWIvdHlwZXMnO1xuXG4vLyBUaGlzIGlzIHRoZSBDbGllbnQgSUQgZm9yIHRoZSBcIldlYiBBcHBsaWNhdGlvblwiIHR5cGUgY3JlZGVudGlhbCBpbiBHb29nbGUgQ2xvdWQgQ29uc29sZS5cbi8vIEl0IGlzIHVzZWQgYXMgYSBmYWxsYmFjayBmb3IgYnJvd3NlcnMgdGhhdCBkbyBub3Qgc3VwcG9ydCBjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuIChlLmcuLCBCcmF2ZSkuXG5jb25zdCBXRUJfQVBQX0NMSUVOVF9JRCA9ICc1MTk3MjkzMDk1MTEtamJmdjhmMWNzMDhmbTF0NzRmYjJldnR0MTJobmJhbmsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nO1xuXG5jb25zdCBESVNDT1ZFUllfRE9DID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2Rpc2NvdmVyeS92MS9hcGlzL2RyaXZlL3YzL3Jlc3QnO1xuXG5jb25zdCBCT1VOREFSWSA9ICctLS0tLS0tMzE0MTU5MjY1MzU4OTc5MzIzODQ2JztcbmNvbnN0IFVQTE9BRF9VUkwgPSAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vdXBsb2FkL2RyaXZlL3YzL2ZpbGVzJztcbmNvbnN0IERSSVZFX0ZJTEVTX1VSTCA9ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9kcml2ZS92My9maWxlcyc7XG5jb25zdCBGSUxFX05BTUUgPSAnY2hyb21lLWV4dGVuc2lvbi1zdmVsdGUtdHlwZXNjcmlwdC1ib2lsZXJwbGF0ZS1iYWNrdXAuanNvbic7XG5jb25zdCBNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVkgPSAnZ2RyaXZlX21hbnVhbF90b2tlbic7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBHb29nbGUgQ2hyb21lLlxuICogVGhpcyBpcyBhIHNpbXBsaWZpZWQgY2hlY2sgYW5kIG1pZ2h0IG5lZWQgaW1wcm92ZW1lbnQuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0cnVlIGlmIHRoZSBicm93c2VyIGlzIGxpa2VseSBDaHJvbWUsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaXNDaHJvbWVCcm93c2VyKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuXHQvLyBAdHMtaWdub3JlXG5cdGlmIChuYXZpZ2F0b3IuYnJhdmUgJiYgKGF3YWl0IG5hdmlnYXRvci5icmF2ZS5pc0JyYXZlKCkpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdC8vIFRoaXMgaXMgbm90IGEgZm9vbHByb29mIHdheSB0byBkZXRlY3QgQ2hyb21lLCBidXQgaXQncyBhIGNvbW1vbiBtZXRob2QuXG5cdC8vIEl0IGNoZWNrcyBmb3IgdGhlIHByZXNlbmNlIG9mICdDaHJvbWUnIGFuZCB0aGUgYWJzZW5jZSBvZiAnRWRnJyAoZm9yIEVkZ2UpIGluIHRoZSB1c2VyIGFnZW50IHN0cmluZy5cblx0Ly8gSXQncyBhIHJlYXNvbmFibGUgaGV1cmlzdGljIGZvciBkaXN0aW5ndWlzaGluZyBDaHJvbWUgZnJvbSBvdGhlciBDaHJvbWl1bS1iYXNlZCBicm93c2Vycy5cblx0cmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQuaW5jbHVkZXMoJ0Nocm9tZScpICYmICFuYXZpZ2F0b3IudXNlckFnZW50LmluY2x1ZGVzKCdFZGcnKTtcbn1cblxuZnVuY3Rpb24gbGF1bmNoV2ViQXV0aEZsb3coaW50ZXJhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHN0cmluZz4ge1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGlmIChXRUJfQVBQX0NMSUVOVF9JRC5zdGFydHNXaXRoKCdDT0xFX09fU0VVX0lEX0RFX0NMSUVOVEUnKSkge1xuXHRcdFx0cmV0dXJuIHJlamVjdChcblx0XHRcdFx0bmV3IEVycm9yKCdQbGVhc2UgcHJvdmlkZSB0aGUgV2ViIEFwcGxpY2F0aW9uIENsaWVudCBJRCBpbiBzcmMvbGliL2dkcml2ZS50cycpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGV4dGVuc2lvbklkID0gY2hyb21lLnJ1bnRpbWUuaWQ7XG5cdFx0Y29uc3QgcmVkaXJlY3RVcmkgPSBgaHR0cHM6Ly8ke2V4dGVuc2lvbklkfS5jaHJvbWl1bWFwcC5vcmdgO1xuXHRcdGNvbnNvbGUubG9nKFxuXHRcdFx0J1BhcmEgbyBmbHV4byBkZSBhdXRlbnRpY2HDp8OjbyBkYSB3ZWIsIGNlcnRpZmlxdWUtc2UgZGUgcXVlIGVzdGUgVVJJIGRlIHJlZGlyZWNpb25hbWVudG8gZXN0w6EgYWRpY2lvbmFkbyDDoHMgc3VhcyBjcmVkZW5jaWFpcyBkZSBPQXV0aCAyLjAgZG8gdGlwbyBcIkFwbGljYcOnw6NvIFdlYlwiIG5hIEdvb2dsZSBDbG91ZCBDb25zb2xlOicsXG5cdFx0XHRyZWRpcmVjdFVyaVxuXHRcdCk7XG5cdFx0Y29uc3Qgc2NvcGVzID0gJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUuZmlsZSc7XG5cdFx0bGV0IGF1dGhVcmwgPSBgaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL3YyL2F1dGhgO1xuXHRcdGF1dGhVcmwgKz0gYD9jbGllbnRfaWQ9JHtXRUJfQVBQX0NMSUVOVF9JRH1gO1xuXHRcdGF1dGhVcmwgKz0gYCZyZXNwb25zZV90eXBlPXRva2VuYDtcblx0XHRhdXRoVXJsICs9IGAmcmVkaXJlY3RfdXJpPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlZGlyZWN0VXJpKX1gO1xuXHRcdGF1dGhVcmwgKz0gYCZzY29wZT0ke2VuY29kZVVSSUNvbXBvbmVudChzY29wZXMpfWA7XG5cblx0XHRjaHJvbWUuaWRlbnRpdHkubGF1bmNoV2ViQXV0aEZsb3coeyB1cmw6IGF1dGhVcmwsIGludGVyYWN0aXZlIH0sIChyZXNwb25zZVVybCkgPT4ge1xuXHRcdFx0aWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2VVcmwpIHtcblx0XHRcdFx0Y29uc3QgdXJsID0gbmV3IFVSTChyZXNwb25zZVVybCk7XG5cdFx0XHRcdGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXModXJsLmhhc2guc3Vic3RyaW5nKDEpKTsgLy8gUmVtb3ZlIHRoZSAnIydcblx0XHRcdFx0Y29uc3QgYWNjZXNzVG9rZW4gPSBwYXJhbXMuZ2V0KCdhY2Nlc3NfdG9rZW4nKTtcblx0XHRcdFx0aWYgKGFjY2Vzc1Rva2VuKSB7XG5cdFx0XHRcdFx0Y2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW01BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWV06IGFjY2Vzc1Rva2VuIH0sICgpID0+IHtcblx0XHRcdFx0XHRcdC8vIFRoZSBsaXN0ZW5lciBhYm92ZSB3aWxsIGF1dG9tYXRpY2FsbHkgdXBkYXRlIHRoZSBzdG9yZVxuXHRcdFx0XHRcdFx0cmVzb2x2ZShhY2Nlc3NUb2tlbik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkOiBBY2Nlc3MgdG9rZW4gbm90IGZvdW5kIGluIHJlc3BvbnNlLicpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gZmFpbGVkOiBObyByZXNwb25zZSBVUkwuJykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBJbml0aWF0ZXMgdGhlIE9BdXRoIDIuMCBmbG93IHRvIGdldCBhbiBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gaW50ZXJhY3RpdmUgSWYgdHJ1ZSwgdGhlIHVzZXIgd2lsbCBiZSBwcm9tcHRlZCB0byBsb2cgaW4gaWYgbmVjZXNzYXJ5LlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIGFjY2VzcyB0b2tlbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEF1dGhUb2tlbihpbnRlcmFjdGl2ZTogYm9vbGVhbik6IFByb21pc2U8c3RyaW5nPiB7XG5cdGNvbnN0IGlzQ2hyb21lID0gYXdhaXQgaXNDaHJvbWVCcm93c2VyKCk7XG5cblx0aWYgKGlzQ2hyb21lKSB7XG5cdFx0Y29uc29sZS5sb2coJ0RldGVjdGVkIENocm9tZSBicm93c2VyLCB1c2luZyBjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuLicpO1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRjaHJvbWUuaWRlbnRpdHkuZ2V0QXV0aFRva2VuKHsgaW50ZXJhY3RpdmUgfSwgKHRva2VuKSA9PiB7XG5cdFx0XHRcdGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcblx0XHRcdFx0XHRyZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzb2x2ZSh0b2tlbiBhcyBzdHJpbmcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLmxvZygnRGV0ZWN0ZWQgYSBub24tQ2hyb21lIGJyb3dzZXIsIHVzaW5nIGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdy4nKTtcblx0XHRpZiAoaW50ZXJhY3RpdmUpIHtcblx0XHRcdHJldHVybiBsYXVuY2hXZWJBdXRoRmxvdyhpbnRlcmFjdGl2ZSk7XG5cdFx0fVxuXHRcdC8vIFRyeSB0byBnZXQgZnJvbSBzdG9yYWdlIGlmIG5vdCBpbnRlcmFjdGl2ZVxuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZLCAocmVzdWx0KSA9PiB7XG5cdFx0XHRcdGlmIChyZXN1bHRbTUFOVUFMX1RPS0VOX1NUT1JBR0VfS0VZXSkge1xuXHRcdFx0XHRcdHJlc29sdmUocmVzdWx0W01BTlVBTF9UT0tFTl9TVE9SQUdFX0tFWV0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoJ05vdCBsb2dnZWQgaW4uJykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBjYWNoZWQgT0F1dGggMi4wIHRva2VuLlxuICogQHBhcmFtIHRva2VuIFRoZSB0b2tlbiB0byByZW1vdmUuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSB0b2tlbiBpcyByZW1vdmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FjaGVkQXV0aFRva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgY2hyb21lLmlkZW50aXR5LnJlbW92ZUNhY2hlZEF1dGhUb2tlbih7IHRva2VuIH0sICgpID0+IHtcblx0XHRcdGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShNQU5VQUxfVE9LRU5fU1RPUkFHRV9LRVksICgpID0+IHtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRIZWFkZXJzKHRva2VuOiBzdHJpbmcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHt0b2tlbn1gLFxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH07XG59XG5cbi8qKlxuICogRmluZHMgdGhlIGJhY2t1cCBmaWxlIGluIHRoZSB1c2VyJ3MgR29vZ2xlIERyaXZlLlxuICogQHBhcmFtIHRva2VuIFRoZSBPQXV0aCAyLjAgYWNjZXNzIHRva2VuLlxuICogQHJldHVybnMgVGhlIGZpbGUgbWV0YWRhdGEgaWYgZm91bmQsIG90aGVyd2lzZSBudWxsLlxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5kQmFja3VwRmlsZSh0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnModG9rZW4pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7RFJJVkVfRklMRVNfVVJMfT9xPW5hbWU9JyR7RklMRV9OQU1FfScgYW5kICdyb290JyBpbiBwYXJlbnRzIGFuZCB0cmFzaGVkPWZhbHNlYCwge1xuICAgICAgICBoZWFkZXJzLFxuICAgIH0pO1xuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGZpbmRCYWNrdXBGaWxlOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHNlYXJjaCBmb3IgYmFja3VwIGZpbGU6ICcgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gZGF0YS5maWxlcy5sZW5ndGggPiAwID8gZGF0YS5maWxlc1swXSA6IG51bGw7XG59XG5cbi8qKlxuICogVXBsb2FkcyB0aGUgYXBwbGljYXRpb24gZGF0YSB0byBHb29nbGUgRHJpdmUuXG4gKiBAcGFyYW0gdG9rZW4gVGhlIE9BdXRoIDIuMCBhY2Nlc3MgdG9rZW4uXG4gKiBAcGFyYW0gZGF0YSBUaGUgYXBwbGljYXRpb24gZGF0YSB0byB1cGxvYWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRCYWNrdXAodG9rZW46IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBcbiAgICBjb25zdCBmaWxlTWV0YWRhdGE6IHsgbmFtZTogc3RyaW5nLCBwYXJlbnRzPzogc3RyaW5nW10gfSA9IHtcbiAgICAgICAgbmFtZTogRklMRV9OQU1FLFxuICAgIH07XG5cbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgLy8gUGFyZW50cyBmaWVsZCBpcyBub3QgbmVlZGVkIGlmIHRoZSBmaWxlIGlzIGluIHRoZSByb290LlxuICAgICAgICAvLyBJdCBkZWZhdWx0cyB0byB0aGUgcm9vdCBpZiBub3Qgc3BlY2lmaWVkLlxuICAgIH1cblxuICAgIGNvbnN0IG11bHRpcGFydFJlcXVlc3RCb2R5ID1cbiAgICAgICAgYC0tJHtCT1VOREFSWX1cXHJcXG5gICtcbiAgICAgICAgYENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFxcclxcblxcclxcbmAgK1xuICAgICAgICBgJHtKU09OLnN0cmluZ2lmeShmaWxlTWV0YWRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfVxcclxcbmAgK1xuICAgICAgICBgQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuYCArXG4gICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGRhdGEpfVxcclxcbmAgK1xuICAgICAgICBgLS0ke0JPVU5EQVJZfS0tYDtcblxuICAgIGNvbnN0IG1ldGhvZCA9IGZpbGUgPyAnUEFUQ0gnIDogJ1BPU1QnO1xuICAgIGNvbnN0IHVybCA9IGZpbGUgPyBgJHtVUExPQURfVVJMfS8ke2ZpbGUuaWR9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YCA6IGAke1VQTE9BRF9VUkx9P3VwbG9hZFR5cGU9bXVsdGlwYXJ0YDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7dG9rZW59YCxcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiBgbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PSR7Qk9VTkRBUll9YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogbXVsdGlwYXJ0UmVxdWVzdEJvZHksXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignR29vZ2xlIEFQSSBFcnJvciBvbiB1cGxvYWRCYWNrdXA6JywgZXJyb3JEZXRhaWxzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBsb2FkIGJhY2t1cDogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBEb3dubG9hZHMgdGhlIGJhY2t1cCBmaWxlIGZyb20gR29vZ2xlIERyaXZlLlxuICogQHBhcmFtIHRva2VuIFRoZSBPQXV0aCAyLjAgYWNjZXNzIHRva2VuLlxuICogQHJldHVybnMgVGhlIGFwcGxpY2F0aW9uIGRhdGEgZnJvbSB0aGUgYmFja3VwIGZpbGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZEJhY2t1cCh0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGZpbmRCYWNrdXBGaWxlKHRva2VuKTtcbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaGVhZGVycyA9IGF3YWl0IGdldEhlYWRlcnModG9rZW4pO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7RFJJVkVfRklMRVNfVVJMfS8ke2ZpbGUuaWR9P2FsdD1tZWRpYWAsIHtcbiAgICAgICAgaGVhZGVycyxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgQVBJIEVycm9yIG9uIGRvd25sb2FkQmFja3VwOicsIGVycm9yRGV0YWlscyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGRvd25sb2FkIGJhY2t1cDogJyArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG59XG5cbi8vIEZ1bmN0aW9ucyBmb3IgYmFja3VwIGFuZCByZXN0b3JlIHdpbGwgYmUgYWRkZWQgYmVsb3cuICIsImltcG9ydCB7IHR5cGUgQ2xhc3NWYWx1ZSwgY2xzeCB9IGZyb20gXCJjbHN4XCI7XG5pbXBvcnQgeyB0d01lcmdlIH0gZnJvbSBcInRhaWx3aW5kLW1lcmdlXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbiguLi5pbnB1dHM6IENsYXNzVmFsdWVbXSkge1xuXHRyZXR1cm4gdHdNZXJnZShjbHN4KGlucHV0cykpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YCBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkXG4gKiBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2FzIGludm9rZWQuXG4gKiBAcGFyYW0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAqIEByZXR1cm5zIFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWJvdW5jZTxUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk+KGZ1bmM6IFQsIHdhaXQ6IG51bWJlcik6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkIHtcbiAgICBsZXQgdGltZW91dDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IFRoaXNQYXJhbWV0ZXJUeXBlPFQ+LCAuLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzO1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgfTtcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCB0eXBlIFdpdGhvdXRDaGlsZDxUPiA9IFQgZXh0ZW5kcyB7IGNoaWxkPzogYW55IH0gPyBPbWl0PFQsIFwiY2hpbGRcIj4gOiBUO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCB0eXBlIFdpdGhvdXRDaGlsZHJlbjxUPiA9IFQgZXh0ZW5kcyB7IGNoaWxkcmVuPzogYW55IH0gPyBPbWl0PFQsIFwiY2hpbGRyZW5cIj4gOiBUO1xuZXhwb3J0IHR5cGUgV2l0aG91dENoaWxkcmVuT3JDaGlsZDxUPiA9IFdpdGhvdXRDaGlsZHJlbjxXaXRob3V0Q2hpbGQ8VD4+O1xuZXhwb3J0IHR5cGUgV2l0aEVsZW1lbnRSZWY8VCwgVSBleHRlbmRzIEhUTUxFbGVtZW50ID0gSFRNTEVsZW1lbnQ+ID0gVCAmIHsgcmVmPzogVSB8IG51bGwgfTtcbiIsImltcG9ydCB7IGFwcERhdGFTdG9yZSB9IGZyb20gJy4vc3RvcmFnZSc7XHJcbmltcG9ydCB7IGdldEF1dGhUb2tlbiwgdXBsb2FkQmFja3VwIH0gZnJvbSAnLi9nZHJpdmUnO1xyXG5pbXBvcnQgeyBkZWJvdW5jZSB9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxubGV0IGlzRmlyc3RDaGFuZ2UgPSB0cnVlO1xyXG5cclxuY29uc3QgZGVib3VuY2VkVXBsb2FkID0gZGVib3VuY2UoYXN5bmMgKHRva2VuOiBzdHJpbmcsIGRhdGE6IGFueSkgPT4ge1xyXG4gICAgY29uc29sZS5sb2coJ0RlYm91bmNlZCBiYWNrdXAgdHJpZ2dlcmVkLicpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCB1cGxvYWRCYWNrdXAodG9rZW4sIGRhdGEpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBzdWNjZXNzZnVsLicpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dG8tYmFja3VwIGZhaWxlZDonLCBlKTtcclxuICAgIH1cclxufSwgNTAwMCk7IC8vIERlYm91bmNlIGZvciA1IHNlY29uZHNcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZURhdGFDaGFuZ2UoZGF0YTogYW55KSB7XHJcbiAgICBpZiAoaXNGaXJzdENoYW5nZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdJbml0aWFsIGRhdGEgbG9hZGVkLCBza2lwcGluZyBmaXJzdCBhdXRvLWJhY2t1cC4nKTtcclxuICAgICAgICBpc0ZpcnN0Q2hhbmdlID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGEgdG9rZW4gbm9uLWludGVyYWN0aXZlbHkuXHJcbiAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYXdhaXQgZ2V0QXV0aFRva2VuKGZhbHNlKTtcclxuICAgICAgICAgICAgaWYgKHRva2VuKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRGF0YSBjaGFuZ2VkLCBzY2hlZHVsaW5nIGF1dG8tYmFja3VwLi4uJyk7XHJcbiAgICAgICAgICAgICAgICBkZWJvdW5jZWRVcGxvYWQodG9rZW4sIGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgLy8gTm8gdG9rZW4gZm91bmQsIGRvIG5vdGhpbmcuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyBTdWJzY3JpYmUgdG8gdGhlIHN0b3JlIHRvIGxpc3RlbiBmb3IgY2hhbmdlcy5cclxuYXBwRGF0YVN0b3JlLnN1YnNjcmliZShoYW5kbGVEYXRhQ2hhbmdlKTtcclxuXHJcbmNvbnNvbGUubG9nKCdBdXRvLWJhY2t1cCBtb2R1bGUgaW5pdGlhbGl6ZWQuJyk7ICIsImltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tIFwiI2ltcG9ydHNcIjtcclxuaW1wb3J0IHsgZmluZEJvb2ttYXJrQnlJZCwgZ2V0QXBwRGF0YSwgZmluZEJvb2ttYXJrQnlVcmwsIHNldEFwcERhdGEgfSBmcm9tIFwiLi4vbGliL3N0b3JhZ2VcIjtcclxuXHJcbi8vIEltcG9ydCB0aGUgYXV0by1iYWNrdXAgbW9kdWxlIHRvIGluaXRpYWxpemUgaXQuXHJcbmltcG9ydCAnJGxpYi9hdXRvLWJhY2t1cCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKFwiQmFja2dyb3VuZCBzY3JpcHQgbG9hZGVkLlwiKTtcclxuXHJcbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhbiBhbGFybSBnb2VzIG9mZlxyXG4gICAgY2hyb21lLmFsYXJtcy5vbkFsYXJtLmFkZExpc3RlbmVyKGFzeW5jIChhbGFybSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQWxhcm0gZmlyZWQ6XCIsIGFsYXJtKTtcclxuXHJcbiAgICAgICAgaWYgKGFsYXJtLm5hbWUuc3RhcnRzV2l0aChcInJlbWluZGVyLVwiKSkge1xyXG4gICAgICAgICAgICBjb25zdCBib29rbWFya0lkID0gYWxhcm0ubmFtZS5yZXBsYWNlKFwicmVtaW5kZXItXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gRmluZCB0aGUgYm9va21hcmsgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcmVtaW5kZXJcclxuICAgICAgICAgICAgY29uc3QgYXBwRGF0YSA9IGF3YWl0IGdldEFwcERhdGEoKTtcclxuICAgICAgICAgICAgY29uc3QgYm9va21hcmsgPSBmaW5kQm9va21hcmtCeUlkKGFwcERhdGEuZm9sZGVycywgYm9va21hcmtJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYm9va21hcmspIHtcclxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKGBub3RpZmljYXRpb24tJHtib29rbWFyay5pZH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiYXNpY1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGljb25Vcmw6IFwiaWNvbi0xMjgucG5nXCIsIC8vIFdYVCBoYW5kbGVzIHBhdGhpbmdcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJSZW1pbmRlcjogXCIgKyBib29rbWFyay50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNsaWNrIHRvIG9wZW4gdGhpcyBzYXZlZCBwYWdlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAyLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW5lciBmb3Igd2hlbiBhIG5vdGlmaWNhdGlvbiBpcyBjbGlja2VkXHJcbiAgICBjaHJvbWUubm90aWZpY2F0aW9ucy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKG5vdGlmaWNhdGlvbklkKSA9PiB7XHJcbiAgICAgICAgaWYgKG5vdGlmaWNhdGlvbklkLnN0YXJ0c1dpdGgoXCJub3RpZmljYXRpb24tXCIpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrSWQgPSBub3RpZmljYXRpb25JZC5yZXBsYWNlKFwibm90aWZpY2F0aW9uLVwiLCBcIlwiKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFRoaXMgcGFydCBpcyB0cmlja3kgYmVjYXVzZSB3ZSBjYW4ndCBkaXJlY3RseSBnZXQgdGhlIFVSTCBoZXJlXHJcbiAgICAgICAgICAgIC8vIHdpdGhvdXQgYW5vdGhlciBzdG9yYWdlIGxvb2t1cC4gQSBiZXR0ZXIgYXBwcm9hY2ggZm9yIGEgcmVhbCBhcHBcclxuICAgICAgICAgICAgLy8gbWlnaHQgYmUgdG8gc3RvcmUgdGhlIFVSTCBpbiB0aGUgYWxhcm0vbm90aWZpY2F0aW9uIGRldGFpbHMgaWYgcG9zc2libGUsXHJcbiAgICAgICAgICAgIC8vIG9yIHBlcmZvcm0gdGhlIGxvb2t1cCBhcyB3ZSBkbyBoZXJlLlxyXG4gICAgICAgICAgICBnZXRBcHBEYXRhKCkudGhlbihhcHBEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlJZChhcHBEYXRhLmZvbGRlcnMsIGJvb2ttYXJrSWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJvb2ttYXJrPy51cmwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IGJvb2ttYXJrLnVybCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGlzdGVuZXIgZm9yIHdoZW4gYSB1c2VyIHZpc2l0cyBhIHBhZ2VcclxuICAgIGNocm9tZS5oaXN0b3J5Lm9uVmlzaXRlZC5hZGRMaXN0ZW5lcihhc3luYyAoaGlzdG9yeUl0ZW0pID0+IHtcclxuICAgICAgICBpZiAoaGlzdG9yeUl0ZW0udXJsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcERhdGEgPSBhd2FpdCBnZXRBcHBEYXRhKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvb2ttYXJrID0gZmluZEJvb2ttYXJrQnlVcmwoYXBwRGF0YS5mb2xkZXJzLCBoaXN0b3J5SXRlbS51cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJvb2ttYXJrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgaGlzdG9yeSBmb3IgYm9va21hcmtlZCBpdGVtOiAke2Jvb2ttYXJrLnRpdGxlfWApO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmlzaXRzID0gYXdhaXQgY2hyb21lLmhpc3RvcnkuZ2V0VmlzaXRzKHsgdXJsOiBoaXN0b3J5SXRlbS51cmwgfSk7XHJcbiAgICAgICAgICAgICAgICBib29rbWFyay5hY2Nlc3NIaXN0b3J5ID0gdmlzaXRzLm1hcCh2aXNpdCA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdmlzaXQudmlzaXRUaW1lIVxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgc2V0QXBwRGF0YShhcHBEYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59KTtcclxuIiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBfYnJvd3NlciB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IF9icm93c2VyO1xuZXhwb3J0IHt9O1xuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJlLnJ1bmVfb3V0c2lkZV9zdmVsdGUiLCJyZXN1bHQiLCJicm93c2VyIiwiX2Jyb3dzZXIiXSwibWFwcGluZ3MiOiI7OztBQUFPLFdBQVMsaUJBQWlCLEtBQUs7QUFDcEMsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBRztBQUNoRSxXQUFPO0FBQUEsRUFDVDtBQ21CTyxRQUFNLE9BQU8sTUFBTTtBQUFBLEVBQUM7QUNWcEIsV0FBUyxlQUFlLEdBQUcsR0FBRztBQUNwQyxXQUFPLEtBQUssSUFDVCxLQUFLLElBQ0wsTUFBTSxLQUFNLE1BQU0sUUFBUSxPQUFPLE1BQU0sWUFBYSxPQUFPLE1BQU07QUFBQSxFQUNyRTtBQzZSTyxXQUFTLG9CQUFvQixNQUFNO0FBQ2hDO0FBQ1IsWUFBTSxRQUFRLElBQUksTUFBTTtBQUFBLFFBQThCLElBQUk7QUFBQSx5Q0FBb0g7QUFFOUssWUFBTSxPQUFPO0FBRWIsWUFBTTtBQUFBLElBQ1A7QUFBQSxFQUdEO0FDM1NTO0FBSVIsUUFBUyxtQkFBVCxTQUEwQixNQUFNO0FBQy9CLFVBQUksRUFBRSxRQUFRLGFBQWE7QUFHMUIsWUFBSTtBQUNKLGVBQU8sZUFBZSxZQUFZLE1BQU07QUFBQSxVQUN2QyxjQUFjO0FBQUE7QUFBQSxVQUVkLEtBQUssTUFBTTtBQUNWLGdCQUFJLFVBQVUsUUFBVztBQUN4QixxQkFBTztBQUFBLFlBQ1I7QUFFQUEsZ0NBQXNCLElBQUk7QUFBQSxVQUMzQjtBQUFBLFVBQ0EsS0FBSyxDQUFDLE1BQU07QUFDWCxvQkFBUTtBQUFBLFVBQ1Q7QUFBQSxRQUNKLENBQUk7QUFBQSxNQUNGO0FBQUEsSUFDRDtBQUVBLHFCQUFpQixRQUFRO0FBQ3pCLHFCQUFp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
