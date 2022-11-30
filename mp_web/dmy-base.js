const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class DmyBase extends BaseExecuter {
  code = D.CODE.DMY;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let dmyCom = new DmyCommon(para);
    let islogin = await dmyCom.login();
    if (islogin) {
      // cm系のミッションはまとめてやるため、ここでは1つ扱いのダミーミッションにする
      let cmMissionList = this.missionList.filter((m) => m.main.indexOf("cm_") === 0);
      this.missionList = this.missionList.filter((m) => m.main.indexOf("cm_") === -1);
      if (cmMissionList.length) this.missionList.push({ main: D.MISSION.CM });
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CLICK:
            execCls = new DmyClick(para);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          if (mission.main != D.MISSION.CM) {
            await this.updateMissionQue(mission, res, this.code);
          }
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://d-money.jp/mall";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["span.p-dmoney-header-small__amount__balance"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class DmyMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.DMY;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["div.mall-popup-close>img"];
    if (await this.isExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
}
// このサイトの共通処理クラス
class DmyCommon extends DmyMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.p-dmoney-header-small__amount__balance";

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = ".p-header-login p>a";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        seleLoginLink = "form[action*='login/ameba']>input";
        if (await this.isExistEle(seleLoginLink, true, 2000)) {
          logger.debug(11102 - 2);
          ele = await this.getEle(seleLoginLink, 2000);
          await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
          let seleInput = {
            id: "input[name='accountId']",
            pass: "input[name='password']",
            login: "input.c-btn--primary",
          };
          // アカウント（メール）入力
          let inputEle = await this.getEle(seleInput.id, 500);
          await inputEle.clear();
          await inputEle.sendKeys(account[this.code].loginid);

          // パスワード入力
          inputEle = await this.getEle(seleInput.pass, 500);
          await inputEle.clear();
          await inputEle.sendKeys(account[this.code].loginpass);

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
      } else {
        // 未ログインで、ログインボタンが見つかりません。
        return;
      }
    } else logger.debug("ログイン中なのでログインしません");
    return true;
  }
}
// クリック
class DmyClick extends DmyMissonSupper {
  firstUrl = "https://d-money.jp/mall";
  targetUrl = "https://pointi.jp/daily.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    await this.openUrl(this.firstUrl); // 操作ページ表示
    await this.hideOverlay();
    let sele = ["a[href*='lo.ameba.jp'] img", "li.item img"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      await this.clickEle(ele, 4000);
      if (await this.isExistEle(sele[1], true, 2000)) {
        let eles = await this.getEles(sele[1], 2000);
        let indexList = [];
        for (let i = 0; i < eles.length; i++) {
          indexList.push(i);
        }
        for (let i = 0; i < 3; i++) {
          choiceNum = libUtil.getRandomInt(0, indexList.length);
          await this.clickEle(eles[indexList[choiceNum]], 3000);
          indexList.splice(choiceNum, 1); // 添え字リストから今使った添え字を削除
        }
      }
      res = D.STATUS.DONE;
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
exports.DmyCommon = DmyCommon;
exports.Dmy = DmyBase;
