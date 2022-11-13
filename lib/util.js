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
};
