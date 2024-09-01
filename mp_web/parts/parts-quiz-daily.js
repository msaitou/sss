const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");

class PartsQuizDaily extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do(targetUrl) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      await driver.get(targetUrl); // 操作ページ表示
      let sele = [
        "a[data-ga-label='デイリークイズ']",
        "input.ui-button-start",
        "label.ui-label-radio",
        "input.ui-button-answer",
        "input.ui-button-result",
        "a.ui-button-close",
        "input.ui-button-end",
      ];
      sele[0] =
        siteInfo.code == D.CODE.CMS
          ? this.isMob
            ? "img[alt='デイリークイズ']"
            : "img[alt='DAILYQUIZ']"
          : sele[0];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000, this.isMob ? 120 : 0);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        await this.hideOverlay();
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(5);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          logger.info(await ele.getText());
          // await this.clickEle(ele, 2000);
          let rect = await ele.getRect();
          await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
          await ele.click(); // なぜかここはこれじゃないとクリックが動作しない
          await this.sleep(3000);
          // 8問あり
          for (let i = 0; i < 8; i++) {
            let eles;
            // 4択を抽出して、ランダムで選択
            if (await this.isExistEle(sele[2], true, 2000)) {
              eles = await this.getEles(sele[2], 2000);
              // ランダムで。
              let choiceNum = libUtil.getRandomInt(0, eles.length);
              await this.clickEle(eles[choiceNum], 2000);
              if (await this.isExistEle(sele[3], true, 3000)) {
                ele = await this.getEle(sele[3], 3000);
                await this.clickEle(ele, 2000, 0, this.isMob); // 回答する
                await this.hideOverlay(); // オーバレイあり。消す
                // 回答結果
                if (await this.isExistEle(sele[4], true, 3000)) {
                  ele = await this.getEle(sele[4], 3000);
                  await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
                  await this.hideOverlay(); // オーバレイあり。消す
                }
              }
            } else if (await this.isExistEle(sele[5], true, 2000)) {
              ele = await this.getEle(sele[5], 3000);
            }
          }
          await this.hideOverlay();
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            res = D.STATUS.DONE;
          }
        } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  // async hideOverlay() {
  //   let seleOver = ["div.overlay-item a.button-close"];
  //   if (await this.isExistEle(seleOver[0], true, 3000)) {
  //     let ele = await this.getEle(seleOver[0], 2000);
  //     if (await ele.isDisplayed()) {
  //       if (!this.isMob) {
  //         await this.clickEle(ele, 2000);
  //       } else {
  //         await ele.sendKeys(Key.ENTER);
  //       }
  //     } else this.logger.debug("オーバーレイは表示されてないです");
  //   }
  // }
  async hideOverlay() {
    let seleOver = [
      "#pfx_interstitial_close",
      // "#inter-close",
      "a.gmoam_close_button",
      "div.overlay-item a.button-close",
    ];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe'][style*='z-index']"];
        if (await this.isExistEle(iSele[0], true, 3000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
          if (await this.isExistEle(s, true, 3000)) {
            let inputEle = await this.getEle(s, 1000);
            // await this.clickEle(inputEle, 2000);
            await this.exeScriptNoTimeOut(`arguments[0].click()`, inputEle);
          } else this.logger.debug("オーバーレイは表示されてないです");
          // もとのフレームに戻す
          await this.driver.switchTo().defaultContent();
        }
      } else if (["#pfx_interstitial_close"].indexOf(s) > -1) {
        let iSele = ["iframe.profitx-ad-frame-markup"];
        if (await this.isExistEle(iSele[0], true, 3000)) {
          await this.exeScriptNoTimeOut(`document.querySelector("${iSele[0]}").contentWindow.document.querySelector("${s}").click()`);
        }
      }
      else if (await this.isExistEle(s, true, 3000)) {
        let ele = await this.getEle(s, 2000);
        if (s == seleOver[0]) {
          await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
        } else if (await ele.isDisplayed()) {
          if (!this.isMob) {
            await this.clickEle(ele, 2000);
          } else {
            await ele.sendKeys(Key.ENTER);
          }
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
  }

  async exchange(minExcNum) {
    let exSele = [
      "a.stamp__btn[href*='exchange']",
      "input.exchange__btn",
      "a.stamp__btn.stamp__btn-return",
      "p.stamp__num",
    ];
    await this.hideOverlay();
    if (await this.isExistEle(exSele[3], true, 2000)) {
      let ele = await this.getEle(exSele[3], 3000);
      let stampStr = await ele.getText();
      let stampNum = stampStr.substr(1);
      if (Number(stampNum) < minExcNum) return;
    }
    if (await this.isExistEle(exSele[0], true, 2000)) {
      let ele = await this.getEle(exSele[0], 3000);
      await this.clickEle(ele, 2000, 0, this.isMob);
      if (await this.isExistEle(exSele[1], true, 2000)) {
        ele = await this.getEle(exSele[1], 3000);
        await this.clickEle(ele, 2000, 0, this.isMob);
      }
      if (await this.isExistEle(exSele[2], true, 2000)) {
        ele = await this.getEle(exSele[2], 3000);
        await this.clickEle(ele, 2000, 0, this.isMob);
      }
    }
  }
}
exports.PartsQuizDaily = PartsQuizDaily;
