// pointgetter(web),pointgetter(mobile),life-utility,pointgetter(mail)
// の4種で同じプログラム（入り口）を利用する。
// 起動時に、どのモードか分ける。
const MODE = { P_WEB: "P_WEB", P_MOB: "P_MOB", P_MIL: "P_MIL", L_UTL: "L_UTL" };
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
      case MODE.P_WEB:
        break;
      case MODE.P_MOB:
        break;
      case MODE.P_MIL:
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
    .then((res) => {logger.info('res', res)})
    .catch((e) => {
      logger.error(e);
    })
    .finally(() => {
      logger.info("tyokuzen");
      process.exit();
    });
}
start(process.argv[2]);

// モードの並列実行が可能か。可能ではない場合、終わりを検知できる必要があり、できない場合、起動タイミングは終了タイミングを予測し猶予する必要がある。
// プロセスに名前をつけて、チェック可能にし、終了するまで。もしくは、終了させてから実行するような仕組みにしたい。

// また、vaiosaito側では、DBから必要な情報を取得して、デスクトップにファイルを作成するみたいなシェルを作りたい。

// log書くやつとdriverとDBの読み書きは独立クラス
// logを表示するwebアプリを作る。
