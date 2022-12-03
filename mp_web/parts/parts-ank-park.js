const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsAnkPark extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doZukan() {
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
  async doIjin() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteWrap h3>span",
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
      for (let i = 0; i < 8; i++) {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
        }
      }
      try {
        await this.commonAnk(sele, "doIjin");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doColum() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "input.next_bt",
        "input:not(.next_bt)[alt='進む']",
        "#enqueteTitle>span",
        "#enqueteUl label",
        "input.enquete_nextbt", // 4
        "input[alt='次へ進む']",
        "input[alt='コラムを読む']", // 6
        "input[alt='next']",
        "input[src*='questionnaire_bt.png']", // 8
        "img[alt='進む']",
        "input[alt='進む']",
        "",
      ];
      if (await this.isExistEle(sele[9], true, 10000)) {
        let ele = await this.getEle(sele[9], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 4000);
        if (await this.isExistEle(sele[6], true, 2000)) {
          ele = await this.getEle(sele[6], 3000);
          await this.clickEle(ele, 4000);
          for (let i = 0; i < 6; i++) {
            if (await this.isExistEle(sele[7], true, 2000)) {
              ele = await this.getEle(sele[7], 3000);
              await this.clickEle(ele, 3000);
            }
          }

          if (await this.isExistEle(sele[1], true, 2000)) {
            ele = await this.getEle(sele[1], 3000);
            await this.clickEle(ele, 3000);
            try {
              await this.commonAnk(sele, "doColum");
              res = D.STATUS.DONE;
            } catch (e) {
              logger.warn(e);
            }
          }
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
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
        "", // 6
        "",
        "", // 8
        "img[alt='進む']",
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
      for (let i = 0; i < 2; i++) {
        if (await this.isExistEle(sele[9], true, 10000)) {
          let ele = await this.getEle(sele[9], 10000);
          await this.clickEle(ele, 2000);
        } else if (await this.isExistEle(sele[0], true, 10000)) {
          let ele = await this.getEle(sele[0], 10000);
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
        "img[alt='進む']",
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
      if (await this.isExistEle(sele[9], true, 10000)) {
        let ele = await this.getEle(sele[9], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
        if (await this.isExistEle(sele[6], true, 2000)) {
          ele = await this.getEle(sele[6], 3000);
          await this.clickEle(ele, 2000);
          for (let i = 0; i < 4; i++) {
            if (await this.isExistEle(sele[7], true, 2000)) {
              ele = await this.getEle(sele[7], 3000);
              await this.clickEle(ele, 2000);
            }
          }
          if (await this.isExistEle(sele[8], true, 2000)) {
            ele = await this.getEle(sele[8], 3000);
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
    let { retryCnt, account, logger, driver, siteInfo } = this.para,
      roopLimit = 8;
    if (ref == "doPhoto") sele[0] = "#endlink";
    // if (["doIjin"].indexOf(ref) > -1) sele[2] = "#enqueteWrap h3>span";
    if (["doManga", "doColum"].indexOf(ref) > -1)
      sele = [
        "#endlink", // ?
        "",
        "span.text03",
        "div.enquete label",
        "input.enquete_nextbt", // 4
        "#endlink",
        "img[src*='again_bt.png']",
      ];
    if (["doColum"].indexOf(ref) > -1) (sele[2] = "p.text03"), (roopLimit = 6);

    // ここから共通のアンケートポイ　全8問(columは6)
    for (let i = 0; i < roopLimit; i++) {
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
            if (["doPhoto", "doManga", "doColum"].indexOf(ref) > -1) choiceNum = -1;
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
        if (await this.isExistEle(sele[0], true, 4000)) {
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000); // 2回目　sugでは一覧に戻る
        } else if (await this.isExistEle("#endlink", true, 4000)) {
          let ele = await this.getEle("#endlink", 3000);
          await this.clickEle(ele, 2000); // 2回目　sugでは一覧に戻る
        }
      }
    }
  }
  async doMobColum() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      // 2,3,4,9,10
      // input[alt='終了する']
      // let sele = [
      //   "input.next_bt",
      //   "input:not(.next_bt)[alt='進む']",
      //   "#que", // 2
      //   "#enqueteUl label", // 3
      //   "input[alt='回答する']", // 4
      //   "input[alt='終了する']",
      //   "#endlink", // 6
      //   "input[alt='next']",
      //   "input[src*='questionnaire_bt.png']", // 8
      //   "img[alt='進む']",　//　9 -> 0
      //   "input[alt='進む']",　//　10 -> 1
      //   "",
      // ];
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#que", // 2
        "#enqueteUl label", // 3
        "input[alt='回答する']", // 4
        "input[alt='終了する']",
        "#endlink", // 6
      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 7; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      try {
        await this.commonMobAnk(sele, "doColum");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobPhoto() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#que", // 2
        "#enqueteUl label", // 3
        "input[alt='回答する']", // 4
        "input[alt='終了する']",
        "#endlink", // 6
        "input[src*='next']",

      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele = await this.getEle(sele[1], 3000);
        await this.clickEle(ele, 3000);
        for (let i = 0; i < 6; i++) {
          if (await this.isExistEle(sele[7], true, 2000)) {
            let ele = await this.getEle(sele[7], 3000);
            await this.clickEle(ele, 3000);
          }
        }
        try {
          await this.commonMobAnk(sele, "doPhoto");
          res = D.STATUS.DONE;
        } catch (e) {
          logger.warn(e);
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobSite() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#enqueteTitle>span", // 2
        "#enqueteUl label", // 3
        "input.enquete_nextbt", // 4
        "input[alt='終了']",
        "#endlink", // 6
        "input[src*='next']",

      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 6; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      try {
        await this.commonMobAnk(sele, "doSite");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobZukan() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#enqueteTitle>span", // 2
        "#enqueteUl label", // 3
        "input.enquete_nextbt", // 4
        "input[alt='終了']",
        "input[alt='進む']", // 6
        "input[src*='next']",
      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 6; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      try {
        await this.commonMobAnk(sele, "doZukan");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobJapan() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#enqueteTitle>span", // 2
        "#enqueteUl label", // 3
        "input.enquete_nextbt", // 4
        "input[alt='進む']",
        "input[alt='進む']", // 6
        "input[src*='next']",
      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 6; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      try {
        await this.commonMobAnk(sele, "doJapan");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobCook() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#enqueteTitle>span", // 2
        "#enqueteUl label", // 3
        "input.enquete_nextbt", // 4
        "input[alt='進む']",
        "input[alt='進む']", // 6
        "input[src*='next']",
      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 6; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      try {
        await this.commonMobAnk(sele, "doCook");
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doMobKenkou() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']", //　9 -> 0
        "input[alt='進む']", //　10 -> 1
        "#que", // 2
        "#enqueteUl label", // 3
        "input[alt='回答する']", // 4
        "input[alt='終了する']",
        "#endlink", // 6
      ];
      if (await this.isExistEle(sele[0], true, 10000)) {
        let ele = await this.getEle(sele[0], 10000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[1], true, 5000)) {
        let ele = await this.getEle(sele[1], 5000);
        await this.clickEle(ele, 2000);
      }
      for (let i = 0; i < 10; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 3000);
        }
      }
      await this.hideOverlay();
      await this.hideOverlay();
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele = await this.getEle(sele[1], 3000);
        await this.clickEle(ele, 3000);
        await this.hideOverlay();
        await this.hideOverlay();
        if (await this.isExistEle(sele[5], true, 2000)) {
          let ele = await this.getEle(sele[5], 3000);
          await this.clickEle(ele, 3000);
          res = D.STATUS.DONE;
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async commonMobAnk(sele, ref) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para,
      roopLimit = 8;
    // if (ref == "doPhoto") sele[0] = "#endlink";
    // // if (["doIjin"].indexOf(ref) > -1) sele[2] = "#enqueteWrap h3>span";
    // if (["doManga", "doColum"].indexOf(ref) > -1)
    //   sele = [
    //     "#endlink", // ?
    //     "",
    //     "span.text03",
    //     "div.enquete label",
    //     "input.enquete_nextbt", // 4
    //     "#endlink",
    //     "img[src*='again_bt.png']",
    //   ];
    if (["doColum", "doPhoto"].indexOf(ref) > -1) roopLimit = 6;

    // ここから共通のアンケートポイ　全8問(columは6)
    for (let i = 0; i < roopLimit; i++) {
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
            choiceNum = 2;
            break;
          case "Q3": // Q3. あなたの居住地をお知らせください。（ひとつだけ）
            choiceNum = 2;
            if (["doPhoto", "doManga", "doColum"].indexOf(ref) > -1) choiceNum = -1;
            break;
          case "Q4": // Q4. あなたの職業をお知らせください。（ひとつだけ）
            choiceNum = "5";
            if (["doPhoto", "doColum"].indexOf(ref) > -1) choiceNum = -1;
            break;
          // case "Q": // Q4. あなたの職業をお知らせください。（ひとつだけ）
          //   choiceNum = "5";
          //   ansSele = sele[5];
          //   break;
          default: // ランダムで。 Q5~Q8
            choiceNum = -1; // 仮値
        }
        // if (ansSele === sele[3] && !(await this.isExistEle(ansSele, true, 2000))) {
        //   ansSele = sele[5];
        // }
        if (await this.isExistEle(ansSele, true, 2000)) {
          let eles = await this.getEles(ansSele, 3000);
          if (choiceNum === -1) {
            choiceNum = libUtil.getRandomInt(0, eles.length - 1); // 最後は否定的な選択肢なので選ばないのがいい
          }
          // if (ansSele === sele[5]) {
          //   let select = new Select(eles[0]);
          //   if (!choiceNum) choiceNum++;
          //   await select.selectByValue(choiceNum.toString());
          // } else {
          if (eles.length <= choiceNum) choiceNum = eles.length - 1;
          await this.clickEle(eles[choiceNum], 2000);
          // }
          if (await this.isExistEle(sele[4], true, 2000)) {
            ele = await this.getEle(sele[4], 3000);
            await this.clickEle(ele, 2000); // 次のページ
          }
        }
      }
    }
    // if (ref == "doManga") {
    //   if (await this.isExistEle(sele[5], true, 2000)) {
    //     let ele = await this.getEle(sele[5], 3000);
    //     await this.clickEle(ele, 2000);
    //     if (await this.isExistEle(sele[6], true, 2000)) {
    //       let ele = await this.getEle(sele[6], 3000);
    //       await this.clickEle(ele, 2000); // sugでは一覧に戻る
    //     }
    //   }
    // } else {
    // for (let i = 0; i < 2; i++) {
    //   if (await this.isExistEle(sele[0], true, 4000)) {
    //     let ele = await this.getEle(sele[0], 3000);
    //     await this.clickEle(ele, 2000); // 2回目　sugでは一覧に戻る
    //   }
    // }
    if (await this.isExistEle(sele[6], true, 4000)) {
      let ele = await this.getEle(sele[6], 3000);
      await this.clickEle(ele, 2000);
      if (await this.isExistEle(sele[5], true, 4000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
      }
    }
    // }
  }

  async hideOverlay() {
    let seleOver = ["div.close"];
    if (await this.isExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        if (!this.isMob) {
          await this.clickEle(ele, 2000);
        } else {
          await ele.sendKeys(Key.ENTER);
        }
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
}
exports.PartsAnkPark = PartsAnkPark;
