const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;
const { libUtil } = require("../../lib/util.js");

class PartsQuizDaily extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
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
      sele[0] = siteInfo.code == D.CODE.CMS ? "img[alt='DAILYQUIZ']" : sele[0];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        // TODO スタンプ交換
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          // await this.clickEle(ele, 2000);
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
                await this.clickEle(ele, 2000); // 回答する
                await this.hideOverlay(); // オーバレイあり。消す
                // 回答結果
                if (await this.isExistEle(sele[4], true, 3000)) {
                  ele = await this.getEle(sele[4], 3000);
                  await this.clickEle(ele, 2000); // 次のページ
                  await this.hideOverlay(); // オーバレイあり。消す
                }
              }
            } else if (await this.isExistEle(sele[5], true, 2000)) {
              ele = await this.getEle(sele[5], 3000);
            }
          }
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000); // 次のページ
            await driver.close(); // このタブを閉じて
            // 元のウインドウIDにスイッチ
            await driver.switchTo().window(wid);
            res = D.STATUS.DONE;
          }
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
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
exports.PartsQuizDaily = PartsQuizDaily;