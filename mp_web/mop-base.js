const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");
const { PartsCmManage } = require("./parts/parts-cm-manage.js");

class MopBase extends BaseExecuter {
  code = D.CODE.MOP;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let mopCom = new MopCommon(para);
    let islogin = await mopCom.login();
    if (islogin) {
      // cm系のミッションはまとめてやるため、ここでは1つ扱いのダミーミッションにする
      let cmMissionList = this.missionList.filter((m) => m.main.indexOf("cm_") === 0);
      this.missionList = this.missionList.filter((m) => m.main.indexOf("cm_") === -1);
      if (cmMissionList.length) {
        this.missionList.push({ main: D.MISSION.CM });
      }
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CLICK:
            execCls = new MopClick(para);
            break;
          case D.MISSION.QUIZ_DAILY:
            execCls = new MopQuizDaily(para);
            break;
          case D.MISSION.EITANGO:
            execCls = new MopEitango(para);
            break;
          case D.MISSION.ANZAN:
            execCls = new MopAnzan(para);
            break;
          case D.MISSION.NANYOUBI:
            execCls = new MopNanyoubi(para);
            break;
          case D.MISSION.CM:
            execCls = new MopCm(para, cmMissionList);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          if (mission.main != D.MISSION.CM) {
            await this.updateMissionQue(mission, res, this.isMob ? "m_" + this.code : this.code);
          }
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let pointPage = "https://pc.moppy.jp/mypage/";
    await this.openUrl(pointPage); // 操作ページ表示
    await this.driver.sleep(3000);
    let sele = ["p.a-point__point"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.driver.findElement(By.css(sele[0]));
      let nakedNum = await ele.getText();
      nakedNum = nakedNum.split("\t").join("");
      nakedNum = nakedNum.split("\n").join("");
      nakedNum = nakedNum.split("ポイントGET!!").join("");
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class MopMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.MOP;
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["div.overlay-item a.button-close"];
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
  async exchange(minExcNum) {
    let exSele = [
      "a.stamp__btn[href*='exchange']",
      "input.exchange__btn",
      "a.stamp__btn.stamp__btn-return",
      "p.stamp__num",
    ];
    if (await this.isExistEle(exSele[3], true, 2000)) {
      let ele = await this.getEle(exSele[3], 3000);
      let stampStr = await ele.getText();
      let stampNum = stampStr.substr(1);
      if (Number(stampNum) < minExcNum) return;
    }
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
// このサイトの共通処理クラス
class MopCommon extends MopMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "p.a-preface--personal__name"; // ポイント数のセレクタでもあります
    if (this.isMob) seleIsLoggedIn = "#header_user_point";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "a.a-btn__login";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000, 10); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input[name='mail']",
          pass: "input[name='pass']",
          login: "button.a-btn__login",
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
class MopClick extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await this.openUrl(this.targetUrl); // 操作ページ表示

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
    return D.STATUS.DONE;
    // return await this.ChirashiCls.do(this.targetUrl);
  }
}
const { PartsQuizDaily } = require("./parts/parts-quiz-daily.js");
// デイリークイズ
class MopQuizDaily extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
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
class MopEitango extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
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
      await this.openUrl(this.targetUrl); // 操作ページ表示
      let sele = [
        "a[data-ga-label='英単語TEST']",
        "input.ui-button-start",
        "label.ui-label-radio",
        "input.ui-button-answer",
        "input.ui-button-result",
        "a.ui-button-close",
        "input.ui-button-end",
      ];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(6);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000, 0, this.isMob);
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
          await this.hideOverlay(); // オーバレイあり。消す
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
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
class MopNanyoubi extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
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
      await this.openUrl(this.targetUrl); // 操作ページ表示
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
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(5);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000, 0, this.isMob);
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
          await this.hideOverlay(); // オーバレイあり。消す
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
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
class MopAnzan extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
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
      await this.openUrl(this.targetUrl); // 操作ページ表示
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
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(5);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000, 0, this.isMob);
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
          await this.hideOverlay(); // オーバレイあり。消す
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
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
class MopCm extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["a[data-ga-label='CMくじ']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://moppy.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}

// module.
exports.MopCommon = MopCommon;
// module.
exports.Mop = MopBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
