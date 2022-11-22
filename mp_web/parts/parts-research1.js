const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");

class PartsResearch1 extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do(wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "table.ui-table a.ui-button",
        "a.ui-button.quake",
        "input.ui-button.quake",
        "div.ui-item-no",
        "li>label",
        "select.ui-select",
      ];
      if (await this.isExistEle(sele[0], true, 3000)) {
        let eles = await this.getEles(sele[0], 3000);
        let ele,
          limit = eles.length;
        for (let j = 0; j < limit; j++) {
          if (j !== 0 && (await this.isExistEle(sele[0], true, 3000))) {
            eles = await this.getEles(sele[0], 3000);
          }
          await this.clickEle(eles[eles.length - 1], 2000); // 常に一番下で
          let wid2 = await driver.getWindowHandle();
          await this.changeWindow(wid2); // 別タブに移動する
          try {
            await this.commonResearch1(sele);
          } catch (e) {
            logger.warn(e);
          }
          await driver.close(); // このタブを閉じて
          await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
          await driver.navigate().refresh(); // 画面更新
        }
        await this.exchange(); // 交換
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        res = D.STATUS.DONE;
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async doGen() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "table.ui-table a.ui-button",
        "a.ui-button.quake",
        "input.ui-button.quake",
        "div.ui-item-no",
        "li>label",
        "select.ui-select",
      ];
      let seleGen = ["ul>li>a[data-type='mini_surveys']", "#mini_surveys td>a>span", "", ""];

      if (await this.isExistEle(seleGen[0], true, 3000)) {
        let ele = await this.getEle(seleGen[0], 3000);
        await this.clickEle(ele, 3000); // アンケートリストを表示
        if (await this.isExistEle(seleGen[1], true, 3000)) {
          let eles = await this.getEles(seleGen[1], 3000),
            limit = eles.length;
          for (let j = 0; j < limit; j++) {
            if (j !== 0 && (await this.isExistEle(seleGen[1], true, 3000))) {
              eles = await this.getEles(seleGen[1], 3000);
            }
            await this.clickEle(eles[0], 2000); // 常に一番上で
            let wid2 = await driver.getWindowHandle();
            await this.changeWindow(wid2); // 別タブに移動する
            try {
              await this.commonResearch1(sele);
            } catch (e) {
              logger.warn(e);
            }
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
            await driver.navigate().refresh(); // 画面更新
            if (await this.isExistEle(seleGen[0], true, 3000)) {
              let ele = await this.getEle(seleGen[0], 3000);
              await this.clickEle(ele, 3000); // アンケートリストを表示
            }
          }
        }
        res = D.STATUS.DONE;
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async commonResearch1(sele) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    if (await this.isExistEle(sele[1], true, 2000)) {
      let ele = await this.getEle(sele[1], 3000);
      await this.clickEle(ele, 2000); // 次のページ
      if (await this.isExistEle(sele[2], true, 2000)) {
        ele = await this.getEle(sele[2], 3000);
        await this.clickEle(ele, 2000); // 次のページ
        // 多分12問あり
        for (let i = 0; i < 12; i++) {
          if (await this.isExistEle(sele[3], true, 2000)) {
            ele = await this.getEle(sele[3], 3000);
            let qNo = await ele.getText();
            logger.info(qNo);
            let choiceNum = 0,
              ansSele = sele[4];
            switch (qNo) {
              case "Q1": // Q1 性別をお知らせ下さい。
              case "Q3": // O3 未既婚をお知らせ下さい。
                break;
              case "Q2": // Q2 年齢をお知らせ下さい。
                choiceNum = 2;
                break;
              case "Q4": // 居住区をお知らせ下さい。
                choiceNum = "4";
                ansSele = sele[5];
                break;
              case "Q5": // Q5 ご職業をお知らせ下さい。
                choiceNum = 5;
                break;
              default: // ランダムで。 Q6~Q12
                choiceNum = -1; // 仮値
            }
            if (ansSele === sele[4] && !(await this.isExistEle(ansSele, true, 2000))) {
              ansSele = sele[5];
            }
            if (await this.isExistEle(ansSele, true, 2000)) {
              let eles = await this.getEles(ansSele, 3000);
              if (choiceNum === -1) {
                choiceNum = libUtil.getRandomInt(0, eles.length-1);
              }
              if (ansSele === sele[5]) {
                let select = new Select(eles[0]);
                if (!choiceNum) choiceNum++;
                await select.selectByValue(choiceNum.toString()); // 38歳を選択
              } else {
                await this.clickEle(eles[choiceNum], 2000);
              }
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 3000);
                await this.clickEle(ele, 2000); // 次のページ
              }
            }
          }
        }
        await this.hideOverlay();
        if (await this.isExistEle(sele[2], true, 2000)) {
          ele = await this.getEle(sele[2], 3000);
          await this.clickEle(ele, 2000); // 次のページ
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
exports.PartsResearch1 = PartsResearch1;
