const { initBrowserDriver, db } = require("./initter.js");
const { libUtil: util, libUtil } = require("./lib/util.js");
const { Builder, By, until } = require("selenium-webdriver");

// driverのインスタンス生成
// インスタンス終了

// 例外キャッチ
// リトライ管理
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
  // async main() {
  //   this.logger.info("BaseWebDriverWrapper", "start");
  //     try {
  //       if (!this.driver) {
  //         this.driver = await this.webDriver();
  //       }
  //       await this.exec();
  //     } catch (e) {
  //       this.logInfo(e);
  //       await this.driver.quit();
  //       this.driver = null;
  //     } finally {
  //       if (this.driver) {
  //         await this.driver.quit();
  //         this.driver = null;
  //         // this.driver.kill();
  //       }
  //     }
  // }
  // // 取得結果をDBに書き込み
  // async updateLutl(cond, doc) {
  //   let rec = await db("life_util", "update", cond, doc);
  //   this.logInfo("update!!!", rec);
  // }
  // // 単位付きのサイズ数の文字列を数値だけ抽出
  // getNumSize(pureText) {
  //   let text = pureText.trim();
  //   let num = pureText;
  //   ["GB", "MB"].some((unit) => {
  //     if (text.indexOf(unit) > -1) {
  //       num = text.replace(unit, "");
  //       return true;
  //     }
  //   });
  //   return Number(num.trim());
  // }

  // // TODO 多分もう一つ親クラス作ってそこに実装がいいかも
  // async getEle(sele, i, time) {
  //   try {
  //     if (!sele || !libUtil.isZeroOver(i)) throw "is not param[0] or param[1] is invalid";
  //     let eles = await this.getEles(sele, time);
  //     return eles[i];
  //   } catch (e) {
  //     this.logWarn(e);
  //   }
  // }
  // async getEles(sele, time) {
  //   try {
  //     if (!sele) throw "is not param[0]";
  //     time = time ? time : 0;
  //     return await this.driver.wait(until.elementsLocated(By.css(sele)), time);
  //   } catch (e) {
  //     this.logWarn(e);
  //   }
  // }
  // async getElesFromEle(ele, sele, time) {
  //   try {
  //     if (!sele) throw "is not param[1]";
  //     time = time ? time : 0;
  //     return await ele.findElements(By.css(sele), time);
  //   } catch (e) {
  //     this.logWarn(e);
  //   }
  // }

  // async isExistEle(sele, showFlag, time) {
  //   try {
  //     if (!sele) throw "is not param[0]";
  //     showFlag = showFlag === void 0 ? true : false;
  //     time = time ? time : 0;
  //     // let register = By.css(selector);
  //     // let is = isExistEle(this.driver.findElements(register));
  //     var eles = await this.driver.wait(until.elementsLocated(By.css(sele)), time);
  //     this.logInfo(`showFlag[${showFlag}] elelen[${eles.length}]`);
  //     if (showFlag && !!eles.length) {
  //       return true;
  //     } else if (!showFlag && !eles.length) {
  //       return true;
  //     }
  //   } catch (e) {
  //     this.logWarn(e);
  //   }
  // }
  logInfo(...a) {
    this.logger.info(a);
  }
  logWarn(...a) {
    this.logger.warn(a);
  }

  async sleep(time) {
    return await util.sleep(time);
  }
}
exports.BaseWebDriverWrapper = BaseWebDriverWrapper;
