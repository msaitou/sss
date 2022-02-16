// const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const { libUtil: util } = require("../lib/util.js");

class rakuCommon {
  retryCnt;
  account;
  logger;
  driver;
  siteInfo;
  constructor(retryCnt, account, logger, driver, siteInfo) {
    this.retryCnt = retryCnt;
    this.account = account;
    this.logger = logger;
    this.driver = driver;
    this.siteInfo = siteInfo;
    this.logger.debug("rakuCommon constructor");
  }
  async login() {
    // ログイン処理は共通化できるよね-- ここから
    await this.driver.get(this.siteInfo.entry_url); // エントリーページ表示
    // let a = await this.driver.findElement(By.css("html"));
    // this.logInfo(await a.getAttribute('innerHTML'));
    // ログインページへのリンクをクリック
    // リンクが存在することを確認
    let ele = await this.driver.findElements(By.css('a[href*="my-rakuten-mobile"]'));
    // this.logInfo(ele.length);
    if (ele.length) {
      await ele[0].click();
      await this.sleep(5000);
      let seleInput = { id: "#loginInner_u", pass: "#loginInner_p", login: 'input[type="submit"]' };
      let inputEle = await this.driver.findElement(By.css(seleInput.id));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.siteInfo.code].loginid);
      inputEle = await this.driver.findElement(By.css(seleInput.pass));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.siteInfo.code].loginpass);

      inputEle = await this.driver.findElement(By.css(seleInput.login));
      inputEle.click();
      //
      let a = await this.driver.findElement(By.css("html"));
      this.logInfo(a);
    }
    // -- ここまで
  }
  // 共通--
  logInfo(...a) {
    this.logger.info(a);
  }
  sleep(time) {
    return util.sleep(time);
  }
  // isExistEle(selector, showFlag) {
  //   By register = By.cssSelector(selector);
  //   boolean is = isExistEle(driver.findElements(register), logg);
  // }
}
exports.rakuCommon = rakuCommon;
