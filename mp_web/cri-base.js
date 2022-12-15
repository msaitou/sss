const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class CriBase extends BaseExecuter {
  code = D.CODE.CRI;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
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
          case D.MISSION.CLICK_MOB:
            execCls = new CriClickMob(para);
            break;
          case D.MISSION.CRI_STAMP:
            execCls = new CriStamp(para);
            break;
          case D.MISSION.ANQ_CRI:
            execCls = new CriAnq(para);
            break;
          case D.MISSION.ANQ_PARK:
            execCls = new CriAnqPark(para);
            break;
          case D.MISSION.ANQ_HAPPY:
            execCls = new CriAnqHappy(para);
            break;
          case D.MISSION.TAP_25:
            execCls = new CriTap25(para);
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
    if (this.isMob) sele[0] = "p.pt_num";
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
class CriCommon extends CriMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "p.g-navi__user__pt";
    if (this.isMob) seleIsLoggedIn = "p.pt_num";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "label[data-for='login']";
      if (this.isMob || (await this.isExistEle(seleLoginLink, true, 2000))) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleLoginLink2 = "a[href='/account/login/']";
        if (this.isMob) seleLoginLink2 = "div.login_btn>a";
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
// クリック(mobile)
class CriClickMob extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "a>img[alt='きたよ!ボタン']",
        "div.co-tac>a",
        "a>img[alt='TAPでスタンプ']",
        "p.list_left>img:not([alt='“済”'])",
        "a.stamp__modal__item-confirm-btn", // 4
        "",
        "",
        "",
      ];
      await this.openUrl(this.targetUrl); // 操作ページ表示
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEleScrollWeak(ele, 2000, 150);
        if (await this.isExistEle(sele[1], true, 2000)) {
          ele = await this.getEle(sele[1], 2000);
          await this.clickEleScrollWeak(ele, 2000, 150);
        }
      }
      res = D.STATUS.DONE;
      await this.openUrl(this.targetUrl); // 操作ページ表示
      if (await this.isExistEle(sele[2], true, 2000)) {
        let ele = await this.getEle(sele[2], 2000);
        await this.clickEleScrollWeak(ele, 2000, 150);
        if (await this.isExistEle(sele[3], true, 2000)) {
          let eles = await this.getEles(sele[3], 2000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0) {
              if (await this.isExistEle(sele[3], true, 2000)) {
                eles = await this.getEles(sele[3], 2000);
              } else break;
            }
            let ele2 = null;
            try {
              ele2 = await this.getElesXFromEle(eles[0], "ancestor::a");
            } catch (e) {
              logger.debug(e);
            }
            await this.clickEleScrollWeak(ele2[0], 2000, 150); // 常に0
            if (await this.isExistEle(sele[4], true, 2000)) {
              ele = await this.getEle(sele[4], 2000);
              await this.clickEleScrollWeak(ele, 3000, 150);
              await driver.navigate().back(); // 戻って
              await driver.navigate().refresh(); // 更新
            }
          }
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// イチオシ　mobile
class CriStamp extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "a>img[alt='イチオシ']",
        "p.list_left>img:not([alt='“済”'])",
        "a.stamp__modal__item-confirm-btn", // 2
      ];
      await this.openUrl(this.targetUrl); // 操作ページ表示
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEleScrollWeak(ele, 2000, 150);
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 2000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0) {
              if (await this.isExistEle(sele[1], true, 2000)) {
                eles = await this.getEles(sele[1], 2000);
              } else break;
            }
            let eles2 = null;
            try {
              eles2 = await this.getElesXFromEle(eles[0], "ancestor::a");
            } catch (e) {
              logger.debug(e);
            }
            await this.clickEleScrollWeak(eles2[0], 2000, 150); // 常に0
            if (await this.isExistEle(sele[2], true, 2000)) {
              ele = await this.getEle(sele[2], 2000);
              await this.clickEleScrollWeak(ele, 3000, 150);
              await driver.navigate().back(); // 戻って
              await driver.navigate().refresh(); // 更新
            }
          }
        }
      }
      res = D.STATUS.DONE;
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// tap25　mobile
class CriTap25 extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    try {
      let sele = [
        "a>img[alt='TAPでスタンプ']",
        "div.button2",
        "#enchant-stage div.button", // 2
      ];
      await this.openUrl(this.targetUrl); // 操作ページ表示
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEleScrollWeak(ele, 2000, 150);
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 2000);
          await this.clickEleScrollWeak(ele, 2000, 150);

          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 2000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0) {
                if (await this.isExistEle(sele[1], true, 2000)) {
                  eles = await this.getEles(sele[1], 2000);
                } else break;
              }
              let eles2 = null;
              try {
                eles2 = await this.getElesXFromEle(eles[0], "ancestor::a");
              } catch (e) {
                logger.debug(e);
              }
              await this.clickEleScrollWeak(eles2[0], 2000, 150); // 常に0
              if (await this.isExistEle(sele[2], true, 2000)) {
                ele = await this.getEle(sele[2], 2000);
                await this.clickEleScrollWeak(ele, 3000, 150);
                await driver.navigate().back(); // 戻って
                await driver.navigate().refresh(); // 更新
              }
            }
          }
        }
      }
      res = D.STATUS.DONE;
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 広告付きアンケート
class CriAnq extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/mypage/research/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let sele = [
      "div.research_box_03 td>p.btn_answer>a",
      "div.btn_next>input",
      "h2.question", // 2
      ".answer label",
      "div.btn_getpoint", // 4
      "",
      "", // 6
      "",
      ".ifr_enquete>iframe",
      "div.btn_getpoint",
    ];
    await this.openUrl(this.targetUrl); // 操作ページ表示

    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      let limit = eles.length;
      for (let i = 0; i < limit; i++) {
        if (i !== 0 && (await this.isExistEle(sele[0], true, 2000)))
          eles = await this.getEles(sele[0], 3000);
        let ele = eles[eles.length - 1]; // 下から
        await this.clickEleScrollWeak(ele, 4000, 70);
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          let seleIframe = [".ifr_enquete>iframe"];
          if (await this.isExistEle(seleIframe[0], true, 3000)) {
            let iframe = await this.getEle(seleIframe[0], 1000);
            await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
            // await driver.switchTo().defaultContent(); // もとのフレームに戻す
            if (await this.isExistEle(sele[1], true, 2000)) {
              ele = await this.getEle(sele[1], 3000);
              await this.clickEleWrap(ele, 3000, iframe);
              for (let i = 0; i < 20; i++) {
                if (await this.isExistEle(sele[2], true, 2000)) {
                  ele = await this.getEle(sele[2], 3000);
                  let q = await ele.getText();
                  q = q.split("\n").join("");
                  q = q.split("\t").join("");
                  let regex = "(Q\\d+)、*";
                  let matches = q.match(regex);
                  logger.info(q);
                  let choiceNum = 0,
                    qNo = matches.length > 1 ? matches[1] : "",
                    ansSele = sele[3];
                  switch (qNo) {
                    case "Q1": // Q1 あなたの性別をお知らせください。（ひとつだけ）
                      break;
                    case "Q2": // Q2. あなたの年齢をお知らせください。（ひとつだけ）
                    case "Q4": // Q4. あなたの居住地をお知らせください。（ひとつだけ）
                      choiceNum = 2;
                      break;
                    case "Q3": // Q3. あなたのご職業をお知らせください。（ひとつだけ）
                      choiceNum = 10;
                      break;
                    default: // ランダムで。 Q5~Q10
                      choiceNum = -1; // 仮値
                  }
                  // if (ansSele === sele[3] && !(await this.isExistEle(ansSele, true, 2000))) {
                  //   ansSele = sele[4];
                  // }

                  if (await this.isExistEle(ansSele, true, 2000)) {
                    let eles = await this.getEles(ansSele, 3000);
                    if (choiceNum === -1) {
                      choiceNum = libUtil.getRandomInt(0, eles.length); // 最後は否定的な選択肢なので選ばないのがいいと思ったが、問題なさそう
                    }
                    // if (ansSele === sele[3]) {
                    //   let select = new Select(eles[0]);
                    //   if (!choiceNum) choiceNum++;
                    //   await select.selectByValue(choiceNum.toString());
                    // } else {
                    // if (qNo === "Q1" && eles.length === 3) isKensyoFlag = true;
                    // if (isKensyoFlag) choiceNum = libUtil.getRandomInt(1, eles.length);
                    await this.clickEleWrap(eles[choiceNum], 2000, iframe);
                    // }
                    if (await this.isExistEle(sele[1], true, 2000)) {
                      ele = await this.getEle(sele[1], 3000);
                      await this.clickEleWrap(ele, 2000, iframe); // 次のページ
                    }
                  }
                } else break;
              }
              if (await this.isExistEle(sele[4], true, 2000)) {
                ele = await this.getEle(sele[4], 3000);
                await this.clickEleWrap(ele, 3000, iframe);
                // let wid2 = await driver.getWindowHandle();
                // await this.changeWindow();
                // await driver.close(); // 最後に無駄なタブが開くので閉じる
                // await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
            }
          }
        } catch (e) {
          logger.warn(e);
        } finally {
          await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
          await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
        }
      }
    }
    return res;
  }
  async clickEleWrap(ele, time, iframe) {
    let rect = await ele.getRect();
    let y = rect.y;
    await this.driver.switchTo().defaultContent(); // もとのフレームに戻す
    await this.driver.executeScript(`window.scrollTo(0, ${y});`);
    await this.driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに

    await this.clickEle(ele, time);
    // await this.driver.executeScript('document.body.style.zoom = "25%"');
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク mobile用
class CriAnqPark extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/mypage/research/";
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
      "a>img[src*='enquetehiroba']",
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
// ハッピーアンケート mobile用
class CriAnqHappy extends CriMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.chobirich.com/mypage/research/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let sele = [
      "#koffice_surveys td>a",
      "div.question-box a",
      "a.next-button", // 2
      "input.submit-button",
      ".answer-list>p", // 4
      "#next-button:not([style*='display: none'])",
      "a>img[src*='enquetesquare']", // 6
      ".answer-list label",
      "div.question-title", // 8
    ];
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
                  if (currentUrl.indexOf("https://chobirich.enquete.vip/") === -1) {
                    await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                    await this.sleep(2000);
                    logger.info("広告をクリックさせられたのでbackします");
                    let iBreak = false;
                    for (let k = 0; k < 5; k++) {
                      currentUrl = await driver.getCurrentUrl();
                      if (currentUrl.indexOf("https://chobirich.enquete.vip/") === -1) {
                        await driver.navigate().back(); // 広告をクリックしたぽいので戻る
                        await this.sleep(2000);
                        logger.info("広告をクリックさせられたのでbackします");
                      } else {
                        currentUrl = await driver.getCurrentUrl();
                        if (currentUrl.indexOf("https://chobirich.enquete.vip/start") === 0) {
                          await driver.navigate().back(); // 一覧からやり直す
                          await this.sleep(2000);
                          iBreak = true;
                        } else if (
                          currentUrl.indexOf("https://chobirich.enquete.vip/question") === 0
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
                      "性別は",
                      "年齢は",
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
    return res;
  }
}

exports.CriCommon = CriCommon;
exports.Cri = CriBase;
