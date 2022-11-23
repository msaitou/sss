const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsAnkPark extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doPhoto() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      for (let i = 0; i < 2; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      for (let i = 0; i < 5; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      }
      try {
        await this.commonAnk(sele, "doPhoto");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doManga() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "input[src*='choose_bt.png']",
        "input[src*='manga_bt.png']", // 6
        "input[src*='manga_next_bt.png']",
        "input[src*='questionnaire_bt.png']", // 8
        "",
        "",
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        if (await this.isExistEle(sele[5], true, 2000)) {
          let ele = await this.getEle(sele[5], 3000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[6], true, 2000)) {
            let ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000);
            for (let i = 0; i < 4; i++) {
              if (await this.isExistEle(sele[7], true, 2000)) {
                let ele = await this.getEle(sele[7], 3000);
                await this.clickEle(ele, 2000);
              }
            }
            if (await this.isExistEle(sele[8], true, 2000)) {
              let ele = await this.getEle(sele[8], 3000);
              await this.clickEle(ele, 2000);
              try {
                await this.commonAnk(sele, "doManga");
                res = D.STATUS.DONE;
              } catch (e) {
                logger.warn(e);
              }
            }
          }
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doJapan() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      for (let i = 0; i < 3; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      for (let i = 0; i < 4; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      }
      try {
        await this.commonAnk(sele);
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doSite() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      for (let i = 0; i < 3; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      for (let i = 0; i < 4; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      }
      try {
        await this.commonAnk(sele);
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doCook() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      for (let i = 0; i < 3; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      for (let i = 0; i < 4; i++) {
        // if (i === 2) {
        //   // 正解していないけど次へのボタンを表示
        //   await this.driver.executeScript(
        //     "document.getElementById('puzzleBtn').setAttribute('style', 'display: block');"
        //   );
        //   await this.sleep(2000);
        // }
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      }
      try {
        await this.commonAnk(sele, "doCook");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doHirameki() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "",
      ];
      if (siteInfo.code == "naniika") {
        sele[1] = "input.getStamp.btn";
        sele[2] = "div.stampCard li.stampGet";
        sele[3] = "a.readMore.btn";
        sele[4] = "p.lessStamp>span";
        sele[5] = "p.allStamp";
      }
      for (let i = 0; i < 3; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      for (let i = 0; i < 3; i++) {
        if (i === 2) {
          // 正解していないけど次へのボタンを表示
          await this.driver.executeScript(
            "document.getElementById('puzzleBtn').setAttribute('style', 'display: block');"
          );
          await this.sleep(2000);
        }
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await driver.wait(until.elementIsVisible(ele), 5000);
          await this.clickEle(ele, 3000);
        }
      }
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      }
      try {
        await this.commonAnk(sele);
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async commonAnk(sele, ref) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    if (ref == "doPhoto") sele[0] = "#endlink";
    if (ref == "doManga")
      sele = [
        "",
        "",
        "span.text03",
        "div.enquete label",
        "input.enquete_nextbt", // 4
        "#endlink",
        "img[src*='again_bt.png']",
      ];
    // ここから共通のアンケートポイ　全8問
    for (let i = 0; i < 8; i++) {
      if (await this.isExistEle(sele[2], true, 2000)) {
        let ele = await this.getEle(sele[2], 3000);
        let q = await ele.getText(),
          qNo = q.substr(0, 2);
        let choiceNum = 0,
          ansSele = sele[3];
        switch (qNo) {
          case "Q1": // Q1 あなたの性別をお知らせください。（ひとつだけ）
            break;
          case "Q2": // Q2. あなたの年齢をお知らせください。（ひとつだけ）
          case "Q3": // Q3. あなたの居住地をお知らせください。（ひとつだけ）
            choiceNum = 2;
            if (["doPhoto","doManga"].indexOf(ref) > -1) choiceNum = -1;
            break;
          case "Q4": // Q4. あなたの職業をお知らせください。（ひとつだけ）
            choiceNum = "5";
            if (["doCook", "doManga", "doPhoto"].indexOf(ref) > -1) choiceNum = -1;
            break;
          // case "Q": // Q4. あなたの職業をお知らせください。（ひとつだけ）
          //   choiceNum = "5";
          //   ansSele = sele[5];
          //   break;
          default: // ランダムで。 Q5~Q8
            choiceNum = -1; // 仮値
        }
        if (ansSele === sele[3] && !(await this.isExistEle(ansSele, true, 2000))) {
          ansSele = sele[5];
        }
        if (await this.isExistEle(ansSele, true, 2000)) {
          let eles = await this.getEles(ansSele, 3000);
          if (choiceNum === -1) {
            choiceNum = libUtil.getRandomInt(0, eles.length - 1); // 最後は否定的な選択肢なので選ばないのがいい
          }
          if (ansSele === sele[5]) {
            let select = new Select(eles[0]);
            if (!choiceNum) choiceNum++;
            await select.selectByValue(choiceNum.toString());
          } else {
            if (eles.length <= choiceNum) choiceNum = eles.length - 1;
            await this.clickEle(eles[choiceNum], 2000);
          }
          if (await this.isExistEle(sele[4], true, 2000)) {
            ele = await this.getEle(sele[4], 3000);
            await this.clickEle(ele, 2000); // 次のページ
          }
        }
      }
    }
    if (ref == "doManga") {
      if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
        if (await this.isExistEle(sele[6], true, 2000)) {
          let ele = await this.getEle(sele[6], 3000);
          await this.clickEle(ele, 2000); // sugでは一覧に戻る
        }
      }
    } else {
      for (let i = 0; i < 2; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000); // 2回目　sugでは一覧に戻る
        }
        else if (await this.isExistEle("#endlink", true, 2000)) {
          let ele = await this.getEle("#endlink", 3000);
          await this.clickEle(ele, 2000); // 2回目　sugでは一覧に戻る
        }

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
exports.PartsAnkPark = PartsAnkPark;
