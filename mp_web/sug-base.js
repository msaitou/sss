const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class SugBase extends BaseExecuter {
  code = D.CODE.SUG;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
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
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
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
    let startPage = "https://www.netmile.co.jp/sugutama/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["div.mile.add_mile.js-user_point", ".js-search-switch button"];
    if (this.isMob && (await this.isExistEle(sele[1], true, 2000))) {
      let ele = await this.getEle(sele[1], 2000);
      await this.clickEle(ele, 2000);
    }
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
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
class SugCommon extends SugMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "div.mile.add_mile.js-user_point";

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "div.login>a";
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
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://sugutama.cmnw.jp/game/"
      );
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
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
              eles = await this.getEles(sele[1], 3000);
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
              switch (text.trim()) {
                case "漫画":
                  res = await AnkPark.doManga();
                  break;
                case "日本百景":
                  res = await AnkPark.doJapan();
                  break;
                case "観察力":
                  res = await AnkPark.doSite();
                  break;
                case "料理":
                  res = await AnkPark.doCook();
                  break;
                case "ひらめき":
                  res = await AnkPark.doHirameki();
                  break;
                case "写真":
                  res = await AnkPark.doPhoto();
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
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
              eles = await this.getEles(sele[1], 3000);
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
      for (let i = 0; i < limit; i++) {
        if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
          eles = await this.getEles(sele[1], 3000);
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
          } finally {
            await driver.close(); // このタブを閉じて
            await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
            // await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
          }
        }
      }
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
exports.SugCommon = SugCommon;
exports.Sug = SugBase;
