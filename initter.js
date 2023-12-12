const conf = require("config");
const { Builder, By, until, Capabilities } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
exports.db = async function (coll, method, cond = {}, doc) {
  if (conf.db.no) return true;  // DBなし
  let log = getLogInstance();
  // log.info(0);
  const mdb = require("mongodb");
  // log.info(1);
  const dbClient = mdb.MongoClient;
  // log.info(2);
  try {
    // log.debug("conf", conf);
    let db = await dbClient.connect(`mongodb://${conf.db.host}/`);
    // log.info(3);
    const dbName = db.db("sm");
    const collection = dbName.collection(coll);
    let res;
    // log.info(4);
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
          cnt = await collection.countDocuments(cond);
        }
        if (cnt) {
          res = await collection.updateOne(cond, { $set: doc });
        } else {
          // insert
          res = await collection.insertOne(doc);
        }
        break;
      case "insertMany":
        res = await collection.insertMany(doc);
        break;
      case "delete":
        res = await collection.deleteMany(doc);
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
  const logPath = "./log/";
  log.configure({
    appenders: {
      // フォーマットリファレンス　https://log4js-node.github.io/log4js-node/layouts.html#pattern-format
      out: {
        type: "stdout",
        layout: { type: "pattern", pattern: "[%d{yy-MM-dd hh:mm:ss} %[%.4p%]] %m ->%f{2} %l" },
      },
      app: {
        type: "dateFile",
        filename: `${logPath}/a.log`,
        pattern: "yyMMdd",
        keepFileExt: true,
        layout: { type: "pattern", pattern: "[%d{yy-MM-dd hh:mm:ss} %.4p] %m ->%f{2} %l" },
        // daysToKeep: 14, // 指定した日数分保持
      },
      wrapInfo: { type: "logLevelFilter", appender: "app", level: "info" },
    },
    // categories: { default: { appenders: ["out", "app"], level: "all" } },
    categories: {
      // enableCallStack: true でフォーマットの%fや%lが有効になる
      default: { appenders: ["out", "wrapInfo"], level: "all", enableCallStack: true },
    },
  });
  // 古いファイルを削除してくれないので、自分で消す
  // 2個残す。　logファイルがあるフォルダで、m.*.logを古い順にけす
  const KEEP_NUM = 7;
  let files = fs.readdirSync(logPath);
  files = files.filter((f) => /^(a|m)\.\d{6}\.log$/.test(f)); // aかm.数字6桁.logという文字列をチェック
  let cnt = files.length;
  for (let f of files) {
    if (cnt > KEEP_NUM) {
      fs.unlinkSync(`${logPath}/${f}`);
      cnt--;
    }
  }
  const logger = log.getLogger();
  logger.level = "all";
  return logger;
};
exports.log = thisLog;

const getDriverPath = async function () {
  let log = getLogInstance();
  try {
    const path = __dirname + "/bin";
    // const selenium = require("selenium-download");
    // // Driverをダウンロードするディレクトリを指定
    // log.debug(path);
    // try {
    //   // # Driverのダウンロードとアップデート
    //   await new Promise((resolve, reject) => {
    //     selenium.ensure(path, (e) => {
    //       // selenium.update(path, (e) => {
    //       if (e) console.error(e.stack);
    //       // log.info("?????");
    //       resolve(true);
    //     });
    //   });
    //   log.info("desuyoehn");
    // } catch (ee) {
    //   log.info(ee);
    // }

    await getDownloadUrl();
    // # ChromeDriverのパスを返す。
    return `${path}/${process.platform === "win32" ? "chromedriver.exe" : "chromedriver"}`;
  } catch (error) {
    throw error;
  }
};
exports.getDriverPath = getDriverPath;

exports.initBrowserDriver = async function (isMob = false, headless = false) {
  let log = getLogInstance();
  // # Driverのパスを取得する
  let driverPath = await getDriverPath();
  // log.info(`driver${driverPath}`);

  // # Driverのパスを渡す
  let service = new chrome.ServiceBuilder(driverPath).build();
  const chromeOptions = new chrome.Options();
  // https://selenium-world.net/selenium-tips/3519/
  chromeOptions.addArguments(`--user-data-dir=${conf.chrome["user-data-dir"]}`);
  chromeOptions.addArguments(`--profile-directory=${conf.chrome["profile"]}`);
  chromeOptions.addArguments("--disable-blink-features=AutomationControlled");
  chromeOptions.addArguments("--lang=en");
  // アプリ外で操作したプロファイルでログイン中にし、アプリでそのプロファイルを利用する。
  // アプリ外で、どのプロファイルを使うか、デフォルトどのプロファイルを使うのがいいか。
  // アプリ内にプロファイルは保存しておきたい気がする。
  // pexのクッキーでログインの期限ぽいもの　削除すればログインが切れた。期限を過去にするのは意味なかった。
  // _pex_session
  if (headless) chromeOptions.addArguments("--headless=new");
  let defoSer = null;
  try {
    defoSer = chrome.getDefaultService();
  } catch (e) {}
  if (defoSer && defoSer.isRunning()) {
    defoSer.kill();
  }
  if (!defoSer || !defoSer.isRunning()) {
    // chrome.setDefaultService(service);
    // chromeOptions.addArguments("--headless");
    if (isMob) {
      chromeOptions.addArguments(
        "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
      );
      chromeOptions.setMobileEmulation({
        deviceName: conf.chrome.mobile ? conf.chrome.mobile : "Pixel 5",
      });
      chromeOptions.addArguments("--window-size=960,1080");
    }
    else {
      chromeOptions.addArguments("--window-size=1920,2160");  // ほんとは1080だけど以下の拡大率のため倍にする
      chromeOptions.addArguments("force-device-scale-factor=0.5");  // 50%の拡大率で上記
      chromeOptions.addArguments("high-dpi-support=0.5");
    }
  }
  return chrome.Driver.createSession(chromeOptions, service);
  // return new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();
};

const req = require("request"); // npm i request adm-zip
const AdmZip = require("adm-zip");
const url = "https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json";
const exec = require("child_process").exec;
const CHROME = {
  BROWSE: {
    FULL_PATH: conf.chrome.browse,
  },
  DRIVER: {
    DOWNLOAD_NAME: "chromedriver.zip",
    DIR: conf.chrome.bin,
    NAME: "chromedriver",
    EXTENSION: { win64: ".exe", linux64: "" },
  },
};

const getDownloadUrl = async () => {
  let localOS = getLocalPlatformKey(); // 実行してるOSの種類　win64かlinux64の択一
  let browseVer = await getNowChromeVer(CHROME.BROWSE.FULL_PATH); // 実行しているOSにインストールされてるchromeのバージョン
  let localDriverVer = ""; // 実行しているOSにあるchromedriverのバージョン
  let localDriverFullPath = `${CHROME.DRIVER.DIR}${CHROME.DRIVER.NAME}${CHROME.DRIVER.EXTENSION[localOS]}`;
  // console.log(localDriverFullPath, fs.existsSync(localDriverFullPath));
  if (fs.existsSync(localDriverFullPath))
    localDriverVer = await getNowChromeVer(
      localOS === "win64" ? localDriverFullPath.split("\\").join("\\\\") : localDriverFullPath,
      true
    );
  console.info(`localOS: ${localOS} local chromeDriverVersion:${localDriverVer} now chromeVersion:${browseVer}`);
  if (localDriverVer === browseVer) return true; // 同じバージョンなら終了

  try {
    return new Promise((resu, rej) => {
      req({url, timeout:180000}, async (err, res, body) => {
        if (err) rej(err );
        // console.log(res);
        // let resObj = res.json();
        // レスポンスコードとHTMLを表示
        // console.log('body:', JSON.stringify(JSON.parse(body), null, 2));
        let dObj =  JSON.parse(body);
        // console.log("resObj:", dObj.milestones, browseVer);
        if (dObj && dObj.milestones[browseVer]) {
          // console.log(dObj.milestones[browseVer].downloads.chromedriver);
          if (dObj.milestones[browseVer].downloads.chromedriver) {
            let targetLine = dObj.milestones[browseVer].downloads.chromedriver.filter((l) => l.platform === localOS)[0];
            if (targetLine) {
              console.log(targetLine);
              if (browseVer != localDriverVer) {
                // ダウンロード
                await downloadDriver(targetLine.url);
                // 解凍
                let zip = new AdmZip(CHROME.DRIVER.DIR + CHROME.DRIVER.DOWNLOAD_NAME);
                zip.extractAllTo(/*target path*/ CHROME.DRIVER.DIR, /*overwrite*/ true);
                for (const zipEntry of zip.getEntries()) {
                  // __MACOSXフォルダなど、フォルダは無視
                  if (zipEntry.isDirectory) {
                    continue;
                  }
                  console.log(zipEntry.entryName);
                  let fName = zipEntry.entryName.split("/");
                  fName = fName[fName.length - 1];
                  if (`${CHROME.DRIVER.NAME}${CHROME.DRIVER.EXTENSION[localOS]}` == fName) {
                    // ドライバーを所定の位置に移動
                    fs.renameSync(CHROME.DRIVER.DIR + zipEntry.entryName, CHROME.DRIVER.DIR + fName); // デフォルト上書き
                    if (localOS === "linux64") {
                      try {
                        fs.chmodSync(CHROME.DRIVER.DIR + fName, "755");
                      } catch (e) {
                        console.log("The permissions for chromedriver have been changed!");
                        throw e;
                      }
                    }
                    break;
                  }
                }
                // 不要ファイルの削除
                fs.unlinkSync(CHROME.DRIVER.DIR + CHROME.DRIVER.DOWNLOAD_NAME);
              }
            }
          }
          // 今ローカルにあるchromedriverのバージョンを取得して、異なっている場合のみダウンロードする　TODO
        }
        // console.log("end");
        resu(true);
        // process.exit(1);
      });
    });
  } catch (e) {
    console.log(e);
  }
};
const downloadDriver = async (url) => {
  return new Promise(async (res, rej) => {
    try {
      req(url)
        .pipe(fs.createWriteStream(CHROME.DRIVER.DIR + CHROME.DRIVER.DOWNLOAD_NAME))
        .on("close", function () {
          console.log("ダウンロード完了");
          res(true);
        });
    } catch (e) {
      rej(e);
    }
  });
};

const getNowChromeVer = async (fullPath, isDriver) => {
  return new Promise(async (res, rej) => {
    let os = getLocalPlatformKey();
    let cmd =
      isDriver || os === "linux64"
        ? `${fullPath} --version`
        : `wmic datafile where name="${fullPath}" get Version /value`;
    await exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        rej(err);
      }
      // console.log(stdout.trim());
      let browseVer = "";
      // どっちのchromeのバージョン文字列によって、切り取り方が変わる（メジャーバージョンの部分だけ抽出）
      if (isDriver) browseVer = stdout.trim().replace("ChromeDriver ", "").split(".")[0];
      else if (os === "linux64" && !isDriver) browseVer = stdout.trim().replace("Google Chrome ", "").split(".")[0];
      // ChromeDriver 116.0.5845.96 (1a391816688002153ef791ffe60d9e899a71a037-refs/branch-heads/5845@{#1382})
      else browseVer = stdout.trim().replace("Version=", "").split(".")[0]; // Version=117.0.5938.150
      res(browseVer);
    });
  });
};
// 実行環境によって、キーを返す。win32はwin64として、それ以外はlinux64　で返す
const getLocalPlatformKey = () => {
  // console.log(process.platform);
  if ("win32" === process.platform) return "win64";
  else return "linux64"; // macは考慮外
};
