const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PtoBase extends BaseExecuter {
  code = D.CODE.PTO;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let gmyCom = new PtoCommon(para);
    let islogin = await gmyCom.login();
    if (islogin) {
      // cm系のミッションはまとめてやるため、ここでは1つ扱いのダミーミッションにする
      let cmMissionList = this.missionList.filter((m) => m.main.indexOf("cm_") === 0);
      this.missionList = this.missionList.filter((m) => m.main.indexOf("cm_") === -1);
      if (cmMissionList.length) this.missionList.push({ main: D.MISSION.CM });
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CM:
            execCls = new PtoCm(para, cmMissionList);
            break;
          case D.MISSION.CLICK:
            execCls = new PtoClick(para);
            break;
          case D.MISSION.POINTQ:
            execCls = new PtoPointQ(para);
            break;
          case D.MISSION.ANQ_PARK:
            execCls = new PtoAnqPark(para);
            break;
          case D.MISSION.GAME_KOKUHAKU:
            execCls = new PtoGameKokuhaku(para);
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
    let startPage = "https://www.pointtown.com/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["div.c-header-user-point>p.c-point-large-label"];
    if (this.isMob) sele[0] = "div.c-header-status__l-num>a.c-point-large-label";
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class PtoMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PTO;
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["button.js-dialog__close-btn", "div.qg-inweb-close"];
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
}
// このサイトの共通処理クラス
class PtoCommon extends PtoMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "div.c-header-user-point>p.c-point-large-label";
    if (this.isMob) seleIsLoggedIn = "div.c-header-status__l-num>a.c-point-large-label";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li>a[href='/login']";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        let mobH = this.isMob ? 100 : 0;
        await this.clickEle(ele, 2000, mobH); // ログイン入力画面へ遷移 なぜかログインボタン押しただけでおｋ
        // let seleInput = {
        //   id: "input[name='rwsid']",
        //   pass: "input[name='pass']",
        //   login: "input[name='login_page']",
        // };
        // // アカウント（メール）入力
        // let inputEle = await this.getEle(seleInput.id, 500);
        // await inputEle.clear();
        // inputEle.sendKeys(account[this.code].loginid);

        // // パスワード入力
        // inputEle = await this.getEle(seleInput.pass, 500);
        // await inputEle.clear();
        // inputEle.sendKeys(account[this.code].loginpass);

        // ele = await this.getEle(seleInput.login, 1000);
        // await this.clickEle(ele, 4000);
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
class PtoCm extends PtoMissonSupper {
  firstUrl = "https://www.pointtown.com/";
  targetUrl = "https://www.pointtown.com/game";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='cm-jk.png']"];
    let mobH = this.isMob ? 50 : 0;
    if (this.isMob) {
      sele[0] = "img[src*='cm-jk.png']";
      this.sleep(3000);
      await driver.executeScript("window.scrollTo(0, 3500);");
    }
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000, mobH);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://pointtown.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
// クリック
class PtoClick extends PtoMissonSupper {
  firstUrl = "https://www.pointtown.com/";
  targetUrl = "https://www.pointtown.com/game";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let sele = [
      "[data-area*='top-click-corner'] button",
      "#link-coin-chance button",
      "form[action='/soudatsu/complete'] button", // 2
      "ul[aria-hidden='false'] li[data-read-status='false'] a:not([style*='display:none;'])",
      "ul[aria-hidden='false'] li[data-read-status='false'] button:not([style*='display:none;'])",
    ];
    let urls = [
      "https://www.pointtown.com/monitor/fancrew/real-shop",
      "https://www.pointtown.com/soudatsu",
      "https://www.pointtown.com/news/infoseek",
    ];
    await this.openUrl(this.firstUrl); // バナー
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        try {
          await this.clickEle(eles[i], 4000);
        } catch (e) {
          logger.warn(e);
        }
        await this.closeOtherWindow(driver);
      }
    }
    await this.openUrl(this.targetUrl); // バナー
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
    }
    await this.openUrl(urls[0]); // 10コインを探せ
    if (await this.isExistEle(sele[1], true, 2000)) {
      let eles = await this.getEles(sele[1], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
    }
    await this.openUrl(urls[1]); // コイン争奪戦
    if (await this.isExistEle(sele[2], true, 2000)) {
      let ele = await this.getEle(sele[2], 2000);
      await this.clickEle(ele, 4000);
    }
    await this.openUrl(urls[2]); // ニュース
    if (await this.isExistEle(sele[3], true, 2000)) {
      let eles = await this.getEles(sele[3], 2000);
      // 最初のページを全部クリック。そのあと、報酬を受けとる。
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
      let rewordCnt = 0; // 報酬を受けとる
      if (await this.isExistEle(sele[4], true, 2000)) {
        eles = await this.getEles(sele[4], 2000);
        rewordCnt = eles.length;
        for (let i = 0; i < rewordCnt; i++) {
          if (await this.isExistEle(sele[4], true, 2000)) {
            if (i != 0) eles = await this.getEles(sele[4], 2000);
            await this.clickEle(eles[0], 4000);
          }
        }
      }
      if (rewordCnt < 20) {
        // その数が20だったら終わり。足りなかったら次のページで足りない分だけクリック。報酬を受け取る
        let sele2 = ["li[aria-controls='poli-soci']"];
        if (await this.isExistEle(sele2[0], true, 2000)) {
          let ele = await this.getEle(sele2[0], 2000);
          await this.clickEle(ele, 4000);
          if (await this.isExistEle(sele[3], true, 2000)) {
            let eles = await this.getEles(sele[3], 2000);
            // 最初のページを全部クリック。そのあと、報酬を受けとる。その数が20だったら終わり。足りなかったら次のページで足りない分だけクリック。報酬を受け取る
            for (let i = 0; i < 20 - rewordCnt || i < eles.length; i++) {
              await this.clickEle(eles[i], 4000);
              await this.closeOtherWindow(driver);
            }
            // let rewordCnt = 0;
            if (await this.isExistEle(sele[4], true, 2000)) {
              eles = await this.getEles(sele[4], 2000);
              for (let i = 0; i < eles.length; i++) {
                if (await this.isExistEle(sele[4], true, 2000)) {
                  if (i != 0) eles = await this.getEles(sele[4], 2000);
                  await this.clickEle(eles[0], 4000);
                  // TODO 総合タブに戻されるので、社会タブに移動しないと報酬がないことになる
                }
              }
            }
          }
        }
      }
    }
    // 三角くじを探せ
    let seleKujis = [
      "img[src*='kuji-red']",
      "img[src*='kuji-yellow']",
      "img[src*='kuji-purple']", // 2
      "img[src*='kuji-pink']",
      "img[src*='kuji-blue']", // 4
      "img[src*='kuji-green']",
    ];
    for (let i in seleKujis) {
      let seleKuji = seleKujis[i];
      await this.openUrl(this.targetUrl);
      if (await this.isExistEle(seleKuji, true, 2000)) {
        let ele = await this.getEle(seleKuji, 2000);
        await this.clickEle(ele, 4000);
        let sele3 = [
          "#js-click-banner",
          "form[action='/click/banner'] button",
          "img[src*='kuji-w']",
        ];
        if (await this.isExistEle(seleKuji, true, 2000)) {
          ele = await this.getEle(seleKuji, 2000);
          await this.clickEle(ele, 4000);
          if (await this.isExistEle(sele3[0], true, 2000)) {
            ele = await this.getEle(sele3[0], 2000);
            await this.clickEle(ele, 4000);
            let wid = await driver.getWindowHandle();
            await this.changeWindow(wid); // 別タブに移動する
            if (await this.isExistEle(sele3[1], true, 2000)) {
              ele = await this.getEle(sele3[1], 2000);
              await this.clickEle(ele, 4000);
            }
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            if (await this.isExistEle(sele3[2], true, 2000)) {
              ele = await this.getEle(sele3[2], 2000); // wくじ
              await this.clickEle(ele, 4000);
            }
          }
        }
      }
    }

    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// ポイントｑ
class PtoPointQ extends PtoMissonSupper {
  firstUrl = "https://www.pointtown.com/";
  targetUrl = "https://www.pointtown.com/game";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = [
      "img[alt='ポイントQ']",
      ".pointq-sec a",
      "#js-quiz-form label",
      "#js-pointq-submit",
      "a[href='/pointq/input']",
      "button.js-watch-reward-ad-btn",
    ];
    try {
      await this.openUrl(this.targetUrl);
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEle(ele, 3000);
        if (await this.isExistEle(sele[1], true, 2000)) {
          if (await this.isExistEle(sele[5], true, 2000)) {
            // 前回動画見なかったら
            await this.lookDouga(sele);
          } else {
            ele = await this.getEle(sele[1], 2000);
            if (await ele.isEnabled()) await this.clickEle(ele, 3000);
          }
          for (let i = 0; i < 3; i++) {
            if (await this.isExistEle(sele[2], true, 2000)) {
              let eles = await this.getEles(sele[2], 2000);
              let choiceNum = libUtil.getRandomInt(0, eles.length); // 最後は否定的な選択肢なので選ばないのがいいと思ったが、問題なさそう
              await this.clickEle(eles[choiceNum], 3000);
              if (await this.isExistEle(sele[3], true, 2000)) {
                ele = await this.getEle(sele[3], 2000);
                await this.clickEle(ele, 3000);
                if (await this.isExistEle(sele[4], true, 2000)) {
                  ele = await this.getEle(sele[4], 2000);
                  await this.clickEle(ele, 3000); // 次の質問へ
                } else if (await this.isExistEle(sele[5], true, 2000)) {
                  i = await this.lookDouga(sele);
                }
                res = D.STATUS.DONE;
              }
            } else break;
          }
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
  async lookDouga(sele) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let ele = await this.getEle(sele[5], 2000);
    await this.clickEle(ele, 3000, 0, true); // 動画再生
    let seleIframe = ["div[id*='google_ads_iframe']>iframe", "div.rewardResumebutton"];
    // 動画を見ればもう3問
    if (await this.isExistEle(seleIframe[0], true, 3000)) {
      let iframe = await this.getEle(seleIframe[0], 1000);
      await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
      if (await this.isExistEle(seleIframe[1], true, 3000)) {
        ele = await this.getEle(seleIframe[1], 2000);
        await this.clickEle(ele, 2000);
      }
      await driver.switchTo().defaultContent(); // もとのフレームに戻す
      await this.sleep(10000);
      return -1; // リセット
    }
    return 3;
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク mobile用
class PtoAnqPark extends PtoMissonSupper {
  firstUrl = "https://www.pointtown.com/";
  targetUrl = "https://www.pointtown.com/game";
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
      "img[src*='enquete-park']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a:not([href='#'])", // 2
      "td>form>input[name='submit']",
    ];
    let mobH = this.isMob ? 50 : 0;
    if (this.isMob) {
      this.sleep(3000);
      await driver.executeScript("window.scrollTo(0, 3300);");
    }
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000, mobH);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[2], true, 2000)) {
          let eles = await this.getEles(sele[2], 3000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0 && (await this.isExistEle(sele[2], true, 2000)))
              eles = await this.getEles(sele[2], 3000);
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles2 = await this.getEles(sele[1], 3000);
              let targetIndex = eles.length - 1;
              let text = await eles2[targetIndex].getText();
              text = text.split("\n").join("").split("\n").join("");
              let ele = eles[targetIndex];
              let ele2 = null;
              try {
                ele2 = await this.getElesXFromEle(ele, "ancestor::tr");
                ele2 = await this.getElesFromEle(ele2[0], sele[3]);
              } catch (e) {
                logger.debug(e);
              }
              let script = "arguments[0]";
              if (ele2 && ele2.length) {
                ele = ele2[0]; // 回答ボタンが実際別の場合が半分くらいあるので置き換え
                script = "arguments[0].closest('form')";
              }
              // let rect = await ele.getRect();
              // await this.driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.driver.executeScript(
              //   `document.querySelectorAll("${sele[2]}")[${targetIndex}].setAttribute('target', '_blank');`
              // );
              await this.driver.executeScript(`${script}.setAttribute('target', '_blank');`, ele);
              await this.clickEle(ele, 3000);
              // let action = await driver.actions();
              // await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              // await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
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
              } catch (e) {
                logger.warn(e);
              } finally {
                try {
                  await driver.close(); // このタブを閉じて
                  await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
                } catch (e) {
                  logger.warn(e);
                }
                await driver.navigate().refresh(); // 画面更新  しないとスタンプが反映されん
                await driver.sleep(1000);
              }
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
const { PartsGame } = require("./parts/parts-game.js");
// 告白 mobile
class PtoGameKokuhaku extends PtoMissonSupper {
  firstUrl = "https://www.pointtown.com/";
  targetUrl = "https://www.pointtown.com/game";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let PGame = new PartsGame(this.para);
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let se = ["img[src*='kokuhaku']"];
    let mobH = this.isMob ? 50 : 0;
    if (this.isMob) {
      this.sleep(3000);
      await driver.executeScript("window.scrollTo(0, 3800);");
    }
    await this.hideOverlay();
    if (await this.isExistEle(se[0], true, 2000)) {
      let el = await this.getEle(se[0], 3000);
      await this.clickEleScrollWeak(el, 2000, mobH);
      await this.ignoreKoukoku();
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await PGame.doKokuhaku(wid);
    }
    return res;
  }
}

exports.PtoCommon = PtoCommon;
exports.Pto = PtoBase;
