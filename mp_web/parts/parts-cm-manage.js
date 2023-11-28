const { BaseExecuter } = require("../base-executer.js");
const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../../com_cls/define").Def;
const mailOpe = require("../../mp_mil/mail_operate");

class PartsCmManage extends BaseExecuter {
  para;
  code;
  cmMissionList;
  startUrl;
  constructor(para, cmMissionList, startUrl) {
    super(para.retryCnt, para.siteInfo, para.account, para.isMob);
    this.para = para;
    this.code = para.siteInfo.code;
    this.cmMissionList = cmMissionList;
    this.startUrl = startUrl;
    this.setDriver(para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.answerCMPreAnq(driver, logger);
    for (let mission of this.cmMissionList) {
      let execCls = null;
      if (!this.getDriver()) {
        this.setDriver(await this.webDriver(this.isMob));
        this.para.driver = this.driver;
      }
      // 個別
      switch (mission.main) {
        case D.MISSION.CM_DOTTI:
          execCls = new CmDotti(this.para, this.startUrl);
          break;
        case D.MISSION.CM_KENTEI:
          execCls = new CmKentei(this.para, this.startUrl);
          break;
        case D.MISSION.CM_URANAI:
          execCls = new CmUranai(this.para, this.startUrl);
          break;
        case D.MISSION.CM_POCHI:
          execCls = new CmPochi(this.para, this.startUrl);
          break;
        case D.MISSION.CM_COLUM:
          execCls = new CmColum(this.para, this.startUrl);
          break;
        case D.MISSION.CM_PHOTO:
          execCls = new CmPhoto(this.para, this.startUrl);
          break;
        case D.MISSION.CM_SITE:
          execCls = new CmSite(this.para, this.startUrl);
          break;
        case D.MISSION.CM_ZUKAN:
          execCls = new CmZukan(this.para, this.startUrl);
          break;
        case D.MISSION.CM_JAPAN:
          execCls = new CmJapan(this.para, this.startUrl);
          break;
        case D.MISSION.CM_COOK:
          execCls = new CmCook(this.para, this.startUrl);
          break;
        case D.MISSION.CM_GAME_FURUFURU:
          execCls = new CmGameFurufuru(this.para, this.startUrl);
          break;
        case D.MISSION.CM_GAME_FURUFURU_SEARCH:
          execCls = new CmGameFurufuruSearch(this.para, this.startUrl);
          break;
        // case "偉人":
        //   res = await AnkPark.doIjin();
        //   break;
        // case "漫画":
        //   res = await AnkPark.doManga();
        //   break;
        // case "ひらめき":
        //   res = await AnkPark.doHirameki();
        //   break;
      }
      if (execCls) {
        this.logger.info(`${mission.main} 開始--`);
        let res = await execCls.do();
        this.logger.info(`${mission.main} 終了--`);
        await this.updateMissionQue(mission, res, this.code);
      }
    }
    if (!this.isMob) {
      // CMコインを換金
      await this.openUrl(this.startUrl); // 操作ページ表示
      let sele = ["a[href='/bankbook/']", "a.button-link.btn>p", "a[href='/bankbook/exchange']>p"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        await this.ignoreKoukoku();
        if (await this.isExistEle(sele[1], true, 2000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[2], true, 2000)) {
            ele = await this.getEle(sele[2], 3000);
            await this.clickEle(ele, 2000);
          }
        }
      }
    } else {
      // CMコインを換金
      await this.openUrl(this.startUrl); // 操作ページ表示
      let sele = [
        "div.js-infolink",
        "a[href='/bankbook/']",
        "a[data-remodal-target='bankbookmodal']",
        "a[href='/bankbook/exchange']",
      ];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        if (await this.isExistEle(sele[1], true, 2000)) {
          ele = await this.getEle(sele[1], 3000);
          if (await ele.isDisplayed()) {
            await this.clickEle(ele, 2000);
            await this.ignoreKoukoku();
            if (await this.isExistEle(sele[2], true, 2000)) {
              ele = await this.getEle(sele[2], 3000);
              await this.clickEle(ele, 2000);
              if (await this.isExistEle(sele[3], true, 2000)) {
                ele = await this.getEle(sele[3], 3000);
                await this.clickEle(ele, 2000);
              }
            }
          }
        }
      }
    }
  }
}
class CmSuper extends BaseWebDriverWrapper {
  para;
  startUrl;
  constructor(para, startUrl) {
    super(para.isMob);
    this.para = para;
    this.startUrl = startUrl;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = [
      "#pfx_interstitial_close",
      // "#inter-close",
      "a.gmoam_close_button",
      // "div.overlay-item a.button-close"
    ];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe']"];
        if (await this.isExistEle(iSele[0], true, 3000)) {
          await this.driver.executeScript(`document.querySelector("${iSele[0]}").remove();`);
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
// クマクマどっち
class CmDotti extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let res = D.STATUS.FAIL;
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [
        "img[src*='dotti2_pc']",
        "p.btn_pink>a",
        "a[href='/top']", //2
        "div.listbox>a",
        "div.btn_send#bbb2>a>p",
        "div.white-line>label", //5
        "#bbb>div.btn_send>a>p",
        "#aaa>div.btn_send>a>p", //7
        "div.btn_send>a[href='/p/ex']",
        "a[href='/']",
      ];
      if (this.isMob) sele[0] = "img[src*='dotti2_sp']";
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        await this.hideOverlay();
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            // 3種各10問の計30問
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let j = 0; j < limit; j++) {
              if (j !== 0 && (await this.isExistEle(sele[1], true, 3000))) {
                eles = await this.getEles(sele[1], 3000);
              }
              await this.hideOverlay();
              await this.clickEle(eles[j], 2000); // ゆるめ、かため、究極のいずれかから進む
              let currentUrl = await this.ignoreKoukoku(); // 広告が画面いっぱいに入る時がある
              if (currentUrl.substr(-2) == "/n") {
                // 獲得してないシールがある場合
                if (await this.isExistEle(sele[1], true, 3000)) {
                  ele = await this.getEle(sele[1], 3000);
                  await this.clickEle(ele, 2000); // 獲得
                  if (await this.isExistEle(sele[2], true, 3000)) {
                    ele = await this.getEle(sele[2], 3000);
                    await this.clickEle(ele, 2000); // topへ（この質問種類の一覧へ）
                  }
                }
              }
              for (let i = 0; i < 10; i++) {
                await this.hideOverlay();
                if (await this.isExistEle(sele[3], true, 3000)) {
                  eles = await this.getEles(sele[3], 3000);
                  // clickして質問を選び、次へ　10問ある
                  await driver.wait(until.elementIsVisible(eles[0]), 15000);
                  await this.clickEle(eles[0], 2000); // 一番上を選択
                  if (await this.isExistEle(sele[4], true, 3000)) {
                    ele = await this.getEle(sele[4], 3000);
                    await driver.wait(until.elementIsVisible(ele), 15000);
                    await this.hideOverlay();
                    await this.clickEle(ele, 2000); // 次へ
                    if (await this.isExistEle(sele[5], true, 3000)) {
                      eles = await this.getEles(sele[5], 3000);
                      let choiceNum = libUtil.getRandomInt(0, eles.length);
                      await driver.wait(until.elementIsVisible(eles[choiceNum]), 15000);
                      await this.clickEle(eles[choiceNum], 2000);
                      if (await this.isExistEle(sele[6], true, 3000)) {
                        ele = await this.getEle(sele[6], 3000);
                        await this.clickEle(ele, 5000); // 次へ（回答する）
                        if (await this.isExistEle(sele[7], true, 3000)) {
                          ele = await this.getEle(sele[7], 4000);
                          await driver.wait(until.elementIsEnabled(ele), 15000);
                          await this.clickEle(ele, 4000); // シールを獲得
                          if (await this.isExistEle(sele[2], true, 3000)) {
                            ele = await this.getEle(sele[2], 3000);
                            await this.clickEle(ele, 2000); // topへ（この質問種類の一覧へ）
                            await this.exchangeDotti(sele);
                          }
                        }
                      }
                    }
                  }
                } else {
                  await this.hideOverlay();
                  if (await this.isExistEle(sele[9], true, 3000)) {
                    ele = await this.getEle(sele[9], 1000);
                    await this.clickEle(ele, 2000); // 大元に戻る
                  }
                  break;
                }
              }
              await this.exchangeDotti(sele);
            }
            res = D.STATUS.DONE;
          }
          logger.info(`${this.constructor.name} END`);
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }

  async exchangeDotti(sele) {
    let currentUrl = await this.driver.getCurrentUrl();
    if (currentUrl.substr(-2) == "/p") {
      // 獲得してないシールがある場合
      if (await this.isExistEle(sele[8], true, 3000)) {
        let ele = await this.getEle(sele[8], 3000);
        await this.clickEle(ele, 2000); // 獲得
        if (await this.isExistEle(sele[2], true, 3000)) {
          ele = await this.getEle(sele[2], 3000);
          await this.clickEle(ele, 2000); // topへ（この質問種類の一覧へ）
        }
        if (await this.isExistEle(sele[9], true, 3000)) {
          ele = await this.getEle(sele[9], 3000);
          await this.clickEle(ele, 2000); // topへ（この質問種類の一覧へ）
        }
      }
    }
  }
}
// ご当地検定
class CmKentei extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [
        "img[src*='gotochi_pc']",
        "div>a[name='start button']",
        "span.answer-select",
        "div.li_jyouhou img",
        "img#answer-button",
        "img.change-image",
      ];
      if (this.isMob) sele[0] = "img[src*='gotochi_sp']";
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        await this.hideOverlay();
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            ele = await this.getEle(sele[1], 3000);
            await this.clickEle(ele, 2000, 0, this.isMob);
            await this.ignoreKoukoku();
            await this.hideOverlay();
            if (await this.isExistEle(sele[1], true, 3000)) {
              ele = await this.getEle(sele[1], 3000);
              await this.clickEle(ele, 2000, 0, this.isMob);
              // 12問
              for (let i = 0; i < 12; i++) {
                await this.ignoreKoukoku();
                await this.hideOverlay();
                if (await this.isExistEle(sele[2], true, 3000)) {
                  let answerList = [];
                  if (await this.isExistEle(sele[3], true, 3000)) {
                    ele = await this.getEle(sele[3], 3000);
                    await driver.wait(until.elementIsVisible(ele), 20000);
                    await this.clickEle(ele, 2000);
                    let wid2 = await driver.getWindowHandle();
                    await this.changeWindow(wid2); // 別タブに移動する
                    let sele2 = ["#news-more", "#PlagClose1", ".entry-content.cf p"];
                    if (await this.isExistEle(sele2[0], true, 3000)) {
                      ele = await this.getEle(sele2[0], 3000);
                      // let rect = await ele.getRect();
                      // logger.info("rect.y", rect.y);
                      await driver.executeScript("window.scrollTo(0, 1200);");
                      await this.sleep(1000);
                      await this.clickEle(ele, 2000);
                      if (await this.isExistEle(sele2[1], true, 3000)) {
                        ele = await this.getEle(sele2[1], 3000);
                        let nakedText = await ele.getText();
                        answerList = nakedText.split("\n").filter((l) => l.indexOf("A.") === 0);
                      }
                    } else if (await this.isExistEle(sele2[2], true, 3000)) {
                      let eles3 = await this.getEles(sele2[2], 3000);
                      let nakedText = "";
                      for (let ele of eles3) {
                        nakedText += (await ele.getText()) + "\n";
                      }
                      // let nakedText = await ele.getText();
                      answerList = nakedText.split("\n").filter((l) => l.indexOf("A.") === 0);
                    }
                    await this.closeDriver(); // このタブを閉じて
                    await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
                  }
                  let eles = await this.getEles(sele[2], 3000);
                  let choiceNum = libUtil.getRandomInt(0, eles.length); // ここヒント見れば答えがわかる
                  let choiceEle = eles[choiceNum];
                  if (answerList.length) {
                    let tmp = [];
                    answerList.forEach((a) => {
                      a = a.replace("A.", "");
                      tmp.push(a.trim());
                    });
                    for (let el of eles) {
                      let opt = await el.getText();
                      if (tmp.indexOf(opt.trim()) > -1) {
                        choiceEle = el;
                        break;
                      }
                    }
                  }
                  await driver.wait(until.elementIsVisible(choiceEle), 15000);
                  await this.clickEle(choiceEle, 2000); // 選択
                  if (await this.isExistEle(sele[4], true, 3000)) {
                    ele = await this.getEle(sele[4], 3000);
                    await this.clickEle(ele, 2000);
                    if (await this.isExistEle(sele[5], true, 3000)) {
                      ele = await this.getEle(sele[5], 3000);
                      await this.clickEle(ele, 2000);
                    }
                  }
                }
              }
              if (await this.isExistEle(sele[5], true, 3000)) {
                ele = await this.getEle(sele[5], 3000);
                await this.clickEle(ele, 2000);
                if (await this.isExistEle(sele[5], true, 3000)) {
                  ele = await this.getEle(sele[5], 3000);
                  await this.clickEle(ele, 2000);
                }
              }
            }
          }
          res = D.STATUS.DONE;
          logger.info(`${this.constructor.name} END`);
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
// 占い
class CmUranai extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = ["img[src*='kumakumaseiza_pc']"];
      if (this.isMob) sele[0] = "img[src*='kumakumaseiza_sp']";

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? 100 : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          let ura = new Uranai(this.para);
          res = await ura.do();
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// ぽちっと調査隊
class CmPochi extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [
        "img[src*='pochitto_pc']",
        "#question>dd>a>p",
        "div.btn_send>a>p", // 2
        "#questionbox>p",
        "#questionbox label", // 4
        "#aaa2>div.btn_send>a>p",
        "a[href='/point/ex']>p", // 6
        "a[href='/top']>p",
      ];
      if (this.isMob) (sele[0] = "img[src*='pochitto_sp']"), (sele[1] = "#question>dd>a"), (sele[5] = sele[2]);
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        await this.hideOverlay();
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let j = 0; j < limit; j++) {
              if (j !== 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              try {
                await driver.wait(until.elementIsVisible(eles[0]), 30000);
              } catch (e) {
                logger.warn(e);
              }
              await this.hideOverlay();
              await this.clickEle(eles[0], 2000); // 常に0番目で
              await this.ignoreKoukoku();
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 3000);
                await this.clickEle(ele, 2000);
                // 7問
                for (let i = 0; i < 7; i++) {
                  if (await this.isExistEle(sele[3], true, 2000)) {
                    ele = await this.getEle(sele[3], 3000);
                    let q = await ele.getText();
                    logger.info(q);
                    let choiceNum = 0,
                      qNo = q.substr(0, 2);
                    switch (qNo) {
                      case "Q1": // Q1 あなたの性別をお答えください
                        choiceNum = 0;
                        break;
                      case "Q2": // Q2 あなたの年齢をお答えください
                        choiceNum = 2;
                        break;
                      case "Q3": // ランダムで。
                      case "Q4": // ランダムで。
                      case "Q5": // ランダムで。
                      case "Q6": // ランダムで。
                        choiceNum = -1; // 仮値
                        break;
                      case "Q7": // テキストエリアは空欄で
                        break;
                    }
                    if (qNo != "Q7") {
                      if (await this.isExistEle(sele[4], true, 2000)) {
                        eles = await this.getEles(sele[4], 3000);
                        if (choiceNum === -1) {
                          choiceNum = libUtil.getRandomInt(0, eles.length);
                        }
                        await this.clickEle(eles[choiceNum], 2000);
                        if (await this.isExistEle(sele[5], true, 2000)) {
                          ele = await this.getEle(sele[5], 3000);
                          await this.clickEle(ele, 2000);
                        }
                      }
                    } else {
                      for (let j = 0; j < 2; j++) {
                        if (await this.isExistEle(sele[2], true, 2000)) {
                          ele = await this.getEle(sele[2], 3000);
                          await this.clickEle(ele, 2000);
                        }
                      }
                    }
                  }
                }
              }
              // CMコインに変換
              let currentUrl = await driver.getCurrentUrl();
              if (currentUrl.indexOf("/stamp") > -1) {
                if (await this.isExistEle(sele[6], true, 2000)) {
                  ele = await this.getEle(sele[6], 3000);
                  await this.clickEle(ele, 2000);
                }
                // 一覧へ
                if (await this.isExistEle(sele[7], true, 2000)) {
                  ele = await this.getEle(sele[7], 3000);
                  await this.clickEle(ele, 2000);
                }
              }
            }
          }
          res = D.STATUS.DONE;
          logger.info(`${this.constructor.name} END`);
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
class Uranai extends CmSuper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = [
      "img[src*='kumakumaseiza_pc']",
      "img[src*='button_check.png']",
      "img[alt='次へ']",
      "img[alt='ラッキーシンボルへ']",
      "img[alt='次のページを確認する']",
      "img[alt='さらにラッキーシンボルを見る']",
      "input[src*='button_symbols.png']",
      "img[alt='進む']",
      "img[alt='ガチャを引くボタン']",
      "img[alt='閉じる']",
      "div[style='display: block;'] img[alt='進む']",
      "img[alt='占い終わり']",
    ];
    if (await this.isExistEle(sele[1], true, 3000)) {
      let ele = await this.getEle(sele[1], 3000);
      await this.clickEle(ele, 2000);
      await this.ignoreKoukoku();
      // await driver.wait(until.elementIsVisible(choiceEle), 15000);
      for (let i = 0; i < 3; i++) {
        if (await this.isExistEle(sele[2], true, 3000)) {
          ele = await this.getEle(sele[2], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      if (await this.isExistEle(sele[3], true, 3000)) {
        ele = await this.getEle(sele[3], 3000);
        await this.clickEle(ele, 2000);
        for (let j = 0; j < 2; j++) {
          if (await this.isExistEle(sele[4], true, 3000)) {
            ele = await this.getEle(sele[4], 3000);
            await this.clickEle(ele, 2000);
            if (await this.isExistEle(sele[5], true, 3000)) {
              ele = await this.getEle(sele[5], 3000);
              await this.clickEle(ele, 2000);
            }
          }
        }
        if (await this.isExistEle(sele[4], true, 3000)) {
          ele = await this.getEle(sele[4], 3000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[6], true, 3000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000);
            if (await this.isExistEle(sele[4], true, 3000)) {
              ele = await this.getEle(sele[4], 3000);
              await this.clickEle(ele, 2000);
              for (let k = 0; k < 2; k++) {
                if (await this.isExistEle(sele[2], true, 3000)) {
                  ele = await this.getEle(sele[2], 3000);
                  await this.clickEle(ele, 2000);
                }
              }
              if (await this.isExistEle(sele[7], true, 3000)) {
                ele = await this.getEle(sele[7], 3000);
                await this.clickEle(ele, 5000);
                if (await this.isExistEle(sele[8], true, 3000)) {
                  ele = await this.getEle(sele[8], 3000);
                  await this.clickEle(ele, 2000);
                  if (await this.isExistEle(sele[9], true, 3000)) {
                    ele = await this.getEle(sele[9], 3000);
                    // 時間かかりそう　TODO
                    await this.clickEle(ele, 2000);
                    if (await this.isExistEle(sele[10], true, 3000)) {
                      ele = await this.getEle(sele[10], 3000);
                      await this.clickEle(ele, 2000);
                      if (await this.isExistEle(sele[11], true, 3000)) {
                        ele = await this.getEle(sele[11], 3000);
                        await this.clickEle(ele, 2000);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      res = D.STATUS.DONE;
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
const { PartsAnkPark } = require("./parts-ank-park.js");
// ↓モバイルでしか利用できない系
// コラム
class CmColum extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='colum']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobColum();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 写真
class CmPhoto extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='photo']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobPhoto();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 観察
class CmSite extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='observation']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobSite();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 図鑑
class CmZukan extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='zoo']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobZukan();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver();
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 日本百景
class CmJapan extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='japan']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobJapan();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 料理
class CmCook extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日1回（0時～）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    logger.info(`${this.constructor.name} START`);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = [".o-content__boxlist img[src*='food']", "div.status>a:not(.answered)"];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? (siteInfo.code == D.CODE.PTO ? 500 : 100) : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        let AnkPark = new PartsAnkPark(this.para);
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i != 0 && (await this.isExistEle(sele[1], true, 3000))) eles = await this.getEles(sele[1], 3000);
              await this.hideOverlay();
              await this.clickEle(eles[eles.length - 1], 2000);
              res = await AnkPark.doMobCook();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          } else res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        } finally {
          await this.closeDriver(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
const { PartsFurufuru } = require("./parts-furufuru.js");
// ふるふる
class CmGameFurufuru extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = ["img[src*='game/furu']"];
      let dome = "";
      if (siteInfo.code == D.CODE.CMS) dome = "cmnwcmsite";
      if (siteInfo.code == D.CODE.LFM) dome = "cmnwlifemedia";
      let gameUrlHost = `https://${dome}.dropgame.jp/`;
      if (this.isMob) {
        gameUrlHost = `https://${dome}-sp.dropgame.jp/`;
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? 100 : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        res = await Furufuru.doFuru(gameUrlHost, wid);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
// ふるふるの探し
class CmGameFurufuruSearch extends CmSuper {
  constructor(para, startUrl) {
    super(para, startUrl);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    try {
      // 今のページが　cm/game/ページならこのページから始める
      await this.openUrl(this.startUrl); // 操作ページ表示
      await this.ignoreKoukoku();
      let sele = ["img[src*='game/furu']"];
      let dome = "";
      if (siteInfo.code == D.CODE.CMS) dome = "cmnwcmsite";
      if (siteInfo.code == D.CODE.LFM) dome = "cmnwlifemedia";
      let gameUrlHost = `https://${dome}.dropgame.jp/`;
      if (this.isMob) {
        gameUrlHost = `https://${dome}-sp.dropgame.jp/`;
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? 100 : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        res = await Furufuru.doSearch(gameUrlHost, wid);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}

exports.PartsCmManage = PartsCmManage;
exports.Uranai = Uranai;
