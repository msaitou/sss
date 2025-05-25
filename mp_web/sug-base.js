const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");
const conf = require("config");

class SugBase extends BaseExecuter {
  code = D.CODE.SUG;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let sugCom = new SugCommon(para);
    let islogin = await sugCom.login();
    if (islogin) {
      // cm系のミッションはまとめてやるため、ここでは1つ扱いのダミーミッションにする
      let cmMissionList = this.missionList.filter((m) => m.main.indexOf("cm_") === 0);
      this.missionList = this.missionList.filter((m) => m.main.indexOf("cm_") === -1);
      if (cmMissionList.length) {
        this.missionList.push({ main: D.MISSION.CM });
      }
      let originDriver = null;
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        if (this.isHeadless) {
          if (mission.main != D.MISSION.QUIZ_KENTEI && originDriver) {
            originDriver = null;
            await this.quitDriver();
            this.setDriver(await this.webDriver(this.isMob, this.isHeadless));
            para.driver = this.driver;sugCom = new SugCommon(para);
            await sugCom.login();
          }
          else if (mission.main == D.MISSION.QUIZ_KENTEI) {
            originDriver = true;
            await this.quitDriver();
            this.setDriver(await this.webDriver(this.isMob, false));
            para.driver = this.driver;sugCom = new SugCommon(para);
            await sugCom.login();
          }
        }
        switch (mission.main) {
          case D.MISSION.CM:
            execCls = new SugCm(para, cmMissionList);
            break;
          case D.MISSION.ANQ_PARK:
            execCls = new SugAnqPark(para);
            break;
          case D.MISSION.QUIZ_KENTEI:
            execCls = new SugQuizKentei(para);
            break;
          case D.MISSION.CLICK:
            execCls = new SugClick(para);
            break;
          case D.MISSION.ANQ_SUG:
            execCls = new SugAnq(para);
            break;
          case D.MISSION.GAME_FURUFURU:
            execCls = new SugGameFurufuru(para);
            break;
          case D.MISSION.GAME_FURUFURU_SEARCH:
            execCls = new SugGameFurufuruSearch(para);
            break;
          case D.MISSION.GAME_KOKUHAKU:
          case D.MISSION.GAME_TRAIN:
          case D.MISSION.GAME_DARUMA:
          case D.MISSION.GAME_TENKI:
            execCls = new SugGameContents(para, mission.main);
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
    let startPage = "https://www.netmile.co.jp/sugutama/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    const getUsePointFunc = async () => {
      // let exchangePage = "https://www.netmile.co.jp/ctrl/user/passbook/index.do";
      // let p = "0";
      // await this.driver.get(exchangePage);
      // let sele = ["table.passbook-table tr", "td.passbook-mile.w15>span"];
      // if (await this.isExistEle(sele[0], true, 2000)) {
      //   let els = await this.getEles(sele[0], 2000);
      //   for (let el of els) {
      //     let el2 = await this.getElesFromEle(el, sele[1]);
      //     p = await el2[1].getText();
      //     if (p) break;
      //   }
      // }
      return "1000";  // 多分これしかない
    };
    let sele = ["div.mile.add_mile.js-user_point", ".js-search-switch button"];
    if (this.isMob && (await this.isExistEle(sele[1], true, 2000))) {
      let ele = await this.getEle(sele[1], 2000);
      await this.clickEle(ele, 2000);
    }
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum, getUsePointFunc);
    }
  }
}
class SugMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.SUG;
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["#pfx_interstitial_close", "div.overlay-item a.button-close", 
    "#gn_ydn_interstitial_btn", 
    // "div.close", "#close", "#interClose"
      ,"div.close-button","a.gmoam_close_button"
    ];
    let iSele = {"a.gmoam_close_button":"iframe[title='GMOSSP iframe']","div.close-button":"ins iframe[title='3rd party ad content']"};
    for (let s of seleOver) {
      if (iSele[s]) {
        if (await this.silentIsExistEle(iSele[s], true, 1000)) {
          let iframe = await this.getEles(iSele[s], 1000);
          if (await iframe[0].isDisplayed()) {
            await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
            let inputEle = await this.getEle(s, 10000);
            if (await inputEle.isDisplayed()) {
              await this.clickEle(inputEle, 1000);
            } else this.logger.debug("オーバーレイは表示されてないです");
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
  }
}
// このサイトの共通処理クラス
class SugCommon extends SugMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "div.mile.add_mile.js-user_point";
    if (this.isMob) seleIsLoggedIn = ".js-search-switch button";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "div.login>a";
      if (this.isMob) seleLoginLink = "div.login_btn>a";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input[name='user[email]']",
          pass: "input[name='user[password]']",
          login: "div.login>input",
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
            subject: `ログインできません[${this.code}]${conf.machine}`,
            contents: `なぜか ${conf.machine} の ${this.code} にログインできません`,
          });
          return;
        }
      } else {
        if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
          // 未ログインで、ログインボタンが見つかりません。
          await mailOpe.send(logger, {
            subject: `ログインできません[${this.code}]${conf.machine}`,
            contents: `多分mobile ${conf.machine} の ${this.code} にログインできません`,
          });
          return;
        }
      }
    } else logger.debug("ログイン中なのでログインしません");
    return true;
  }
}
const { PartsCmManage } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class SugCm extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/game?lo=124";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='d854486f003a29cac6a7dae61f8c40ed.png']"];
    if (this.isMob) sele[0] = "img[src*='5e1e89c03734085b7630a59db1c51e01.png']";
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      if (!this.isMob) {
        await this.changeWindow(wid); // 別タブに移動する
      }
      let cmManage = new PartsCmManage(this.para, this.cmMissionList, "https://sugutama.cmnw.jp/game/");
      await cmManage.do();
      if (!this.isMob) {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク
class SugAnqPark extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/survey?lo=124";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = [
      "img[alt='アンケートパーク']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a", // 2
      "+form>input[name='submit']",
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
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
            let selectIndex = eles.length - 1 - i;
            let text = await eles[selectIndex].getText();
            if (await this.isExistEle(sele[2], true, 2000)) {
              let eles2 = await this.getEles(sele[2], 3000);
              await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
              let ele = eles2[selectIndex];
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
              await this.hideOverlay();
              await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
              // await this.clickEle(ele, 3000);
              let gameUrl = await driver.getCurrentUrl();
              if (gameUrl.indexOf("403") > -1) {
                await this.driver.navigate().back();
                continue;
              }
              switch (text.trim()) {
                case "漫画":
                  if (this.isMob) res = await AnkPark.doMobManga();
                  else res = await AnkPark.doManga();
                  break;
                case "日本百景":
                  if (this.isMob) res = await AnkPark.doMobJapan();
                  else res = await AnkPark.doJapan();
                  break;
                case "観察力":
                  if (this.isMob) res = await AnkPark.doMobSite();
                  else res = await AnkPark.doSite();
                  break;
                case "料理":
                  if (this.isMob) res = await AnkPark.doMobCook();
                  else res = await AnkPark.doCook();
                  break;
                case "ひらめき":
                  if (this.isMob) res = await AnkPark.doMobHirameki();
                  else res = await AnkPark.doHirameki();
                  break;
                case "写真":
                  if (this.isMob) res = await AnkPark.doMobPhoto();
                  else res = await AnkPark.doPhoto();
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
const { PartsQuizKentei } = require("./parts/parts-quiz-kentei.js");
// クイズ検定
class SugQuizKentei extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/survey?lo=124";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let QuizKentei = new PartsQuizKentei(this.para);
    let sele = [
      "img[alt='クイズ検定Q']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a", // 2
      "+form>input[name='submit']",
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
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
            let text = await eles[eles.length - 1].getText();
            if (await this.isExistEle(sele[2], true, 2000)) {
              let eles2 = await this.getEles(sele[2], 3000);
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
    return res;
  }
}
// クリック
class SugClick extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/shop?lo=124";
  targetUrl2 = "https://www.netmile.co.jp/sugutama/service?lo=124";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let sele = [".daily_box .daily"];
    for (let url of [this.firstUrl, this.targetUrl, this.targetUrl2]) {
      logger.info(`${url}でクリック`);
      await this.openUrl(url); // 操作ページ表示
      if (await this.isExistEle(sele[0], true, 2000)) {
        let eles = await this.getEles(sele[0], 2000);
        for (let i = 0; i < eles.length; i++) {
          await this.clickEle(eles[i], 3000);
          await this.closeOtherWindow(driver);
        }
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// すぐたまのアンケート
class SugAnq extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/survey?lo=124";
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
      "nnn",
      "#enquete_area dt.name a",
      "#enquete_area dd.stat a", // 2
      "nnn",
    ];
    if (await this.isExistEle(sele[1], true, 2000)) {
      let eles = await this.getEles(sele[1], 3000);
      let limit = eles.length;
      let isErr = false;
      for (let i = 0; i < limit; i++) {
        if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
        let text = await eles[i].getText();
        // 【コラム付き】ヘアスタイルに関するアンケート
        let kind = text.split("】")[0]; // 【コラム付き
        if (await this.isExistEle(sele[2], true, 2000)) {
          let eles2 = await this.getEles(sele[2], 3000);
          let ele = eles2[i];
          await this.clickEle(ele, 3000);
          let wid = await driver.getWindowHandle();
          await this.changeWindow(wid); // 別タブに移動する
          try {
            switch (kind) {
              case "【コラム付き":
                res = await AnkPark.doColum();
                break;
              case "【動物図鑑付き":
                res = await AnkPark.doZukan();
                break;
            }
          } catch (e) {
            logger.warn(e);
            isErr = true;
          } finally {
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            // await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
          }
        }
      }
      isErr ? (res = D.STATUS.DONE) : null;
    } else {
      res = D.STATUS.DONE;
    }
    return res;
  }
}
const { PartsFurufuru } = require("./parts/parts-furufuru.js");
// ふるふる
class SugGameFurufuru extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/game?lo=124";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[src*='71825fac2eeac6a2b2650f60']"];
    let gameUrlHost = "https://sugutama.dropgame.jp/";
    if (this.isMob) {
      sele = ["img[src*='b086b0a182915e5c0e57329d225b28a1']"];
      gameUrlHost = "https://sugutama-sp.dropgame.jp/";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doFuru(gameUrlHost, wid);
    }
    return res;
  }
}
// ふるふるの探し
class SugGameFurufuruSearch extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/game?lo=124";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[src*='71825fac2eeac6a2b2650f60']"];
    let gameUrlHost = "https://sugutama.dropgame.jp/";
    if (this.isMob) {
      sele = ["img[src*='b086b0a182915e5c0e57329d225b28a1']"];
      gameUrlHost = "https://sugutama-sp.dropgame.jp/";
    }
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
const { PartsGame } = require("./parts/parts-game.js");
// 告白,ピタットトレインmobile
class SugGameContents extends SugMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/game?lo=124";
  mission = "";
  constructor(para, mType) {
    super(para);
    this.mission = mType;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let PGame = new PartsGame(this.para, this.mission);
    let se;
    if (this.mission == D.MISSION.GAME_KOKUHAKU) se = ["img[src*='f0a4790d8fbd0d045c2498fe25fa3fa8']"];
    else if (this.mission == D.MISSION.GAME_TRAIN) se = ["img[src*='1a6ddc77ac3971bbbe7e0baee7a2271c']"]; // train
    else if (this.mission == D.MISSION.GAME_TENKI) se = ["img[src*='7180e9d499f17389deca4cc215bd27d7']"];
    else if (this.mission == D.MISSION.GAME_DARUMA) se = ["img[src*='f091c6cb4870b08d78584a4a32b6d826']"];

    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(se[0], true, 2000)) {
      let el = await this.getEle(se[0], 3000);
      await this.clickEleScrollWeak(el, 2000, 100);
      await this.ignoreKoukoku();
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await PGame.doMethod(wid);
    }
    return res;
  }
}

exports.SugCommon = SugCommon;
exports.Sug = SugBase;
