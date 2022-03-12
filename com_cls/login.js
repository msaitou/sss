const { rakuCommon } = require("../com_cls/c_raku.js");
const D = require("./define").Define;

class Login {
  cPara = {};
  constructor(retryCnt, account, logger, driver, siteInfo) {
    this.cPara = { retryCnt, account, logger, driver, siteInfo };
  }
  async login(code) {
    switch (code) {
      case 'rin':
      case D.CODE_RAKU:
        let rakuCom = new rakuCommon(this.cPara);
        await rakuCom.login2();
        break;
    }
  }
}
exports.Login = Login;
