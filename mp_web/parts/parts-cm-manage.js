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
    super(para.retryCnt, para.siteInfo, para.account);
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
      }
      if (execCls) {
        this.logger.info(`${mission.main} 開始--`);
        let res = await execCls.do();
        this.logger.info(`${mission.main} 終了--`);
        await this.updateMissionQue(mission, res, this.code);
      }
    }
    // CMコインを換金
    let currentUrl = await driver.getCurrentUrl();
    if (currentUrl != this.startUrl) {
      await driver.get(this.startUrl);
    }
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
}
class CmSuper extends BaseWebDriverWrapper {
  para;
  startUrl;
  constructor(para, startUrl) {
    super(para);
    this.para = para;
    this.startUrl = startUrl;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
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
      let currentUrl = await driver.getCurrentUrl();
      if (currentUrl != this.startUrl) {
        await driver.get(this.startUrl); // 最初のページ表示
      }
      let sele = [
        "img[src*='dotti2_pc']",
        "p.btn_pink>a",
        "a[href='/top']",
        "div.listbox>a",
        "div.btn_send#bbb2>a>p",
        "div.white-line>label",
        "#bbb>div.btn_send>a>p",
        "#aaa>div.btn_send>a>p",
        "div.btn_send>a[href='/p/ex']",
        "a[href='/']",
      ];

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            // 3種各10問の計30問
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let j = 0; j < limit; j++) {
              if (j !== 0 && (await this.isExistEle(sele[1], true, 3000))) {
                eles = await this.getEles(sele[1], 3000);
              }
              await this.clickEle(eles[j], 2000); // ゆるめ、かため、究極のいずれかから進む
              currentUrl = await this.ignoreKoukoku(); // 広告が画面いっぱいに入る時がある
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
                if (await this.isExistEle(sele[3], true, 3000)) {
                  eles = await this.getEles(sele[3], 3000);
                  // clickして質問を選び、次へ　10問ある
                  await driver.wait(until.elementIsVisible(eles[0]), 15000);
                  await this.clickEle(eles[0], 2000); // 一番上を選択
                  if (await this.isExistEle(sele[4], true, 3000)) {
                    ele = await this.getEle(sele[4], 3000);
                    await driver.wait(until.elementIsVisible(ele), 15000);
                    await this.clickEle(ele, 2000); // 次へ
                    if (await this.isExistEle(sele[5], true, 3000)) {
                      eles = await this.getEles(sele[5], 3000);
                      let choiceNum = libUtil.getRandomInt(0, eles.length);
                      await driver.wait(until.elementIsVisible(eles[choiceNum]), 15000);
                      await this.clickEle(eles[choiceNum], 2000);
                      if (await this.isExistEle(sele[6], true, 3000)) {
                        ele = await this.getEle(sele[6], 3000);
                        await this.clickEle(ele, 2000); // 次へ（回答する）
                        if (await this.isExistEle(sele[7], true, 3000)) {
                          ele = await this.getEle(sele[7], 4000);
                          await driver.wait(until.elementIsVisible(ele), 15000);
                          await this.clickEle(ele, 2000); // シールを獲得
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
                  if (await this.isExistEle(sele[9], true, 3000)) {
                    ele = await this.getEle(sele[9], 1000);
                    await this.clickEle(ele, 2000); // 大元に戻る
                  }
                  break;
                }
              }
              await this.exchangeDotti(sele);
            }
          }
          res = D.STATUS.DONE;
          logger.info(`${this.constructor.name} END`);
        } catch (e) {
          logger.warn(e);
        } finally {
          await driver.close(); // このタブを閉じて
          await driver.switchTo().window(wid);  // 元のウインドウIDにスイッチ
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
        if (await this.isExistEle(sele[2], true, 3000)) {
          ele = await this.getEle(sele[2], 3000);
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
      let currentUrl = await driver.getCurrentUrl();
      if (currentUrl != this.startUrl) {
        await driver.get(this.startUrl); // 最初のページ表示
      }
      let sele = [
        "img[src*='gotochi_pc']",
        "div>a[name='start button']",
        "span.answer-select",
        "div.li_jyouhou img",
        "img#answer-button",
        "img.change-image",
      ];

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            ele = await this.getEle(sele[1], 3000);
            await this.clickEle(ele, 2000);
            await this.ignoreKoukoku();
            if (await this.isExistEle(sele[1], true, 3000)) {
              ele = await this.getEle(sele[1], 3000);
              await this.clickEle(ele, 2000);
              // 12問
              for (let i = 0; i < 12; i++) {
                await this.ignoreKoukoku();
                if (await this.isExistEle(sele[2], true, 3000)) {
                  let answerList = [];
                  if (await this.isExistEle(sele[3], true, 3000)) {
                    ele = await this.getEle(sele[3], 3000);
                    await driver.wait(until.elementIsVisible(ele), 20000);
                    await this.clickEle(ele, 2000);
                    let wid2 = await driver.getWindowHandle();
                    await this.changeWindow(wid2); // 別タブに移動する
                    let sele2 = ["#news-more", "#PlagClose1"];
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
                        await driver.close(); // このタブを閉じて
                        // 元のウインドウIDにスイッチ
                        await driver.switchTo().window(wid2);
                      }
                    }
                  }
                  let eles = await this.getEles(sele[2], 3000);
                  let choiceNum = libUtil.getRandomInt(0, eles.length); // TODO ここヒント見れば答えがわかりそう
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
          await driver.close(); // このタブを閉じて
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
      let currentUrl = await driver.getCurrentUrl();
      if (currentUrl != this.startUrl) {
        await driver.get(this.startUrl); // 最初のページ表示
      }
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

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            ele = await this.getEle(sele[1], 3000);
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
          }
          res = D.STATUS.DONE;
          logger.info(`${this.constructor.name} END`);
        } catch (e) {
          logger.warn(e);
        } finally {
          await driver.close(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
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
      let currentUrl = await driver.getCurrentUrl();
      if (currentUrl != this.startUrl) {
        await driver.get(this.startUrl); // 最初のページ表示
      }
      let sele = [
        "img[src*='pochitto_pc']",
        "#question>dd>a>p",
        "div.btn_send>a>p",

        "#questionbox>p",
        "#questionbox label",
        "#aaa2>div.btn_send>a>p",
        "a[href='/point/ex']>p",
        "a[href='/top']>p",
      ];

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 3000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let j = 0; j < limit; j++) {
              if (j !== 0 && (await this.isExistEle(sele[1], true, 3000))) {
                eles = await this.getEles(sele[1], 3000);
              }
              await driver.wait(until.elementIsVisible(eles[0]), 20000);
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
          await driver.close(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}

exports.PartsCmManage = PartsCmManage;
