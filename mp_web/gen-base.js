const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class GenBase extends BaseExecuter {
  code = D.CODE.GEN;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let gmyCom = new GenCommon(para);
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
            execCls = new GenCm(para, cmMissionList);
            break;
          case D.MISSION.RESEARCH1:
            execCls = new GenResearch1(para, cmMissionList);
            break;
          case D.MISSION.ANQ_GEN:
            execCls = new GenAnq(para, cmMissionList);
            break;
          case D.MISSION.CLICK:
            execCls = new GenClick(para);
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
    let sele = ["#account_pt>span"];
    let startPage = "https://www.gendama.jp/";
    if (this.isMob) {
      sele[0] = "#hdr_pt";
      startPage = "https://www.gendama.jp/sp";
    }
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class GenMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.GEN;
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
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
}
// このサイトの共通処理クラス
class GenCommon extends GenMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let seleIsLoggedIn = "#account_pt>span";
    let startPage = siteInfo.entry_url;
    if (this.isMob) {
      seleIsLoggedIn = "#hdr_pt";
      startPage = "https://www.gendama.jp/sp";
    }
    await driver.get(startPage); // エントリーページ表示
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "a.btn_login";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input[name='rwsid']",
          pass: "input[name='pass']",
          login: "input[name='login_page']",
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
class GenCm extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/bingo/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["ul.top_contents.stripeY a[href='/cmkuji/']"];
    if (this.isMob) {
      await this.openUrl("https://www.gendama.jp/sp/everyday_point"); // 操作ページ表示
      sele = ["a[href*='/cmkuji/']>p>img"];
      // await driver.executeScript("window.scrollTo(0, 200);");
      // await this.sleep(1000);
    } else await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://gendama.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsResearch1 } = require("./parts/parts-research1.js");
// リサーチ1
class GenResearch1 extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START###`);
    await this.openUrl(this.targetUrl); // 最初のページ表示
    let sele = ["#gnavi a[href='/survey']"];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 2000);
      // let wid = await driver.getWindowHandle();
      // await this.changeWindow(wid); // 別タブに移動する
      let Research1 = new PartsResearch1(this.para);
      res = await Research1.doGen();
    }
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}
// クリック
class GenClick extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/forest/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START###`);
    await this.openUrl(this.targetUrl); // 最初のページ表示
    let sele = ["img[src*='forest_bt1']", "img[src*='star.gif']"];
    let res = D.STATUS.FAIL;
    try {
      if (await this.isExistEle(sele[0], true, 2000)) {
        let eles = await this.getEles(sele[0], 3000);
        for (let i = 0; i < eles.length; i++) {
          await this.clickEle(eles[i], 2000);
          await this.closeOtherWindow(driver);
        }
      }
      if (await this.isExistEle(sele[1], true, 2000)) {
        let eles = await this.getEles(sele[1], 3000);
        for (let i = 0; i < eles.length; i++) {
          await this.clickEle(eles[i], 2000);
          await this.closeOtherWindow(driver);
        }
      }
      res = D.STATUS.DONE;
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}
// ハッピーアンケート
class GenAnq extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/survey";
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
      "ul>li>a[data-type='crossmarketing_surveys']", // 6
      ".answer-list label",
      "",
    ];
    let res = D.STATUS.FAIL;
    let skip = 0; // バグって完了できないやつがあるのでスキップ
    if (await this.isExistEle(sele[6], true, 2000)) {
      let ele = await this.getEle(sele[6], 3000);
      await this.clickEle(ele, 3000);
      if (await this.isExistEle(sele[0], true, 2000)) {
        let eles = await this.getEles(sele[0], 3000);
        await this.clickEle(eles[0], 2000);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 2000)) {
            eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let j = 0; j < limit; j++) {
              if (j < 4) {
                skip++;
                continue;
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
                  let ele = await this.getEle(sele[2], 3000);
                  await this.clickEle(ele, 3000);
                  for (let i = 0; i < 30; i++) {
                    if (await this.isExistEle(sele[4], true, 2000)) {
                      let ele = await this.getEle(sele[4], 3000);
                      let q = await ele.getText();
                      logger.info(`${i}つ目 ${q}`);
                      let choiceNum = 0;
                      switch (q.trim()) {
                        case "性別は":
                          break;
                        case "年齢は":
                          choiceNum = 3;
                          break;
                        case "住んでいる地方は":
                          choiceNum = 2;
                          break;
                        default:
                          choiceNum = -1;
                      }
                      if (await this.isExistEle(sele[7], true, 2000)) {
                        let eles = await this.getEles(sele[7], 3000);
                        if (choiceNum === -1) choiceNum = libUtil.getRandomInt(0, eles.length);
                        await this.clickEle(eles[choiceNum], 3000);
                        if (await this.isExistEle(sele[3], true, 2000)) {
                          let ele = await this.getEle(sele[3], 3000);
                          await this.clickEle(ele, 3000);
                        }
                      }
                    } else break;
                  }
                  if (await this.isExistEle(sele[2], true, 2000)) {
                    let ele = await this.getEle(sele[2], 3000);
                    await this.clickEle(ele, 3000);
                  } else {
                    skip++;
                    await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                    await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
                    if (await this.isExistEle(sele[6], true, 2000)) {
                      ele = await this.getEle(sele[6], 3000);
                      await this.clickEle(ele, 3000);
                      if (await this.isExistEle(sele[0], true, 2000)) {
                        eles = await this.getEles(sele[0], 3000);
                        await this.clickEle(eles[0], 2000);
                        await this.changeWindow(wid); // 別タブに移動する
                      }
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
          await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
          // await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
        }
      }
    }
    logger.info(`${this.constructor.name} END#####`);
    return res;
  }
}
exports.GenCommon = GenCommon;
exports.Gen = GenBase;
