const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class GenBase extends BaseExecuter {
  code = D.CODE.GEN;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
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
          case D.MISSION.ANQ_GEN_MOB:
            execCls = new GenAnqMob(para);
            break;
          case D.MISSION.CLICK:
            execCls = new GenClick(para);
            break;
          case D.MISSION.ANQ_PARK:
            execCls = new GenAnqPark(para);
            break;
          case D.MISSION.ANQ_KENKOU:
            execCls = new GenAnqKenkou(para);
            break;
          case D.MISSION.GAME_FURUFURU:
            execCls = new GenGameFurufuru(para);
            break;
          case D.MISSION.GAME_FURUFURU_SEARCH:
            execCls = new GenGameFurufuruSearch(para);
            break;
          case D.MISSION.QUIZ_KENTEI:
            execCls = new GenQuizKentei(para);
            break;
          case D.MISSION.GAME_DOKOMADE:
          case D.MISSION.GAME_OTE:
          case D.MISSION.GAME_EGG:
          case D.MISSION.GAME_DARUMA:
            execCls = new GenGameContents(para, mission.main);
            break;
        }
        if (execCls) {
          this.writeLogMissionStart(mission.main);
          await this.updateMissionQueStart(mission);
          let res = await execCls.do();
          this.writeLogMissionEnd(mission.main, res);
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
  // async hideOverlay() {
  //   let seleOver = ["#close_btn>span"];
  //   if (await this.isExistEle(seleOver[0], true, 3000)) {
  //     let ele = await this.getEle(seleOver[0], 2000);
  //     if (await ele.isDisplayed()) {
  //       await this.clickEle(ele, 2000);
  //     } else this.logger.debug("オーバーレイは表示されてないです");
  //   }
  // }
  async hideOverlay() {
    let seleOver = [
      "button.btn-close",
      "#pfx_interstitial_close",
      "#close_btn>span",
      "#gn_ydn_interstitial_btn",
      ,
      ".custom-modal.show-modal.modal-show div.close-button",
      "a.gmoam_close_button",
    ];
    let iSele = {
      "#pfx_interstitial_close": "iframe.profitx-ad-frame-markup",
      "a.gmoam_close_button": "iframe[title='GMOSSP iframe']",
      "div.close-button": "ins iframe[title='3rd party ad content']",
    };
    for (let s of seleOver) {
      if (iSele[s]) {
        if (await this.silentIsExistEle(s, true, 1000)) {
          let ele = await this.getEle(s, 1000);
          // if (s == seleOver[0]) {
          //   await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
          // } else
          if (await ele.isDisplayed()) {
            await this.clickEle(ele, 1000);
          } else this.logger.debug("オーバーレイは表示されてないです");
        }else 
        if (await this.silentIsExistEle(iSele[s], true, 1000)) {
          let iframe = await this.getEles(iSele[s], 1000);
          if (await iframe[0].isDisplayed()) {
            await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
            if (await this.silentIsExistEle(s, true, 1000)) {
              let inputEle = await this.getEle(s, 10000);
              if (await inputEle.isDisplayed()) {
                await this.clickEle(inputEle, 1000);
              } else this.logger.debug("オーバーレイは表示されてないです");
            }
            // もとのフレームに戻す
            await this.driver.switchTo().defaultContent();
          }
        }
      } else if (await this.silentIsExistEle(s, true, 1000)) {
        let ele = await this.getEle(s, 1000);
        // if (s == seleOver[0]) {
        //   await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
        // } else
        if (await ele.isDisplayed()) {
          await this.clickEle(ele, 1000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
    // await this.hideOverlay22();
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
    await this.hideOverlay();
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
      await this.clickEle(eles[0], 2000, 155);
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
      "div.question-title", // 8
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
              if (await this.isExistEle(sele[8], true, 2000)) {
                eles = await this.getEles(sele[8], 3000);
                let title = await eles[skip].getText();
                if (
                  [
                    "書店について",
                    "好きな飲み物に関して",
                    "キャラクターに関するアンケート",
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
const { PartsFurufuru } = require("./parts/parts-furufuru.js");
// ふるふる
class GenGameFurufuru extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["#wrapper_rec_game a[href='/panic/pc']"];
    let gameUrlHost = "https://gendama.dropgame.jp/";
    if (this.isMob) {
      this.targetUrl = "https://www.gendama.jp/sp/everyday_point"; // 操作ページ表示
      sele = ["a[href*='/panic/sp']>p>img"];
      gameUrlHost = "https://gendama-sp.dropgame.jp/";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      // await this.clickEleScrollWeak(eles[0], 2000, 100);
      await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doFuru(gameUrlHost, wid);
    }
    return res;
  }
}
// ふるふるの探し
class GenGameFurufuruSearch extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["#wrapper_rec_game a[href='/panic/pc']"];
    let gameUrlHost = "https://gendama.dropgame.jp/";
    if (this.isMob) {
      this.targetUrl = "https://www.gendama.jp/sp/everyday_point"; // 操作ページ表示
      sele = ["a[href*='/panic/sp']>p>img"];
      gameUrlHost = "https://gendama-sp.dropgame.jp/";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      // await this.clickEleScrollWeak(eles[0], 2000, 100);
      await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doSearch(gameUrlHost, wid);
    }
    return res;
  }
}

const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク　mobile用
class GenAnqPark extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/sp";
  targetUrl = "https://www.gendama.jp/bingo/";
  constructor(para, cmMissionList) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let sele = ["div.burger>div", "nav.menu_point a[href*='/sp/surveys_page']", "", "", ""];
    await this.openUrl(this.firstUrl); // 操作ページ表示
    // await driver.executeScript("window.scrollTo(0, 200);");
    // await this.sleep(1000);
    let Research1 = new PartsResearch1(this.para);
    let AnkPark = new PartsAnkPark(this.para);
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      // await driver.executeScript("window.scrollTo(0, 1);");
      // await this.hideOverlay();
      await this.driver.executeScript(
        `document.querySelector('nav.navigation').setAttribute('class', 'navigation nav_active');`
      );
      await this.sleep(2000);
      // await this.clickEle(ele, 2000, -10, this.isMob);
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele = await this.getEle(sele[1], 3000);
        await this.clickEle(ele, 2000, 0, this.isMob);
        try {
          await this.ignoreKoukoku();
          let seleGen = ["ul>li>a[data-type='mini_surveys']", "#tabBox2 div.list_survey>a", "", ""];
          if (await this.isExistEle(seleGen[0], true, 3000)) {
            let ele = await this.getEle(seleGen[0], 3000);
            await this.clickEle(ele, 3000, 150); // アンケートリストを表示
            if (await this.isExistEle(seleGen[1], true, 3000)) {
              let eles = await this.getEles(seleGen[1], 3000),
                limit = eles.length;
              for (let j = 0; j < limit; j++) {
                if (j !== 0 && (await this.isExistEle(seleGen[1], true, 3000))) {
                  eles = await this.getEles(seleGen[1], 3000);
                }
                ele = eles[eles.length - 1]; // 常に一番↓で(消えないので1つ上にする)
                let href = await ele.getAttribute("href");
                let keyIndex = -1;
                [
                  "/research/",
                  "/observation/",
                  "/hirameki/", // 2
                  "/mix/",
                  "/ijin/", //4
                  "/photo/",
                  "/cooking/", //6
                  "/animal/",
                  "/map/", // 8
                  "/column/",
                ].some((key, i) => {
                  if (href.indexOf(key) > -1) {
                    keyIndex = i;
                    return true;
                  }
                });
                await this.clickEle(ele, 2000, 150);
                let wid = await driver.getWindowHandle();
                await this.changeWindow(wid); // 別タブに移動する
                try {
                  let currentUrl = await this.driver.getCurrentUrl();
                  if (
                    currentUrl.indexOf("already_read") > -1 ||
                    currentUrl.indexOf("403.html") > -1 ||
                    currentUrl.indexOf("err.html") > -1
                  ) keyIndex = -99;
                    switch (keyIndex) {
                      case 0: // リサーチ
                        res = await Research1.commonResearch1([
                          "table.ui-table a.ui-button",
                          "a.ui-button",
                          "input.ui-button",
                          "div.ui-item-no",
                          "li>label",
                          "select.ui-select",
                        ]);
                        break;
                      case 1: // 観察力
                        res = await AnkPark.doMobSite();
                        break;
                      case 2: // ひらめき
                        res = await AnkPark.doMobHirameki();
                        break;
                      case 3: // MIX
                        res = await AnkPark.doMobMix();
                        break;
                      case 4: // 偉人
                        res = await AnkPark.doMobIjin();
                        break;
                      case 5: // 写真
                        res = await AnkPark.doMobPhoto();
                        break;
                      case 6: // 料理
                        res = await AnkPark.doMobCook();
                        break;
                      case 7: // 動物図鑑
                        res = await AnkPark.doMobZukan();
                        break;
                      case 8: // 日本百景
                        res = await AnkPark.doMobJapan();
                        break;
                      case 9: // コラム
                        res = await AnkPark.doMobColum();
                        break;
                    }
                } catch (e) {
                  logger.warn(e);
                }
                await driver.close(); // このタブを閉じて
                await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
                await driver.navigate().refresh(); // 画面更新
                if (await this.isExistEle(seleGen[0], true, 3000)) {
                  let ele = await this.getEle(seleGen[0], 3000);
                  await this.clickEle(ele, 3000); // アンケートリストを表示
                }
              }
            }
            res = D.STATUS.DONE;
          } else logger.info("今日はもう獲得済み"), (res = D.STATUS.DONE);
        } catch (e) {
          logger.warn(e);
        }
      }
    }
    return res;
  }
}
// ハッピーアンケート　mobile用
class GenAnqMob extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/sp";
  targetUrl = "https://www.gendama.jp/bingo/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let sele = [
      "#koffice_surveys div>a",
      "div.question-box a",
      "a.next-button", // 2
      "input.submit-button",
      ".answer-list>p", // 4
      "#next-button:not([style*='display: none'])",
      "ul>li>a[data-type='crossmarketing_surveys']", // 6
      ".answer-list label",
      "div.question-title", // 8
      "div.burger>div", // 9
      "nav.menu_point a[href*='/sp/surveys_page']",
    ];
    await this.openUrl(this.firstUrl); // 操作ページ表示
    if (await this.isExistEle(sele[9], true, 2000)) {
      let ele = await this.getEle(sele[9], 3000);
      await this.driver.executeScript(
        `document.querySelector('nav.navigation').setAttribute('class', 'navigation nav_active');`
      );
      await this.sleep(2000);
      if (await this.isExistEle(sele[10], true, 2000)) {
        let ele = await this.getEle(sele[10], 3000);
        await this.clickEle(ele, 2000, 0, this.isMob);
        await this.ignoreKoukoku();
        let skip = 0; // バグって完了できないやつがあるのでスキップ
        if (await this.isExistEle(sele[6], true, 2000)) {
          let ele = await this.getEle(sele[6], 3000);
          await this.clickEle(ele, 3000, 150);
          if (await this.isExistEle(sele[0], true, 2000)) {
            let eles = await this.getEles(sele[0], 3000);
            await this.clickEle(eles[0], 2000, 150);
            let wid = await driver.getWindowHandle();
            await this.changeWindow(wid); // 別タブに移動する
            try {
              if (await this.isExistEle(sele[1], true, 2000)) {
                eles = await this.getEles(sele[1], 3000);
                let limit = eles.length < 5 ? eles.length : 50;
                for (let j = 0; j < limit; j++) {
                  let wid2 = await driver.getWindowHandle();
                  if (await this.isExistEle(sele[8], true, 2000)) {
                    eles = await this.getEles(sele[8], 3000);
                    if (eles.length === skip) break;
                    let title = await eles[skip].getText();
                    if (
                      [
                        "書店について",
                        "好きな飲み物に関して",
                        "自分の人生観、人間関係に関するアンケート",
                        "バッグについてのアンケート",
                        "食生活に関するアンケート",
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
                      for (let i = 0; i < 50; i++) {
                        let currentUrl = await driver.getCurrentUrl();
                        // 広告が画面いっぱいに入る時がある
                        if (currentUrl.indexOf("https://gendama.enquete.vip/") === -1) {
                          await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                          await this.sleep(2000);
                          logger.info("広告をクリックさせられたのでbackします");
                          let iBreak = false;
                          for (let k = 0; k < 5; k++) {
                            currentUrl = await driver.getCurrentUrl();
                            if (currentUrl.indexOf("https://gendama.enquete.vip/") === -1) {
                              await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                              await this.sleep(2000);
                              logger.info("広告をクリックさせられたのでbackします");
                            } else {
                              currentUrl = await driver.getCurrentUrl();
                              if (currentUrl.indexOf("https://gendama.enquete.vip/start") === 0) {
                                await driver.navigate().back(); // 一覧からやり直す
                                await this.sleep(2000);
                                iBreak = true;
                              } else if (
                                currentUrl.indexOf("https://gendama.enquete.vip/question") === 0
                              ) {
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
                            if (await this.isExistEle(sele[1], true, 2000)) {
                              eles = await this.getEles(sele[1], 3000);
                              await this.clickEle(eles[skip], 3000);
                            }
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
                          if (await this.isExistEle(sele[0], true, 2000)) {
                            eles = await this.getEles(sele[0], 3000);
                            await this.clickEle(eles[0], 2000, 150);
                            await this.changeWindow(wid); // 別タブに移動する
                          }
                        }
                      }
                    }
                  }
                }
              }
              if (await this.isExistEle(sele[1], true, 3000))
                (eles = await this.getEles(sele[1], 3000)),
                  (res = (eles.length < 10 || eles.length -1 < skip) ? D.STATUS.DONE : res);
            } catch (e) {
              logger.warn(e);
            } finally {
              await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
              await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
              // await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
            }
          }
        }
      }
    }
    return res;
  }
}
// アンケート 健康 mobile用
class GenAnqKenkou extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/sp/everyday_point";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["#tabbox1 img[alt='さらさら健康コラム']", "div.status>a"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000, this.isMob ? 155 : 0);
      await this.ignoreKoukoku();
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 3000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            await this.hideOverlay();
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
              eles = await this.getEles(sele[1], 3000);
            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
            await this.clickEle(eles[eles.length - 1], 6000, 250);
            res = await AnkPark.doMobKenkou();
            await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            await this.sleep(2000);
          }
        } else res = D.STATUS.DONE;
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
const { PartsQuizKentei } = require("./parts/parts-quiz-kentei.js");
// クイズ検定Q mobile用
class GenQuizKentei extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/sp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let QuizKentei = new PartsQuizKentei(this.para);
    let sele = [
      "a.btn_game",
      "img[alt='クイズ検定Q']",
      ".enquete-list td.cate", // 2
      ".enquete-list td.status>a",
    ];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      if (await this.isExistEle(sele[1], true, 2000)) {
        ele0 = await this.getEle(sele[1], 3000);
        // await this.clickEle(ele0, 3000);
        await this.exeScriptNoTimeOut(`arguments[0].click()`, ele0);  // pcの画面縦幅が短いと表示されてないので

        await this.ignoreKoukoku();
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[2], true, 2000)) {
            let eles = await this.getEles(sele[2], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              await this.hideOverlay();
              if (i !== 0 && (await this.isExistEle(sele[2], true, 2000)))
                eles = await this.getEles(sele[2], 3000);
              let text = await eles[eles.length - 1].getText();
              if (await this.isExistEle(sele[3], true, 2000)) {
                let eles2 = await this.getEles(sele[3], 3000);
                await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
                let ele = eles2[eles.length - 1];
                let ele2;
                try {
                  ele2 = await ele.findElements(By.xpath("ancestor::tr"));
                  ele2 = await this.getElesFromEle(ele2[0], "td>form>input[name='submit']");
                } catch (e) {
                  logger.debug(e);
                }
                if (ele2 && ele2.length) {
                  ele = ele2[0];
                }
                await this.clickEle(ele, 3000);
                res = await QuizKentei.doKentei();
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
    }
    return res;
  }
}
const { PartsGame } = require("./parts/parts-game.js");
// どこまでのびるか
class GenGameContents extends GenMissonSupper {
  firstUrl = "https://www.gendama.jp/";
  targetUrl = "https://www.gendama.jp/sp/";
  mission = "";
  constructor(para, mType) {
    super(para);
    this.mission = mType;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    // "img[alt='だるま落とし']", "img[alt='お手できるかな']","img[alt='エッグチョイス']",
    let sele = ["a.btn_game", "img[alt='どこまでのびるかな？']", "#fluct-ad-overlay"];

    let PGame = new PartsGame(this.para, this.mission);
    let se;
    if (this.mission == D.MISSION.GAME_DARUMA) se = ["#menu_game img[alt='だるま落とし']"];
    else if (this.mission == D.MISSION.GAME_OTE) se = ["#menu_game img[alt='お手できるかな']"];
    // else if (this.mission == D.MISSION.GAME_TENKI) se = ["#menu_game img[alt='てるてるの天気当てゲーム']"];
    else if (this.mission == D.MISSION.GAME_EGG) se = ["#menu_game img[alt='エッグチョイス']"];
    else if (this.mission == D.MISSION.GAME_DOKOMADE)
      se = ["#menu_game img[alt='どこまでのびるかな？']"];
    sele[1] = se[0];

    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 100);
      if (await this.isExistEle(sele[2], true, 2000)) {
        await this.driver.executeScript(
          `document.querySelector('#fluct-ad-overlay').setAttribute('style', 'display:none;');`
        );
      }
      if (await this.isExistEle(sele[1], true, 2000)) {
        ele0 = await this.getEle(sele[1], 3000);
        await this.clickEle(ele0, 100);
        await this.ignoreKoukoku();
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        res = await PGame.doMethod(wid);
      }
    }
    return res;
  }
}
exports.GenCommon = GenCommon;
exports.Gen = GenBase;
