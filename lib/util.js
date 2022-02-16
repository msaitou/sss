exports.util = {
  /** mili time*/
  sleep: (time) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  },
};
