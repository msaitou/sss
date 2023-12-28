const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsGame extends BaseWebDriverWrapper {
  para;
  doMethod;
  constructor(para, mType = null) {
    super(para.isMob);
    this.para = para;
    this.doMethod = null;
    this.setDriver(this.para.driver);
    switch (mType) {
      case D.MISSION.MOLL_OTSUKAI:
      case D.MISSION.GAME_OTSUKAI:
        this.doMethod = this.doOtsukai;
        break;
      case D.MISSION.MOLL_COOK:
      case D.MISSION.GAME_COOK:
        this.doMethod = this.doCook;
        break;
      case D.MISSION.MOLL_FASHION:
      case D.MISSION.GAME_FASHION:
        this.doMethod = this.doFashion;
        break;
      case D.MISSION.GAME_MEISHO:
        this.doMethod = this.doMeisho;
        break;
      case D.MISSION.MOLL_OTE:
      case D.MISSION.GAME_OTE:
        this.doMethod = this.doOte;
        break;
      case D.MISSION.MOLL_DARUMA:
      case D.MISSION.GAME_DARUMA:
        this.doMethod = this.doDaruma;
        break;
      case D.MISSION.MOLL_KOKUHAKU:
        this.doMethod = this.doKokuhaku;
        break;
      case D.MISSION.MOLL_YUUSYA:
        this.doMethod = this.doYuusya;
        break;
      case D.MISSION.MOLL_TRAIN:
        this.doMethod = this.doTrain;
        break;
      case D.MISSION.MOLL_EGG:
        this.doMethod = this.doEgg;
        break;
      case D.MISSION.MOLL_HIGHLOW:
        this.doMethod = this.doHighLow;
        break;
      case D.MISSION.MOLL_TENKI:
        this.doMethod = this.doTenki;
        break;
      case D.MISSION.MOLL_DOKOMADE:
        this.doMethod = this.doDokomade;
        break;
    }
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
      let limit = 30; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
        for (let i = 0; i < 2; i++) {
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 1000);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          // 勝手に動く
          await this.sleep(10000);
          await this.hideOverlay();
          await this.sleep(5000);
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
      let limit = 30; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
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
          await this.hideOverlay();
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
      // await this.exeScriptNoTimeOut(`document.body.style.zoom='50%'`);
      // let ele = await this.getEle("body", 1000);
      // await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SUBTRACT).keyUp(Key.SUBTRACT).perform();
      // await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SUBTRACT).keyUp(Key.SUBTRACT).perform();
      // await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SUBTRACT).keyUp(Key.SUBTRACT).perform();
      // await driver.actions().keyDown(Key.CONTROL).sendKeys(ele, Key.SUBTRACT).keyUp(Key.CONTROL).perform();
      // await driver.actions().keyDown(Key.CONTROL).sendKeys(ele, Key.SUBTRACT).perform();
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
                await this.hideOverlay();
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
      let limit = 30; // 基本は
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
          await this.hideOverlay();
          await this.clickEle(el, 2000, 200);
          await this.backNowMissionPage(gameUrlHost);
          if (await this.isExistEle(se[1], true, 2000)) {
            let els = await this.getEles(se[1], 3000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 7000, 200);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
            await this.sleep(5000);
            if (await this.isExistEle(se[0], true, 2000)) {
              let el = await this.getEle(se[0], 3000);
              await driver.wait(until.elementIsVisible(el), 10000);
              await this.clickEle(el, 3000, 200);
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
            let waitEls = [];
            for (let seButton of [se[2], se[4]]) {
              if (await this.isExistEle(seButton, true, 3000)) {
                let el = await this.getEle(seButton, 2000);
                waitEls.push(el);
              }
            }
            try {
              await driver.wait(
                until.elementIsVisible(waitEls[0]) || waitEls[1] ? until.elementIsVisible(waitEls[1]) : null,
                10000
              );
            } catch (e) {
              this.logger.info("表示待ちのタイムアウト");
            }
            for (let button of waitEls) {
              if (await button.isDisplayed()) {
                await this.clickEle(button, 3000);
                await this.backNowMissionPage(gameUrlHost);
                break;
              }
            }
            await this.hideOverlay();
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
        // "div.game-cards[style='display: block;']>img",
        "div.game-card div.game-card-inner",
        "img[alt='進む']", // 2
        "#status_1>span",
        "img[alt='獲得した報酬をゲットする']",
      ];
      let limit = 20; // 基本は
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
            let waitEls = [];
            for (let seButton of [se[2], se[4]]) {
              if (await this.isExistEle(seButton, true, 3000)) {
                let el = await this.getEle(seButton, 2000);
                waitEls.push(el);
              }
            }
            try {
              await driver.wait(
                until.elementIsVisible(waitEls[0]) || waitEls[1] ? until.elementIsVisible(waitEls[1]) : null,
                10000
              );
            } catch (e) {
              this.logger.info("表示待ちのタイムアウト");
            }
            for (let button of waitEls) {
              if (await button.isDisplayed()) {
                await this.clickEle(button, 3000);
                await this.backNowMissionPage(gameUrlHost);
                break;
              }
            }
            await this.hideOverlay();
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
      let limit = 20; // 基本は
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await driver.wait(until.elementIsVisible(el), 5000);
          await this.clickEle(el, 2000);
          await this.backNowMissionPage(gameUrlHost);
          for (let k = 0; k < 5; k++) {
            if (await this.isExistEle(se[1], true, 2000)) {
              let els = await this.getEles(se[1], 3000);
              await driver.wait(until.elementIsVisible(els[0]), 5000);
              await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 3000);
              await this.backNowMissionPage(gameUrlHost);
              let waitEls = [];
              for (let seButton of [se[2], se[4]]) {
                if (await this.isExistEle(seButton, true, 3000)) {
                  let el = await this.getEle(seButton, 2000);
                  waitEls.push(el);
                }
              }
              try {
                await driver.wait(
                  until.elementIsVisible(waitEls[0]) || waitEls[1] ? until.elementIsVisible(waitEls[1]) : null,
                  10000
                );
              } catch (e) {
                this.logger.info("表示待ちのタイムアウト");
              }
              for (let button of waitEls) {
                if (await button.isDisplayed()) {
                  await this.clickEle(button, 3000);
                  await this.backNowMissionPage(gameUrlHost);
                  break;
                }
              }
            }
          }
          await this.hideOverlay();
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await driver.wait(until.elementIsVisible(el), 10000);
            await this.clickEle(el, 3000);
            await this.backNowMissionPage(gameUrlHost);
          }
        } else break;
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
  async doOtsukai(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#statustime_1>span",
        "div[id^=chara]>a>img", // 4
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          await this.hideOverlay();
          if (await this.isExistEle(se[4], true, 2000)) {
            let els = await this.getEles(se[4], 3000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
            if (await this.isExistEle(se[1], true, 2000)) {
              let el = await this.getEle(se[1], 3000);
              await this.clickEle(el, 100, 400);
              await this.backNowMissionPage(gameUrlHost);
              // 勝手に動く
              await this.sleep(10000);
              await this.hideOverlay();
              if (await this.isExistEle(se[2], true, 3000)) {
                let el = await this.getEle(se[2], 3000);
                await this.clickEle(el, 100, 400); // トップへ
                await this.backNowMissionPage(gameUrlHost);
              }
            }
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
  async doCook(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#status_1>span",
        "[id^=chara]>a>img", // 4
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          await this.hideOverlay();
          for (let k = 0; k < 2; k++) {
            if (!this.isMob && k == 1) se[4] = "#btn>a>img";
            else if (!this.isMob && k == 0) se[4] = "[id^=chara]>a>img";
            if (await this.isExistEle(se[4], true, 2000)) {
              let els = await this.getEles(se[4], 3000);
              await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 100, 400);
              await this.backNowMissionPage(gameUrlHost);
              await this.hideOverlay();
              if (await this.isExistEle(se[1], true, 2000)) {
                let el = await this.getEle(se[1], 3000);
                await this.clickEle(el, 100, 400);
                await this.backNowMissionPage(gameUrlHost);
                // 勝手に動く
                await this.sleep(10000);
                await this.hideOverlay();
              }
            }
          }
          if (await this.isExistEle(se[2], true, 3000)) {
            let el = await this.getEle(se[2], 3000);
            await this.clickEle(el, 100, 400); // トップへ
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
  async doFashion(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#status_1>span",
        "[id^=chara]>a>img", // 4
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
        if (await this.isExistEle(se[0], true, 2000)) {
          let el = await this.getEle(se[0], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          await this.hideOverlay();
          for (let j = 0; j < 2; j++) {
            if (await this.isExistEle(se[4], true, 2000)) {
              let els = await this.getEles(se[4], 3000);
              await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 100, 400);
              await this.backNowMissionPage(gameUrlHost);
              await this.hideOverlay();
            }
          }
          if (await this.isExistEle(se[1], true, 2000)) {
            let el = await this.getEle(se[1], 3000);
            await this.clickEle(el, 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            // 勝手に動く
            await this.sleep(10000);
            await this.hideOverlay();
            if (await this.isExistEle(se[2], true, 3000)) {
              let el = await this.getEle(se[2], 3000);
              await this.clickEle(el, 100, 400); // トップへ
              await this.backNowMissionPage(gameUrlHost);
            }
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
  async doMeisho(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "#startWrap img",
        "a>img[alt='トップへ戻る']", // 2
        "div.point>div>span",
        "[id^=chara]>a>img", // 4
        "input[alt='進む']",
        "#map", // 6
        "div[id^='button']",
        "a[href='finish.php']>img", // 8
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1]) limit = Number(matches[1]);
      }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        await this.hideOverlay();
        for (let j = 0; j < 3; j++) {
          if (await this.isExistEle(se[5], true, 2000)) {
            let el = await this.getEle(se[5], 3000);
            await this.clickEle(el, 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          await this.hideOverlay();
        }
        await this.exeScriptNoTimeOut(`document.querySelector("${se[6]}").remove();`);
        for (let j = 0; j < 1; j++) {
          if (await this.isExistEle(se[7], true, 2000)) {
            let els = await this.getEles(se[7], 3000);
            await this.clickEle(els[libUtil.getRandomInt(0, els.length)], 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
            if (await this.isExistEle(se[8], true, 2000)) {
              let el = await this.getEle(se[8], 3000);
              await this.exeScriptNoTimeOut(`document.querySelector("${se[8]}").click();`);
              await this.backNowMissionPage(gameUrlHost);
              await this.hideOverlay();
              for (let k = 0; k < 2; k++) {
                if (await this.isExistEle(se[5], true, 2000)) {
                  let el = await this.getEle(se[5], 3000);
                  await this.clickEle(el, 100, 400);
                  await this.backNowMissionPage(gameUrlHost);
                  await this.hideOverlay();
                }
              }
            }
          }
        }
      }

      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "(\\d+)回*";
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
  async doOte(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "a>img[alt='次へ']",
        "img[src*='btn_start']",
        "a>img[alt='トップへ戻る']", // 2
        "#statustime_1>span",
        "[id^=chara]>a>img", // 4
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
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
        await this.hideOverlay();
        for (let k = 0; k < 2; k++) {
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          // 勝手に動く
          await this.sleep(10000);
          await this.hideOverlay();
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
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
  async doDaruma(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let se = [
        "input[alt='進む']",
        "#startWrap img",
        "a>img[alt='トップへ戻る']", // 2
        "div.point>div>span",
        "[id^=chara]>a>img", // 4
        "#buttonRed",
        "#buttonBlue", // 6
        "div.blockBox",
        "a[href='finish.php']>img", // 8

        // "a>img[alt='次へ']",
        // "#startWrap img",
        // "a>img[alt='トップへ戻る']", // 2
        // "div.point>div>span",
        // "[id^=chara]>a>img", // 4
        // "input[alt='進む']",
        // "#map", // 6
        // "div[id^='button']",
        // "a[href='finish.php']>img", // 8
      ];
      // if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.ignoreKoukoku();
      let limit = 20; // なんか結構30多いので、基本は20
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "(\\d+)回*";
        let matches = text.match(regex);
        if (matches[1]) limit = Number(matches[1]);
      }
      let gameUrlHost = await driver.getCurrentUrl();
      gameUrlHost = gameUrlHost.substr(0, gameUrlHost.indexOf("/", 8));
      for (let j = 0; j < limit; j++) {
        logger.info(`${j}/${limit}回目-----------`);
        await this.hideOverlay();
        for (let k = 0; k < 3; k++) {
          if (await this.isExistEle(se[0], true, 2000)) {
            let el = await this.getEle(se[0], 3000);
            await this.clickEle(el, 100, 400);
            // await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
          }
        }
        if (await this.isExistEle(se[1], true, 2000)) {
          let el = await this.getEle(se[1], 3000);
          await this.clickEle(el, 100, 400);
          await this.backNowMissionPage(gameUrlHost);
          await this.hideOverlay();
          // await this.exeScriptNoTimeOut(`document.querySelector("${se[6]}").remove();`);
          let els = await this.getEles(se[7], 2000);
          for (let i = els.length - 1; i >= 0; i--) {
            let classTmp = await els[i].getAttribute("class");
            let regex = "blockBox box(\\d+)";
            let matches = classTmp.match(regex);
            let s = se[5];
            if (matches[1] == "2") {
              s = se[6];
            }
            if (await this.isExistEle(s, true, 2000)) {
              let el = await this.getEle(s, 3000);
              await this.clickEle(el, 100, 400);
              // await this.backNowMissionPage(gameUrlHost);
              // await this.hideOverlay();
            }
          }
          if (await this.isExistEle(se[8], true, 2000)) {
            let el = await this.getEle(se[8], 3000);
            await this.sleep(5000);
            await this.clickEle(el, 100, 400);
            await this.backNowMissionPage(gameUrlHost);
            await this.hideOverlay();
            for (let i = 0; i < 2; i++) {
              if (await this.isExistEle(se[0], true, 2000)) {
                let el = await this.getEle(se[0], 3000);
                await this.clickEle(el, 100, 400);
                await this.backNowMissionPage(gameUrlHost);
                await this.hideOverlay();
              }
            }
          }
        }
      }
      if (await this.isExistEle(se[3], true, 2000)) {
        let el = await this.getEle(se[3], 3000);
        let text = await el.getText();
        let regex = "(\\d+)回*";
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

  async hideOverlay() {
    let seleOver = [
      "div.overlay-item a.button-close",
      "#pfx_interstitial_close",
      // "#inter-close",
      "a.gmoam_close_button",
    ];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe']"];
        if (await this.isExistEle(iSele[0], true, 3000)) {
          await this.exeScriptNoTimeOut(`document.querySelectorAll("${iSele[0]}").forEach((e)=>{e.remove();});`);
          await this.exeScriptNoTimeOut(`document.querySelectorAll("${iSele[0]}").forEach((e)=>{e.remove();});`);
          // let iframe = await this.getEles(iSele[0], 1000);
          // await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
          // let inputEle = await this.getEle(s, 1000);
          // if (await inputEle.isDisplayed()) {
          //   await this.clickEle(inputEle, 2000, 0, true);
          // } else this.logger.debug("オーバーレイは表示されてないです");
          // // もとのフレームに戻す
          // await this.driver.switchTo().defaultContent();
        }
      } else if (await this.isExistEle(s, true, 3000)) {
        let ele = await this.getEle(s, 2000);
        if ((await ele.isDisplayed()) || (this.isMob && s == "#pfx_interstitial_close")) {
          if (["div.overlay-item a.button-close", "#pfx_interstitial_close"].indexOf(seleOver[0]) > -1) {
            await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
          } else await this.clickEle(ele, 2000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
  }
}
exports.PartsGame = PartsGame;
