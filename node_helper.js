// Imports
var NodeHelper = require("node_helper");
var moment = require("moment");
const NewsAPI = require("newsapi");
const { basename } = require("path");
const Log = require("logger");

const CHOICES_METHODS = {
  headlines: "topHeadlines",
  everything: "everything"
};

module.exports = NodeHelper.create({
  name: basename(__dirname),
  logPrefix: basename(__dirname) + " :: ",
  client: null,
  choice: null,
  queryOptions: null,
  articles: [],
  excludeAuthors: [],
  lastReceived: null,
  fetchInterval: 1000 * 60 * 60,

  // Start function
  start: function () {
    this.log("starting");
    // Declare any defaults
    this.client = null;
    this.choice = null;
    this.queryOptions = null;
    this.articles = [];
    this.excludeAuthors = [];
    this.lastReceived = null;
    this.fetchInterval = 1000 * 60 * 60;
    this.log("started");
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

  _sendNotification(notification, payload) {
    this.sendSocketNotification(`${this.name}_${notification}`, payload);
  },

  _now() {
    return parseInt(moment().format("x"));
  },

  _notificationReceived(notification, payload) {
    switch (notification) {
      case "GET_DATA":
        try {
          if (
            !Object.keys(payload).includes("apiKey") ||
            typeof payload.apiKey !== "string" ||
            `${payload.apiKey}`.trim().length == 0
          )
            throw new Error("invalid API key");
          this.client = new NewsAPI(payload.apiKey);
          if (
            !Object.keys(payload).includes("choice") ||
            typeof payload.choice !== "string" ||
            !Object.keys(CHOICES_METHODS).includes(
              `${payload.choice}`.trim().toLowerCase()
            )
          )
            throw new Error("invalid choice");
          this.choice = `${payload.choice}`.trim().toLowerCase();
          if (
            !Object.keys(payload).includes("query") ||
            typeof payload.query !== "object" ||
            Object.keys(payload).length == 0
          )
            throw new Error("invalid query options");
          this.queryOptions = payload.query;
          if (
            Object.keys(payload).includes("fetchInterval") ||
            typeof payload.fetchInterval === "number"
          )
            this.fetchInterval = payload.fetchInterval;
          if (
            Object.keys(payload).includes("excludeAuthors") &&
            typeof payload.excludeAuthors !== "undefined" &&
            payload.excludeAuthors &&
            Array.isArray(payload.excludeAuthors)
          )
            this.excludeAuthors = payload.excludeAuthors;
          this.getData(payload.pageSize);
        } catch (err) {
          this.error(err);
          this.client = null;
          this.queryOptions = null;
          this.excludeAuthors = [];
        }
        break;
      default:
    }
  },

  getData(pageSize) {
    if (
      this.articles.length > 0 &&
      this.lastReceived !== null &&
      this._now() - this.lastReceived <= this.fetchInterval
    ) {
      this.sendArticles();
      return;
    }

    const method = CHOICES_METHODS[this.choice];
    let articlesReceived = 0,
      articlesCount = 0;
    const askPage = (page) => {
      this.log(
        `updating articles [${this.choice}] with options: ${JSON.stringify(
          this.queryOptions,
          null,
          2
        )}`
      );
      this.client.v2[method]({
        ...this.queryOptions,
        pageSize: Math.min(pageSize * 2, 100),
        page
      })
        .then((response) => {
          if (
            Object.prototype.hasOwnProperty.call(response, "status") &&
            response.status === "ok" &&
            Object.prototype.hasOwnProperty.call(response, "articles") &&
            Array.isArray(response.articles)
          ) {
            articlesCount = response.totalResults;
            articlesReceived += response.articles.length;
            for (const article of response.articles) {
              if (this.articles.length >= pageSize) break;

              if (
                article.author &&
                this.excludeAuthors.includes(article.author.trim())
              )
                continue;

              this.articles.push({
                source: article.source.name,
                author: article.author ? article.author.trim() : null,
                title: article.title.replace(
                  new RegExp(`[\\s+-]+${article.author}$`, "gi"),
                  ""
                ),
                description: article.description,
                url: article.url,
                image: article.urlToImage,
                date: article.publishedAt,
                content: article.content
              });
            }
            this.lastReceived = this._now();
            if (
              this.articles.length >= pageSize ||
              articlesReceived >= articlesCount
            ) {
              this.sendArticles();
            } else {
              askPage(p + 1);
            }
          }
        })
        .catch((error) => {
          this.error(error);
          this.lastReceived = null;
        });
    };

    askPage(1);
  },

  sendArticles() {
    this.log(`sending ${this.articles.length} articles`);
    this._sendNotification("NEWS_UPDATED", this.articles);
  },

  // Socket Notification Received
  socketNotificationReceived: function (notification, payload) {
    this._notificationReceived(
      notification.replace(new RegExp(`${this.name}_`, "gi"), ""),
      payload
    );
  }
});
