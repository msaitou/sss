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
          case D.MISSION.ANQ_PARK:
            execCls = new MopAnqPark(para);
            break;
          case D.MISSION.RESEARCH1:
            execCls = new MopResearch1(para, cmMissionList);
            break;
          case D.MISSION.ANQ_HAPPY:
            execCls = new MopAnqHappy(para, cmMissionList);
            break;
          case D.MISSION.KANJI:
            execCls = new MopKanji(para);
            break;
          case D.MISSION.GAME_FURUFURU:
            execCls = new MopGameFurufuru(para);
            break;
          case D.MISSION.GAME_FURUFURU_SEARCH:
            execCls = new MopGameFurufuruSearch(para);
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
      "a.stamp__btn-return",
      "p.stamp__num",
    ];
    // if (this.isMob) return; // めんどくさいのでリターン
    if (await this.isExistEle(exSele[3], true, 2000)) {
      let ele = await this.getEle(exSele[3], 3000);
      let stampStr = await ele.getText();
      let stampNum = stampStr.substr(1);
      if (Number(stampNum) < minExcNum) return;
    }
    await this.hideOverlay();
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
        "input.ui-button-answer", // 3
        "input.ui-button-result",
        "a.ui-button-close", // 5
        "input.ui-button-end",
      ];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(6);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000, 0, this.isMob);
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
          await this.hideOverlay(); // オーバレイあり。消す
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            res = D.STATUS.DONE;
            logger.info(`${this.constructor.name} END`);
          }
        } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
      }
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
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000, 0, this.isMob);
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
                  await this.clickEle(ele, 2000, 0, this.isMob); // 回答する
                  await this.hideOverlay(); // オーバレイあり。消す
                  // 回答結果
                  if (await this.isExistEle(sele[4], true, 3000)) {
                    ele = await this.getEle(sele[4], 3000);
                    await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
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
            await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            res = D.STATUS.DONE;
            logger.info(`${this.constructor.name} END`);
          }
        } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
      }
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
        await this.hideOverlay(); // オーバレイあり。消す
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(5);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.sleep(2000);
          await this.clickEle(ele, 2000, 0, this.isMob);
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
                  await this.clickEle(ele, 2000, 0, this.isMob); // 回答する
                  await this.hideOverlay(); // オーバレイあり。消す
                  // 回答結果
                  if (await this.isExistEle(sele[4], true, 3000)) {
                    ele = await this.getEle(sele[4], 3000);
                    await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
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
            await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            res = D.STATUS.DONE;
            logger.info(`${this.constructor.name} END`);
          }
        } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
      }
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
const { PartsFurufuru } = require("./parts/parts-furufuru.js");
// ふるふる
class MopGameFurufuru extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["a[data-ga-label='ふるふるモッピー']"];
    let gameUrlHost = "https://moppy.dropgame.jp/";
    if (this.isMob) gameUrlHost = "https://moppy-sp.dropgame.jp/";
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEleScrollWeak(eles[0], 2000, 100);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doFuru(gameUrlHost, wid);
    }
    return res;
  }
}
// ふるふるの探し
class MopGameFurufuruSearch extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/gamecontents/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["a[data-ga-label='ふるふるモッピー']"];
    let gameUrlHost = "https://moppy.dropgame.jp/";
    if (this.isMob) gameUrlHost = "https://moppy-sp.dropgame.jp/";
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEleScrollWeak(eles[0], 2000, 100);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doSearch(gameUrlHost, wid);
    }
    return res;
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク mobile用
class MopAnqPark extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/enquete/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = [
      "a[data-ga-label='アンケートパーク']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a", // 2
      "td>form>input[name='submit']",
    ];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 3000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
              eles = await this.getEles(sele[1], 3000);
            let text = await eles[eles.length - 1].getText();
            text = text.split("\n").join("").split("\n").join("");
            if (await this.isExistEle(sele[2], true, 2000)) {
              let eles2 = await this.getEles(sele[2], 3000);
              await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
              let ele = eles2[eles.length - 1];
              let ele2 = null;
              try {
                ele2 = await this.getElesXFromEle(ele, "ancestor::tr");
                ele2 = await this.getElesFromEle(ele2[0], sele[3]);
              } catch (e) {
                logger.debug(e);
              }
              if (ele2 && ele2.length) ele = ele2[0]; // 回答ボタンが実際別の場合が半分くらいあるので置き換え
              await this.clickEle(ele, 3000);
              switch (text.trim()) {
                case "MIX":
                  res = await AnkPark.doMobMix();
                  break;
                // case "偉人":
                //   res = await AnkPark.doMobIjin();
                //   break;
                case "ひらめき":
                  res = await AnkPark.doMobHirameki();
                  break;
                case "漫画":
                  res = await AnkPark.doMobManga();
                  break;
                case "動物図鑑":
                  res = await AnkPark.doMobZukan();
                  break;
                case "コラム":
                  res = await AnkPark.doMobColum();
                  break;
                case "日本百景":
                  res = await AnkPark.doMobJapan();
                  break;
                case "観察力":
                  res = await AnkPark.doMobSite();
                  break;
                case "料理":
                  res = await AnkPark.doMobCook();
                  break;
                case "写真":
                  res = await AnkPark.doMobPhoto();
                  break;
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          }
        } else {
          res = D.STATUS.DONE;
        }
      } catch (e) {
        logger.warn(e);
      } finally {
        await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
}
const { PartsResearch1 } = require("./parts/parts-research1.js");
// リサーチ1　mobile用
class MopResearch1 extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/enquete/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START###`);
    await this.openUrl(this.targetUrl); // 最初のページ表示
    let sele = [
      "a[data-ga-label='ポイントリサーチ']",
      "ol.ui-list>li a",
      ".enquete-list td.status>a", // 2
      "td>form>input[name='submit']",
    ];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 2000);
      let Research1 = new PartsResearch1(this.para);
      res = await Research1.doMobMop();
    }
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}
// ハッピーアンケート mobile用
class MopAnqHappy extends MopMissonSupper {
  firstUrl = "https://pc.moppy.jp/";
  targetUrl = "https://pc.moppy.jp/enquete/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START###`);
    await this.openUrl(this.targetUrl); // 最初のページ表示
    let sele = [
      "#koffice_surveys td>a",
      "div.question-box a",
      "a.next-button", // 2
      "input.submit-button",
      ".answer-list>p", // 4
      "#next-button:not([style*='display: none'])",
      "a[data-ga-label='アンケートランド']", // 6
      ".answer-list label",
      "div.question-title", // 8
    ];
    let res = D.STATUS.FAIL;
    let skip = 0; // バグって完了できないやつがあるのでスキップ
    if (await this.isExistEle(sele[6], true, 2000)) {
      let ele = await this.getEle(sele[6], 3000);
      await this.clickEle(ele, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 3000);
          let limit = eles.length < 50 ? eles.length : 50;
          for (let j = 0; j < limit; j++) {
            let wid2 = await driver.getWindowHandle();
            if (await this.isExistEle(sele[8], true, 2000)) {
              eles = await this.getEles(sele[8], 3000);
              let title = await eles[skip].getText();
              if (
                [
                  "書店について",
                  "好きな飲み物に関して",
                  "キャラクターに関するアンケート",
                  "自分の人生観、人間関係に関するアンケート",
                ].indexOf(title) > -1
              ) {
                skip++;
                continue;
              }
            }
            if (await this.isExistEle(sele[1], true, 2000)) {
              // for (let i = 0; i < 9; i++) {
              //   // 隠れてるので全部オープン
              //   if (await this.isExistEle(sele[5], true, 2000)) {
              //     let ele = await this.getEle(sele[5], 3000);
              //     await this.clickEle(ele, 3000);
              //   } else break;
              // }
              // eles = await this.getEles(sele[1], 10000);
              // await this.clickEle(eles[eles.length -1], 3000);
              eles = await this.getEles(sele[1], 3000);
              await this.clickEle(eles[skip], 3000);
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 3000);
                // await this.clickEle(ele, 3000, 500, this.isMob);
                await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
                await this.sleep(2000);
                await this.closeElesWindowAndAlert([wid, wid2]);
                let isStartPage = true;
                for (let i = 0; i < 30; i++) {
                  let currentUrl = await driver.getCurrentUrl();
                  // 広告が画面いっぱいに入る時がある
                  if (currentUrl.indexOf("https://moppy.enquete.vip/") === -1) {
                    await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                    await this.sleep(2000);
                    logger.info("広告をクリックさせられたのでbackします");
                    let iBreak = false;
                    for (let k = 0; k < 5; k++) {
                      currentUrl = await driver.getCurrentUrl();
                      if (currentUrl.indexOf("https://moppy.enquete.vip/") === -1) {
                        await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                        await this.sleep(2000);
                        logger.info("広告をクリックさせられたのでbackします");
                      } else {
                        currentUrl = await driver.getCurrentUrl();
                        if (currentUrl.indexOf("https://moppy.enquete.vip/start") === 0) {
                          await driver.navigate().back(); // 一覧からやり直す
                          await this.sleep(2000);
                          iBreak = true;
                        } else if (currentUrl.indexOf("https://moppy.enquete.vip/question") === 0) {
                          // ナニモシナイ
                        } else if (isStartPage) iBreak = true;
                        break;
                      }
                    }
                    if (iBreak) break;
                    await driver.navigate().refresh(); // 画面更新
                    await this.sleep(2000);
                    i--;
                  }
                  if (await this.isExistEle(sele[4], true, 2000)) {
                    isStartPage = false;
                    let ele = await this.getEle(sele[4], 3000);
                    let q = await ele.getText();
                    logger.info(`${i}つ目 ${q}`);
                    let choiceNum = 0;
                    let keyIndex = -1;
                    [
                      "性別",
                      "年齢",
                      "住んでいる地方は", // 2
                    ].some((key, i) => {
                      if (q.indexOf(key) > -1) {
                        keyIndex = i;
                        return true;
                      }
                    });
                    switch (keyIndex) {
                      case 0:
                        break;
                      case 1:
                        choiceNum = 3;
                        break;
                      case 2:
                        choiceNum = 2;
                        break;
                      default:
                        choiceNum = -1;
                    }
                    if (await this.isExistEle(sele[7], true, 2000)) {
                      let eles = await this.getEles(sele[7], 3000);
                      if (choiceNum === -1) choiceNum = libUtil.getRandomInt(0, eles.length);
                      if (choiceNum >= eles.length) choiceNum = eles.length - 1;
                      // await this.clickEle(eles[choiceNum], 3000, 500);
                      await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[choiceNum]);
                      await this.sleep(2000);
                      let done = await this.closeElesWindowAndAlert([wid, wid2]);
                      if (await this.isExistEle(sele[3], true, 2000)) {
                        let ele = await this.getEle(sele[3], 3000);
                        // await this.clickEle(ele, 3000, 500, this.isMob);
                        await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
                        await this.sleep(2000);
                        if ((await this.closeElesWindowAndAlert([wid, wid2])) || done) i--;
                      }
                    }
                  } else if (isStartPage) {
                    if (await this.isExistEle(sele[2], true, 2000)) {
                      ele = await this.getEle(sele[2], 3000);
                      // await this.clickEle(ele, 3000, 500, this.isMob);
                      await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
                      await this.sleep(2000);
                      await this.closeElesWindowAndAlert([wid, wid2]);
                      i--;
                      continue;
                    }
                  } else break;
                }
                if (await this.isExistEle(sele[2], true, 2000)) {
                  let ele = await this.getEle(sele[2], 3000);
                  // await this.clickEle(ele, 3000, 500, this.isMob);
                  await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
                  await this.sleep(2000);
                  await this.closeElesWindowAndAlert([wid, wid2]);
                } else {
                  skip++;
                  await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                  await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
                  if (await this.isExistEle(sele[6], true, 2000)) {
                    ele = await this.getEle(sele[6], 3000);
                    await this.clickEle(ele, 3000);
                    await this.changeWindow(wid); // 別タブに移動する
                  }
                }
              }
            }
          }
        }
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      } finally {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        // await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
      }
    }
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}
// 漢字　mobile用
class MopKanji extends MopMissonSupper {
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
        "a[data-ga-label='漢字テスト']",
        "input.ui-button-start",
        "label.ui-label-radio", // 2
        "input.ui-button-answer",
        "input.ui-button-result", // 4
        "a.ui-button-close",
        "input.ui-button-end",
        ".ui-item-title",
      ];
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 3000);
        await this.clickEle(ele, 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        if (await this.isExistEle(sele[1], true, 2000)) await this.exchange(3);
        if (await this.isExistEle(sele[1], true, 3000)) {
          ele = await this.getEle(sele[1], 3000);
          await this.clickEle(ele, 2000, 0, this.isMob);
          // 10問あり
          for (let i = 0; i < 10; i++) {
            let eles;
            if (await this.isExistEle(sele[2], true, 2000)) {
              eles = await this.getEles(sele[2], 2000);
              // 問題から読み仮名を変換して、選択
              if (await this.isExistEle(sele[7], true, 3000)) {
                ele = await this.getEle(sele[7], 2000);
                let text = await ele.getText();
                logger.info(`${text}`);
                let selectIndex = libUtil.getRandomInt(0, eles.length);
                let yomiResult = await libUtil.kanjiToKana(text);
                // 答えと一致する選択肢を探す
                for (let j = 0; j < eles.length; j++) {
                  let radioText = await eles[j].getText();
                  if (radioText == yomiResult) {
                    selectIndex = j;
                    break;
                  }
                }
                await this.clickEle(eles[selectIndex], 2000);
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
              }
            } else if (await this.isExistEle(sele[5], true, 2000)) {
              ele = await this.getEle(sele[5], 3000);
              await this.clickEle(ele, 2000, 0, this.isMob); // エラーで閉じる
            }
          }
          await this.hideOverlay(); // オーバレイあり。消す
          if (await this.isExistEle(sele[6], true, 2000)) {
            ele = await this.getEle(sele[6], 3000);
            await this.clickEle(ele, 2000, 0, this.isMob); // 次のページ
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            res = D.STATUS.DONE;
            logger.info(`${this.constructor.name} END`);
          }
        } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}

exports.MopCommon = MopCommon;
exports.Mop = MopBase;
