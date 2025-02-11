const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const mailOpe = require("../../mp_mil/mail_operate");

class PartsFurufuru extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async doFuru(gameUrlHost, wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "#start_btn",
        "#main_column #item",
        "#main_column #item>div", // 2
        "#finish>a[href='result']",
        "#scoreboard>a[href*='/top']", // 4
        "#getpoint>a",
        "a[target='_blank'], iframe", // 6
        "",
        "",
      ];
      if (this.isMob) (sele[1] = "#game_area #item"), (sele[2] = "#game_area #item>div");
      // await this.openUrl(`${gameUrlHost}drop/practice/top`); // todo 練習用
      await this.ignoreKoukoku();
      await this.getPoint();
      for (let i = 0; i < 3; i++) {
        // スコアボード後、ここに戻る　２時間毎に３回チャレンジ可
        if (await this.isExistEle(sele[0], true, 2000)) {
          let winList = await driver.getAllWindowHandles();
          await this.hideOverlay();
          let ele = await this.getEles(sele[0], 3000);
          await this.clickEle(ele[0], 4000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let ele = await this.getEle(sele[1], 3000);
            let rect = await ele.getRect();
            let eleScope = {
              xStart: rect.x + (this.isMob ? 30 : 150),
              xEnd: rect.x + rect.width - (this.isMob ? 30 : 150),
              yStart: rect.y + (this.isMob ? 30 : 110),
              yEnd: rect.y + rect.height - (this.isMob ? 10 : 70),
            };
            // $("a[target='_blank'], iframe").attr('target', '').attr('style','display:none;')
            await this.driver.executeScript(
              `for (let t of document.querySelectorAll("a[target='_blank'],iframe,ins")){t.setAttribute('target','');t.setAttribute('style','display:none;');}`
            );
            try {
              await driver.manage().setTimeouts({ pageLoad: 5000 });
              const actions = driver.actions();
              for (;;) {
                let x = libUtil.getRandomInt(eleScope.xStart, eleScope.xEnd);
                let y = libUtil.getRandomInt(eleScope.yStart, eleScope.yEnd);
                // logger.debug(x, y);
                if (await this.isExistEle(sele[2], true, 2000)) {
                  // sele[1]のleft,topからright,bottomの間で、ランダムで
                  await actions.move({ x: x, y: y }).click().perform();
                  x = libUtil.getRandomInt(eleScope.xStart, eleScope.xEnd);
                  await actions.move({ x: x, y: y }).click().perform();
                  x = libUtil.getRandomInt(eleScope.xStart, eleScope.xEnd);
                  await actions.move({ x: x, y: y }).click().perform();
                  // for (let i = 0;i < 500;i++) {
                  //   let items = document.querySelectorAll("div.item_type_2");
                  //   items.forEach(item => {
                  //     item.click();
                  //   });
                  // }
                } else break;
              }
            } catch (e) {
              logger.warn(e);
            }
          }
          await this.closeElesWindow(winList);
          await this.driver.manage().setTimeouts({ pageLoad: D.INTERVAL[180] }); // 元のタイムアウト時間に戻す
          let currentUrl = await driver.getCurrentUrl();
          if (currentUrl.indexOf(gameUrlHost) === -1) {
            await driver.navigate().back();
            await this.sleep(1000);
            for (let k = 0; k < 8; k++) {
              currentUrl = await driver.getCurrentUrl();
              if (currentUrl.indexOf(gameUrlHost) === -1) {
                await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                await this.sleep(2000);
                logger.info("広告をクリックさせられたのでbackします");
              } else break;
            }
            if (await this.isExistEle(sele[3], true, 2000)) {
              let ele = await this.getEle(sele[3], 3000);
              await this.clickEle(ele, 2000, this.isMob ? 150 : 0);
              await this.ignoreKoukoku();
            }
            await this.hideOverlay();
            if (await this.isExistEle(sele[4], true, 2000)) {
              let ele = await this.getEle(sele[4], 3000);
              await this.clickEle(ele, 2000, this.isMob ? 150 : 0);
              await this.ignoreKoukoku();
            }
          } else if (await this.isExistEle(sele[3], true, 2000)) {
            let ele = await this.getEle(sele[3], 3000);
            await this.clickEle(ele, 2000, this.isMob ? 150 : 0);
            await this.ignoreKoukoku();
            if (await this.isExistEle(sele[4], true, 2000)) {
              let ele = await this.getEle(sele[4], 3000);
              await this.clickEle(ele, 2000, this.isMob ? 150 : 0);
              await this.ignoreKoukoku();
            }
          }
          res = D.STATUS.DONE;
        } else {
          res = D.STATUS.DONE;
          break;
        }
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
    return res;
  }

  async ignoreKoukoku() {
    await this.noTimeOutWrap(super.ignoreKoukoku.bind(this));
  }

  async getPoint() {
    let sele = ["#getpoint>a"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 1000);
    }
  }
  async doSearch(gameUrlHost, wid) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "a[href='/minigame/play']",
        "#box li[data-stat]>a>img",
        "#minigame_end a[href='/minigame']", // 2
        "img[src*='check_on.png']",
        "#scoreboard>a[href*='/top']", // 4
        "#menu a[href='/minigame']",
      ];
      if (this.isMob) sele[5] = "#mode_bar a[href='/minigame']";
      await this.ignoreKoukoku();
      await this.getPoint();
      // 3回やってるんだったら終わり
      if (await this.isExistEle(sele[3], true, 2000)) {
        return D.STATUS.DONE;
      }
      if (await this.isExistEle(sele[5], true, 2000)) {
        let ele = await this.getEle(sele[5], 3000);
        await this.clickEle(ele, 2000);
        await this.ignoreKoukoku();
      }
      for (let i = 0; i < 3; i++) {
        // スコアボード後、ここに戻る　２時間毎に３回チャレンジ可
        if (await this.isExistEle(sele[0], true, 2000)) {
          let wid2 = await driver.getWindowHandle();
          let ele = await this.getEle(sele[0], 3000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length * 2; // 最大でも
            for (let i = 0; i < limit; i++) {
              if (i != 0)
                if (await this.isExistEle(sele[1], true, 2000)) {
                  eles = await this.getEles(sele[1], 3000);
                } else break;
              await this.ignoreKoukoku();
              await this.clickEle(eles[0], 2000);
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 3000);
                await this.clickEle(ele, 2000);
              }
            }
          }
          await this.closeElesWindow([wid, wid2]);
          res = D.STATUS.DONE;
        } else break;
      }
    } catch (e) {
      logger.warn(e);
    } finally {
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
    return res;
  }
  async hideOverlay() {
    // let seleOver = ["div.overlay-item a.button-close", "#svg_close"];
    // for (let s of seleOver) {
    //   if (await this.isExistEle(s, true, 1000)) {
    //     let ele = await this.getEle(s, 1000);
    //     if (await ele.isDisplayed()) {
    //       await this.clickEle(ele, 1000);
    //     } else this.logger.debug("オーバーレイは表示されてないです");
    //   }
    // }
    let seleOver = [
      "#pfx_interstitial_close",
      "#gn_ydn_interstitial_btn",
      "div.overlay-item a.button-close",
      "#svg_close",
      "#gn_interstitial_close",
      "#gn_interstitial_outer_area",
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
        if (s == "#gn_interstitial_outer_area") {
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
}
exports.PartsFurufuru = PartsFurufuru;
