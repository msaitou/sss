const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class CriBase extends BaseExecuter {
  code = D.CODE.CRI;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let gmyCom = new CriCommon(para);
    let islogin = await gmyCom.login();
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
          case D.MISSION.CM:
            execCls = new CriCm(para, cmMissionList);
            break;
          case D.MISSION.CLICK:
            execCls = new CriClick(para);
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
    let startPage = "https://www.chobirich.com/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["p.g-navi__user__pt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      nakedNum.split("\n").join("");
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum.trim());
    }
  }
}
class CriMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.CRI;
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
class CriCommon extends CriMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "p.g-navi__user__pt";

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "label[data-for='login']";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleLoginLink2 = "a[href='/account/login/']";
        if (await this.isExistEle(seleLoginLink2, true, 2000)) {
          logger.debug(11102);
          let ele = await this.getEle(seleLoginLink2, 2000);
          await this.clickEle(ele, 2000); // ログイン入力画面へ遷移

          let seleInput = {
            id: "input[name='form[uid]']",
            pass: "input[name='form[pswd]']",
            login: "input.to_login_btn",
          };
          // アカウント（メール）入力
          let inputEle = await this.getEle(seleInput.id, 500);
          await inputEle.clear();
          inputEle.sendKeys(account[this.code].loginid);

          // パスワード入力
          inputEle = await this.getEle(seleInput.pass, 500);
          await inputEle.clear();
          inputEle.sendKeys(account[this.code].loginpass);

          let seleRecap = {
            // panel_iframe: "iframe[title*='reCAPTCHA ']", // Linuxだけかも
            panel_iframe: "iframe[title*='recaptcha']", // winだけかも
            panel: "[name='recaptcha']", // 適当
            auth_iframe: "div.g-recaptcha div iframe",
            auth: "div.recaptcha-checkbox-border",
          };
          // 私はロボットではありませんチェック　オン
          // その前に、frameが違うので、recaptchaのフレームに切り替える
          // <iframe title="reCAPTCHA" src="https://www.recaptcha.net/recaptcha/api2/anchor?ar=1&amp;k=6Le4XxITAAAAAPglAF9EweDm7t1UM-IA9lHKP3ye&amp;co=aHR0cHM6Ly9wZXguanA6NDQz&amp;hl=ja&amp;v=Ixi5IiChXmIG6rRkjUa1qXHT&amp;size=normal&amp;cb=agnd7j2qgvem" width="304" height="78" role="presentation" name="a-6edalsgmrj9e" frameborder="0" scrolling="no" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox"></iframe>
          let iframe = await this.getEle(seleRecap.auth_iframe, 1000);
          await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
          inputEle = await this.getEle(seleRecap.auth, 1000);
          await inputEle.click();
          // もとのフレームに戻す
          await driver.switchTo().defaultContent();
          if (await this.isExistEle(seleRecap.panel_iframe, true, 2000)) {
            let res = await this.driver.findElement(By.css(seleRecap.panel_iframe)).isDisplayed();
            if (res) {
              // 画層識別が表示されたらログインを諦めて、メールを飛ばす
              logger.info("RECAPTCHA発生　手動でログインして！");
              await mailOpe.send(logger, {
                subject: `ログインできません[${this.code}] RECAPTCHA発生`,
                contents: `${this.code} にログインできません`,
              });
              return;
            }
          }

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
        }
      } else {
        // 未ログインで、ログインボタンが見つかりません。
        return;
      }
    } else logger.debug("ログイン中なのでログインしません");
    return true;
  }
}

const { PartsCmManage } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class CriCm extends CriMissonSupper {
  firstUrl = "https://dietnavi.com/pc/";
  targetUrl = "https://dietnavi.com/pc/game/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='pic_cmkuji.gif']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://dietnavi.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
// クリック
class CriClick extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://dietnavi.com/pc/daily_click.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let sele = ["div.tokusen_bnr a img", ".clickstamp_list a img", ".clickstamp_list a img"];
    let urlList = [
      this.firstUrl,
      "https://www.chobirich.com/shopping/",
      "https://www.chobirich.com/earn/",
    ];
    for (let j = 0; j < sele.length; j++) {
      await this.openUrl(urlList[j]); // 操作ページ表示
      if (await this.isExistEle(sele[j], true, 2000)) {
        let eles = await this.getEles(sele[j], 2000);
        for (let i = 0; i < eles.length; i++) {
          await this.clickEleScrollWeak(eles[i], 4000, 70);
          await this.closeOtherWindow(driver);
        }
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
exports.CriCommon = CriCommon;
exports.Cri = CriBase;
