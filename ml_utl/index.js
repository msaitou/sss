const { initBrowserDriver, db } = require("../initter.js");
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
      let driver = await initBrowserDriver();
      for (let rec of recs) {
        this.logger.info("rec", rec);
        //   await driver.get("http://google.com/");
        // ここで各サイトのスクレイピングクラスに処理を移す
        getOperatorCls(rec.code)
        
        await driver.get(rec.entry_url);
        break; // test中
      }
      await driver.quit();
    }
  }
}
exports.LifeUtilClass = LifeUtilCls;


function getOperatorCls(code) {
  switch (code) {
    case 'raku':
      return ;

  }
}