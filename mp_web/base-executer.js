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
  isMob;
  isHeadless;
  constructor(retryCnt, siteInfo, aca, isMob = false, isHeadless = false) {
    super(isMob);
    this.logger = global.log;
    this.retryMax = retryCnt ? retryCnt : 1;
    this.siteInfo = siteInfo;
    this.account = aca;
    this.isMob = isMob;
    this.isHeadless = isHeadless;
    this.logger.debug(`${this.constructor.name} ${this.isMob ? "mobile Version" : ""} constructor`);
  }
  async main() {
    this.logger.info("BaseExecuter", "start");
    let para = {
      retryCnt: this.retryMax,
      account: this.account,
      logger: this.logger,
      siteInfo: this.siteInfo,
      isMob: this.isMob,
      isHeadless: this.isHeadless,
    };
    for (let i = 0; i < this.retryMax; i++) {
      try {
        if (!this.getDriver()) this.setDriver(await this.webDriver(this.isMob, this.isHeadless));
        para.driver = this.driver;
        await this.exec(para);
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
    let execlude = [",", " pt", " pt", "Pt", "pt", "mile", "ポイント", "P"];
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
        diff = Math.round(diff * 100) / 100; // 小数点の誤差をなくす
        if (diff < 0) {
          if (nowDoc && nowDoc[siteCode] && nowDoc[siteCode].exch) {
            exch = nowDoc[siteCode].exch;
            // 手動で入力されたexchと今のポイント（円換算）を加算し、diffを再計算
            let tmpP = Math.round((p + exch) * 100) / 100; // 小数点の誤差をなくす
            diff = tmpP - oldDoc[siteCode].p;
            diff = Math.round(diff * 100) / 100; // 小数点の誤差をなくす
          } else {
            // TODO ちゃんと作るまではメール飛ばす
            await mailOpe.send(this.logger, {
              subject: `換金した疑い[${siteCode}]`,
              contents: `直前のポイント：${oldDoc[siteCode].p}\n今回のポイント：${p}\n差額：${diff}`,
            });
          }
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
    nowDoc.total = Math.round(total * 100) / 100; // 小数点の誤差をなくす
    nowDoc.diff = Math.round(diffTotal * 100) / 100; // 小数点の誤差をなくす
    console.log("1");
    await db(D.DB_COL.POINT, "update", { _id: idStr }, nowDoc);
    console.log("2");
  }

  /**
   * 1つのmission完了時のキューテーブルへの更新
   * @param {*} mission
   * @param {*} res
   * @param {*} siteCode
   */
  async updateMissionQue(mission, res, siteCode) {
    if (mission["mission_date"]) {
      // ミッションの状況更新
      mission.mod_date = new Date();
      mission.status = res;
      await db(D.DB_COL.MISSION_QUE, "update", { _id: mission._id }, mission);
      // サブミッションの場合、次のサブミッション開始日を更新
      if (mission.sub && mission.valid_term && mission.valid_term.current_m_from) {
        // 続けるミッションのドキュメントを予め確保しておくか、否か
        let nextMission = await db(D.DB_COL.MISSION_QUE, "findOne", {
          site_code: siteCode,
          main: mission.main,
          sub: (++mission.sub).toString(), // 次のやつ。数字で定義
        });
        if (nextMission) {
          let nextDate = new Date();
          nextDate.setMinutes(nextDate.getMinutes() + mission.valid_term.current_m_from);
          nextMission.valid_time = { from: nextDate };
          await db(D.DB_COL.MISSION_QUE, "update", { _id: nextMission._id }, nextMission);
        }
      }
    }
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
