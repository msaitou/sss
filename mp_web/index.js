const { initBrowserDriver, db } = require("../initter.js");
const pBase = require("./pex-base");
const config = require("config");
const { Entry } = require("selenium-webdriver/lib/logging");

class PointWebCls {
  logger;
  exeKind;
  constructor(kind) {
    this.logger = global.log;
    this.exeKind = kind ? kind.toLowerCase() : "";
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async main(missionMap) {
    this.logger.info("PointWebCls main begin!");
    if (missionMap && Object.keys(missionMap).length) {
      let targetKeys = Object.keys(missionMap);
 
      let aca = await db("config", "findOne", { type: "login" });
      let siteInfos = await db("www", "find", {
        kind: "web-pc",
        code: { $in: targetKeys },
      });
      for (let [key, line] of Object.entries(missionMap)) {
        await this.execOperator(key, line, aca, siteInfos.filter(i => i.code === key)[0]);
      }
    } else this.logInfo("ミッションは登録されていません");
  }
  /**
   * 単体実行の入口（デバック実行含む）
   */
  async once() {
    let targetAll = config[this.exeKind];
    let missionMap = targetAll['']; // 今の時間のサイト毎のミッションを抽出
    // "": {
    //   "pex": [
    //     { "main": "news", "sub": "" },
    //     { "main": "chirashi", "sub": "1" }
    //   ]
    // }

    await this.main(missionMap);
  }
  
  /**
   * 定期実行の入口
   */
   async endless() {
    let count = 0;
    const countUp = () => {
      console.log(count++);
      // TODO 
      let missionMap = {};
      this.main(missionMap);
    }
    await setInterval(countUp, 10000);
    // DBのミッションキューが今日か
    // 今日出ない場合、その時点のミッションキューテーブルデータをアーカイブして、
    // クリアした今日のミッションテンプレートを更新
    // いま時点で未実行のミッションを抽出
    // main()に未実行ミッションリストを渡す　同期的に
    // 5分ごとにエンドレス・・
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
        opeCls = new pBase.Pex(0, siteInfo, aca, missionList);
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
