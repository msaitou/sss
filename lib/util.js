const { Logger } = require("selenium-webdriver/lib/logging");

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
    result = Math.round(result * 100)/100; // 整数以下を四捨五入するというメソッドなので、100（2桁左に動かして四捨五入）
    logger.info(`式：${strCalc} で、答え：${result}`);
    return result;
  },
};
