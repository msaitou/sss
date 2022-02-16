const { initBrowserDriver, db } = require("../initter.js");
const { util } = require("../lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");

// driverのインスタンス生成
// インスタンス終了

// 例外キャッチ
// リトライ管理
class BaseExecuter {
  logger;
  retryMax = 0;
  driver;
  siteInfo;
  account;
  constructor(retryCnt, siteInfo, aca) {
    this.logger = global.log;
    this.retryMax = retryCnt ? retryCnt : 1;
    this.siteInfo = siteInfo;
    this.account = aca;
    this.logger.info("base constructor");
  }
  async webDriver() {
    return await initBrowserDriver();
  }
  async main() {
    this.logger.info("BaseExecuter", "start");
    for (let i = 0; i < this.retryMax; i++) {
      try {
        if (!this.driver) {
          this.driver = await this.webDriver();
        }
        await this.exec();
      } catch (e) {
        this.logger.info(e);
        await this.driver.quit();
        this.driver = null;
      } finally {
        if (this.driver) {
          await this.driver.quit();
          this.driver = null;
        }
      }
    }
  }
  isExistEle(selector, showFlag) {
    let register = By.css(selector);
    let is = isExistEle(this.driver.findElements(register));
  }
  logInfo(...a) {
    this.logger.info(a);
  }

  sleep(time) {
    return util.sleep(time);
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve();
    //   }, time);
    // });
  }
}
exports.BaseExecuter = BaseExecuter;
