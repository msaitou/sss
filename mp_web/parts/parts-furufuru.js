const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsFurufuru extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doFuru(gameUrlHost, wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "#start_btn",
        "#main_column #item",
        "#main_column #item>div", // 2
        "#finish>a[href='result']",
        "#scoreboard>a[href*='/top']", // 4
        "#getpoint>a",
      ];
      // await this.openUrl(`${gameUrlHost}drop/practice/top`); // todo 練習用
      await this.ignoreKoukoku();
      await this.getPoint();
      for (let i = 0; i < 3; i++) {
        // スコアボード後、ここに戻る　２時間毎に３回チャレンジ可
        if (await this.isExistEle(sele[0], true, 2000)) {
          let wid2 = await driver.getWindowHandle();
          let ele = await this.getEles(sele[0], 3000);
          await this.clickEle(ele[0], 2000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let ele = await this.getEle(sele[1], 3000);
            let rect = await ele.getRect();
            let eleScope = {
              xStart: rect.x + 150,
              xEnd: rect.x + rect.width - 150,
              yStart: rect.y + 110,
              yEnd: rect.y + rect.height - 70,
            };
            for (;;) {
              if (await this.isExistEle(sele[2], true, 2000)) {
                // sele[1]のleft,topからright,bottomの間で、ランダムで
                let x = libUtil.getRandomInt(eleScope.xStart, eleScope.xEnd);
                let y = libUtil.getRandomInt(eleScope.yStart, eleScope.yEnd);
                logger.info(x, y);
                const actions = driver.actions();
                actions.move({ x: x, y: y }).click().perform();
                x = libUtil.getRandomInt(eleScope.xStart, eleScope.xEnd);
                actions.move({ x: x, y: y }).click().perform();
              } else break;
            }
          }
          await this.closeElesWindow([wid, wid2]);
          let currentUrl = await driver.getCurrentUrl();
          if (currentUrl.indexOf(gameUrlHost) === -1) {
            await driver.navigate().back();
            await this.sleep(1000);
            currentUrl = await driver.getCurrentUrl();
            // 2回くらい戻る必要あり
            if (currentUrl.indexOf(gameUrlHost) === -1) {
              await driver.navigate().back();
              await this.sleep(1000);
            }
            if (await this.isExistEle(sele[4], true, 2000)) {
              let ele = await this.getEle(sele[4], 3000);
              await this.clickEle(ele, 2000);
              await this.ignoreKoukoku();
            }
          } else if (await this.isExistEle(sele[3], true, 2000)) {
            let ele = await this.getEle(sele[3], 3000);
            await this.clickEle(ele, 2000);
            await this.ignoreKoukoku();
            if (await this.isExistEle(sele[4], true, 2000)) {
              let ele = await this.getEle(sele[4], 3000);
              await this.clickEle(ele, 2000);
              await this.ignoreKoukoku();
            }
          }
          res = D.STATUS.DONE;
        } else {
          res = D.STATUS.DONE;
          break;
        } 
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
    return res;
  }
  async getPoint() {
    let sele = ["#getpoint>a"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 2000);
    }
  }
  async doSearch(gameUrlHost, wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "a[href='/minigame/play']",
        "#box li[data-stat]>a>img",
        "#minigame_end a[href='/minigame']", // 2
        "img[src*='check_on.png']",
        "#scoreboard>a[href*='/top']", // 4
        "#menu a[href='/minigame']",
      ];
      await this.ignoreKoukoku();
      await this.getPoint();
      // 3回やってるんだったら終わり
      if (await this.isExistEle(sele[3], true, 2000)) {
        return D.STATUS.DONE;
      }
      if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
        await this.ignoreKoukoku();
      }
      for (let i = 0; i < 3; i++) {
        // スコアボード後、ここに戻る　２時間毎に３回チャレンジ可
        if (await this.isExistEle(sele[0], true, 2000)) {
          let wid2 = await driver.getWindowHandle();
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length * 2; // 最大でも
            for (let i = 0; i < limit; i++) {
              if (i != 0)
                if (await this.isExistEle(sele[1], true, 2000)) {
                  eles = await this.getEles(sele[1], 3000);
                } else break;
              await this.ignoreKoukoku();
              await this.clickEle(eles[0], 2000);
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 3000);
                await this.clickEle(ele, 2000);
              }
            }
          }
          await this.closeElesWindow([wid, wid2]);
          res = D.STATUS.DONE;
        } else break;
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
    return res;
  }
  async ignoreKoukoku() {
    let currentUrl = await this.driver.getCurrentUrl();
    // 広告が画面いっぱいに入る時がある
    if (currentUrl.indexOf("google_vignette") > -1) {
      // await driver.actions().sendKeys(Key.ESCAPE).perform();
      // await this.sleep(2000);
      await this.driver.navigate().back(); // 戻って
      await this.driver.navigate().forward(); // 行く
      currentUrl = await this.driver.getCurrentUrl();
    }
    return currentUrl;
  }
  async hideOverlay() {
    let seleOver = ["div.overlay-item a.button-close"];
    if (await this.isExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
}
exports.PartsFurufuru = PartsFurufuru;
