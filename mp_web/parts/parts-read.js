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
      ];
      if (siteInfo.code == D.CODE.GMY) {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
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
        for (let i = 0; i < limit; i++) {
          if (!triedFlag) await this.moveLastPage(isReaded), (triedFlag = true); // 最後のページに移動
          if (await this.isExistEle(sele[0], true, 2000)) {
            eles = await this.getEles(sele[0], 3000);
            await this.clickEle(eles[eles.length - 1], 3000);
            if (await this.isExistEle(sele[1], true, 3000)) {
              let ele = await this.getEle(sele[1], 3000);
              await this.clickEle(ele, 5000);
              let seleIframe = [
                "iframe[title='Rokt placement']",
                "button[aria-label='閉じる']",
                "iframe[title='Rokt offer']",
              ];
              if (await this.isExistEle(seleIframe[0], true, 3000)) {
                let iframe = await this.getEle(seleIframe[0], 1000);
                await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
                if (await this.isExistEle(seleIframe[2], true, 3000)) {
                  ele = await this.getEle(seleIframe[2], 2000);
                  await driver.switchTo().frame(ele); // 違うフレームなのでそっちをターゲットに
                  if (await this.isExistEle(seleIframe[1], true, 3000)) {
                    ele = await this.getEle(seleIframe[1], 2000);
                    await this.clickEle(ele, 2000);
                  }
                }
                await driver.switchTo().defaultContent(); // もとのフレームに戻す
              }
              if (await this.isExistEle(sele[2], true, 3000)) {
                eles = await this.getEles(sele[2], 3000);
                let stampNum = eles.length;
                logger.info(`スタンプ ${stampNum} め！`);
                if (await this.isExistEle(sele[3], true, 3000)) {
                  ele = await this.getEle(sele[3], 2000);
                  await this.clickEle(ele, 2000);
                  triedFlag = false;
                }
              }
            }
          } else {
            // このページに読むものがないので前のページに移動
            await this.movePrevPage();
            isReaded = false;
            i--; // ノーカン
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
      await this.clickEle(eles[eles.length - 1 - nextNum], 2000);
      return true;
    }
  }
  async movePrevPage() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ol.pager>li>a", "ol.pager>li.next>a", "ol.pager>li.back>a"];
    if (siteInfo.code == D.CODE.GMY) {
      sele = ["ul.pager>li>a", "ul.pager>li.next>a", "ul.pager>li.back>a"];
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
    if (await this.isExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
  async exchange() {
    let exSele = [
      "a.stamp__btn[href*='exchange']",
      "input.exchange__btn",
      "a.stamp__btn.stamp__btn-return",
    ];
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
