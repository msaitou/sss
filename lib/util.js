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
  calcAnzan: (m) => {
    let strNum1 = m.group(1);
    let strNum2 = m.group(3);
    let strNum3 = m.group(5);
    let operator = [];
    for (let code of [m.group(2), m.group(4)]) {
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
    // ScriptEngineManager manager = new ScriptEngineManager();
    // ScriptEngine engine = manager.getEngineByName("nashorn");
    // Object res = null;
    // try {
    //   System.out.println("\\t strNum1[" + strNum1 + operator[0] + strNum2 + operator[1] + strNum3 + "]");
    //   System.out.println("\\t manager[" + manager + "]");
    //   System.out.println("\\t engine[" + engine + "]");

    //   res = engine.eval(strNum1 + operator[0] + strNum2 + operator[1] + strNum3);
    //   if (res instanceof Double) {
    //     double val = (Double) res;
    //     // 元データをBigDecimal型にする
    //     BigDecimal bd = new BigDecimal(val);
    //     // 四捨五入する
    //     res = bd.setScale(2, BigDecimal.ROUND_HALF_UP);
    //   }
    // } catch (ScriptException ex) {
    //   ex.printStackTrace();
    // }
    return res.toString();
  },
};
