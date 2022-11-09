const { initBrowserDriver, db } = require("../initter.js");
const { libUtil: util, libUtil } = require("../lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");

class BaseExecuter extends BaseWebDriverWrapper {
  logger;
  retryMax = 0;
  siteInfo;
  account;
  constructor(retryCnt, siteInfo, aca) {
    super();
    this.logger = global.log;
    this.retryMax = retryCnt ? retryCnt : 1;
    this.siteInfo = siteInfo;
    this.account = aca;
    this.logger.info("base constructor");
  }
  async main() {
    this.logger.info("BaseExecuter", "start");
    for (let i = 0; i < this.retryMax; i++) {
      try {
        if (!this.getDriver()) {
          // let driver = await this.webDriver();
          this.setDriver(await this.webDriver());
        }
        await this.exec();
      } catch (e) {
        this.logger.info(e);
        await this.quitDriver();
      } finally {
        await this.quitDriver();
        // this.driver.kill();
      }
    }
  }
  // UTLのソース↓
  // 取得結果をDBに書き込み
  async updateLutl(cond, doc) {
    let rec = await db("life_util", "update", cond, doc);
    this.logger.info("update!!!");
  }
  // UTLのソース↓
  // 単位付きのサイズ数の文字列を数値だけ抽出
  getNumSize(pureText) {
    let text = pureText.trim();
    let num = pureText;
    ["GB", "MB"].some((unit) => {
      if (text.indexOf(unit) > -1) {
        num = text.replace(unit, "");
        return true;
      }
    });
    return Number(num.trim());
  }
}
exports.BaseExecuter = BaseExecuter;
