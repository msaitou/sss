const { initBrowserDriver, db } = require("./initter.js");
const { libUtil: util, libUtil } = require("./lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");

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
      return await ele.findElements(By.css(sele));
    } catch (e) {
      this.logger.warn(e);
    }
  }
  /**
   * 要素をクリックして指定時間寝る
   * @param {*} ele
   * @param {*} time
   */
  async clickEle(ele, time) {
    let rect = await ele.getRect();
    this.logger.info("rect.y", rect.y);
    await this.driver.executeScript(`window.scrollTo(0, ${rect.y});`);
    // await this.driver.executeScript("arguments[0].scrollIntoView(true);", ele);
    await this.sleep(1000);
    await this.driver.actions().scroll(0, 0, 5, 10, ele).perform();
    const actions = this.driver.actions();
    await actions.move({ origin: ele }).perform();
    await this.sleep(1000);
    await ele.click();
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
    await this.driver.switchTo().window(widSet[widSet.length-1]);
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
