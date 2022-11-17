const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class CmsBase extends BaseExecuter {
  code = D.CODE.CMS;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let cmsCom = new CmsCommon(para);
    let islogin = await cmsCom.login();
    if (islogin) {
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.QUIZ_DAILY:
            execCls = new CmsQuizDaily(para);
            break;
          case D.MISSION.CLICK:
            execCls = new CmsClick(para);
            break;
          case D.MISSION.EITANGO:
            execCls = new CmsEitango(para);
            break;
          case D.MISSION.ANZAN:
            execCls = new CmsAnzan(para);
            break;
          case D.MISSION.NANYOUBI:
            execCls = new CmsNanyoubi(para);
            break;
          case D.MISSION.CM:
            execCls = new CmsCm(para);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          await this.updateMissionQue(mission, res, this.code);
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://www.cmsite.co.jp/top/home/";
    await this.driver.get(startPage);
    await this.driver.sleep(1000);
    let sele = ["p.menbertxt>span"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class CmsMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.CMS;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
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
// このサイトの共通処理クラス
class CmsCommon extends CmsMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "p.menbertxt>span"; // ポイント数のセレクタでもあります

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "ul#GuestMenu>li>a[href*='login']";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input#usermei",
          pass: "input[name='password']",
          login: "input#btn_send",
        };
        // アカウント（メール）入力
        let inputEle = await this.getEle(seleInput.id, 500);
        await inputEle.clear();
        inputEle.sendKeys(account[this.code].loginid);

        // パスワード入力
        inputEle = await this.getEle(seleInput.pass, 500);
        await inputEle.clear();
        inputEle.sendKeys(account[this.code].loginpass);

        ele = await this.getEle(seleInput.login, 1000);
        await this.clickEle(ele, 4000);
        // ログインできてるか、チェック
        if (await this.isExistEle(seleIsLoggedIn, true, 2000)) {
          // ログインできてるのでOK
          logger.info("ログインできました！");
          return true;
        } else {
          // ログインできてないので、メール
          logger.info("ログインできませんでした");
          await mailOpe.send(logger, {
            subject: `ログインできません[${this.code}] `,
            contents: `なぜか ${this.code} にログインできません`,
          });
          return;
        }
      } else {
        // 未ログインで、ログインボタンが見つかりません。
        return;
      }
    } else logger.debug("ログイン中なのでログインしません");
    return true;
  }
}
// クリック
class CmsClick extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await driver.get(this.firstUrl); // 最初のページ表示
    await driver.get(this.targetUrl); // 毎日貯めるのページ

    let sele = ["div.gamecontents__wrapper li.gamecontents__box>a>div", "#modal_detail"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 2000);
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 2000);
          await this.clickEle(ele, 4000);
          await this.closeOtherWindow(driver);
          // リフレッシュ
          await driver.navigate().refresh();
        }
      }
    }
    logger.info(`${this.constructor.name} END`);
    return true;
    // return await this.ChirashiCls.do(this.targetUrl);
  }
}
const { PartsQuizDaily } = require("./parts/parts-quiz-daily.js");

// デイリークイズ
class CmsQuizDaily extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://www.cmsite.co.jp/top/game/";
  QuizDaily;
  constructor(para) {
    super(para);
    this.QuizDaily = new PartsQuizDaily(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日3回（0時～8時～16時）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START###`);
    let res = await this.QuizDaily.do(this.targetUrl);
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}

// 英単語
class CmsEitango extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日2回（0時～12時）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let res = D.STATUS.FAIL;
    try {
      await driver.get(this.firstUrl); // 最初のページ表示
      await driver.get(this.targetUrl); // 操作ページ表示
      let sele = [
        "a[data-ga-label='英単語TEST']",

        "input.ui-button-start",
        "label.ui-label-radio",
        "input.ui-button-answer",
        "input.ui-button-result",
        "a.ui-button-close",
        "input.ui-button-end",
      ];
      // TODO スタンプ交換

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
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
            logger.info(`${this.constructor.name} END`);
          }
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
// 何曜日
class CmsNanyoubi extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日2回（0時～12時）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let res = D.STATUS.FAIL;
    try {
      await driver.get(this.firstUrl); // 最初のページ表示
      await driver.get(this.targetUrl); // 操作ページ表示
      let sele = [
        "a[data-ga-label='この日何曜日？']",

        "input.ui-button-start",
        "label.ui-label-radio",
        "input.ui-button-answer",
        "input.ui-button-result",
        "a.ui-button-close",
        "input.ui-button-end",
        "div.ui-item-header>h2.ui-item-title",
      ];
      // TODO スタンプ交換

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000);
          // 8問あり
          for (let i = 0; i < 8; i++) {
            let eles;
            if (await this.isExistEle(sele[2], true, 2000)) {
              eles = await this.getEles(sele[2], 2000);
              // 問題から曜日を換算して、選択
              if (await this.isExistEle(sele[7], true, 3000)) {
                ele = await this.getEle(sele[7], 2000);
                let text = await ele.getText();
                logger.info(`${text}`);
                let regex = "今日の(\\d+)日後は何曜日？";
                let matches = text.match(regex);
                logger.info(`${matches[1]}は、`);
                let selectYoubi = libUtil.getNanyoubi(matches[1]);
                logger.info(`${selectYoubi}です`);
                await this.clickEle(eles[selectYoubi], 2000);
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
            logger.info(`${this.constructor.name} END`);
          }
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
// 暗算
class CmsAnzan extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // 1日2回（0時～12時）
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let res = D.STATUS.FAIL;
    try {
      await driver.get(this.firstUrl); // 最初のページ表示
      await driver.get(this.targetUrl); // 操作ページ表示
      let sele = [
        "a[data-ga-label='ANZAN']",

        "input.ui-button-start",
        "label.ui-label-radio",
        "input.ui-button-answer",
        "input.ui-button-result",
        "a.ui-button-close",
        "input.ui-button-end",
        "div.ui-item-header>h2.ui-item-title",
      ];
      // TODO スタンプ交換

      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.sleep(2000);
          await this.clickEle(ele, 2000);
          // 10問あり
          for (let i = 0; i < 10; i++) {
            let eles;
            if (await this.isExistEle(sele[2], true, 2000)) {
              eles = await this.getEles(sele[2], 2000);
              // 計算式から答えを評価して、選択
              if (await this.isExistEle(sele[7], true, 3000)) {
                ele = await this.getEle(sele[7], 2000);
                let calculation = await ele.getText();
                let regex = "(\\d) ([-×+÷]) (\\d) ([-×+÷]) (\\d)";
                let matches = calculation.match(regex);
                logger.info(`${matches}`);
                let calcResult = libUtil.calcAnzan(matches, logger);
                let selectIndex = 0;
                // 答えと一致する選択肢を探す
                for (let j = 0; j < eles.length; j++) {
                  let radioText = await eles[j].getText();
                  if (Number(radioText) == calcResult) {
                    selectIndex = j;
                    break;
                  }
                }
                await this.clickEle(eles[selectIndex], 2000);
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
            logger.info(`${this.constructor.name} END`);
          }
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
class CmsCm extends CmsMissonSupper {
  firstUrl = "https://www.cmsite.co.jp/top/home/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  // ChirashiCls;
  constructor(para) {
    super(para);
    // this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(this.firstUrl); // 最初のページ表示
    await driver.get(this.targetUrl); // 操作ページ表示

    this.answerCMPreAnq(driver, logger);
  }
}
// module.
exports.CmsCommon = CmsCommon;
// module.
exports.Cms = CmsBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
