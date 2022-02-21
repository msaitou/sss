const { initBrowserDriver, db } = require("./initter.js");
exports.main = async (logger) => {
  global.log.info("こっちに来たね");
  // site数で回す
  // DBからsiteを取得
  // let recs = await db("www", "find", { kind: "data-traffic" });
  // if (recs.length) {
  let driver = await initBrowserDriver();
  await driver.get("https://pex.jp/");

  logger.info("rec");
  await driver.quit();
  // }
};
