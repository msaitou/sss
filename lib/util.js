exports.libUtil = {
  /** mili time*/
  sleep: (time) => {
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
};
