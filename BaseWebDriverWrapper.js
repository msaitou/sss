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
  logInfo(...a) {
    (this ? this.logger : global.log).info(a);
  }
  logWarn(...a) {
    (this ? this.logger : global.log).warn(a);
  }
  logDebug(...a) {
    (this ? this.logger : global.log).debug(a);
  }
  async findElements(cssSele) {
    return await this.driver.findElements(By.css(cssSele));
  }
  async sleep(time) {
    await util.sleep(time);
  }
}
exports.BaseWebDriverWrapper = BaseWebDriverWrapper;
