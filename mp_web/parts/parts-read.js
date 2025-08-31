const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsRead extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      // await driver.get(targetUrl); // 操作ページ表示
      let sele = [
        "li:not(.read) img.articleImg",
        "input.get_stamp.btn",
        "div.stamp_card li.stampGet",
        "a.read_more.btn",
        "p.less_stamp>span", // 4
        "p.all_stamp",
        "div.read_more.btn",
      ];
      if (siteInfo.code == D.CODE.GMY) {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
        sele[6] = "div.readMore.btn";
      }
      if (await this.isExistEle(sele[4], true, 2000)) {
        let eles = await this.getEles(sele[4], 3000);
        let text = await eles[0].getText();
        let regex = "(\\d+)個";
        let matches = text.match(regex);
        // logger.info(`${matches[1]}は、`);
        let limit = matches[1];
        let triedFlag = false,
          isReaded = false;
        let superBreakCnt = 0;
        for (let i = 0; i < limit; i++) {
          if (!triedFlag) await this.moveLastPage(isReaded), (triedFlag = true); // 最後のページに移動
          if (await this.isExistEle(sele[0], true, 2000)) {
            await this.ignoreKoukoku();
            eles = await this.getEles(sele[0], 3000);
            await this.clickEle(eles[eles.length - 1], 2000, 150);
            await this.ignoreKoukoku();
            if (await this.isExistEle(sele[6], true, 3000)) {
              eles = await this.getEles(sele[6], 3000);
              for (let i = 0, max = eles.length; i < max; i++) {
                // 次へボタンの分
                if (await eles[i].isDisplayed()) {
                  // let el = await this.getEle(sele[2], 3000); // 見えてるボタン
                  // await this.clickEle(eles[i], 1000);
                  await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[i]);
                  eles = await this.getEles(sele[6], 3000);
                }
              }
            }
            if (await this.isExistEle(sele[1], true, 3000)) {
              let ele = await this.getEle(sele[1], 3000);
              await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
              if (await this.isExistEle(sele[2], true, 3000)) {
                eles = await this.getEles(sele[2], 3000);
                let stampNum = eles.length;
                logger.info(`スタンプ ${stampNum} め！`);
                if (await this.isExistEle(sele[3], true, 3000)) {
                  ele = await this.getEle(sele[3], 2000);
                  // await this.clickEle(ele, 2000);
                  await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
                  triedFlag = false;
                }
              }
            }
          } else {
            // このページに読むものがないので前のページに移動
            await this.movePrevPage();
            isReaded = false;
            i--; // ノーカン
            if (superBreakCnt++ > 100) throw "無限ループしてるので失敗にします";
          }
        }
        res = D.STATUS.DONE;
      } else if (await this.isExistEle(sele[5], true, 2000)) {
        res = D.STATUS.DONE;
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async moveLastPage(isReaded) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ol.pager>li>a", "ol.pager>li.next>a", "ol.pager>li.back>a"];
    if (siteInfo.code == D.CODE.GMY) {
      sele = ["ul.pager>li>a", "ul.pager>li.next>a", "ul.pager>li.back>a"];
    }
    // 最初のページで呼ばれること前提
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      let nextNum = 0;
      if (await this.isExistEle(sele[1], true, 2000)) {
        let nexts = await this.getEles(sele[1], 2000);
        nextNum = nexts.length;
      }
      if (isReaded) nextNum++;
      await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[eles.length - 1 - nextNum]);
      await this.ignoreKoukoku();
      return true;
    }
  }
  async movePrevPage() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ol.pager>li>a", "ol.pager>li.next>a", "ol.pager>li.back>a"];
    if (siteInfo.code == D.CODE.GMY) {
      sele = ["ul.pager>li>a", "ul.pager>li.next>a", "ul.pager>li.prev>a"];
    }
    // 途中のページで呼ばれること前提　1つ前に遷移できるようにする
    if (await this.isExistEle(sele[2], true, 2000)) {
      let ele = await this.getEle(sele[2], 2000);
      await this.clickEle(ele, 2000);
      return true;
    }
  }
  async hideOverlay() {
    let seleOver = ["div.overlay-item a.button-close"];
    if (await this.silentIsExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
  async exchange() {
    let exSele = ["a.stamp__btn[href*='exchange']", "input.exchange__btn", "a.stamp__btn.stamp__btn-return"];
    await this.hideOverlay();
    if (await this.isExistEle(exSele[0], true, 2000)) {
      let ele = await this.getEle(exSele[0], 3000);
      await this.clickEle(ele, 2000);
      if (await this.isExistEle(exSele[1], true, 2000)) {
        ele = await this.getEle(exSele[1], 3000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(exSele[2], true, 2000)) {
        ele = await this.getEle(exSele[2], 3000);
        await this.clickEle(ele, 2000);
      }
    }
  }
}
class PartsReadPic extends BaseWebDriverWrapper {
  para;
  constructor(para, main) {
    super();
    this.para = para;
    this.main = main;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "li:not(.read) img.list_thum_img",
        "input.get_stamp.btn",
        "img[alt='スタンプ有り']",
        "a.go_btn[href='./#tabs_3']",
        "p.less_stamp>span", // 4
        "p.all_stamp",
        "a.go_btn[onclick*='movePage']", // 6
        "",
        "",
      ];
      let limit = 190;
      let triedFlag = false,
        readedPage = 0;
      let superBreakCnt = 0;
      for (let i = 0; i < limit; i++) {
        if (!triedFlag) await this.moveLastPage(), (triedFlag = true); // 最後のページに移動
        if (await this.isExistEle(sele[0], true, 2000)) {
          let eles = await this.getEles(sele[0], 3000);
          let choiceNum = eles.length - 1;
          for (let j = 0; j < eles.length; j++) {
            let ele0 = eles[choiceNum];
            let eleZumi = null;
            try {
              eleZumi = await this.getElesXFromEle(ele0, "ancestor::a");
              eleZumi = await this.getElesFromEle(eleZumi[0], "img.list_stamp_img");
            } catch (e) {
              logger.debug(e);
            }
            if (eleZumi && eleZumi.length) {
              choiceNum--; // 再探索
            } else {
              break;
            }
          }
          if (choiceNum === -1) {
            // このページに読むものがないので前のページに移動(リターンfalseは読みつくしたので終了)
            if (!(await this.movePrevPage())) break;
            i--; // ノーカン
            continue;
          }
          // await this.clickEle(eles[choiceNum], 3000);
          // 別タブに強制
          if (this.main == D.MISSION.READ_PRENEW){
            let eletmp = await this.getElesXFromEle(
              eles[choiceNum],
              "ancestor::a"
            );
            let href = await eletmp[0].getAttribute("href");
            await this.exeScriptNoTimeOut(`window.open('${href}')`);
          } 
          else {
            let action = await driver.actions();
            await action.keyDown(Key.CONTROL).click(eles[choiceNum]).keyUp(Key.CONTROL).perform();
          }
          await this.sleep(2000);

          let wid = await driver.getWindowHandle();
          await this.changeWindow(wid); // 別タブに移動する
          try {
            for (let j = 0; j < 50; j++) {
              if (await this.isExistEle(sele[6], true, 3000)) {
                if (this.main == D.MISSION.READ_PRENEW) await this.hideOverlay();
                let ele = await this.getEle(sele[6], 3000);
                await this.clickEle(ele, 3000);
              } else break;
            }
            // すたんぷの数を数える
            if (await this.isExistEle(sele[2], true, 3000)) {
              eles = await this.getEles(sele[2], 3000);
              let stampNum = eles.length;
              logger.info(`スタンプ ${stampNum} め！`);
              // if (await this.isExistEle(sele[3], true, 3000)) {
              //   let ele = await this.getEle(sele[3], 2000);
              //   await this.clickEle(ele, 2000);
              //   // triedFlaqg = false;
              // }
            }
          } catch (e) {
            logger.warn(e);
          } finally {
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
            await driver.sleep(1000);
          }
        } else {
          // このページに読むものがないので前のページに移動
          await this.movePrevPage();
          // readedPage = true;
          i--; // ノーカン
          if (superBreakCnt++ > 100) throw "無限ループしてるので失敗にします";
        }
      }
      res = D.STATUS.DONE;
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async moveLastPage() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["div.pager>a:not(.hide)", "div.pager>a.next:not(.hide)", "div.pager>a.prev:not(.hide)"];
    // 最初のページで呼ばれること前提　これはほんとに最後のページだけど、それだと読んだものしかないので、もう少し手前を最後と家仮定
    // if (await this.isExistEle(sele[0], true, 2000)) {
    //   let eles = await this.getEles(sele[0], 2000);
    //   let nextNum = 0;
    //   if (await this.isExistEle(sele[1], true, 2000)) {
    //     let nexts = await this.getEles(sele[1], 2000);
    //     nextNum = nexts.length;
    //   }
    //   await this.clickEle(eles[eles.length - 1 - nextNum], 2000);
    //   return true;
    // }
    if (await this.isExistEle(sele[0], true, 2000)) {
      if (this.main == D.MISSION.READ_PRENEW) await this.hideOverlay();
      let eles = await this.getEles(sele[0], 2000);
      let nextNum = 0;
      if (await this.isExistEle(sele[1], true, 2000)) {
        let nexts = await this.getEles(sele[1], 2000);
        nextNum = nexts.length;
      }
      let lastIndex = eles.length - 1 - nextNum;
      lastIndex = lastIndex > 3 ? 3 : lastIndex > 2 ? 2 : lastIndex > 1 ? 1 : 0;
      await this.clickEle(eles[lastIndex], 2000);
      return true;
    }
  }
  async movePrevPage() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["div.pager>a:not(.hide)", "div.pager>a.next:not(.hide)", "div.pager>a.prev:not(.hide)"];
    // 途中のページで呼ばれること前提　1つ前に遷移できるようにする
    if (await this.isExistEle(sele[2], true, 2000)) {
      if (this.main == D.MISSION.READ_PRENEW) await this.hideOverlay();
      let ele = await this.getEle(sele[2], 2000);
      await this.clickEle(ele, 2000);
      return true;
    }
  }
  // async hideOverlay() {
  //   let seleOver = ["div.overlay-item a.button-close"];
  //   if (await this.isExistEle(seleOver[0], true, 3000)) {
  //     let ele = await this.getEle(seleOver[0], 2000);
  //     if (await ele.isDisplayed()) {
  //       await this.clickEle(ele, 2000);
  //     } else this.logger.debug("オーバーレイは表示されてないです");
  //   }
  // }
  async hideOverlay() {
    // let seleOver = [
    //   // "#pfx_interstitial_close",
    //   // "#inter-close",
    //   // "a.gmoyda.gmoam_close_button",
    //   // "a.gmoam_close_button",
    //   "#gn_interstitial_close_contents",
    //   "div.overlay-item a.button-close"
    //   // "#fluct_ydn_interstitial_btn"
    // ];
    let seleOver = [
      // "#pfx_interstitial_close",
      // "#gn_ydn_interstitial_btn",
      "div.overlay-item a.button-close",
      // "#svg_close",
      "#gn_interstitial_close",
      "#gn_interstitial_close_contents",
      "#gn_interstitial_outer_area",
      // "ins iframe[title='3rd party ad content']",
    ];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe']"];
        if (await this.isExistEle(iSele[0], true, 1000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
          let inputEle = await this.getEle(s, 1000);
          if (await inputEle.isDisplayed()) {
            await this.clickEle(inputEle, 1000);
          } else this.logger.debug("オーバーレイは表示されてないです");
          // もとのフレームに戻す
          await this.driver.switchTo().defaultContent();
        }
      } else if (await this.silentIsExistEle(s, true, 1000)) {
        let ele = await this.getEle(s, 1000);
        if (s == "ins iframe[title='3rd party ad content']") {
          let sele = [
            "ins iframe[title='3rd party ad content']",
            "#dismiss-button",
          ];
          let iframes = await this.getEles(sele[0], 1000);
          for (let iframe of iframes) {
            if (await iframe.isDisplayed()) {
              await this.driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
              await this.sleep(10000);
              if (await this.silentIsExistEle(sele[1], true, 1000)) {
                let inputEle = await this.getEle(sele[1], 1000);
                if (await inputEle.isDisplayed()) {
                  await this.clickEle(inputEle, 1000);
                } else this.logger.debug("オーバーレイは表示されてないです");
              }
              // もとのフレームに戻す
              await this.driver.switchTo().defaultContent();
            }
          }
        } else if (s == "#gn_interstitial_outer_area") {
          await this.exeScriptNoTimeOut(
            `for (let t of document.querySelectorAll("#gn_interstitial_outer_area")){t.remove();}`
          );
        } else if (s == seleOver[0]) {
          await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
        } else if (await ele.isDisplayed()) {
          await this.clickEle(ele, 1000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
  }

  async exchange() {
    let exSele = ["a.stamp__btn[href*='exchange']", "input.exchange__btn", "a.stamp__btn.stamp__btn-return"];
    await this.hideOverlay();
    if (await this.isExistEle(exSele[0], true, 2000)) {
      let ele = await this.getEle(exSele[0], 3000);
      await this.clickEle(ele, 2000);
      if (await this.isExistEle(exSele[1], true, 2000)) {
        ele = await this.getEle(exSele[1], 3000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(exSele[2], true, 2000)) {
        ele = await this.getEle(exSele[2], 3000);
        await this.clickEle(ele, 2000);
      }
    }
  }
}
class PartsReadEGLR extends BaseWebDriverWrapper {
  para;
  main;
  constructor(para, main) {
    super();
    this.para = para;
    this.main = main;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "ul.articleList>li:not(.read)>a>img",
        "div.list-btn>button",
        "div.list-btn:visible>button", // 使わない
        "form>input.get_stamp",
        "p.less_stamp", // 4
        "a.read_more.btn",
        "li.stampGet", // 6
        "p.all_stamp",
      ];
      if (this.main == D.MISSION.READ_RENSOU) sele[1] = "div.read_more.btn";
      if (siteInfo.code == D.CODE.GMY) {
        if (this.main == D.MISSION.READ_PRENEW) sele[3] = "form>input.getStamp.btn";
        if (this.main == D.MISSION.READ_RENSOU) {
          sele[1] = "div>button.readMore.btn";
          sele[3] = "form>input.getStamp.btn";
        }
        sele[4] = "p.lessStamp";
        sele[5] = "a.readMore.btn";
        sele[7] = "p.allStamp";
      }
      else if (siteInfo.code == D.CODE.CIT) {
        if (this.main == D.MISSION.READ_PRENEW) sele[1] = "div.read_more.btn";
      }
      if (await this.isExistEle(sele[4], true, 2000)) {
        let eles = await this.getEles(sele[4], 3000);
        let text = await eles[0].getText();
        let regex = "(\\d+)個";
        let matches = text.match(regex);
        logger.info(`あと ${matches[1]} 個`);
        let limit = matches[1];
        let preCnt = 0;
        let superBreakCnt = 0;
        for (let i = 0; i < limit; i++) {
          await this.hideOverlay();
          await this.moveLastPage(preCnt); // 最後のページに移動
          if (await this.isExistEle(sele[0], true, 2000)) {
            eles = await this.getEles(sele[0], 3000);
            await this.clickEle(eles[eles.length - 1], 1000, 200);
            if (await this.isExistEle(sele[1], true, 3000)) {
              eles = await this.getEles(sele[1], 3000);
              for (let i = 0, max = eles.length; i < max; i++) {
                // 次へボタンの分
                if (await eles[i].isDisplayed()) {
                  // let el = await this.getEle(sele[2], 3000); // 見えてるボタン
                  // await this.clickEle(eles[i], 1000);
                  await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[i]);
                  eles = await this.getEles(sele[1], 3000);
                }
              }
              if (await this.isExistEle(sele[3], true, 3000)) {
                let el = await this.getEle(sele[3], 3000); // stampGET
                await this.exeScriptNoTimeOut(`arguments[0].click()`, el);
                // await this.clickEle(el, 1000);
                if (await this.isExistEle(sele[6], true, 3000)) {
                  eles = await this.getEles(sele[6], 3000);
                  logger.info(`スタンプ ${eles.length} め！`);
                }
                if (await this.isExistEle(sele[5], true, 3000)) {
                  el = await this.getEle(sele[5], 3000); // stampGET
                  // await this.clickEle(el, 1000);
                  await this.exeScriptNoTimeOut(`arguments[0].click()`, el);
                }
              }
            }
          } else {
            // このページに読むものがないので前のページに移動
            await this.movePrevPage();
            preCnt++;
            i--; // ノーカン
            if (superBreakCnt++ > 50) throw "無限ループしてるので失敗にします";
          }
        }
        res = D.STATUS.DONE;
      } else if (await this.isExistEle(sele[7], true, 2000)) res = D.STATUS.DONE;
    } catch (e) {
      logger.warn(e);
    }
    　return res;
  }
  async moveLastPage(preCnt) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ol.page-number>li>a"];
    if (siteInfo.code == D.CODE.GMY) sele = ["ul.pageNav>li>a"];
    // 最初のページで呼ばれること前提
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      // await this.clickEle(eles[eles.length - 2 - preCnt], 2000, 100);
      await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[eles.length - 2 - preCnt]);
      return true;
    }
  }
  async movePrevPage() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ol.page-number>li>a"];
    if (siteInfo.code == D.CODE.GMY) sele = ["ul.pageNav>li>a"];
    // 途中のページで呼ばれること前提　1つ前に遷移できるようにする
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      if (eles.length >= 3)
        // await this.clickEle(eles[eles.length - 3], 1000, 100);
        await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[eles.length - 3]);
      return true;
    }
  }
  async hideOverlay() {
    let seleOver = ["#dismiss-button"];
    let iSele = { "#dismiss-button": "iframe[title='Advertisement']" };
    for (let s of seleOver) {
      if (iSele[s]) {
        if (await this.isExistEle(iSele[s], true, 1000)) {
          let iframe = await this.getEles(iSele[s], 1000);
          if (await iframe[0].isDisplayed()) {
            await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
            if (await this.isExistEle(s, true, 1000)) {
              let inputEle = await this.getEle(s, 10000);
              if (await inputEle.isDisplayed()) {
                await this.clickEle(inputEle, 1000);
              } else this.logger.debug("オーバーレイは表示されてないです");
            }
            // もとのフレームに戻す
            await this.driver.switchTo().defaultContent();
          }
        }
      }
      //  else if (await this.isExistEle(s, true, 1000)) {
      //   let ele = await this.getEle(s, 1000);
      //   if (await ele.isDisplayed()) {
      //     await this.clickEle(ele, 1000);
      //   } else await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
      // }
    }
  }
  async exchange() {
    let exSele = ["a.stamp__btn[href*='exchange']", "input.exchange__btn", "a.stamp__btn.stamp__btn-return"];
    await this.hideOverlay();
    if (await this.isExistEle(exSele[0], true, 2000)) {
      let ele = await this.getEle(exSele[0], 3000);
      await this.clickEle(ele, 2000);
      if (await this.isExistEle(exSele[1], true, 2000)) {
        ele = await this.getEle(exSele[1], 3000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(exSele[2], true, 2000)) {
        ele = await this.getEle(exSele[2], 3000);
        await this.clickEle(ele, 2000);
      }
    }
  }
}
exports.PartsRead = PartsRead;
exports.PartsReadPic = PartsReadPic;
exports.PartsReadEGLR = PartsReadEGLR;
