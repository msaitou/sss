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
          case D.MISSION.ANQ_CRI:
            execCls = new CriAnq(para);
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
exports.CriCommon = CriCommon;
exports.Cri = CriBase;
