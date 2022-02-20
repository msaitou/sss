const conf = require("config");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

exports.db = async function (coll, method, cond = {}, doc) {
  let log = getLogInstance();
  log.info(0);
  const mdb = require("mongodb");
  //   global.db = db;
  log.info(1);
  const dbClient = mdb.MongoClient;
  log.info(2);
  try {
    log.info("conf", conf);
    let db = await dbClient.connect(`mongodb://${conf.db.host}/`);
    log.info(3);
    const dbName = db.db("sm");
    const collection = dbName.collection(coll);
    let res;
    log.info(4);
    switch (method) {
      case "find":
        res = await collection.find(cond).toArray();
        break;
      case "findOne":
        res = await collection.findOne(cond);
        break;
      case "update":
        let cnt = 0;
        if (cond) {
          cnt = await collection.find(cond).count();
        }
        if (cnt) {
          res = await collection.updateOne(cond, { $set: doc });
        } else {
          // insert
          res = await collection.insertOne(doc);
        }
        break;
      case "remove":
      default:
    }
    log.info(5);
    // log.info(lines);
    db.close();
    return res;
  } catch (e) {
    throw e;
  }
};
function getLogInstance() {
  return global.log ? global.log : thisLog();
}

/** ログクラスの初期処理
 * @returns
 */
const thisLog = () => {
  const log = require("log4js");
  log.configure({
    appenders: {
      out: { type: "stdout" },
      app: { type: "dateFile", filename: "log/a.log", pattern: ".yyyyMMdd", keepFileExt: true },
    },
    categories: { default: { appenders: ["out", "app"], level: "all" } },
  });
  const logger = log.getLogger();
  logger.level = "all";
  return logger;
};
exports.log = thisLog;

const getDriverPath = async function () {
  let log = getLogInstance();
  try {
    const selenium = require("selenium-download");
    // Driverをダウンロードするディレクトリを指定
    const path = __dirname + "/bin";
    log.info(path);
    try {
      // # Driverのダウンロードとアップデート
      await new Promise((resolve, reject) => {
        selenium.ensure(path, (e) => {
          if (e) console.error(e.stack);
          // log.info("?????");
          resolve(true);
        });
      });
      log.info("desuyoehn");
    } catch (ee) {
      log.info(ee);
    }
    // # ChromeDriverのパスを返す。
    return `${path}/${process.platform === "win32" ? "chromedriver.exe" : "chromedriver"}`;
  } catch (error) {
    throw error;
  }
};
exports.getDriverPath = getDriverPath;

exports.initBrowserDriver = async function (isMob = false, headless = true) {
  let log = getLogInstance();
  // # Driverのパスを取得する
  let driverPath = await getDriverPath();
  log.info(`driver${driverPath}`);

  // # Driverのパスを渡す
  let service = new chrome.ServiceBuilder(driverPath).build();
  const chromeOptions = new chrome.Options();
  let defoSer = null;
  try {
    defoSer = chrome.getDefaultService();
  } catch (e) {}
  if (defoSer && defoSer.isRunning()) {
    defoSer.kill();
  }
  if (!defoSer || !defoSer.isRunning()) {
    chrome.setDefaultService(service);
    // chromeOptions.addArguments("--headless");
    if (isMob) {
      chromeOptions.setMobileEmulation({
        deviceName: "Nexus 6",
      });
    }
  }
  return new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();
};
