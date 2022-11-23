const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsOtano extends BaseWebDriverWrapper {
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
        "input.btn-success",
        "div.panel-heading>strong",
        "div>label", // 2
        "div>select",
        "", // 4
        "",
        "",
      ];
      // if (siteInfo.code == D.CODE.GMY) {
      //   sele[1] = "input.getStamp.btn";
      //   sele[2] = "div.stampCard li.stampGet";
      //   sele[3] = "a.readMore.btn";
      //   sele[4] = "p.lessStamp>span";
      //   sele[5] = "p.allStamp";
      // }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000),
          isKensyoFlag = false;
        await this.clickEle(ele, 2000); // 次のページ
        for (let i = 0; i < 10; i++) {
          if (await this.isExistEle(sele[1], true, 2000)) {
            ele = await this.getEle(sele[1], 3000);
            let q = await ele.getText(),
              qNo = q.substr(0, 2);
            let choiceNum = 0,
              ansSele = sele[2];
            switch (qNo) {
              case "Q1": // Q1 あなたの性別をお知らせください。（ひとつだけ）
                break;
              case "Q3": // Q3. あなたのご職業をお知らせください。（ひとつだけ）
                choiceNum = 9;
                break;
              case "Q2": // Q2. あなたの年齢をお知らせください。（ひとつだけ）
                choiceNum = 2;
                break;
              case "Q4": // Q4. あなたの居住地をお知らせください。（ひとつだけ）
                choiceNum = "13";
                ansSele = sele[3];
                if (isKensyoFlag) ansSele = sele[2];
                break;
              default: // ランダムで。 Q5~Q10
                choiceNum = -1; // 仮値
            }
            if (ansSele === sele[2] && !(await this.isExistEle(ansSele, true, 2000))) {
              ansSele = sele[3];
            }

            if (await this.isExistEle(ansSele, true, 2000)) {
              let eles = await this.getEles(ansSele, 3000);
              if (choiceNum === -1) {
                choiceNum = libUtil.getRandomInt(0, eles.length); // 最後は否定的な選択肢なので選ばないのがいいと思ったが、問題なさそう
              }
              if (ansSele === sele[3]) {
                let select = new Select(eles[0]);
                if (!choiceNum) choiceNum++;
                await select.selectByValue(choiceNum.toString());
              } else {
                if (qNo === "Q1" && eles.length === 3) isKensyoFlag = true;
                if (isKensyoFlag) choiceNum = libUtil.getRandomInt(1, eles.length);
                await this.clickEle(eles[choiceNum], 2000);
              }
              if (await this.isExistEle(sele[0], true, 2000)) {
                ele = await this.getEle(sele[0], 3000);
                await this.clickEle(ele, 2000); // 次のページ
              }
            }
          }
        }
        if (await this.isExistEle(sele[0], true, 2000)) {
          ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000); // このページが閉じる？　picは少なくとも　gmyは閉じない
        }
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
exports.PartsOtano = PartsOtano;
