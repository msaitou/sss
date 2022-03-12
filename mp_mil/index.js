const { initBrowserDriver, db } = require("../initter");
const { libUtil: util, libUtil } = require("../lib/util");
const { Builder, By, until } = require("selenium-webdriver");
const { resolveObjectURL } = require("buffer");
const { BaseWebDriverWrapper } = require("../BaseWebDriverWrapper");
const { Login } = require("../com_cls/login");
const D = require("../com_cls/define").Define;

const Imap = require("node-imap"),
  inspect = require("util").inspect;
const simpleParser = require("mailparser").simpleParser;
const conf = require("config");
const { url } = require("inspector");
const labelmap = {
  // code:{dir:メールフォルダ名, key:ポイントありの印}
  raku: { dir: "p/rakuten01", key: "" },
  // rin: { dir: "p/depoint", key: "" },
  gmy: { dir: "p/getmoney", key: "Pt]" },
  osa: { dir: "p/osaifu", key: "付>" },
  pto: { dir: "p/ポイントタウン", key: "" },
  pex: { dir: "p/PEX", key: "クリック1P" },
  ecn: { dir: "p/ECナビ", key: "" },
  i2i: { dir: "p/i2iポイント", key: "ptあり" },
  gen: { dir: "p/げん玉", key: "【クリック", key2: "】オススメサービス" },
  mop: { dir: "p/モッピー", key: "付" },
  war: { dir: "p/warau", key: "じゃんけんちゃん", key2: "ワラウマガジン" },
  sug: {
    dir: "p/sugutama",
    key: "号外",
    key2: "週刊すぐたま",
    key3: "すぐたまグレードステータス",
  },
  pmo: { dir: "p/pointmonkey", key: "ポイモン南の島NEWS" },
  pil: { dir: "p/pointisland", key: "" },
  pst: { key: "", dir: "p/pointstadium" },
  ntm: { dir: "p/netmairu", key: "週刊ネットマイル" },
  koz: { dir: "p/kozukai", key: "【ポイント探し】" },
  hap: {
    dir: "p/hapitas",
    key: "【クリック",
    key2: "宝くじ交換券付き",
  },
  cri: { dir: "p/chobi", key: "おみくじ付き" },
  cit: { dir: "p/chanceit", key: "ポイントメール", key2: "チャンス通信" },
  pic: { dir: "p/pointincome", key: "クリック" },
  test: { dir: "p/test", key: "" },
};
const targetList = conf.p_mil.target;

class PointMailClass extends BaseWebDriverWrapper {
  logger;
  driver;
  constructor() {
    super();
    this.logger = global.log;
    this.logInfo("PointMailClass constractor", "target:", targetList);
  }
  async main() {
    this.logInfo("PointMailClass main");
    // リアルタイムで受信をrecieve https://liginc.co.jp/web/service/facebook/153850/2
    // メールを受信したい。からDBからメールアカウントを取得したい。
    // googleapisを利用したプロジェクトは、リアルタイムで処理するときに対応。一番最後。
    // このプロジェクトでは、通常のmailの期間を指定して受信に制限し、捌くのみとする。
    // DBからmailアカウントを取得
    let rec = await db("config", "findOne", { type: "mail" });
    let imap = new Imap({
      user: rec.user,
      password: rec.password,
      host: rec.host,
      port: rec.port,
      tls: true,
      // debug: console.debug,
    });
    let before = new Date();
    before.setHours(0, 0, 0, 0);
    let beforeNum = conf.p_mil.before ? conf.p_mil.before : 1;
    before.setDate(before.getDate() - beforeNum);
    this.logInfo(`${before}以降のメールを抽出します`);
    let urlMap = {};
    await new Promise((resolve, reject) => {
      // let targeList = this.targetList;
      let { logInfo, logWarn } = this;
      // this.logInfo();
      async function openInbox() {
        await Promise.all(
          targetList.map(async (target) => {
            await promiseTargetBox(target);
          })
        );
        imap.end();
        function promiseTargetBox(target) {
          return new Promise((res2, rej2) => {
            imap.openBox(labelmap[target].dir, true, (err, box) => {
              if (err) throw err;
              // "Mar 1, 2022"
              imap.search([["SINCE", before]], (err, results) => {
                if (err) throw err;
                logInfo(results);
                if (results.length) {
                  var f = imap.fetch(results, { bodies: "" });
                  f.on("message", (msg, seqno) => {
                    // logInfo("Message #%d", seqno);
                    // var prefix = "(#" + seqno + ") ";

                    msg.on("body", (stream, info) => {
                      simpleParser(stream, null, (err, parsed) => {
                        // TODO ここでポイントになるURLを抽出する
                        logInfo("date,subject", parsed.date, parsed.subject);
                        logInfo("headers", parsed.headers.get("content-type").value);
                        // 件名をチェック。
                        let content = "";
                        if (parsed.headers.get("content-type").value == "text/html") {
                          content = parsed.html;
                        } else {
                          content = parsed.text;
                        }
                        // 対象のメールだったら、ヘッダーからhtmlかtextを判別して、テキストを抽出。
                        getPointUrls(urlMap, target, content);
                      });
                    });

                    // msg.once("attributes", function (attrs) {
                    //   logInfo(prefix + "Attributes: %s", inspect(attrs, false, 8));
                    // });
                    msg.once("end", () => {
                      // logInfo(prefix + "Finished");
                    });
                  });
                  f.once("error", function (err) {
                    rej2(), logInfo("Fetch error: " + err);
                  });
                  f.once("end", () => {
                    res2(), logInfo("Done fetching all messages!");
                  });
                } else {
                  res2(), logInfo("no result!");
                }
              });
            }); // ラベル名は完全一致なので注意　大文字
          });
        }
      }
      imap.once("ready", function () {
        // promiseAllで、対象すべてを抽出する　全部終わったらendをコール
        openInbox();
      });

      imap.once("error", function (err) {
        reject(), logWarn(err);
      });

      imap.once("end", function (a) {
        logInfo("Connection ended", a);
        resolve();
      });
      imap.connect();
    });
    this.logInfo("直前の前よね");
    let loginSiteList = [D.CODE_RAKU, "rin"];
    let aca = await db("config", "findOne", { type: "login" });
    let loginCls = null;
    for (let site in urlMap) {
      let urls = urlMap[site];
      let uniqueUrls = [];
      for (let url of urls) {
        if (uniqueUrls.indexOf(url) === -1) {
          uniqueUrls.push(url);
        }
      }
      let isLoginNow = false;
      for (let i in uniqueUrls) {
        let url = uniqueUrls[i];
        try {
          if (!this.driver) {
            this.driver = await this.webDriver();
          }
          this.logInfo(`${Number(i) + 1}/${uniqueUrls.length}`, url);
          if (!isLoginNow && loginSiteList.indexOf(site) !== -1) {
            // ログインが必要そうなサイトだけログイン
            if (!loginCls) {
              loginCls = new Login(0, aca, this.logger, this.driver, null);
            }
            await loginCls.login(site);
            isLoginNow = true;
          }
          // siteごとに処理を分けたいかも
          // url = "https://r.rakuten.co.jp/2Ec9C56IK1AVeYT81V51t5hI?mpe=552111"; // test
          url = "https://pmrd.rakuten.co.jp/?r=MzI1MDQ3fDE%3D&p=C92DE7E&u=BAB68077";
          await this.driver.get(url); // エントリーページ表示
          this.sleep(1000);
          break; // test
        } catch (e) {
          this.logInfo(e);
          await this.driver.quit();
          this.driver = null;
        }
      }
    }
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
      // this.driver.kill();
    }
    this.logInfo("やりきりました");
  }
  // TODO 多分もう一つ親クラス作ってそこに実装がいいかも
  async getEle(sele, i, time) {
    try {
      if (!sele || !libUtil.isZeroOver(i)) throw "is not param[0] or param[1] is invalid";
      let eles = await this.getEles(sele, time);
      return eles[i];
    } catch (e) {
      this.logWarn(e);
    }
  }
  async getEles(sele, time) {
    try {
      if (!sele) throw "is not param[0]";
      time = time ? time : 0;
      return await this.driver.wait(until.elementsLocated(By.css(sele)), time);
    } catch (e) {
      this.logWarn(e);
    }
  }
  async getElesFromEle(ele, sele, time) {
    try {
      if (!sele) throw "is not param[1]";
      time = time ? time : 0;
      return await ele.findElements(By.css(sele), time);
    } catch (e) {
      this.logWarn(e);
    }
  }
  async isExistEle(sele, showFlag, time) {
    try {
      if (!sele) throw "is not param[0]";
      showFlag = showFlag === void 0 ? true : false;
      time = time ? time : 0;
      // let register = By.css(selector);
      // let is = isExistEle(this.driver.findElements(register));
      var eles = await this.driver.wait(until.elementsLocated(By.css(sele)), time);
      this.logInfo(`showFlag[${showFlag}] elelen[${eles.length}]`);
      if (showFlag && !!eles.length) {
        return true;
      } else if (!showFlag && !eles.length) {
        return true;
      }
    } catch (e) {
      this.logWarn(e);
    }
  }
  logInfo(...a) {
    (this ? this.logger : global.log).info(a);
  }
  logWarn(...a) {
    (this ? this.logger : global.log).warn(a);
  }
}
function getPointUrls(urlMap, target, content) {
  let contentRow = content.split("\n");
  let urls = [];
  for (let row of contentRow) {
    switch (target) {
      case D.CODE_RAKU:
        for (let key of [
          "https://r.rakuten.co.jp/",
          "http://ac.rakuten-card.co.jp/s.p",
          "http://ac.rakuten-card.co.jp/c.p",
        ]) {
          if (row.indexOf(key) > -1) {
            let url = "";
            if (row.indexOf('"', row.indexOf(key)) > 0) {
              url = row.substring(row.indexOf(key), row.indexOf('"', row.indexOf(key)));
            } else {
              console.log(row);
              url = row.substring(row.indexOf(key));
            }
            if (url) {
              // .gif が含まれてるやつ、?fbu= が含まれてるやつをスキップ
              if (url.indexOf(".gif") === -1 && url.indexOf("?fbu=") === -1) {
                urls.push(url);
              }
            }
          }
        }
        break;
    }
    if (!urlMap[target]) {
      urlMap[target] = [];
    }
    urlMap[target] = urlMap[target].concat(urls);
  }
}
exports.PointMailClass = PointMailClass;
