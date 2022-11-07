const { initBrowserDriver, db } = require("../initter.js");
const pBase = require("./pexBase");
const config = require("config");
const { Entry } = require("selenium-webdriver/lib/logging");

class PointWebCls {
  logger;
  exeKind;
  constructor(kind) {
    this.logger = global.log;
    this.exeKind = kind ? kind.toLowerCase() : "";
  }
  async main() {
    this.logger.info("PointWebCls main begin!");
    let targetAll = config[this.exeKind];
    // console.log(new Date().getHours());
    let firstKey = this.exeKind == "p_web_h" ? new Date().getHours() : "";
    let targetMap = targetAll[firstKey]; // 今の時間のサイト毎のミッションを抽出
    if (targetMap && Object.keys(targetMap).length) {
      let targetKeys = Object.keys(targetMap);
      let aca = await db("config", "findOne", { type: "login" });
      let siteInfos = await db("www", "find", {
        kind: "web-pc",
        code: { $in: targetKeys },
      });
      for (let [key, line] of Object.entries(targetMap)) {
        console.log(key, line);
        await this.execOperator(key, line, aca, siteInfos.filter(i => i.code === key)[0]);
      }
    } else this.logInfo("ミッションは登録されていません");

    // if (recs.length) {
    //   // let driver = await initBrowserDriver();
    //   for (let rec of recs) {
    //     this.logger.info("rec", rec);
    //     // TODO ログインアカウントとパスワードを取得して、次の処理に渡す
    //     let aca = await db("config", "findOne", { type: "login" });
    //     // this.logger.info('aca', aca);
    //     //   await driver.get("http://google.com/");
    //     // ここで各サイトのスクレイピングクラスに処理を移す
    //     await getOperatorCls(rec.code, rec, aca);

    //     // await driver.get(rec.entry_url);
    //     // break; // test中
    //   }
    //   // await driver.quit();
    // }
  }
  logInfo(...a) {
    (this ? this.logger : global.log).info(a);
  }
  logWarn(...a) {
    (this ? this.logger : global.log).warn(a);
  }
  async execOperator(code, missionList, aca, siteInfo) {
    let opeCls = null;
    switch (code) {
      case "raku":
        // opeCls = new pex(0, missionList, aca);
        break;
      case "pex":
        opeCls = new pBase.pex(0, siteInfo, aca, missionList);
        break;
    }
    if (opeCls) {
      await opeCls.main().catch((e) => {
        this.logWarn(e);
      });
    }
  }
}
exports.PointWebCls = PointWebCls;
