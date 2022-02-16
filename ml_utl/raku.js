const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const { rakuCommon } = require("../com_cls/c_raku.js");

class raku extends BaseExecuter {
  constructor(retryCnt, siteInfo, aca) {
    super(retryCnt, siteInfo, aca);
    this.logger.debug("raku constructor");
  }
  async exec() {
    this.logInfo("きた？", this.siteInfo.entry_url);
    let rakuCom = new rakuCommon(
      this.retryCnt,
      this.account,
      this.logger,
      this.driver,
      this.siteInfo
    );
    await rakuCom.login();

    //$('rktn-btn[ratid="web-ecare-6"] button').click() // ログイン後の通信量ページへのリンク
    
  }
  // isExistEle(selector, showFlag) {
  //   By register = By.cssSelector(selector);
  //   boolean is = isExistEle(driver.findElements(register), logg);
  // }
}
exports.raku = raku;
