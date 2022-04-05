// pointgetter(web),pointgetter(mobile),life-utility,pointgetter(mail)
// の4種で同じプログラム（入り口）を利用する。
// 起動時に、どのモードか分ける。
const MODE = { P_WEB_S: "P_WEB_S", P_WEB_H: "P_WEB_H", P_MOB: "P_MOB", P_MIL: "P_MIL", L_UTL: "L_UTL" ,manual:"manual"};
const logger = require("./initter.js").log();
global.log = logger;
logger.info("start!");
logger.info(process.argv);
const db = require("./initter.js").db;

async function start(mode) {
  return new Promise(async (resolve, reject) => {
    logger.info(33);
    // await db();
    switch (mode) {
      case "manual":
        const man = require("./exam.js");
        await man.alone(logger);
        break;
      case MODE.P_WEB_S:  // 単発（開発用）
        // console.log("pex");
        // const exam = require("./exam.js");
        // // const exam = new Exam();
        // await exam.main(logger);
        const Web = require("./mp_web/index.js").PointWebCls;
        const PWeb = new Web();
        await PWeb.main();
        break;
      case MODE.P_MOB:
        break;
      case MODE.P_MIL:
        // 開封済みにする
        // ここにメールボックス作って、未受信のメールを受信する方法にしたい
        const Mail = require("./mp_mil/index.js").PointMailClass;
        const PMil = new Mail();
        await PMil.main();
        break;
      case MODE.L_UTL:
        const Life = require("./ml_utl/index.js").LifeUtilClass;
        const lUtil = new Life();
        await lUtil.main();
        break;
      default:
    }
    resolve(true);
  })
    .then((res) => {
      logger.info("res", res);
    })
    .catch((e) => {
      logger.error(e);
    })
    .finally(() => {
      logger.info("tyokuzen");
      process.exit();
    });
}
if (process.argv[2] && MODE[process.argv[2]]) {
  start(process.argv[2]);
}
else {
  console.log(`引数は、${Object.keys(MODE)} のどれかです！`);
  process.exit();
}
