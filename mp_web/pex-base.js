const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PexBase extends BaseExecuter {
  code = D.CODE.PEX;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let pexCom = new PexCommon(para);
    let islogin = await pexCom.login();
    if (islogin) {
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CHIRASHI:
            execCls = new PexChirashi(para);
            break;
          case D.MISSION.NEWS:
            execCls = new PexNewsWatch(para);
            break;
          case D.MISSION.CM:
            execCls = new PexCm(para);
            break;
        }
        if (execCls) {
          this.writeLogMissionStart(mission.main);
          await this.updateMissionQueStart(mission);
          let res = await execCls.do();
          this.writeLogMissionEnd(mission.main, res);
          await this.updateMissionQue(mission, res, this.code);
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://pex.jp/";
    let pointPage = "https://pex.jp/user/point_passbook/all";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.get(pointPage);
    await this.driver.sleep(1000);
    let sele = ["dl.point_area>dd>span", "span.spend_p:not(.return-p)", 
      "div.status.s1", "ul.mypage-list>a"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.driver.findElement(By.css(sele[0]));
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);

      // 投資中分
      let toshiPage = "https://pex.jp/investments/portfolio"
      await this.driver.get(toshiPage);
      let anotherP = 0;
      if (await this.isExistEle(sele[3], true, 2000)) {
        let eles = await this.getEles(sele[3], 2000);
        for (let el of eles) {
          if (await this.isExistElesFromEle(el, sele[2], true)) {
            if (await this.isExistElesFromEle(el, sele[1], true)) {
              let ele2 = await this.getElesFromEle(el, sele[1]);
              let p = await ele2[0].getText();
              anotherP += Number(this.convertNumber(p));
            }
          }
        }
      }
      await this.pointSummary(this.code, nakedNum, null, anotherP);
    }
  }
}
class PexMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PEX;
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
}
// このサイトの共通処理クラス
class PexCommon extends PexMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.g-icon_point"; // ポイント数のセレクタでもあります

    // let ele = await driver.findElements(By.css(seleIsLoggedIn));
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li.header-mymenu_login>a";
      // logger.info(ele.length);
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await ele.click();
        await this.sleep(2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "#pex_user_login_email",
          pass: "#pex_user_login_password",
          login: "[type='submit'][name='commit']",
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
        await ele.click();
        this.sleep(4000);
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
const { PartsChirashi } = require("./parts/parts-chirashi.js");
// オリチラ
class PexChirashi extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
  targetUrl = "https://pex.jp/chirashi";
  ChirashiCls;
  constructor(para) {
    super(para);
    this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(this.firstUrl); // 最初のページ表示
    return await this.ChirashiCls.do(this.targetUrl);
  }
}
// みんなのNEWSウォッチ
class PexNewsWatch extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
  targetUrl = "https://pex.jp/point_news";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは朝7時から
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      await this.openUrl(this.targetUrl); // 操作ページ表示
      let sele = [
        "ul#point-action-0>li.pt.ungained",
        "div.panel_img",
        "td>input[type='submit']",
        "a>div.go_top",
        "ul#point-action-",
      ];
      if (this.isMob) sele[2] ="form>input[type='submit']";
      if (await this.isExistEle(sele[0], true, 2000)) {
        // let eles = await this.getEles(sele[0], 2000);
        // let repeatNum = eles.length === 3 ? 5 : eles.length === 2 ? 3 : 1;
        let eles;
        // 基本は5回ループ
        let repeatNum = 0;
        for (let i = 0; i < 6; i++) {
          let tmpSele = sele[4] + i;
          let tmpEle = await this.getEle(tmpSele, 2000);
          if (await tmpEle.isDisplayed()) {
            repeatNum = 5 - i;
            break;
          }
        }
        await this.hideOverlay2();
        let cnt = 0;
        for (let i = 0; i < repeatNum; i++) {
          eles = await this.getEles(sele[1], 2000);
          let selePart = ["div.panel_label>span.emo_action", "img"];
          for (let j = eles.length - 1; j >= 0; j--) {
            // なんか既読じゃなかったらみたいな条件あり
            if (await this.isExistElesFromEle(eles[j], selePart[0], false, 2000)) {
              await this.clickEle(eles[j], 2000, this.isMob ? 70 : 0); // 同一ページを切り替えてます
              await this.ignoreKoukoku();
              await this.hideOverlay2();
              if (await this.isExistEle(sele[2], true, 3000)) {
                // リアクションを選ぶ
                let eles1 = await this.getEles(sele[2], 5000);
                // ランダムで。
                let choiceNum = libUtil.getRandomInt(0, eles1.length);
                // クリック場所へスクロールが必要（画面に表示しないとだめぽい）
                await this.clickEle(eles1[choiceNum], 5000, this.isMob ? 120 : 0, this.isMob); // 同一ページを切り替えてます
                cnt++;
                await this.hideOverlay2();
                if (await this.isExistEle(sele[3], true, 2000)) {
                  let ele = await this.getEle(sele[3], 2000);
                  await this.clickEle(ele, 2000, this.isMob ? 120 : 0); // newsのトップページへ戻る
                  await this.ignoreKoukoku();
                  await this.hideOverlay2();
                  break;
                }
              }
            }
          }
        }
        if (repeatNum === cnt) {
          res = D.STATUS.DONE;
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
  async hideOverlay2() {
    let sele = ["div.fc-dialog button.fc-rewarded-ad-button", "ins iframe[title^='3rd']", "#dismiss-button"];
    if (await this.silentIsExistEle(sele[0], true, 4000)) {
      let ele = await this.getEle(sele[0], 1000);
      await this.clickEle(ele, 1000);
      if (await this.silentIsExistEle(sele[1], true, 2000)) {
        await this.sleep(15000);
        let iframe = await this.getEles(sele[1], 1000);
        await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
        for (let sele2 of [sele[2], sele[3]]) {
          if (await this.silentIsExistEle(sele2, true, 2000)) {
            let inputEle = await this.getEle(sele2, 1000);
            // if (await inputEle.isDisplayed()) {
            await this.exeScriptNoTimeOut(`arguments[0].click()`, inputEle);
            // await this.clickEle(inputEle, 2000, 0, true);
            // } else this.logger.debug("オーバーレイは表示されてないです");
            break;
          }
        }
        // もとのフレームに戻す
        await this.driver.switchTo().defaultContent();
      }
    }
    // if (await this.isExistEle(sele[0], true, 4000)) {
    //   let ele = await this.getEle(sele[0], 1000);
    //   await this.clickEle(ele, 1000);
    //   if (await this.isExistEle(sele[1], true, 2000)) {
    //     let iframe = await this.getEles(sele[1], 1000);
    //     await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
    //     let inputEle = await this.getEle(sele[2], 1000);
    //     await this.sleep(5000);
    //     // if (await inputEle.isDisplayed()) {
    //     await this.exeScriptNoTimeOut(`arguments[0].click()`, inputEle);
    //     // await this.clickEle(inputEle, 2000, 0, true);
    //     // } else this.logger.debug("オーバーレイは表示されてないです");
    //     // もとのフレームに戻す
    //     await this.driver.switchTo().defaultContent();
    //   }
    // }
  }
}
class PexCm extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
  targetUrl = "https://pex-pc.cmnw.jp/cm";
  // ChirashiCls;
  constructor(para) {
    super(para);
    // this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示

    this.answerCMPreAnq(driver, logger);
  }
}
// module.
exports.PexCommon = PexCommon;
// module.
exports.Pex = PexBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
