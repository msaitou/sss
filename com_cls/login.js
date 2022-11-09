const { rakuCommon } = require("../com_cls/c_raku.js");
const pBase = require("../mp_web/pex-base"); // 同じファイルで別クラス呼ぶときは、こうしなきゃ行けないかも
const D = require("./define").Def;

class Login {
  cPara = {};
  constructor(retryCnt, account, logger, driver, siteInfo) {
    this.cPara = { retryCnt, account, logger, driver, siteInfo };
  }
  async login(code) {
    switch (code) {
      case "rin":
      case D.CODE.RAKU:
        let rakuCom = new rakuCommon(this.cPara);
        await rakuCom.login2();
        break;
      // これ不要なクラスの気がしてるので、以降ここに追加しないつもり。
      case D.CODE.PEX:
        let pexCom = new pBase.pexCommon(this.cPara);
        await pexCom.login();
        break;
    }
  }
}
exports.Login = Login;
