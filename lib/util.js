const { Logger } = require("selenium-webdriver/lib/logging");
const { default: Kuroshiro } = require("kuroshiro");
const KuroshiroAnalyzer = require("kuroshiro-analyzer-kuromoji");
const { Def: D } = require("../com_cls/define");
exports.libUtil = {
  /** mili time*/
  sleep: async (time) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  },
  isNum: (a) => {
    return Number.isSafeInteger(a);
  },
  isZeroOver: (a) => {
    return this.libUtil.isNum(a) && a > -1;
  },
  /**
   * ランダムに抽出された整数を返す
   * @param {*} min 最小値
   * @param {*} max 最大値
   * @returns 最小値〜最大値未満の整数値
   */
  getRandomInt: (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  },
  /**
   * 日付からyymmddの文字列を作成し返す
   * @param {*} date
   * @returns
   */
  getYYMMDDStr: (date) => {
    let d = date ? date : new Date();
    return (
      d.getFullYear().toString().substring(2) +
      (d.getMonth() + 1).toString().padStart(2, "0") +
      d.getDate().toString().padStart(2, "0")
    );
  },
  getNanyoubi: (strAfterDayNum) => {
    let iAfterDayNum = Number(strAfterDayNum);
    let amari = iAfterDayNum % 7;
    let now = new Date();
    let todayYoubi = now.getDay();
    todayYoubi = todayYoubi === 0 ? 7 : todayYoubi; // 日曜日は0だけど7扱い
    let resYoubi = todayYoubi + amari;
    if (resYoubi > 7) {
      resYoubi -= 7;
    }
    return resYoubi - 1;
  },
  calcAnzan: (m, logger) => {
    let strNum1 = m[1];
    let strNum2 = m[3];
    let strNum3 = m[5];
    let operator = [];
    for (let code of [m[2], m[4]]) {
      let ope = "";
      switch (code) {
        case "+":
          ope = "+";
          break;
        case "-":
          ope = "-";
          break;
        case "×":
          ope = "*";
          break;
        case "÷":
          ope = "/";
          break;
      }
      operator.push(ope);
    }
    let strCalc = strNum1 + operator[0] + strNum2 + operator[1] + strNum3;
    let result = Function("return (" + strCalc + ");")();
    // 小数点第3位四捨五入
    result = Math.round(result * 100) / 100; // 整数以下を四捨五入するというメソッドなので、100（2桁左に動かして四捨五入）
    logger.info(`式：${strCalc} で、答え：${result}`);
    return result;
  },
  async kanjiToKana(kanji) {
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuroshiroAnalyzer());
    return await kuroshiro.convert(kanji, { to: "hiragana" });
  },
  /**
   * 1つのmission完了時のキューテーブルへの更新
   * @param {*} mission
   * @param {*} res
   * @param {*} siteCode
   */
  async updateMissionQueUtil(db, mission, res, siteCode) {
    if (mission["mission_date"]) {
      // ミッションの状況更新
      mission.mod_date = new Date();
      if (!mission.exec_time) mission.exec_time = 0;
      mission.exec_time += mission.mod_date - new Date(mission.exec_time_start);

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
  },
};
