const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsQuizKentei extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doKentei() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "img[alt='進む']",
        "#choices label",
        "input.next_bt",
        "img[alt='終了する']",
        "img[alt='再挑戦']", // 4
        "form input[alt='進む']",
        "", // 6
        "",
      ];
      if (siteInfo.code === D.CODE.PIC) sele[3] = "input[alt='終了する']";
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
      } else if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
      }
      let wrongList = [];
      for (let i = 0; i < 1; i++) {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 3000);
          let choiceNum = libUtil.getRandomInt(0, eles.length);
          if (wrongList.length) {
            let kouhoTextList = [],
              kouhoIndexList = [];
            for (let j = 0; j < eles.length; j++) {
              let tmpText = await eles[j].getText();
              if (wrongList.indexOf(tmpText) > -1) continue;
              kouhoTextList.push(tmpText);
              kouhoIndexList.push(j);
            }
            let kouhoIndex = libUtil.getRandomInt(0, kouhoTextList.length);
            choiceNum = kouhoIndexList[kouhoIndex];
          }

          let choiceText = await eles[choiceNum].getText();
          // 選択肢をランダムで選択、間違ったら別の選択肢を選択
          await this.clickEle(eles[choiceNum], 2000);
          if (await this.isExistEle(sele[2], true, 3000)) {
            let ele = await this.getEle(sele[2], 3000);
            await this.clickEle(ele, 3000);
            if (await this.isExistEle(sele[0], true, 3000)) {
              ele = await this.getEle(sele[0], 3000);
              await this.clickEle(ele, 4000);
              if (await this.isExistEle(sele[0], true, 3000)) {
                // 正解
                ele = await this.getEle(sele[0], 3000);
                await this.clickEle(ele, 3000);
                if (await this.isExistEle(sele[3], true, 3000)) {
                  ele = await this.getEle(sele[3], 5000);
                  await this.clickEle(ele, 3000);
                  res = D.STATUS.DONE;
                }
              } else if (await this.isExistEle(sele[4], true, 3000)) {
                // 不正解
                i--;
                wrongList.push(choiceText.trim());
                logger.debug("wrongList:", wrongList);
                ele = await this.getEle(sele[4], 5000);
                await this.clickEle(ele, 3000);
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
  async startKentei() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let sele = ["#mainContent li>a"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      let limit = eles.length;
      for (let i = 0; i < limit; i++) {
      // for (let i = 0; i < 3; i++) {
        if (i != 0) eles = await this.getEles(sele[0], 3000);
        // await this.clickEle(eles[eles.length - 1]);
        let ele = eles[eles.length - 1];
        let rect = await ele.getRect();
        let y = rect.y;
        this.logger.info("rect.y", y);
        await driver.executeScript(`window.scrollTo(0, ${y});`);
        // 別タブに強制
        let action = await driver.actions();
        await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
        await this.sleep(2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          res = await this.doKentei();
        } catch (e) {
          logger.warn(e);
        } finally {
          await driver.close(); // このタブを閉じて
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
          await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
          await driver.sleep(1000);
        }
      }
    }
    return res;
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
exports.PartsQuizKentei = PartsQuizKentei;
