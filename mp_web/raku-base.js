const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class RakuBase extends BaseExecuter {
  code = D.CODE.RAKU;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let rakuCom = new RakuCommon(para);
    let islogin = await rakuCom.login();
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
            execCls = new RakuClick(para);
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
    let startPage = "https://www.rakuten-card.co.jp/e-navi/members/index.xhtml";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["#rakutenSuperPoints"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class RakuMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.RAKU;
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
class RakuCommon extends RakuMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "#rakutenSuperPoints";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      let seleInput = { id: "#u", pass: "#p", login: "#loginButton" };
      let seleInput2 = {
        id: "#loginInner_u",
        pass: "#loginInner_p",
        login: 'input[type="submit"]',
        birth: "#loginInner_birthday",
      };
      if (await this.isExistEle(seleInput.id, true, 2000)) {
        logger.debug(11102);
        for (let seleGroup of [seleInput, seleInput2]) {
          if (await this.isExistEle(seleGroup.id, true, 2000)) {
            // アカウント（メール）入力
            let inputEle = await this.getEle(seleGroup.id, 500);
            await inputEle.clear();
            await inputEle.sendKeys(account[this.code].loginid);
            // パスワード入力
            inputEle = await this.getEle(seleGroup.pass, 500);
            await inputEle.clear();
            await inputEle.sendKeys(account[this.code].loginpass);
            if (seleGroup.birth) {
              inputEle = await this.getEle(seleGroup.birth, 500);
              await inputEle.clear();
              await inputEle.sendKeys(account[this.code].birth);
            }
            let ele = await this.getEle(seleGroup.login, 1000);
            await this.clickEle(ele, 3000); // ログインボタン押下
          }
        }

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
class RakuClick extends RakuMissonSupper {
  firstUrl = "https://www.rakuten-card.co.jp/e-navi/members/index.xhtml";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = [
      ".rce-userDetails__linkItem a[href*='click-point']",
      "span.rce-number",
      "p.dateArrival img",  // 2
      "div.bnrBoxInner a>img",
      "ancestor::div[contains(@class, 'topArea')]"
    ];
    await this.openUrl(this.firstUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      if (await this.isExistElesFromEle(ele, sele[1], true, 2000)) {
        // 未クリック数があれば
        // ele = await this.getElesFromEle(ele, sele[1], 2000);
        await this.clickEleScrollWeak(ele, 4000, 90); // 遷移
        if (await this.isExistEle(sele[2], true, 2000)) {
          let eles = await this.getEles(sele[2], 2000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i != 0) eles = await this.getEles(sele[2], 2000);
            let ele2 = await this.getElesXFromEle(eles[0], sele[4], 2000);
            ele2 = await this.getElesFromEle(ele2[0], sele[3]);
            await this.clickEle(ele2[0], 4000);
            await this.closeOtherWindow(driver);
          }
        }
      }
      res = D.STATUS.DONE;
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
exports.RakuCommon = RakuCommon;
exports.Raku = RakuBase;
