/* global Module moment */
const QUERY_DEFAULTS = {
  q: null,
  language: null,
  pageSize: null,
  sources: null,
  sortBy: null
};
const HEADLINES_DEFAULTS = {
  category: null,
  country: null
};
const EVERYTHING_DEFAULTS = {
  searchIn: null,
  excludeDomains: null,
  domains: null,
  from: null,
  to: null
};

Module.register("MMM-NewsAPI", {
  name: "MMM-NewsAPI",
  logPrefix: "MMM-NewsAPI :: ",
  newsArticles: [],
  firstUpdate: false,
  index: 0,
  timer: null,
  ready: false,
  // Declare default inputs
  defaults: {
    apiKey: null,
    choice: "headlines",
    pageSize: 20,
    sortBy: "publishedAt",
    timeFormat: "relative",
    language: null,
    // className: "MMM-NewsAPI",
    drawInterval: 1000 * 30,
    fetchInterval: 1000 * 60 * 60,
    QRCode: false,
    excludeAuthors: [],
    query: {}
  },

  // Logging wrapper
  log(msg, ...args) {
    Log.log(`${this.logPrefix}${msg}`, ...args);
  },
  info(msg, ...args) {
    Log.info(`${this.logPrefix}${msg}`, ...args);
  },
  debug(msg, ...args) {
    Log.debug(`${this.logPrefix}${msg}`, ...args);
  },
  error(msg, ...args) {
    Log.error(`${this.logPrefix}${msg}`, ...args);
  },
  warning(msg, ...args) {
    Log.warning(`${this.logPrefix}${msg}`, ...args);
  },

  _filterQueryOptions(options, schema_keys) {
    const filteredOptions = Object.entries(options).reduce((acc, [k, v]) => {
      if (
        typeof v !== "undefined" &&
        v !== null &&
        `${v}`.trim().length !== 0 &&
        schema_keys.includes(k)
      )
        acc[k] = v;
      return acc;
    }, {});
    if (Object.keys(filteredOptions).length === 0) {
      throw new Error(
        `You should provide at least one valid option from: ${[
          ...Object.keys(QUERY_DEFAULTS),
          ...Object.keys(
            this.config.choice === "headlines"
              ? HEADLINES_DEFAULTS
              : EVERYTHING_DEFAULTS
          )
        ]}`
      );
    }
    return filteredOptions;
  },

  _sendNotification(notification, payload) {
    this.sendSocketNotification(`${this.name}_${notification}`, payload);
  },

  _notificationReceived(notification, payload) {
    switch (notification) {
      case "NEWS_UPDATED":
        if (!Array.isArray(payload)) break;
        this.debug(`received ${payload.length} articles`);
        this.newsArticles = payload;
        if (!this.firstUpdate) {
          this.firstUpdate = true;
          this.index = 0;
          this.draw();
        }
        break;
      default:
    }
  },

  _findInnerByClassName: function (parent, className) {
    if (!parent || !parent.classList) return null;
    if (parent.classList.contains(className)) {
      return parent;
    } else {
      // recursively check the children of the parent element
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        const result = this._findInnerByClassName(child, className);
        if (result !== null) {
          return result;
        }
      }
    }
    // class name not found in parent or its children
    return null;
  },

  // Start process
  start: function () {
    this.sanitizeConfig();

    this.firstUpdate = false;
    this.index = 0;
    this.timer = null;
    this.ready = false;
    this.template = "";
    suspended = false;
    this.newsArticles = [];
    console.log("using config: ", JSON.stringify(this.config, null, 2));
    // Start function call to node_helper
    this.updateNews();
    // Schedule the next update
    this.scheduleUpdate();
  },

  sanitizeConfig: function () {
    this.config = {
      ...this.defaults,
      ...this.config
    };

    if (
      !this.config.apiKey ||
      typeof this.config.apiKey !== "string" ||
      this.config.apiKey.trim().length === 0
    ) {
      throw new Error("'apiKey' is required");
    }

    this.config.choice = `${this.config.choice ?? "undefined"}`
      .trim()
      .toLowerCase();
    if (!["headlines", "everything"].includes(this.config.choice)) {
      throw new Error(
        `Invalid choice '${
          this.config.choice ?? "undefined"
        }' received. Only 'headlines' and 'everything' are supported`
      );
    }

    switch (this.config.choice) {
      case "headlines":
      case "everything":
        const queryDefaults = {
          ...QUERY_DEFAULTS,
          ...(this.config.choice === "headlines"
            ? HEADLINES_DEFAULTS
            : EVERYTHING_DEFAULTS)
        };
        this.config.query = this._filterQueryOptions(
          {
            ...queryDefaults,
            ...this.config.query,
            pageSize: this.config.pageSize,
            sortBy: this.config.sortBy
          },
          Object.keys(queryDefaults)
        );
        break;
      default:
        const msg = this.error(msg);
        throw new Error(msg);
    }
  },

  stop: function () {
    this.info("stopping module");
  },

  resume: function () {
    this.info("resuming module");
    this.debug("with config: " + JSON.stringify(this.config, null, 2));
    this.suspended = false;
    this.updateDom();
  },

  suspend: function () {
    this.info("Suspending module");
    this.suspended = true;
  },

  getDom: function () {
    let wrapper = document.createElement("div");
    wrapper.id = `${this.name}-${this.identifier}`;
    wrapper.classList.add(wrapper.id, `${this.name}-wrapper`, "untouchable");
    let newsContent = document.createElement("div");
    newsContent.id = `${this.name}-content-${this.identifier}`;
    newsContent.classList.add(`${this.name}-content`, newsContent.id);
    wrapper.appendChild(newsContent);
    return wrapper;
  },

  // Schedule the next update
  scheduleUpdate: function (delay) {
    let nextLoad = this.config.fetchInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }
    let self = this;
    setInterval(function () {
      this.debug("getting the next batch of data");
      self.updateNews();
    }, nextLoad);
  },

  // Send Socket Notification and start node_helper
  updateNews: function () {
    this._sendNotification("GET_DATA", this.config);
  },

  // Receive Socket Notification
  socketNotificationReceived: function (notification, payload) {
    this._notificationReceived(
      notification.replace(new RegExp(`${this.name}_`, "gi"), ""),
      payload
    );
  },

  draw: function () {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.newsArticles.length == 0) return;

    const article = this.newsArticles[this.index];
    console.log("article: " + JSON.stringify(article, null, 2));
    const shouldGenerateQR =
      this.config.QRCode === true &&
      Object.prototype.hasOwnProperty.call(article, "url") &&
      article.url !== null;
    const template = document.createElement("div");
    template.classList.add("article", this.name);

    const tags = {
      qrcode: ["url"],
      image: ["image"],
      header: ["title"],
      content: ["description"],
      footer: ["author", "source", "date"]
    };

    let qr = null;
    let containers = {};
    let containerChildCount = {};
    Object.keys(tags).forEach((t) => {
      const el = document.createElement("div");
      el.classList.add(t);
      template.appendChild(el);
      containers[t] = el;
      containerChildCount[t] = 0;
    }, {});

    Object.entries(tags).forEach(([k, keys]) => {
      keys.forEach((key) => {
        if (
          Object.prototype.hasOwnProperty.call(article, key) &&
          article[key] !== null
        ) {
          const el = document.createElement("div");
          el.classList.add(key);
          switch (key) {
            case "url":
              if (!shouldGenerateQR) return;
              qr = document.createElement("canvas");
              qr.classList.add("qr");
              el.appendChild(qr);
              break;
            case "image":
              el.style.backgroundImage = `url('${article[key]}')`;
              el.classList.add("article-image");
              break;
            case "date":
              moment.locale(
                this.config.query.language ||
                  this.config.language ||
                  this.language ||
                  "en"
              );
              const ts = moment.utc(
                article[key].replace("Z", ""),
                "YYYY-MM-DDTHH:mm:ss"
              );
              if (this.config.timeFormat === "relative") {
                el.innerHTML = ts.from(moment.utc());
              } else if (
                typeof this.config.timeFormat === "string" &&
                this.config.timeFormat.length > 0
              ) {
                el.innerHTML = ts.format(this.config.timeFormat);
              } else {
                el.innerHTML = ts.format("llll");
              }
              break;
            default:
              el.innerHTML = article[key];
          }
          containers[k].appendChild(el);
          containerChildCount[k]++;
        }
      });
    });

    Object.entries(containerChildCount).forEach(([k, count]) => {
      if (count === 0) {
        template.removeChild(containers[k]);
        containers[k] = null;
        delete containers[k];
      }
    });

    setTimeout(() => {
      const news = document.getElementById(`${this.name}-${this.identifier}`);
      const newsContent = document.getElementById(
        `${this.name}-content-${this.identifier}`
      );
      newsContent.innerHTML = "";
      news.classList.remove("hideArticle");
      news.classList.add("showArticle");
      newsContent.appendChild(template);
      if (shouldGenerateQR && qr !== null) {
        new QRious({
          element: qr,
          value: article.url
        });
      }
    }, 900);

    this.timer = setTimeout(() => {
      this.index++;
      if (this.index >= this.newsArticles.length) this.index = 0;
      this.draw();
    }, this.config.drawInterval);
  },

  // Get the Stylesheet
  getStyles: function () {
    return [this.file(`${this.name}.css`)];
  },

  // Import QR code script file
  getScripts: function () {
    return [
      this.file("node_modules/moment/min/moment-with-locales.min.js"),
      this.file("node_modules/qrious/dist/qrious.min.js")
    ];
  }
});
