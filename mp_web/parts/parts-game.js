const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsGame extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doKokuhaku(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#status_1>span",
        "",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "あと(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1]) limit = Number(matches[1]);
      }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        for (let i = 0; i < 2; i++) {
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 2000);
            await this.backNowMissionPage(gameUrlHost);
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          // 勝手に動く
          await this.sleep(10000);
          if (await this.isExistEle(se[2], true, 3000)) {
            let el = await this.getEle(se[2], 3000);
            await this.clickEle(el, 2000); // トップへ
            await this.backNowMissionPage(gameUrlHost);
          }
        }
      }
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "あと(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doYuusya(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#status_1>span",
        "",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "あと(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1]) limit = Number(matches[1]);
      }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        for (let i = 0; i < 2; i++) {
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 2000);
            await this.backNowMissionPage(gameUrlHost);
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          // 勝手に動く
          await this.sleep(20000);
          if (await this.isExistEle(se[2], true, 3000)) {
            let el = await this.getEle(se[2], 3000);
            await this.clickEle(el, 2000); // トップへ
            await this.backNowMissionPage(gameUrlHost);
          }
        }
      }
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "あと(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doDokomade(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='ボタン']",
        "div.game-buttons>img",
        "img[alt='進む']", // 2
        "#status_1>span",
        "",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1]) limit = Number(matches[1]);
      // }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 7000);
            await this.backNowMissionPage(gameUrlHost);
            if (await this.isExistEle(se[2], true, 2000)) {
              let el = await this.getEle(se[2], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000);
              await this.backNowMissionPage(gameUrlHost);
              if (await this.isExistEle(se[0], true, 2000)) {
                let el = await this.getEle(se[0], 3000);
                await driver.wait(until.elementIsVisible(el), 5000);
                await this.clickEle(el, 2000);
                await this.backNowMissionPage(gameUrlHost);
              }
            }
          } else break;
        }
      }
      res = D.STATUS.DONE;
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      // }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doTrain(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='ボタン']",
        "div.game-buttons>img",
        "img[alt='進む']", // 2
        "#status_1>span",
        "",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1]) limit = Number(matches[1]);
      // }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 7000);
            await this.backNowMissionPage(gameUrlHost);
            await this.sleep(5000);
            if (await this.isExistEle(se[0], true, 2000)) {
              let el = await this.getEle(se[0], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000);
              await this.backNowMissionPage(gameUrlHost);
            }
          } else break;
        }
      }
      res = D.STATUS.DONE;
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      // }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doEgg(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='ボタン']",
        "div.game-buttons[style='display: block;']>img",
        "img[alt='進む']", // 2
        "#status_1>span",
        "img[alt='獲得した報酬をゲットする']",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1]) limit = Number(matches[1]);
      // }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await driver.wait(until.elementIsVisible(els[0]), 5000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 3000);
            await this.backNowMissionPage(gameUrlHost);
            await this.sleep(10000);
            for (let seButton of [se[2], se[4]]) {
              if (await this.isExistEle(seButton, true, 3000)) {
                let el = await this.getEle(seButton, 2000);
                if (await el.isDisplayed()) {
                  await driver.wait(until.elementIsVisible(el), 10000);
                  await this.clickEle(el, 3000);
                  await this.backNowMissionPage(gameUrlHost);
                }
              }
            }
            if (await this.isExistEle(se[0], true, 2000)) {
              let el = await this.getEle(se[0], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000);
              await this.backNowMissionPage(gameUrlHost);
            }
          } else break;
        }
      }
      res = D.STATUS.DONE;
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      // }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doTenki(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='ボタン']",
        "div.game-cards[style='display: block;']>img",
        "img[alt='進む']", // 2
        "#status_1>span",
        "img[alt='獲得した報酬をゲットする']",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1]) limit = Number(matches[1]);
      // }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await driver.wait(until.elementIsVisible(els[0]), 5000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 3000);
            await this.backNowMissionPage(gameUrlHost);
            await this.sleep(10000);
            for (let seButton of [se[2], se[4]]) {
              if (await this.isExistEle(seButton, true, 3000)) {
                let el = await this.getEle(seButton, 2000);
                if (await el.isDisplayed()) {
                  await driver.wait(until.elementIsVisible(el), 10000);
                  await this.clickEle(el, 3000);
                  await this.backNowMissionPage(gameUrlHost);
                }
              }
            }
            if (await this.isExistEle(se[0], true, 2000)) {
              let el = await this.getEle(se[0], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000);
              await this.backNowMissionPage(gameUrlHost);
            }
          } else break;
        }
      }
      res = D.STATUS.DONE;
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      // }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
  async doHighLow(wid) {
    // pc版（gpo）はロードできないときもあり、あたりを引く確率が低いので後回し。
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='ボタン']",
        "div.game-buttons[style='display: block;']>img",
        "img[alt='進む']", // 2
        "#status_1>span",
        "img[alt='獲得した報酬をゲットする']",
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // 基本は
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1]) limit = Number(matches[1]);
      // }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);

          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await driver.wait(until.elementIsVisible(els[0]), 5000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 3000);
            await this.backNowMissionPage(gameUrlHost);
            await this.sleep(10000);
            for (let seButton of [se[2], se[4]]) {
              if (await this.isExistEle(seButton, true, 3000)) {
                let el = await this.getEle(seButton, 2000);
                if (await el.isDisplayed()) {
                  await driver.wait(until.elementIsVisible(el), 10000);
                  await this.clickEle(el, 3000);
                  await this.backNowMissionPage(gameUrlHost);
                }
              }
            }
            if (await this.isExistEle(se[0], true, 2000)) {
              let el = await this.getEle(se[0], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000);
              await this.backNowMissionPage(gameUrlHost);
            }
          } else break;
        }
      }
      res = D.STATUS.DONE;
      // if (await this.isExistEle(se[3], true, 2000)) {
      //   let el = await this.getEle(se[3], 3000);
      //   let text = await el.getText();
      //   let regex = "あと(\\d+)回*";
      //   let matches = text.match(regex);
      //   if (matches[1] && matches[1] == "0") res = D.STATUS.DONE;
      // }
    } catch (e) {
      logger.warn(e);
    } finally {
      if (wid) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
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
      if (this.isMob) sele[5] = "#mode_bar a[href='/minigame']";
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
  async backNowMissionPage(gameUrlHost) {
    let currentUrl = await this.driver.getCurrentUrl();
    if (currentUrl.indexOf(gameUrlHost) === -1) {
      await this.driver.navigate().back();
      await this.sleep(1000);
      for (let k = 0; k < 8; k++) {
        currentUrl = await this.driver.getCurrentUrl();
        if (currentUrl.indexOf(gameUrlHost) === -1) {
          await this.driver.navigate().back(); // 広告をクリックしたぽいので戻る
          await this.sleep(2000);
          this.logger.info("広告をクリックさせられたのでbackします");
        } else break;
      }
    }
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
exports.PartsGame = PartsGame;
