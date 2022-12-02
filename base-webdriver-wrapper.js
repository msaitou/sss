const { initBrowserDriver, db } = require("./initter.js");
const { libUtil: util, libUtil } = require("./lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");

class BaseWebDriverWrapper {
  logger;
  driver;
  isMob;
  constructor(isMob) {
    this.logger = global.log;
    this.isMob = isMob;
    this.logger.info("base constructor");
  }
  async webDriver(isMob) {
    return await initBrowserDriver(isMob);
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
  async closeDriver() {
    try {
      await this.driver.close(); // このタブを閉じて
    } catch (e) {
      this.logger.warn(e);
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
  /**
   * 要素からcssセレクターで要素を検索して返す
   * @param {*} ele
   * @param {*} sele
   * @param {*} time
   * @returns
   */
  async getElesFromEle(ele, sele, time) {
    // try {
    //   if (!sele) throw "is not param[1]";
    //   time = time ? time : 0;
    //   return await ele.findElements(By.css(sele));
    // } catch (e) {
    //   this.logger.warn(e);
    // }
    if (!sele) throw "is not param[1]";
    return await this.getElesFromEleCommon(ele, By.css(sele), time);
  }
  /**
   * 要素からxpathで要素を検索して返す
   * @param {*} ele
   * @param {*} xP
   * @param {*} time
   * @returns
   */
  async getElesXFromEle(ele, xP, time) {
    if (!xP) throw "is not param[1]";
    return await this.getElesFromEleCommon(ele, By.xpath(xP), time);
  }
  /**
   *
   * @param {*} ele
   * @param {*} locator
   * @param {*} time
   * @returns
   */
  async getElesFromEleCommon(ele, locator, time) {
    try {
      if (!locator) throw "is not param[1]";
      time = time ? time : 0;
      return await ele.findElements(locator);
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async clickEleScrollWeak(ele, time, top, isEnter = false) {
    await this.clickEleCommon(ele, time, top, isEnter);
  }
  /**
   * 要素をクリックして指定時間寝る
   * @param {*} ele
   * @param {*} time
   */
  async clickEle(ele, time, top = 0, isEnter = false) {
    await this.clickEleCommon(ele, time, top, isEnter);
  }
  /**
   * 要素をクリックして指定時間寝る
   * @param {*} ele
   * @param {*} time
   */
  async clickEleCommon(ele, time, top, isEnter) {
    let rect = await ele.getRect();
    if (!top) top = 0;
    let y = rect.y - top;
    this.logger.info("rect.y", y);
    await this.driver.executeScript(`window.scrollTo(0, ${y});`);
    await this.sleep(1000);
    // if (!this.isMob) await this.driver.actions().scroll(0, 0, 5, 10, ele).perform();
    const actions = this.driver.actions();
    if (!this.isMob) await actions.move({ origin: ele }).perform();
    await this.sleep(1000);
    try {
      await this.driver.manage().setTimeouts({ pageLoad: 10000 });
      if (isEnter) await ele.sendKeys(Key.ENTER);
      else await ele.click();
    } catch (e) {
      if (e.name != "TimeoutError") {
        throw e;
      } else {
        await this.driver.navigate().refresh(); // 画面更新  しないとなにも起きない
      }
    } finally {
      await this.driver.manage().setTimeouts({ pageLoad: 300000 });
    }
    this.logger.debug("clicked");
    await this.sleep(time);
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
      this.logger.info(`sele[${sele}] showFlag[${showFlag}] elelen[${eles.length}]`);
      if (exception) {
        // throw exception;
        return false;
      } else if (showFlag && !!eles.length) {
        return true; // 見つけようと思って見つかった
      } else if (!showFlag && !eles.length) {
        return true; // 見つからないと思って見つからない
      } // else // 見つからないと思ったけど見つかった
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async isExistElesFromEle(ele, sele, showFlag, time) {
    try {
      if (!sele) throw "is not param[0]";
      showFlag = showFlag === void 0 ? true : showFlag;
      time = time ? time : 0;
      let eles, exception;
      try {
        eles = await ele.findElements(By.css(sele));
      } catch (e) {
        if (showFlag) exception = e;
        eles = [];
      }
      this.logger.info(`sele[${sele}] showFlag[${showFlag}] elelen[${eles.length}]`);
      if (exception) {
        // throw exception;
        return false;
      } else if (showFlag && !!eles.length) {
        return true; // 見つけようと思って見つかった
      } else if (!showFlag && !eles.length) {
        return true; // 見つからないと思って見つからない
      } // else // 見つからないと思ったけど見つかった
    } catch (e) {
      this.logger.warn(e);
    }
  }
  /**
   * 直前に開いたタブを閉じる
   * @param driver
   */
  async closeOtherWindow(driver) {
    let wid = await driver.getWindowHandle();
    let widSet = await driver.getAllWindowHandles();
    for (let id of widSet) {
      if (id != wid) {
        // 最後に格納したウインドウIDにスイッチして閉じる
        await driver.switchTo().window(id);
        await driver.close();
      }
    }
    // 元のウインドウIDにスイッチ
    await driver.switchTo().window(wid);
  }
  async changeWindow(wid) {
    // 別タブに移動する
    let widSet = await this.driver.getAllWindowHandles();
    await this.driver.switchTo().window(widSet[widSet.length - 1]);
    // wid = wid | (await this.driver.getWindowHandle());
    // for (let id of widSet) {
    //   if (id != wid) {
    //     // 最後に格納したウインドウIDにスイッチして閉じる
    //     await this.driver.switchTo().window(id);
    //   }
    // }
  }

  /**
   * CMくじのページで最初に表示されることがあるアンケートに回答操作
   * @param {*} driver
   * @param {*} logger
   */
  async answerCMPreAnq() {
    let selePre = [
      "form[action='/cmd/profiledone']",
      "label[for='radio01'],label[for='radio02']", // 性別  非表示inputをクリックできない　！！
      "select[name='age']", // 年齢
      "select[name='pref']", // 都道府県
      "label[for='radio03'],label[for='radio04']", // 結婚
      "label[for='radio05'],label[for='radio06']", // 子供
      "button[type='submit']", // 回答を送る
    ];
    if (await this.isExistEle(selePre[0], true, 2000)) {
      let ele0,
        select,
        formEle = await this.getEle(selePre[0], 2000);
      if (await this.isExistElesFromEle(formEle, selePre[1], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[1], 2000);
        await this.clickEle(ele0[0], 2000); // 男性を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[2], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[2], 2000);
        select = new Select(ele0[0]);
        await select.selectByValue("38"); // 38歳を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[3], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[3], 2000);
        select = new Select(ele0[0]);
        await select.selectByValue("13"); // 東京を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[4], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[4], 2000);
        await this.clickEle(ele0[1], 2000); // 結婚　無を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[5], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[5], 2000);
        await this.clickEle(ele0[1], 2000); // 子供　無を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[6], true, 2000)) {
        ele0 = await this.getElesFromEle(formEle, selePre[6], 2000);
        await this.clickEle(ele0[0], 2000); // 回答を送る
      }
      this.logger.info("cm最初のアンケートに回答しました");
    } else this.logger.debug("cm最初のアンケートはありませんでした");
  }
  async openUrl(targetUrl) {
    let currentUrl = await this.driver.getCurrentUrl();
    if (currentUrl != targetUrl) {
      await this.driver.get(targetUrl); // 最初のページ表示
    }
  }
}
exports.BaseWebDriverWrapper = BaseWebDriverWrapper;
