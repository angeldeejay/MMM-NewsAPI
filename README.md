# MMM-NewsAPI

A [MagicMirror²](https://magicmirror.builders) module to to get news from [NewsAPi.org](https://newsapi.org/).

Inspired from [original module](https://github.com/mumblebaj/MMM-NewsAPI)

## Updates

- Fixes parameters on the fly
- Uses the [Node Official Client](https://github.com/bzarras/newsapi) instead of node-fetch
- Localization of timestamps
- Replaced Luxon with MomentJS
- Using QRios directly from module instead of CDN
- Improved config parsing
- Better logging

## Dependencies

- moment@2.29.4"
- newsapi@2.4.1"
- qrious@4.0.2

## Installation

In your terminal, go to your MagicMirror's Module folder:

```
cd ~/MagicMirror/modules
```

Clone this repository:

```
git clone https://github.com/angeldeejay/MMM-NewsAPI.git
```

Add the module to the modules array in the `config/config.js` file:

```javascript
  {
			module: "MMM-NewsAPI",
			header: "NEWS",
			position: "bottom_bar",
  },
```

## Configuration options

The following properties can be configured:

| Option           | Description                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apiKey`         | You can obtain an API Key from [NewsAPi.org](https://newsapi.org/)                                                                                                                                                                                                                   |
| `choice`         | Type of query to be instantiated <br><br> **Possible values:** `headlines` or `everything` <br> **Default value:** `headlines`                                                                                                                                                       |
| `pageSize`       | The number of articles to be returned. Max = 100 <br> **Default value:** `20`                                                                                                                                                                                                        |
| `sortBy`         | The order to sort the articles in. <br> **Possible values:** `relevancy`, `popularity`, `publishedAt` <br> only available for `choice: "everything"`                                                                                                                                 |
| `timeFormat`     | Format for timestamps. Can be `relative` or a valid format string ([see MomentJS reference](https://momentjs.com/docs/#/displaying/format/)). Default is `relative`                                                                                                                  |
| `language`       | Language to use for i18n. Default is `en                                                                                                                                                                                                                                             |
| `drawInterval`   | The amount of time each article is displayed <br> **Default value:** `30 seconds`                                                                                                                                                                                                    |
| `fetchInterval`  | The time interval between fetching new articles. There is a daily limit of 100 calls per apiKey. Best to set this to 100*60*60                                                                                                                                                       |
| `QRCode`         | Boolean true/false value to display QR code for article URL. Default is false.                                                                                                                                                                                                       |
| `excludeAuthors` | A list of strings representing author to exclude from resultset (e.g `Wired`). Default is empty list.                                                                                                                                                                                |
| `query`          | An object with options according to `choice` value, and supported by [NewsAPi.org](https://newsapi.org/)<br>Please refer to:<br>- [Everything Options](https://newsapi.org/docs/endpoints/everything)<br>- [Top Headlines Options](https://newsapi.org/docs/endpoints/top-headlines) |

## Config Example

**everything** Example

```javascript
  {
                module: "MMM-NewsAPI",
                header: "Everything News",
                position: "bottom_bar",
                config: {
                        apiKey: "",
                        choice: "everything",
                        pageSize: 10,
                        sortBy: "publishedAt",
                        drawInterval: 1000*30,
                        fetchInterval: 1000*60*60,
                        QRCode: true,
                        query: {
                                domains: "cnn.com,nytimes.com,news24.com",
                        }
                }
        },
```

**headlines** Example

```javascript
  {
                module: "MMM-NewsAPI",
                header: "Top Headlines News",
                position: "bottom_bar",
                config: {
                        apiKey: "",
                        choice: "headlines",
                        pageSize: 10,
                        sortBy: "relevance",
                        drawInterval: 1000*30,
                        templateFile: "template.html",
                        fetchInterval: 1000*60*60,
                        query: {
                                country: "us",
                                q: "covid",
                                domains: "nytimes.com",
                        }
                }
        },
```

**Notes**

- `apiKey` is **required**. You should first create an account on https://newsapi.org/

## Updating

To update the module to the latest version, use your terminal to go to your MMM-NewsAPI module folder and type the following command:

```
cd MMM-NewsAPI
git pull
npm install
```
