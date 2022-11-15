const { initBrowserDriver, db } = require("../initter.js");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class BaseExecuter extends BaseWebDriverWrapper {
  logger;
  retryMax = 0;
  siteInfo;
  account;
  constructor(retryCnt, siteInfo, aca) {
    super();
    this.logger = global.log;
    this.retryMax = retryCnt ? retryCnt : 1;
    this.siteInfo = siteInfo;
    this.account = aca;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async main() {
    this.logger.info("BaseExecuter", "start");
    for (let i = 0; i < this.retryMax; i++) {
      try {
        if (!this.getDriver()) {
          // let driver = await this.webDriver();
          this.setDriver(await this.webDriver());
        }
        await this.exec();
      } catch (e) {
        this.logger.info(e);
        await this.quitDriver();
      } finally {
        await this.quitDriver();
        // this.driver.kill();
      }
    }
  }
  /**
   * point_summaryコレクション用の_idを作って返す（yymmdd）
   * @param {*} date
   * @returns
   */
  createPointSummaryId(date) {
    return libUtil.getYYMMDDStr(date);
  }
  /**
   * そのままのポイントを整数（文字列）に変換
   * @param points
   * @return 数値型
   */
  convertNumber(points) {
    let execlude = [",", " pt", " pt", "Pt", "pt", "mile", "ポイント"];
    for (let s of execlude) {
      if (points.indexOf(s) > 0) {
        points = points.split(s).join("");
        points = points.trim();
      }
    }
    return Number(points);
  }

  /**
   * point_summaryのコレクションを更新
   * @param {*} siteCode
   * @param {*} nakedPoint
   */
  async pointSummary(siteCode, nakedPoint) {
    let d = new Date();
    d.setDate(d.getDate() - 1); // 前日のデータ用
    let oldIdStr = this.createPointSummaryId(d);
    // このサイトの昨日のポイントを取得
    let oldDoc = await db(D.DB_COL.POINT, "findOne", { _id: oldIdStr });

    let idStr = this.createPointSummaryId();
    let nowDoc = await db(D.DB_COL.POINT, "findOne", { _id: idStr });
    // そのままのポイント表示を整数に変換
    let p = this.convertNumber(nakedPoint);
    p = p * this.siteInfo.rate; // そのサイトのポイント倍率を円に換算
    let exch = 0,
      diff = 0;
    if (!oldDoc) {
      // ない場合
      oldDoc = { total: 0, diff: 0 };
    } else {
      // diffを算出　マイナスの場合換金した扱いをする
      if (oldDoc[siteCode] && oldDoc[siteCode].p) {
        diff = p - oldDoc[siteCode].p;
        if (diff < 0) {
          // TODO ちゃんと作るまではメール飛ばす
          exch;
          await mailOpe.send(this.logger, {
            subject: `換金した疑い[${siteCode}]`,
            contents: `直前のポイント：${oldDoc[siteCode].p}\n今回のポイント：${p}\n差額：${diff}`,
          });
        }
      }
    }
    if (!nowDoc) {
      // ない場合 diffを算出　マイナスの場合換金した扱いをする
      nowDoc = { _id: idStr, total: 0, mod_date: null, diff: 0 };
    }
    let now = new Date();
    nowDoc[siteCode] = { p: p, date: now, exch: exch, diff: diff };
    nowDoc.mod_date = now;
    let total = 0,
      diffTotal = 0;

    for (let key in D.CODE) {
      let code = D.CODE[key];
      if (nowDoc[code]) {
        total += Number(nowDoc[code].p);
        diffTotal += Number(nowDoc[code].diff);
      }
    }
    nowDoc.total = total;
    nowDoc.diff = diffTotal;
    console.log("1");
    await db(D.DB_COL.POINT, "update", { _id: idStr }, nowDoc);
    console.log("2");
  }
  // UTLのソース↓
  // 取得結果をDBに書き込み
  async updateLutl(cond, doc) {
    let rec = await db("life_util", "update", cond, doc);
    this.logger.info("update!!!");
  }
  // UTLのソース↓
  // 単位付きのサイズ数の文字列を数値だけ抽出
  getNumSize(pureText) {
    let text = pureText.trim();
    let num = pureText;
    ["GB", "MB"].some((unit) => {
      if (text.indexOf(unit) > -1) {
        num = text.replace(unit, "");
        return true;
      }
    });
    return Number(num.trim());
  }
}
exports.BaseExecuter = BaseExecuter;
