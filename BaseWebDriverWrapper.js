const { initBrowserDriver, db } = require("./initter.js");
const { libUtil: util, libUtil } = require("./lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");

class BaseWebDriverWrapper {
  logger;
  driver;
  constructor() {
    this.logger = global.log;
    this.logger.info("base constructor");
  }
  async webDriver() {
    return await initBrowserDriver();
  }
  getDriver() {
    return this.driver;
  }
  setDriver(driver) {
    this.driver = driver;
  }
  async quitDriver() {
    if (this.getDriver()) {
      await this.driver.quit();
      this.setDriver(null);
    }
  }
  async findElements(cssSele) {
    return await this.driver.findElements(By.css(cssSele));
  }
  async sleep(time) {
    await util.sleep(time);
  }
  //
  async getEle(sele, time) {
    try {
      if (!sele) throw "is not param[0] is invalid";
      let eles = await this.getEles(sele, time);
      return eles[0];
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async getEles(sele, time) {
    try {
      if (!sele) throw "is not param[0]";
      time = time ? time : 0;
      return await this.driver.wait(until.elementsLocated(By.css(sele)), time);
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async getElesFromEle(ele, sele, time) {
    try {
      if (!sele) throw "is not param[1]";
      time = time ? time : 0;
      return await ele.findElements(By.css(sele), time);
    } catch (e) {
      this.logger.warn(e);
    }
  }

  async isExistEle(sele, showFlag, time) {
    try {
      if (!sele) throw "is not param[0]";
      showFlag = showFlag === void 0 ? true : showFlag;
      time = time ? time : 0;
      let eles, exception;
      try {
        eles = await this.driver.wait(until.elementsLocated(By.css(sele)), time);
      } catch (e) {
        if (showFlag) exception = e;
        eles = [];
      }
      this.logger.info(`showFlag[${showFlag}] elelen[${eles.length}]`);
      if (exception) {
        throw exception;
      } else if (showFlag && !!eles.length) {
        return true; // 見つけようと思って見つかった
      } else if (!showFlag && !eles.length) {
        return true; // 見つからないと思って見つからない
      } // else // 見つからないと思ったけど見つかった
    } catch (e) {
      this.logger.warn(e);
    }
  }
}
exports.BaseWebDriverWrapper = BaseWebDriverWrapper;
