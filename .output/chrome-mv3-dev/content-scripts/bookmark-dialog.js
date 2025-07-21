var bookmarkDialog = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  function defineContentScript(definition2) {
    return definition2;
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  const nullKey = Symbol("null");
  let keyCounter = 0;
  class ManyKeysMap extends Map {
    constructor() {
      super();
      this._objectHashes = /* @__PURE__ */ new WeakMap();
      this._symbolHashes = /* @__PURE__ */ new Map();
      this._publicKeys = /* @__PURE__ */ new Map();
      const [pairs] = arguments;
      if (pairs === null || pairs === void 0) {
        return;
      }
      if (typeof pairs[Symbol.iterator] !== "function") {
        throw new TypeError(typeof pairs + " is not iterable (cannot read property Symbol(Symbol.iterator))");
      }
      for (const [keys, value] of pairs) {
        this.set(keys, value);
      }
    }
    _getPublicKeys(keys, create = false) {
      if (!Array.isArray(keys)) {
        throw new TypeError("The keys parameter must be an array");
      }
      const privateKey = this._getPrivateKey(keys, create);
      let publicKey;
      if (privateKey && this._publicKeys.has(privateKey)) {
        publicKey = this._publicKeys.get(privateKey);
      } else if (create) {
        publicKey = [...keys];
        this._publicKeys.set(privateKey, publicKey);
      }
      return { privateKey, publicKey };
    }
    _getPrivateKey(keys, create = false) {
      const privateKeys = [];
      for (let key of keys) {
        if (key === null) {
          key = nullKey;
        }
        const hashes = typeof key === "object" || typeof key === "function" ? "_objectHashes" : typeof key === "symbol" ? "_symbolHashes" : false;
        if (!hashes) {
          privateKeys.push(key);
        } else if (this[hashes].has(key)) {
          privateKeys.push(this[hashes].get(key));
        } else if (create) {
          const privateKey = `@@mkm-ref-${keyCounter++}@@`;
          this[hashes].set(key, privateKey);
          privateKeys.push(privateKey);
        } else {
          return false;
        }
      }
      return JSON.stringify(privateKeys);
    }
    set(keys, value) {
      const { publicKey } = this._getPublicKeys(keys, true);
      return super.set(publicKey, value);
    }
    get(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.get(publicKey);
    }
    has(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.has(publicKey);
    }
    delete(keys) {
      const { publicKey, privateKey } = this._getPublicKeys(keys);
      return Boolean(publicKey && super.delete(publicKey) && this._publicKeys.delete(privateKey));
    }
    clear() {
      super.clear();
      this._symbolHashes.clear();
      this._publicKeys.clear();
    }
    get [Symbol.toStringTag]() {
      return "ManyKeysMap";
    }
    get size() {
      return super.size;
    }
  }
  function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
      return false;
    }
    if (Symbol.iterator in value) {
      return false;
    }
    if (Symbol.toStringTag in value) {
      return Object.prototype.toString.call(value) === "[object Module]";
    }
    return true;
  }
  function _defu(baseObject, defaults, namespace = ".", merger) {
    if (!isPlainObject(defaults)) {
      return _defu(baseObject, {}, namespace, merger);
    }
    const object = Object.assign({}, defaults);
    for (const key in baseObject) {
      if (key === "__proto__" || key === "constructor") {
        continue;
      }
      const value = baseObject[key];
      if (value === null || value === void 0) {
        continue;
      }
      if (merger && merger(object, key, value, namespace)) {
        continue;
      }
      if (Array.isArray(value) && Array.isArray(object[key])) {
        object[key] = [...value, ...object[key]];
      } else if (isPlainObject(value) && isPlainObject(object[key])) {
        object[key] = _defu(
          value,
          object[key],
          (namespace ? `${namespace}.` : "") + key.toString(),
          merger
        );
      } else {
        object[key] = value;
      }
    }
    return object;
  }
  function createDefu(merger) {
    return (...arguments_) => (
      // eslint-disable-next-line unicorn/no-array-reduce
      arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
    );
  }
  const defu = createDefu();
  const isExist = (element) => {
    return element !== null ? { isDetected: true, result: element } : { isDetected: false };
  };
  const isNotExist = (element) => {
    return element === null ? { isDetected: true, result: null } : { isDetected: false };
  };
  const getDefaultOptions = () => ({
    target: globalThis.document,
    unifyProcess: true,
    detector: isExist,
    observeConfigs: {
      childList: true,
      subtree: true,
      attributes: true
    },
    signal: void 0,
    customMatcher: void 0
  });
  const mergeOptions = (userSideOptions, defaultOptions) => {
    return defu(userSideOptions, defaultOptions);
  };
  const unifyCache = new ManyKeysMap();
  function createWaitElement(instanceOptions) {
    const { defaultOptions } = instanceOptions;
    return (selector, options) => {
      const {
        target,
        unifyProcess,
        observeConfigs,
        detector,
        signal,
        customMatcher
      } = mergeOptions(options, defaultOptions);
      const unifyPromiseKey = [
        selector,
        target,
        unifyProcess,
        observeConfigs,
        detector,
        signal,
        customMatcher
      ];
      const cachedPromise = unifyCache.get(unifyPromiseKey);
      if (unifyProcess && cachedPromise) {
        return cachedPromise;
      }
      const detectPromise = new Promise(
        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: avoid nesting promise
        async (resolve, reject) => {
          if (signal == null ? void 0 : signal.aborted) {
            return reject(signal.reason);
          }
          const observer = new MutationObserver(
            async (mutations) => {
              for (const _ of mutations) {
                if (signal == null ? void 0 : signal.aborted) {
                  observer.disconnect();
                  break;
                }
                const detectResult2 = await detectElement({
                  selector,
                  target,
                  detector,
                  customMatcher
                });
                if (detectResult2.isDetected) {
                  observer.disconnect();
                  resolve(detectResult2.result);
                  break;
                }
              }
            }
          );
          signal == null ? void 0 : signal.addEventListener(
            "abort",
            () => {
              observer.disconnect();
              return reject(signal.reason);
            },
            { once: true }
          );
          const detectResult = await detectElement({
            selector,
            target,
            detector,
            customMatcher
          });
          if (detectResult.isDetected) {
            return resolve(detectResult.result);
          }
          observer.observe(target, observeConfigs);
        }
      ).finally(() => {
        unifyCache.delete(unifyPromiseKey);
      });
      unifyCache.set(unifyPromiseKey, detectPromise);
      return detectPromise;
    };
  }
  async function detectElement({
    target,
    selector,
    detector,
    customMatcher
  }) {
    const element = customMatcher ? customMatcher(selector) : target.querySelector(selector);
    return await detector(element);
  }
  const waitElement = createWaitElement({
    defaultOptions: getDefaultOptions()
  });
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  function applyPosition(root, positionedElement, options) {
    var _a2, _b2;
    if (options.position === "inline") return;
    if (options.zIndex != null) root.style.zIndex = String(options.zIndex);
    root.style.overflow = "visible";
    root.style.position = "relative";
    root.style.width = "0";
    root.style.height = "0";
    root.style.display = "block";
    if (positionedElement) {
      if (options.position === "overlay") {
        positionedElement.style.position = "absolute";
        if ((_a2 = options.alignment) == null ? void 0 : _a2.startsWith("bottom-"))
          positionedElement.style.bottom = "0";
        else positionedElement.style.top = "0";
        if ((_b2 = options.alignment) == null ? void 0 : _b2.endsWith("-right"))
          positionedElement.style.right = "0";
        else positionedElement.style.left = "0";
      } else {
        positionedElement.style.position = "fixed";
        positionedElement.style.top = "0";
        positionedElement.style.bottom = "0";
        positionedElement.style.left = "0";
        positionedElement.style.right = "0";
      }
    }
  }
  function getAnchor(options) {
    if (options.anchor == null) return document.body;
    let resolved = typeof options.anchor === "function" ? options.anchor() : options.anchor;
    if (typeof resolved === "string") {
      if (resolved.startsWith("/")) {
        const result2 = document.evaluate(
          resolved,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result2.singleNodeValue ?? void 0;
      } else {
        return document.querySelector(resolved) ?? void 0;
      }
    }
    return resolved ?? void 0;
  }
  function mountUi(root, options) {
    var _a2, _b2;
    const anchor = getAnchor(options);
    if (anchor == null)
      throw Error(
        "Failed to mount content script UI: could not find anchor element"
      );
    switch (options.append) {
      case void 0:
      case "last":
        anchor.append(root);
        break;
      case "first":
        anchor.prepend(root);
        break;
      case "replace":
        anchor.replaceWith(root);
        break;
      case "after":
        (_a2 = anchor.parentElement) == null ? void 0 : _a2.insertBefore(root, anchor.nextElementSibling);
        break;
      case "before":
        (_b2 = anchor.parentElement) == null ? void 0 : _b2.insertBefore(root, anchor);
        break;
      default:
        options.append(anchor, root);
        break;
    }
  }
  function createMountFunctions(baseFunctions, options) {
    let autoMountInstance = void 0;
    const stopAutoMount = () => {
      autoMountInstance == null ? void 0 : autoMountInstance.stopAutoMount();
      autoMountInstance = void 0;
    };
    const mount = () => {
      baseFunctions.mount();
    };
    const unmount = baseFunctions.remove;
    const remove = () => {
      stopAutoMount();
      baseFunctions.remove();
    };
    const autoMount = (autoMountOptions) => {
      if (autoMountInstance) {
        logger$1.warn("autoMount is already set.");
      }
      autoMountInstance = autoMountUi(
        { mount, unmount, stopAutoMount },
        {
          ...options,
          ...autoMountOptions
        }
      );
    };
    return {
      mount,
      remove,
      autoMount
    };
  }
  function autoMountUi(uiCallbacks, options) {
    const abortController = new AbortController();
    const EXPLICIT_STOP_REASON = "explicit_stop_auto_mount";
    const _stopAutoMount = () => {
      var _a2;
      abortController.abort(EXPLICIT_STOP_REASON);
      (_a2 = options.onStop) == null ? void 0 : _a2.call(options);
    };
    let resolvedAnchor = typeof options.anchor === "function" ? options.anchor() : options.anchor;
    if (resolvedAnchor instanceof Element) {
      throw Error(
        "autoMount and Element anchor option cannot be combined. Avoid passing `Element` directly or `() => Element` to the anchor."
      );
    }
    async function observeElement(selector) {
      let isAnchorExist = !!getAnchor(options);
      if (isAnchorExist) {
        uiCallbacks.mount();
      }
      while (!abortController.signal.aborted) {
        try {
          const changedAnchor = await waitElement(selector ?? "body", {
            customMatcher: () => getAnchor(options) ?? null,
            detector: isAnchorExist ? isNotExist : isExist,
            signal: abortController.signal
          });
          isAnchorExist = !!changedAnchor;
          if (isAnchorExist) {
            uiCallbacks.mount();
          } else {
            uiCallbacks.unmount();
            if (options.once) {
              uiCallbacks.stopAutoMount();
            }
          }
        } catch (error) {
          if (abortController.signal.aborted && abortController.signal.reason === EXPLICIT_STOP_REASON) {
            break;
          } else {
            throw error;
          }
        }
      }
    }
    observeElement(resolvedAnchor);
    return { stopAutoMount: _stopAutoMount };
  }
  function createIframeUi(ctx, options) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-wxt-iframe", "");
    const iframe = document.createElement("iframe");
    iframe.src = browser.runtime.getURL(options.page);
    wrapper.appendChild(iframe);
    let mounted = void 0;
    const mount = () => {
      var _a2;
      applyPosition(wrapper, iframe, options);
      mountUi(wrapper, options);
      mounted = (_a2 = options.onMount) == null ? void 0 : _a2.call(options, wrapper, iframe);
    };
    const remove = () => {
      var _a2;
      (_a2 = options.onRemove) == null ? void 0 : _a2.call(options, mounted);
      wrapper.remove();
      mounted = void 0;
    };
    const mountFunctions = createMountFunctions({ mount, remove }, options);
    ctx.onInvalidated(remove);
    return {
      get mounted() {
        return mounted;
      },
      iframe,
      wrapper,
      ...mountFunctions
    };
  }
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    main(ctx) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "openBookmarkDialog" && message.data) {
          const ui = createIframeUi(ctx, {
            page: "/dialog-iframe.html",
            onMount: (wrapper, iframe) => {
              Object.assign(wrapper.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100vw",
                height: "100vh",
                zIndex: "2147483647"
              });
              Object.assign(iframe.style, {
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent"
              });
            }
          });
          ui.mount();
          ui.iframe.onload = () => {
            var _a2;
            (_a2 = ui.iframe.contentWindow) == null ? void 0 : _a2.postMessage(
              {
                type: "init-dialog",
                data: {
                  ...message.data,
                  theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
                }
              },
              "*"
            );
          };
          const closeListener = (event) => {
            var _a2, _b2;
            if (event.source === ((_a2 = ui.iframe) == null ? void 0 : _a2.contentWindow) && ((_b2 = event.data) == null ? void 0 : _b2.type) === "close-dialog") {
              ui.remove();
              window.removeEventListener("message", closeListener);
            }
          };
          window.addEventListener("message", closeListener);
        }
      });
    }
  });
  bookmarkDialog;
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"bookmark-dialog"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  function initPlugins() {
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
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("bookmark-dialog", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"bookmark-dialog"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
bookmarkDialog;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9va21hcmstZGlhbG9nLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuN19AdHlwZXMrbm9kZUAyNC4wXzRiODdhYzdmYzFmMTg3YTUyNTE2OTFiYmFjZDJiN2Q5L25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtY29udGVudC1zY3JpcHQubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbWFueS1rZXlzLW1hcEAyLjAuMS9ub2RlX21vZHVsZXMvbWFueS1rZXlzLW1hcC9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9kZWZ1QDYuMS40L25vZGVfbW9kdWxlcy9kZWZ1L2Rpc3QvZGVmdS5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vQDFuYXRzdSt3YWl0LWVsZW1lbnRANC4xLjIvbm9kZV9tb2R1bGVzL0AxbmF0c3Uvd2FpdC1lbGVtZW50L2Rpc3QvZGV0ZWN0b3JzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS9AMW5hdHN1K3dhaXQtZWxlbWVudEA0LjEuMi9ub2RlX21vZHVsZXMvQDFuYXRzdS93YWl0LWVsZW1lbnQvZGlzdC9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuN19AdHlwZXMrbm9kZUAyNC4wXzRiODdhYzdmYzFmMTg3YTUyNTE2OTFiYmFjZDJiN2Q5L25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2dnZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvY29udGVudC1zY3JpcHQtdWkvc2hhcmVkLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC43X0B0eXBlcytub2RlQDI0LjBfNGI4N2FjN2ZjMWYxODdhNTI1MTY5MWJiYWNkMmI3ZDkvbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2NvbnRlbnQtc2NyaXB0LXVpL2lmcmFtZS5tanMiLCIuLi8uLi8uLi9zcmMvZW50cnlwb2ludHMvYm9va21hcmstZGlhbG9nLmNvbnRlbnQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuN19AdHlwZXMrbm9kZUAyNC4wXzRiODdhYzdmYzFmMTg3YTUyNTE2OTFiYmFjZDJiN2Q5L25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8ucG5wbS93eHRAMC4yMC43X0B0eXBlcytub2RlQDI0LjBfNGI4N2FjN2ZjMWYxODdhNTI1MTY5MWJiYWNkMmI3ZDkvbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMF80Yjg3YWM3ZmMxZjE4N2E1MjUxNjkxYmJhY2QyYjdkOS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUNvbnRlbnRTY3JpcHQoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbjtcbn1cbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsImNvbnN0IG51bGxLZXkgPSBTeW1ib2woJ251bGwnKTsgLy8gYG9iamVjdEhhc2hlc2Aga2V5IGZvciBudWxsXG5cbmxldCBrZXlDb3VudGVyID0gMDtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWFueUtleXNNYXAgZXh0ZW5kcyBNYXAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5fb2JqZWN0SGFzaGVzID0gbmV3IFdlYWtNYXAoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMgPSBuZXcgTWFwKCk7IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L2VjbWEyNjIvaXNzdWVzLzExOTRcblx0XHR0aGlzLl9wdWJsaWNLZXlzID0gbmV3IE1hcCgpO1xuXG5cdFx0Y29uc3QgW3BhaXJzXSA9IGFyZ3VtZW50czsgLy8gTWFwIGNvbXBhdFxuXHRcdGlmIChwYWlycyA9PT0gbnVsbCB8fCBwYWlycyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBwYWlyc1tTeW1ib2wuaXRlcmF0b3JdICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKHR5cGVvZiBwYWlycyArICcgaXMgbm90IGl0ZXJhYmxlIChjYW5ub3QgcmVhZCBwcm9wZXJ0eSBTeW1ib2woU3ltYm9sLml0ZXJhdG9yKSknKTtcblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IFtrZXlzLCB2YWx1ZV0gb2YgcGFpcnMpIHtcblx0XHRcdHRoaXMuc2V0KGtleXMsIHZhbHVlKTtcblx0XHR9XG5cdH1cblxuXHRfZ2V0UHVibGljS2V5cyhrZXlzLCBjcmVhdGUgPSBmYWxzZSkge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGtleXMgcGFyYW1ldGVyIG11c3QgYmUgYW4gYXJyYXknKTtcblx0XHR9XG5cblx0XHRjb25zdCBwcml2YXRlS2V5ID0gdGhpcy5fZ2V0UHJpdmF0ZUtleShrZXlzLCBjcmVhdGUpO1xuXG5cdFx0bGV0IHB1YmxpY0tleTtcblx0XHRpZiAocHJpdmF0ZUtleSAmJiB0aGlzLl9wdWJsaWNLZXlzLmhhcyhwcml2YXRlS2V5KSkge1xuXHRcdFx0cHVibGljS2V5ID0gdGhpcy5fcHVibGljS2V5cy5nZXQocHJpdmF0ZUtleSk7XG5cdFx0fSBlbHNlIGlmIChjcmVhdGUpIHtcblx0XHRcdHB1YmxpY0tleSA9IFsuLi5rZXlzXTsgLy8gUmVnZW5lcmF0ZSBrZXlzIGFycmF5IHRvIGF2b2lkIGV4dGVybmFsIGludGVyYWN0aW9uXG5cdFx0XHR0aGlzLl9wdWJsaWNLZXlzLnNldChwcml2YXRlS2V5LCBwdWJsaWNLZXkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7cHJpdmF0ZUtleSwgcHVibGljS2V5fTtcblx0fVxuXG5cdF9nZXRQcml2YXRlS2V5KGtleXMsIGNyZWF0ZSA9IGZhbHNlKSB7XG5cdFx0Y29uc3QgcHJpdmF0ZUtleXMgPSBbXTtcblx0XHRmb3IgKGxldCBrZXkgb2Yga2V5cykge1xuXHRcdFx0aWYgKGtleSA9PT0gbnVsbCkge1xuXHRcdFx0XHRrZXkgPSBudWxsS2V5O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBoYXNoZXMgPSB0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyB8fCB0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nID8gJ19vYmplY3RIYXNoZXMnIDogKHR5cGVvZiBrZXkgPT09ICdzeW1ib2wnID8gJ19zeW1ib2xIYXNoZXMnIDogZmFsc2UpO1xuXG5cdFx0XHRpZiAoIWhhc2hlcykge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKGtleSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXNbaGFzaGVzXS5oYXMoa2V5KSkge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKHRoaXNbaGFzaGVzXS5nZXQoa2V5KSk7XG5cdFx0XHR9IGVsc2UgaWYgKGNyZWF0ZSkge1xuXHRcdFx0XHRjb25zdCBwcml2YXRlS2V5ID0gYEBAbWttLXJlZi0ke2tleUNvdW50ZXIrK31AQGA7XG5cdFx0XHRcdHRoaXNbaGFzaGVzXS5zZXQoa2V5LCBwcml2YXRlS2V5KTtcblx0XHRcdFx0cHJpdmF0ZUtleXMucHVzaChwcml2YXRlS2V5KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkocHJpdmF0ZUtleXMpO1xuXHR9XG5cblx0c2V0KGtleXMsIHZhbHVlKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMsIHRydWUpO1xuXHRcdHJldHVybiBzdXBlci5zZXQocHVibGljS2V5LCB2YWx1ZSk7XG5cdH1cblxuXHRnZXQoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuZ2V0KHB1YmxpY0tleSk7XG5cdH1cblxuXHRoYXMoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuaGFzKHB1YmxpY0tleSk7XG5cdH1cblxuXHRkZWxldGUoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXksIHByaXZhdGVLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gQm9vbGVhbihwdWJsaWNLZXkgJiYgc3VwZXIuZGVsZXRlKHB1YmxpY0tleSkgJiYgdGhpcy5fcHVibGljS2V5cy5kZWxldGUocHJpdmF0ZUtleSkpO1xuXHR9XG5cblx0Y2xlYXIoKSB7XG5cdFx0c3VwZXIuY2xlYXIoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMuY2xlYXIoKTtcblx0XHR0aGlzLl9wdWJsaWNLZXlzLmNsZWFyKCk7XG5cdH1cblxuXHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7XG5cdFx0cmV0dXJuICdNYW55S2V5c01hcCc7XG5cdH1cblxuXHRnZXQgc2l6ZSgpIHtcblx0XHRyZXR1cm4gc3VwZXIuc2l6ZTtcblx0fVxufVxuIiwiZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gIGlmIChwcm90b3R5cGUgIT09IG51bGwgJiYgcHJvdG90eXBlICE9PSBPYmplY3QucHJvdG90eXBlICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90b3R5cGUpICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gdmFsdWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKFN5bWJvbC50b1N0cmluZ1RhZyBpbiB2YWx1ZSkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgTW9kdWxlXVwiO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBfZGVmdShiYXNlT2JqZWN0LCBkZWZhdWx0cywgbmFtZXNwYWNlID0gXCIuXCIsIG1lcmdlcikge1xuICBpZiAoIWlzUGxhaW5PYmplY3QoZGVmYXVsdHMpKSB7XG4gICAgcmV0dXJuIF9kZWZ1KGJhc2VPYmplY3QsIHt9LCBuYW1lc3BhY2UsIG1lcmdlcik7XG4gIH1cbiAgY29uc3Qgb2JqZWN0ID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMpO1xuICBmb3IgKGNvbnN0IGtleSBpbiBiYXNlT2JqZWN0KSB7XG4gICAgaWYgKGtleSA9PT0gXCJfX3Byb3RvX19cIiB8fCBrZXkgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gYmFzZU9iamVjdFtrZXldO1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG1lcmdlciAmJiBtZXJnZXIob2JqZWN0LCBrZXksIHZhbHVlLCBuYW1lc3BhY2UpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pKSB7XG4gICAgICBvYmplY3Rba2V5XSA9IFsuLi52YWx1ZSwgLi4ub2JqZWN0W2tleV1dO1xuICAgIH0gZWxzZSBpZiAoaXNQbGFpbk9iamVjdCh2YWx1ZSkgJiYgaXNQbGFpbk9iamVjdChvYmplY3Rba2V5XSkpIHtcbiAgICAgIG9iamVjdFtrZXldID0gX2RlZnUoXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvYmplY3Rba2V5XSxcbiAgICAgICAgKG5hbWVzcGFjZSA/IGAke25hbWVzcGFjZX0uYCA6IFwiXCIpICsga2V5LnRvU3RyaW5nKCksXG4gICAgICAgIG1lcmdlclxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURlZnUobWVyZ2VyKSB7XG4gIHJldHVybiAoLi4uYXJndW1lbnRzXykgPT4gKFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB1bmljb3JuL25vLWFycmF5LXJlZHVjZVxuICAgIGFyZ3VtZW50c18ucmVkdWNlKChwLCBjKSA9PiBfZGVmdShwLCBjLCBcIlwiLCBtZXJnZXIpLCB7fSlcbiAgKTtcbn1cbmNvbnN0IGRlZnUgPSBjcmVhdGVEZWZ1KCk7XG5jb25zdCBkZWZ1Rm4gPSBjcmVhdGVEZWZ1KChvYmplY3QsIGtleSwgY3VycmVudFZhbHVlKSA9PiB7XG4gIGlmIChvYmplY3Rba2V5XSAhPT0gdm9pZCAwICYmIHR5cGVvZiBjdXJyZW50VmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIG9iamVjdFtrZXldID0gY3VycmVudFZhbHVlKG9iamVjdFtrZXldKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5jb25zdCBkZWZ1QXJyYXlGbiA9IGNyZWF0ZURlZnUoKG9iamVjdCwga2V5LCBjdXJyZW50VmFsdWUpID0+IHtcbiAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pICYmIHR5cGVvZiBjdXJyZW50VmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIG9iamVjdFtrZXldID0gY3VycmVudFZhbHVlKG9iamVjdFtrZXldKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmV4cG9ydCB7IGNyZWF0ZURlZnUsIGRlZnUgYXMgZGVmYXVsdCwgZGVmdSwgZGVmdUFycmF5Rm4sIGRlZnVGbiB9O1xuIiwiY29uc3QgaXNFeGlzdCA9IChlbGVtZW50KSA9PiB7XG4gIHJldHVybiBlbGVtZW50ICE9PSBudWxsID8geyBpc0RldGVjdGVkOiB0cnVlLCByZXN1bHQ6IGVsZW1lbnQgfSA6IHsgaXNEZXRlY3RlZDogZmFsc2UgfTtcbn07XG5jb25zdCBpc05vdEV4aXN0ID0gKGVsZW1lbnQpID0+IHtcbiAgcmV0dXJuIGVsZW1lbnQgPT09IG51bGwgPyB7IGlzRGV0ZWN0ZWQ6IHRydWUsIHJlc3VsdDogbnVsbCB9IDogeyBpc0RldGVjdGVkOiBmYWxzZSB9O1xufTtcblxuZXhwb3J0IHsgaXNFeGlzdCwgaXNOb3RFeGlzdCB9O1xuIiwiaW1wb3J0IE1hbnlLZXlzTWFwIGZyb20gJ21hbnkta2V5cy1tYXAnO1xuaW1wb3J0IHsgZGVmdSB9IGZyb20gJ2RlZnUnO1xuaW1wb3J0IHsgaXNFeGlzdCB9IGZyb20gJy4vZGV0ZWN0b3JzLm1qcyc7XG5cbmNvbnN0IGdldERlZmF1bHRPcHRpb25zID0gKCkgPT4gKHtcbiAgdGFyZ2V0OiBnbG9iYWxUaGlzLmRvY3VtZW50LFxuICB1bmlmeVByb2Nlc3M6IHRydWUsXG4gIGRldGVjdG9yOiBpc0V4aXN0LFxuICBvYnNlcnZlQ29uZmlnczoge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWVcbiAgfSxcbiAgc2lnbmFsOiB2b2lkIDAsXG4gIGN1c3RvbU1hdGNoZXI6IHZvaWQgMFxufSk7XG5jb25zdCBtZXJnZU9wdGlvbnMgPSAodXNlclNpZGVPcHRpb25zLCBkZWZhdWx0T3B0aW9ucykgPT4ge1xuICByZXR1cm4gZGVmdSh1c2VyU2lkZU9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcbn07XG5cbmNvbnN0IHVuaWZ5Q2FjaGUgPSBuZXcgTWFueUtleXNNYXAoKTtcbmZ1bmN0aW9uIGNyZWF0ZVdhaXRFbGVtZW50KGluc3RhbmNlT3B0aW9ucykge1xuICBjb25zdCB7IGRlZmF1bHRPcHRpb25zIH0gPSBpbnN0YW5jZU9wdGlvbnM7XG4gIHJldHVybiAoc2VsZWN0b3IsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB7XG4gICAgICB0YXJnZXQsXG4gICAgICB1bmlmeVByb2Nlc3MsXG4gICAgICBvYnNlcnZlQ29uZmlncyxcbiAgICAgIGRldGVjdG9yLFxuICAgICAgc2lnbmFsLFxuICAgICAgY3VzdG9tTWF0Y2hlclxuICAgIH0gPSBtZXJnZU9wdGlvbnMob3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuICAgIGNvbnN0IHVuaWZ5UHJvbWlzZUtleSA9IFtcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgdGFyZ2V0LFxuICAgICAgdW5pZnlQcm9jZXNzLFxuICAgICAgb2JzZXJ2ZUNvbmZpZ3MsXG4gICAgICBkZXRlY3RvcixcbiAgICAgIHNpZ25hbCxcbiAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICBdO1xuICAgIGNvbnN0IGNhY2hlZFByb21pc2UgPSB1bmlmeUNhY2hlLmdldCh1bmlmeVByb21pc2VLZXkpO1xuICAgIGlmICh1bmlmeVByb2Nlc3MgJiYgY2FjaGVkUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIGNhY2hlZFByb21pc2U7XG4gICAgfVxuICAgIGNvbnN0IGRldGVjdFByb21pc2UgPSBuZXcgUHJvbWlzZShcbiAgICAgIC8vIGJpb21lLWlnbm9yZSBsaW50L3N1c3BpY2lvdXMvbm9Bc3luY1Byb21pc2VFeGVjdXRvcjogYXZvaWQgbmVzdGluZyBwcm9taXNlXG4gICAgICBhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmIChzaWduYWw/LmFib3J0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoXG4gICAgICAgICAgYXN5bmMgKG11dGF0aW9ucykgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBfIG9mIG11dGF0aW9ucykge1xuICAgICAgICAgICAgICBpZiAoc2lnbmFsPy5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGRldGVjdFJlc3VsdDIgPSBhd2FpdCBkZXRlY3RFbGVtZW50KHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgICAgICAgZGV0ZWN0b3IsXG4gICAgICAgICAgICAgICAgY3VzdG9tTWF0Y2hlclxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaWYgKGRldGVjdFJlc3VsdDIuaXNEZXRlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldGVjdFJlc3VsdDIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgc2lnbmFsPy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwiYWJvcnRcIixcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgeyBvbmNlOiB0cnVlIH1cbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgZGV0ZWN0UmVzdWx0ID0gYXdhaXQgZGV0ZWN0RWxlbWVudCh7XG4gICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIGRldGVjdG9yLFxuICAgICAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkZXRlY3RSZXN1bHQuaXNEZXRlY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKGRldGVjdFJlc3VsdC5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0LCBvYnNlcnZlQ29uZmlncyk7XG4gICAgICB9XG4gICAgKS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHVuaWZ5Q2FjaGUuZGVsZXRlKHVuaWZ5UHJvbWlzZUtleSk7XG4gICAgfSk7XG4gICAgdW5pZnlDYWNoZS5zZXQodW5pZnlQcm9taXNlS2V5LCBkZXRlY3RQcm9taXNlKTtcbiAgICByZXR1cm4gZGV0ZWN0UHJvbWlzZTtcbiAgfTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGRldGVjdEVsZW1lbnQoe1xuICB0YXJnZXQsXG4gIHNlbGVjdG9yLFxuICBkZXRlY3RvcixcbiAgY3VzdG9tTWF0Y2hlclxufSkge1xuICBjb25zdCBlbGVtZW50ID0gY3VzdG9tTWF0Y2hlciA/IGN1c3RvbU1hdGNoZXIoc2VsZWN0b3IpIDogdGFyZ2V0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICByZXR1cm4gYXdhaXQgZGV0ZWN0b3IoZWxlbWVudCk7XG59XG5jb25zdCB3YWl0RWxlbWVudCA9IGNyZWF0ZVdhaXRFbGVtZW50KHtcbiAgZGVmYXVsdE9wdGlvbnM6IGdldERlZmF1bHRPcHRpb25zKClcbn0pO1xuXG5leHBvcnQgeyBjcmVhdGVXYWl0RWxlbWVudCwgZ2V0RGVmYXVsdE9wdGlvbnMsIHdhaXRFbGVtZW50IH07XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgd2FpdEVsZW1lbnQgfSBmcm9tIFwiQDFuYXRzdS93YWl0LWVsZW1lbnRcIjtcbmltcG9ydCB7XG4gIGlzRXhpc3QgYXMgbW91bnREZXRlY3RvcixcbiAgaXNOb3RFeGlzdCBhcyByZW1vdmVEZXRlY3RvclxufSBmcm9tIFwiQDFuYXRzdS93YWl0LWVsZW1lbnQvZGV0ZWN0b3JzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UG9zaXRpb24ocm9vdCwgcG9zaXRpb25lZEVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMucG9zaXRpb24gPT09IFwiaW5saW5lXCIpIHJldHVybjtcbiAgaWYgKG9wdGlvbnMuekluZGV4ICE9IG51bGwpIHJvb3Quc3R5bGUuekluZGV4ID0gU3RyaW5nKG9wdGlvbnMuekluZGV4KTtcbiAgcm9vdC5zdHlsZS5vdmVyZmxvdyA9IFwidmlzaWJsZVwiO1xuICByb290LnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICByb290LnN0eWxlLndpZHRoID0gXCIwXCI7XG4gIHJvb3Quc3R5bGUuaGVpZ2h0ID0gXCIwXCI7XG4gIHJvb3Quc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgaWYgKHBvc2l0aW9uZWRFbGVtZW50KSB7XG4gICAgaWYgKG9wdGlvbnMucG9zaXRpb24gPT09IFwib3ZlcmxheVwiKSB7XG4gICAgICBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgIGlmIChvcHRpb25zLmFsaWdubWVudD8uc3RhcnRzV2l0aChcImJvdHRvbS1cIikpXG4gICAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuICAgICAgZWxzZSBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS50b3AgPSBcIjBcIjtcbiAgICAgIGlmIChvcHRpb25zLmFsaWdubWVudD8uZW5kc1dpdGgoXCItcmlnaHRcIikpXG4gICAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG4gICAgICBlbHNlIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLmxlZnQgPSBcIjBcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG4gICAgICBwb3NpdGlvbmVkRWxlbWVudC5zdHlsZS50b3AgPSBcIjBcIjtcbiAgICAgIHBvc2l0aW9uZWRFbGVtZW50LnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuICAgICAgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUubGVmdCA9IFwiMFwiO1xuICAgICAgcG9zaXRpb25lZEVsZW1lbnQuc3R5bGUucmlnaHQgPSBcIjBcIjtcbiAgICB9XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbmNob3Iob3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5hbmNob3IgPT0gbnVsbCkgcmV0dXJuIGRvY3VtZW50LmJvZHk7XG4gIGxldCByZXNvbHZlZCA9IHR5cGVvZiBvcHRpb25zLmFuY2hvciA9PT0gXCJmdW5jdGlvblwiID8gb3B0aW9ucy5hbmNob3IoKSA6IG9wdGlvbnMuYW5jaG9yO1xuICBpZiAodHlwZW9mIHJlc29sdmVkID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYgKHJlc29sdmVkLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBkb2N1bWVudC5ldmFsdWF0ZShcbiAgICAgICAgcmVzb2x2ZWQsXG4gICAgICAgIGRvY3VtZW50LFxuICAgICAgICBudWxsLFxuICAgICAgICBYUGF0aFJlc3VsdC5GSVJTVF9PUkRFUkVEX05PREVfVFlQRSxcbiAgICAgICAgbnVsbFxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQuc2luZ2xlTm9kZVZhbHVlID8/IHZvaWQgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVzb2x2ZWQpID8/IHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc29sdmVkID8/IHZvaWQgMDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBtb3VudFVpKHJvb3QsIG9wdGlvbnMpIHtcbiAgY29uc3QgYW5jaG9yID0gZ2V0QW5jaG9yKG9wdGlvbnMpO1xuICBpZiAoYW5jaG9yID09IG51bGwpXG4gICAgdGhyb3cgRXJyb3IoXG4gICAgICBcIkZhaWxlZCB0byBtb3VudCBjb250ZW50IHNjcmlwdCBVSTogY291bGQgbm90IGZpbmQgYW5jaG9yIGVsZW1lbnRcIlxuICAgICk7XG4gIHN3aXRjaCAob3B0aW9ucy5hcHBlbmQpIHtcbiAgICBjYXNlIHZvaWQgMDpcbiAgICBjYXNlIFwibGFzdFwiOlxuICAgICAgYW5jaG9yLmFwcGVuZChyb290KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJmaXJzdFwiOlxuICAgICAgYW5jaG9yLnByZXBlbmQocm9vdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwicmVwbGFjZVwiOlxuICAgICAgYW5jaG9yLnJlcGxhY2VXaXRoKHJvb3QpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImFmdGVyXCI6XG4gICAgICBhbmNob3IucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKHJvb3QsIGFuY2hvci5uZXh0RWxlbWVudFNpYmxpbmcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImJlZm9yZVwiOlxuICAgICAgYW5jaG9yLnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShyb290LCBhbmNob3IpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIG9wdGlvbnMuYXBwZW5kKGFuY2hvciwgcm9vdCk7XG4gICAgICBicmVhaztcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1vdW50RnVuY3Rpb25zKGJhc2VGdW5jdGlvbnMsIG9wdGlvbnMpIHtcbiAgbGV0IGF1dG9Nb3VudEluc3RhbmNlID0gdm9pZCAwO1xuICBjb25zdCBzdG9wQXV0b01vdW50ID0gKCkgPT4ge1xuICAgIGF1dG9Nb3VudEluc3RhbmNlPy5zdG9wQXV0b01vdW50KCk7XG4gICAgYXV0b01vdW50SW5zdGFuY2UgPSB2b2lkIDA7XG4gIH07XG4gIGNvbnN0IG1vdW50ID0gKCkgPT4ge1xuICAgIGJhc2VGdW5jdGlvbnMubW91bnQoKTtcbiAgfTtcbiAgY29uc3QgdW5tb3VudCA9IGJhc2VGdW5jdGlvbnMucmVtb3ZlO1xuICBjb25zdCByZW1vdmUgPSAoKSA9PiB7XG4gICAgc3RvcEF1dG9Nb3VudCgpO1xuICAgIGJhc2VGdW5jdGlvbnMucmVtb3ZlKCk7XG4gIH07XG4gIGNvbnN0IGF1dG9Nb3VudCA9IChhdXRvTW91bnRPcHRpb25zKSA9PiB7XG4gICAgaWYgKGF1dG9Nb3VudEluc3RhbmNlKSB7XG4gICAgICBsb2dnZXIud2FybihcImF1dG9Nb3VudCBpcyBhbHJlYWR5IHNldC5cIik7XG4gICAgfVxuICAgIGF1dG9Nb3VudEluc3RhbmNlID0gYXV0b01vdW50VWkoXG4gICAgICB7IG1vdW50LCB1bm1vdW50LCBzdG9wQXV0b01vdW50IH0sXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIC4uLmF1dG9Nb3VudE9wdGlvbnNcbiAgICAgIH1cbiAgICApO1xuICB9O1xuICByZXR1cm4ge1xuICAgIG1vdW50LFxuICAgIHJlbW92ZSxcbiAgICBhdXRvTW91bnRcbiAgfTtcbn1cbmZ1bmN0aW9uIGF1dG9Nb3VudFVpKHVpQ2FsbGJhY2tzLCBvcHRpb25zKSB7XG4gIGNvbnN0IGFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgRVhQTElDSVRfU1RPUF9SRUFTT04gPSBcImV4cGxpY2l0X3N0b3BfYXV0b19tb3VudFwiO1xuICBjb25zdCBfc3RvcEF1dG9Nb3VudCA9ICgpID0+IHtcbiAgICBhYm9ydENvbnRyb2xsZXIuYWJvcnQoRVhQTElDSVRfU1RPUF9SRUFTT04pO1xuICAgIG9wdGlvbnMub25TdG9wPy4oKTtcbiAgfTtcbiAgbGV0IHJlc29sdmVkQW5jaG9yID0gdHlwZW9mIG9wdGlvbnMuYW5jaG9yID09PSBcImZ1bmN0aW9uXCIgPyBvcHRpb25zLmFuY2hvcigpIDogb3B0aW9ucy5hbmNob3I7XG4gIGlmIChyZXNvbHZlZEFuY2hvciBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICB0aHJvdyBFcnJvcihcbiAgICAgIFwiYXV0b01vdW50IGFuZCBFbGVtZW50IGFuY2hvciBvcHRpb24gY2Fubm90IGJlIGNvbWJpbmVkLiBBdm9pZCBwYXNzaW5nIGBFbGVtZW50YCBkaXJlY3RseSBvciBgKCkgPT4gRWxlbWVudGAgdG8gdGhlIGFuY2hvci5cIlxuICAgICk7XG4gIH1cbiAgYXN5bmMgZnVuY3Rpb24gb2JzZXJ2ZUVsZW1lbnQoc2VsZWN0b3IpIHtcbiAgICBsZXQgaXNBbmNob3JFeGlzdCA9ICEhZ2V0QW5jaG9yKG9wdGlvbnMpO1xuICAgIGlmIChpc0FuY2hvckV4aXN0KSB7XG4gICAgICB1aUNhbGxiYWNrcy5tb3VudCgpO1xuICAgIH1cbiAgICB3aGlsZSAoIWFib3J0Q29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY2hhbmdlZEFuY2hvciA9IGF3YWl0IHdhaXRFbGVtZW50KHNlbGVjdG9yID8/IFwiYm9keVwiLCB7XG4gICAgICAgICAgY3VzdG9tTWF0Y2hlcjogKCkgPT4gZ2V0QW5jaG9yKG9wdGlvbnMpID8/IG51bGwsXG4gICAgICAgICAgZGV0ZWN0b3I6IGlzQW5jaG9yRXhpc3QgPyByZW1vdmVEZXRlY3RvciA6IG1vdW50RGV0ZWN0b3IsXG4gICAgICAgICAgc2lnbmFsOiBhYm9ydENvbnRyb2xsZXIuc2lnbmFsXG4gICAgICAgIH0pO1xuICAgICAgICBpc0FuY2hvckV4aXN0ID0gISFjaGFuZ2VkQW5jaG9yO1xuICAgICAgICBpZiAoaXNBbmNob3JFeGlzdCkge1xuICAgICAgICAgIHVpQ2FsbGJhY2tzLm1vdW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdWlDYWxsYmFja3MudW5tb3VudCgpO1xuICAgICAgICAgIGlmIChvcHRpb25zLm9uY2UpIHtcbiAgICAgICAgICAgIHVpQ2FsbGJhY2tzLnN0b3BBdXRvTW91bnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGlmIChhYm9ydENvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQgJiYgYWJvcnRDb250cm9sbGVyLnNpZ25hbC5yZWFzb24gPT09IEVYUExJQ0lUX1NUT1BfUkVBU09OKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgb2JzZXJ2ZUVsZW1lbnQocmVzb2x2ZWRBbmNob3IpO1xuICByZXR1cm4geyBzdG9wQXV0b01vdW50OiBfc3RvcEF1dG9Nb3VudCB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgYXBwbHlQb3NpdGlvbiwgY3JlYXRlTW91bnRGdW5jdGlvbnMsIG1vdW50VWkgfSBmcm9tIFwiLi9zaGFyZWQubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSWZyYW1lVWkoY3R4LCBvcHRpb25zKSB7XG4gIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICB3cmFwcGVyLnNldEF0dHJpYnV0ZShcImRhdGEtd3h0LWlmcmFtZVwiLCBcIlwiKTtcbiAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgaWZyYW1lLnNyYyA9IGJyb3dzZXIucnVudGltZS5nZXRVUkwob3B0aW9ucy5wYWdlKTtcbiAgd3JhcHBlci5hcHBlbmRDaGlsZChpZnJhbWUpO1xuICBsZXQgbW91bnRlZCA9IHZvaWQgMDtcbiAgY29uc3QgbW91bnQgPSAoKSA9PiB7XG4gICAgYXBwbHlQb3NpdGlvbih3cmFwcGVyLCBpZnJhbWUsIG9wdGlvbnMpO1xuICAgIG1vdW50VWkod3JhcHBlciwgb3B0aW9ucyk7XG4gICAgbW91bnRlZCA9IG9wdGlvbnMub25Nb3VudD8uKHdyYXBwZXIsIGlmcmFtZSk7XG4gIH07XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHtcbiAgICBvcHRpb25zLm9uUmVtb3ZlPy4obW91bnRlZCk7XG4gICAgd3JhcHBlci5yZW1vdmUoKTtcbiAgICBtb3VudGVkID0gdm9pZCAwO1xuICB9O1xuICBjb25zdCBtb3VudEZ1bmN0aW9ucyA9IGNyZWF0ZU1vdW50RnVuY3Rpb25zKHsgbW91bnQsIHJlbW92ZSB9LCBvcHRpb25zKTtcbiAgY3R4Lm9uSW52YWxpZGF0ZWQocmVtb3ZlKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgbW91bnRlZCgpIHtcbiAgICAgIHJldHVybiBtb3VudGVkO1xuICAgIH0sXG4gICAgaWZyYW1lLFxuICAgIHdyYXBwZXIsXG4gICAgLi4ubW91bnRGdW5jdGlvbnNcbiAgfTtcbn1cbiIsImltcG9ydCB7IGRlZmluZUNvbnRlbnRTY3JpcHQsIGNyZWF0ZUlmcmFtZVVpIH0gZnJvbSAnI2ltcG9ydHMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcbiAgbWF0Y2hlczogWyc8YWxsX3VybHM+J10sXG5cbiAgbWFpbihjdHgpIHtcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ29wZW5Cb29rbWFya0RpYWxvZycgJiYgbWVzc2FnZS5kYXRhKSB7XG4gICAgICAgIGNvbnN0IHVpID0gY3JlYXRlSWZyYW1lVWkoY3R4LCB7XG4gICAgICAgICAgcGFnZTogJy9kaWFsb2ctaWZyYW1lLmh0bWwnLFxuICAgICAgICAgIG9uTW91bnQ6ICh3cmFwcGVyLCBpZnJhbWUpID0+IHtcbiAgICAgICAgICAgIC8vIEFwbGljYSBlc3RpbG9zIGFvIHdyYXBwZXIgcGFyYSB0b3Juw6EtbG8gdW0gb3ZlcmxheSBkZSB0ZWxhIGNoZWlhXG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHdyYXBwZXIuc3R5bGUsIHtcbiAgICAgICAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXG4gICAgICAgICAgICAgIHRvcDogJzAnLFxuICAgICAgICAgICAgICBsZWZ0OiAnMCcsXG4gICAgICAgICAgICAgIHdpZHRoOiAnMTAwdncnLFxuICAgICAgICAgICAgICBoZWlnaHQ6ICcxMDB2aCcsXG4gICAgICAgICAgICAgIHpJbmRleDogJzIxNDc0ODM2NDcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBHYXJhbnRlIHF1ZSBvIGlmcmFtZSBwcmVlbmNoYSBvIHdyYXBwZXIgZSBzZWphIHRyYW5zcGFyZW50ZVxuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihpZnJhbWUuc3R5bGUsIHtcbiAgICAgICAgICAgICAgd2lkdGg6ICcxMDAlJyxcbiAgICAgICAgICAgICAgaGVpZ2h0OiAnMTAwJScsXG4gICAgICAgICAgICAgIGJvcmRlcjogJ25vbmUnLFxuICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAndHJhbnNwYXJlbnQnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdWkubW91bnQoKTtcblxuICAgICAgICB1aS5pZnJhbWUub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgIHVpLmlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZShcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2luaXQtZGlhbG9nJyxcbiAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIC4uLm1lc3NhZ2UuZGF0YSxcbiAgICAgICAgICAgICAgICB0aGVtZTogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnZGFyaycpID8gJ2RhcmsnIDogJ2xpZ2h0JyxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICcqJ1xuICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY2xvc2VMaXN0ZW5lciA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gdWkuaWZyYW1lPy5jb250ZW50V2luZG93ICYmIGV2ZW50LmRhdGE/LnR5cGUgPT09ICdjbG9zZS1kaWFsb2cnKSB7XG4gICAgICAgICAgICB1aS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgY2xvc2VMaXN0ZW5lcik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGNsb3NlTGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxufSk7ICIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2ltcG9ydC5tZXRhLmVudi5FTlRSWVBPSU5UfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL3V0aWxzL2ludGVybmFsL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7XG4gIGdldFVuaXF1ZUV2ZW50TmFtZVxufSBmcm9tIFwiLi9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qc1wiO1xuaW1wb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanNcIjtcbmV4cG9ydCBjbGFzcyBDb250ZW50U2NyaXB0Q29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRlbnRTY3JpcHROYW1lLCBvcHRpb25zKSB7XG4gICAgdGhpcy5jb250ZW50U2NyaXB0TmFtZSA9IGNvbnRlbnRTY3JpcHROYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgaWYgKHRoaXMuaXNUb3BGcmFtZSkge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoeyBpZ25vcmVGaXJzdEV2ZW50OiB0cnVlIH0pO1xuICAgICAgdGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cygpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFxuICAgIFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIlxuICApO1xuICBpc1RvcEZyYW1lID0gd2luZG93LnNlbGYgPT09IHdpbmRvdy50b3A7XG4gIGFib3J0Q29udHJvbGxlcjtcbiAgbG9jYXRpb25XYXRjaGVyID0gY3JlYXRlTG9jYXRpb25XYXRjaGVyKHRoaXMpO1xuICByZWNlaXZlZE1lc3NhZ2VJZHMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICBnZXQgc2lnbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5zaWduYWw7XG4gIH1cbiAgYWJvcnQocmVhc29uKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLmFib3J0KHJlYXNvbik7XG4gIH1cbiAgZ2V0IGlzSW52YWxpZCgpIHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lLmlkID09IG51bGwpIHtcbiAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsLmFib3J0ZWQ7XG4gIH1cbiAgZ2V0IGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzSW52YWxpZDtcbiAgfVxuICAvKipcbiAgICogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoY2IpO1xuICAgKiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuICAgKiAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIoY2IpO1xuICAgKiB9KVxuICAgKiAvLyAuLi5cbiAgICogcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lcigpO1xuICAgKi9cbiAgb25JbnZhbGlkYXRlZChjYikge1xuICAgIHRoaXMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuICAgKiBhZnRlciB0aGUgY29udGV4dCBpcyBleHBpcmVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBnZXRWYWx1ZUZyb21TdG9yYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgKiAgIGlmIChjdHguaXNJbnZhbGlkKSByZXR1cm4gY3R4LmJsb2NrKCk7XG4gICAqXG4gICAqICAgLy8gLi4uXG4gICAqIH1cbiAgICovXG4gIGJsb2NrKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0SW50ZXJ2YWxgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImRlZmluaXRpb24iLCJicm93c2VyIiwiX2Jyb3dzZXIiLCJwcmludCIsImxvZ2dlciIsIl9hIiwiX2IiLCJyZXN1bHQiLCJyZW1vdmVEZXRlY3RvciIsIm1vdW50RGV0ZWN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLFdBQVMsb0JBQW9CQSxhQUFZO0FBQzlDLFdBQU9BO0FBQUEsRUFDVDtBQ0RPLFFBQU1DLGNBQVUsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE1BQ2hELFdBQVcsVUFDWCxXQUFXO0FDRlIs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
