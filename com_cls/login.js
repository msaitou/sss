const { rakuCommon } = require("../com_cls/c_raku.js");
const D = require("./define").Def;

class Login {
  cPara = {};
  constructor(retryCnt, account, logger, driver, siteInfo) {
    this.cPara = { retryCnt, account, logger, driver, siteInfo };
  }
  async login(code) {
    switch (code) {
      case 'rin':
      case D.CODE.RAKU:
        let rakuCom = new rakuCommon(this.cPara);
        await rakuCom.login2();
        break;
      case D.CODE.PEX:
        let pexCom = new pexCommon(this.cPara);
        await pexCom.login();
        break;
    }
  }
}
exports.Login = Login;
