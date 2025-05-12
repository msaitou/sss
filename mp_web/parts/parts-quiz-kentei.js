const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsQuizKentei extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
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
        "img[alt='進む']", // 6
        "",
      ];
      await this.hideOverlay();
      if (siteInfo.code === D.CODE.PIC) sele[3] = "input[alt='終了する']";
      if (this.isMob) sele[6] = "img[alt='OK']";
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 200);
      } else if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 200);
      }
      await this.hideOverlay();
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
          await this.clickEle(eles[choiceNum], 100);
          await this.hideOverlay();
          if (await this.isExistEle(sele[2], true, 3000)) {
            let ele = await this.getEle(sele[2], 1000);
            await this.clickEle(ele, 100);
            await this.hideOverlay();
            if (await this.isExistEle(sele[6], true, 3000)) {
              ele = await this.getEle(sele[6], 3000);
              await this.clickEle(ele, 200);
              await this.hideOverlay();
              if (await this.isExistEle(sele[0], true, 3000)) {
                // 正解
                ele = await this.getEle(sele[0], 3000);
                await this.clickEle(ele, 300);
                await this.hideOverlay();
                if (await this.isExistEle(sele[3], true, 3000)) {
                  ele = await this.getEle(sele[3], 3000);
                  await this.clickEle(ele, 200);
                  res = D.STATUS.DONE;
                }
              } else if (await this.isExistEle(sele[4], true, 3000)) {
                // 不正解
                i--;
                wrongList.push(choiceText.trim());
                logger.debug("wrongList:", wrongList);
                ele = await this.getEle(sele[4], 3000);
                await this.clickEle(ele, 200);
              }
              await this.hideOverlay();
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
    let seleOver = [
      "#pfx_interstitial_close",
      "#inter-close",
      "a.gmoam_close_button"
      // "div.overlay-item a.button-close"
    ];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe']"];
        if (await this.silentIsExistEle(iSele[0], true, 3000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
          let inputEle = await this.getEle(s, 1000);
          if (await inputEle.isDisplayed()) {
            await this.clickEle(inputEle, 2000);
          } else this.logger.debug("オーバーレイは表示されてないです");
          // もとのフレームに戻す
          await this.driver.switchTo().defaultContent();
        }
      } else if (["#pfx_interstitial_close"].indexOf(s) > -1) {
        let iSele = ["iframe.profitx-ad-frame-markup"];
        if (await this.silentIsExistEle(iSele[0], true, 3000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          if (await iframe[0].isDisplayed()) {
            await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
            let isExists = await this.silentIsExistEle(s, true, 1000);
            // もとのフレームに戻す
            await this.driver.switchTo().defaultContent();
            if (isExists) await this.exeScriptNoTimeOut(`document.querySelector("${iSele[0]}").contentWindow.document.querySelector("${s}").click()`);
            else if (await this.silentIsExistEle(s, true, 3000)) {
              await this.exeScriptNoTimeOut(`document.querySelector("${s}").click()`);
            } 
          }
        }
      }
      else if (await this.isExistEle(s, true, 3000)) {
        let ele = await this.getEle(s, 2000);
        if (await ele.isDisplayed()) {
          if (s == seleOver[0]) {
            await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
          } else await this.clickEle(ele, 2000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
    await this.exeScriptNoTimeOut(
      `for (let t of document.querySelectorAll("iframe")){t.remove();}`
    );
  }
}
exports.PartsQuizKentei = PartsQuizKentei;
