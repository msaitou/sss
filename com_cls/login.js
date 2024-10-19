// const { rakuCommon } = require("../com_cls/c_raku.js");
const { RakuCommon } = require("../mp_web/raku-base");
const pBase = require("../mp_web/pex-base"); // 同じファイルで別クラス呼ぶときは、こうしなきゃ行けないかも
const mopBase = require("../mp_web/mop-base"); // 同じファイルで別クラス呼ぶときは、こうしなきゃ行けないかも
const ameBase = require("../mp_web/ame-base"); // 同じファイルで別クラス呼ぶときは、こうしなきゃ行けないかも
const D = require("./define").Def;

class Login {
  cPara = {};
  constructor(retryCnt, account, logger, driver, siteInfo) {
    this.cPara = { retryCnt, account, logger, driver, siteInfo };
  }
  async login(code) {
    let comCls;
    switch (code) {
      case "rin":
      case D.CODE.RAKU:
        comCls = new RakuCommon(this.cPara);
        await comCls.login();
        break;
      // これ不要なクラスの気がしてるので、以降ここに追加しないつもり。
      case D.CODE.PEX:
        comCls = new pBase.PexCommon(this.cPara);
        await comCls.login();
        break;
      case D.CODE.MOP:
        comCls = new mopBase.MopCommon(this.cPara);
        await comCls.login();
        break;
      case D.CODE.AME:
        comCls = new ameBase.AmeCommon(this.cPara);
        await comCls.login();
        break;
    }
  }
}
exports.Login = Login;
