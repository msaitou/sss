// const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const { libUtil: util } = require("../lib/util.js");
const D = require("./define").Def;

class rakuCommon {
  code = D.CODE.RAKU;
  retryCnt;
  account;
  logger;
  driver;
  siteInfo; 
  constructor(para) {
    this.retryCnt = para.retryCnt;
    this.account = para.account;
    this.logger = para.logger;
    this.driver = para.driver;
    this.siteInfo = para.siteInfo;
    this.logger.debug("rakuCommon constructor");
  }
  async login() {
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
      inputEle.sendKeys(this.account[this.code].loginid);
      inputEle = await this.driver.findElement(By.css(seleInput.pass));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.code].loginpass);

      inputEle = await this.driver.findElement(By.css(seleInput.login));
      inputEle.click();
      // let a = await this.driver.findElement(By.css("html"));
      // this.logInfo(a);
    }
  }
  async login2() {
    await this.driver.get('https://grp02.id.rakuten.co.jp/rms/nid/login'); // エントリーページ表示
    // let a = await this.driver.findElement(By.css("html"));
    // this.logInfo(await a.getAttribute('innerHTML'));
    // ログインページへのリンクをクリック
    // リンクが存在することを確認
    // let ele = await this.driver.findElements(By.css('a[href*="my-rakuten-mobile"]'));
    // this.logInfo(ele.length);
    // if (ele.length) {
      // await ele[0].click();
      // await this.sleep(5000);
     
      let seleInput = { id: "#loginInner_u", pass: "#loginInner_p", login: 'input[type="submit"]' };
      let inputEle = await this.driver.findElement(By.css(seleInput.id));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.code].loginid);
      inputEle = await this.driver.findElement(By.css(seleInput.pass));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.code].loginpass);

      inputEle = await this.driver.findElement(By.css(seleInput.login));
      await inputEle.click();
      // let a = await this.driver.findElement(By.css("html"));
      // this.logInfo(a);
    // }
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
