// pointgetter(web),pointgetter(mobile),life-utility,pointgetter(mail)
// の4種で同じプログラム（入り口）を利用する。
// 起動時に、どのモードか分ける。
const MODE = {
  P_WEB_S: "P_WEB_S",
  P_WEB_H: "P_WEB_H",
  DEBUG: "debug",
  P_MIL: "P_MIL",
  L_UTL: "L_UTL",
  MANUAL: "manual",
  MOBILE: "mobile",
};
const logger = require("./initter.js").log();
global.log = logger;
logger.info("start!");
logger.debug(process.argv);
const db = require("./initter.js").db;

async function start(mode) {
  return new Promise(async (resolve, reject) => {
    logger.info(33);
    let Web = null;
    let PWeb = null;
    switch (mode) {
      case "mobile":
        global.mobile = true;
      case "manual":
        global.manual = true;
        const man = require("./exam.js");
        await man.alone(logger);
        break;
      case MODE.P_WEB_S: // 単発（開発用）
      case MODE.P_WEB_H: // 定期実行用
        Web = require("./mp_web/index.js").PointWebCls;
        PWeb = new Web(mode);
        if (mode === MODE.P_WEB_S) {
          await PWeb.once();
        } else {
          await PWeb.endless();
        }
        break;
      case MODE.DEBUG:
        Web = require("./mp_web/index.js").PointWebCls;
        PWeb = new Web(mode);
        if (process.argv.length > 4)
          await PWeb.once({[process.argv[3]]:[{
            main: process.argv[4],
            sub: "",
            type: "chain",
            is_valid_cond: true,
            valid_time: "",
            valid_term: {
              const_h_from: 0,
            },
          }]});
        break;
      case MODE.P_MIL:
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
      if (mode !== MODE.P_WEB_H) {
        process.exit();
      }
    });
}
if (process.argv[2] && MODE[process.argv[2].toUpperCase()]) {
  start(process.argv[2]);
} else {
  console.log(`引数は、${Object.keys(MODE)} のどれかです！`);
  process.exit();
}
