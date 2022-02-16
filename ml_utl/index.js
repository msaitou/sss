const { initBrowserDriver, db } = require("../initter.js");
const { raku } = require("./raku.js");
// exports.main = async (logger) => {
//   global.log.info("こっちに来たね");
//   // site数で回す
//   // DBからsiteを取得
//   let recs = await db("www", "find", { kind: "data-traffic" });
//   if (recs.length) {
//     let driver = await initBrowserDriver();
//     for (let rec of recs) {
//       logger.info("rec", rec);
//       //   await driver.get("http://google.com/");
//       await driver.get(rec.entry_url);
//       break; // test中
//     }
//     await driver.quit();
//   }
// };

class LifeUtilCls {
  logger;
  constructor() {
    this.logger = global.log;
  }
  async main() {
    this.logger.info("こっちに来たね class版");
    // site数で回す
    // DBからsiteを取得
    let recs = await db("www", "find", { kind: "data-traffic" });
    if (recs.length) {
      // let driver = await initBrowserDriver();
      for (let rec of recs) {
        this.logger.info("rec", rec);
        // TODO ログインアカウントとパスワードを取得して、次の処理に渡す
        let aca = await db("config", "findOne", { type: "login" });
        // this.logger.info('aca', aca);
        //   await driver.get("http://google.com/");
        // ここで各サイトのスクレイピングクラスに処理を移す
        await getOperatorCls(rec.code, rec, aca);

        // await driver.get(rec.entry_url);
        break; // test中
      }
      // await driver.quit();
    }
  }
}
exports.LifeUtilClass = LifeUtilCls;

async function getOperatorCls(code, siteInfo, aca) {
  let opeCls = null;
  switch (code) {
    case "raku":
      opeCls = new raku(0, siteInfo, aca);
      await opeCls.main();
      return;
    case "uqmo":
    case "wima":
    case "moba":
  }
}
