const { initBrowserDriver, db } = require("../initter.js");
const { libUtil: util, libUtil } = require("../lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");
const { resolveObjectURL } = require("buffer");
const Imap = require("node-imap"),
  inspect = require("util").inspect;

class PointMailClass {
  logger;
  constructor() {
    this.logger = global.log;
    this.logInfo("PointMailClass constractor");
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
    });

    await new Promise((resolve, reject) => {
      function openInbox(cb) {
        imap.openBox("INBOX", true, cb);
      }
      imap.once("ready", function () {
        openInbox(function (err, box) {
          if (err) throw err;
          imap.search(["UNSEEN", ["SINCE", "Jan 31, 2022"]], function (err, results) {
            if (err) throw err;
            var f = imap.fetch(results, { bodies: "" });
            f.on("message", function (msg, seqno) {
              console.log("Message #%d", seqno);
              var prefix = "(#" + seqno + ") ";
              msg.on("body", async function (stream, info) {
                console.log(prefix + "Body");
                await new Promise((res, rej) => {
                  let bo = "";
                  stream.on("data", (a) => {
                    bo += a.toString("utf8");
                    if (info.which === "TEXT")
                      console.log(prefix + "Body [%s]", inspect(info.which));
                  });
                  stream.on("end", () => {
                    if (info.which !== "TEXT"){
                      console.log(prefix + "Parsed header: %s", inspect(Imap.parseHeader(bo)));
                      console.log(prefix + "Parsed Body: %s", inspect(Imap.parseBodyStructure(bo)));
                    }
                    else console.log(prefix + "Body [%s] Finished", inspect(info.which));
                    // Stream が完了したら resolve としてデータを返却する
                    let aaaa = bo;
                    // let aaaa = Buffer.from(bo, 'base64').toString();
                    console.log(aaaa);
                    resolve();
                  });

                  // let a = await stream.pipe();
                  // const text = await readFile("path/to/file");
                  // console.log(text);
                });
              });
              msg.once("attributes", function (attrs) {
                console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
              });
              msg.once("end", function () {
                console.log(prefix + "Finished");
              });
            });
            f.once("error", function (err) {
              console.log("Fetch error: " + err);
            });
            f.once("end", function () {
              console.log("Done fetching all messages!");
              imap.end();
            });
          });
        });
      });

      imap.once("error", function (err) {
        console.log(err);
        reject();
      });

      imap.once("end", function () {
        console.log("Connection ended");
        resolve();
      });

      imap.connect();
    });
    // const readFile = async (filename) => {
    //   return new Promise((resolve) => {
    //     // 例として Stream を生成する
    //     const s = fs.createReadStream(filename);
    //     let buff = "";
    //     s.on("data", (chunk) => {
    //       // データの一部が渡ってくるので resolve で返せるようにデータを連結する
    //       buff += chunk;
    //     });
    //     s.on("end", () => {
    //       // Stream が完了したら resolve としてデータを返却する
    //       resolve(buff);
    //     });
    //   });
    // };
    // (async(() => {
    //   // ファイルを読み込むAsync関数を実行し、戻り値の Promise の完了を待機する
    //   const text = await readFile('path/to/file')
    //   console.log(text)
    // };
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
    this.logger.info(a);
  }
  logWarn(...a) {
    this.logger.warn(a);
  }
}
exports.PointMailClass = PointMailClass;
