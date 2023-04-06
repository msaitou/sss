const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class CitBase extends BaseExecuter {
  code = D.CODE.CIT;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let citCom = new CitCommon(para);
    let islogin = await citCom.login();
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
            execCls = new CitCm(para, cmMissionList);
            break;
          case D.MISSION.READ_DOG:
            execCls = new CitReadDog(para, cmMissionList);
            break;
          case D.MISSION.READ_CAT:
            execCls = new CitReadCat(para, cmMissionList);
            break;
          case D.MISSION.READ_THANK:
            execCls = new CitReadThank(para, cmMissionList);
            break;
          case D.MISSION.READ_ICHI:
            execCls = new CitReadIchi(para, cmMissionList);
            break;
          case D.MISSION.OTANO:
            execCls = new CitOtano(para);
            break;
          case D.MISSION.CLICK:
            execCls = new CitClick(para);
            break;
          case D.MISSION.ANQ_KENKOU:
            execCls = new CitAnqKenkou(para);
            break;
          case D.MISSION.ANQ_PARK:
            execCls = new CitAnqPark(para);
            break;
          case D.MISSION.ANQ_MANGA:
            execCls = new CitAnqManga(para);
            break;
          case D.MISSION.ANQ_COOK:
            execCls = new CitAnqCook(para);
            break;
          case D.MISSION.GAME_FURUFURU:
            execCls = new CitGameFurufuru(para);
            break;
          case D.MISSION.GAME_FURUFURU_SEARCH:
            execCls = new CitGameFurufuruSearch(para);
            break;
          case D.MISSION.GAME_KOKUHAKU:
            execCls = new CitGameKokuhaku(para);
            break;
            case D.MISSION.GAME_DOKOMADE:
              execCls = new CitGameDokomade(para);
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
    let startPage = "https://www.chance.com/";
    await this.openUrl(startPage); // 最初のページ表示
    await this.driver.sleep(1000);
    let sele = ["li.user_pt>a"];
    if (this.isMob) sele[0] = "div.user-pt>span";
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class CitMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.CIT;
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
class CitCommon extends CitMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "li.user_pt>a";
    if (this.isMob) seleIsLoggedIn = "div.user-pt>span";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = ".login>a>span";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input[name='id']",
          pass: "input[name='password']",
          login: "input[name='search_btn']",
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
class CitCm extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/sitemap.jsp";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["a[href*='jump.srv?id=25724']"];
    if (this.isMob) {
      await this.openUrl("https://www.chance.com/sp/mypage/tasklist.jsp");
    } else await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      // await this.clickEle(eles[0], 2000);
      await this.sleep(1000);
      if (this.isMob) {
        let rect = await eles[0].getRect();
        await this.driver.executeScript(`window.scrollTo(0, ${rect.y});`);
      }
      await eles[0].click();
      await this.sleep(1000);

      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://chance.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsRead } = require("./parts/parts-read.js");
// 犬の気持ち
class CitReadDog extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='ban_dog.gif']"];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      // let wid = await driver.getWindowHandle();
      // await this.changeWindow(wid); // 別タブに移動する
      let PartsReadDogCls = new PartsRead(this.para);
      res = await PartsReadDogCls.do();
      // await driver.close(); // このタブを閉じて
      // await driver.switchTo().window(wid);  // 元のウインドウIDにスイッチ
    }
    return res;
  }
}
// 猫の気持ち
class CitReadCat extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='ban_cat.gif']"];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      // let wid = await driver.getWindowHandle();
      // await this.changeWindow(wid); // 別タブに移動する
      let PartsReadDogCls = new PartsRead(this.para);
      res = await PartsReadDogCls.do();
      // await driver.close(); // このタブを閉じて
      // await driver.switchTo().window(wid);  // 元のウインドウIDにスイッチ
    }
    return res;
  }
}
// サンキュ
class CitReadThank extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='ban_39mag.gif']"];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      // let wid = await driver.getWindowHandle();
      // await this.changeWindow(wid); // 別タブに移動する
      let PartsReadDogCls = new PartsRead(this.para);
      res = await PartsReadDogCls.do();
      // await driver.close(); // このタブを閉じて
      // await driver.switchTo().window(wid);  // 元のウインドウIDにスイッチ
    }
    return res;
  }
}
// 一押し
class CitReadIchi extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='ban_ichioshi.gif']"];
    let res = D.STATUS.FAIL;
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      // let wid = await driver.getWindowHandle();
      // await this.changeWindow(wid); // 別タブに移動する
      let PartsReadDogCls = new PartsRead(this.para);
      res = await PartsReadDogCls.do();
      // await driver.close(); // このタブを閉じて
      // await driver.switchTo().window(wid);  // 元のウインドウIDにスイッチ
    }
    return res;
  }
}
const { PartsOtano } = require("./parts/parts-otano.js");
// お楽しみアンケート
class CitOtano extends CitMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://www.chance.com/research/";
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
    let Otano = new PartsOtano(this.para);
    let sele = [
      "button.btn-danger",
      "",
      "img[src*='ban-research.gif']", // 2
    ];
    if (await this.isExistEle(sele[2], true, 2000)) {
      let ele = await this.getEle(sele[2], 3000);
      await this.clickEle(ele, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[0], true, 2000)) {
          let eles0 = await this.getEles(sele[0], 3000),
            limit = eles0.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0 && (await this.isExistEle(sele[0], true, 2000)))
              eles0 = await this.getEles(sele[0], 3000);
            await this.clickEle(eles0[0], 3000);
            res = await Otano.do();
          }
        } else {
          res = D.STATUS.DONE;
        }
      } catch (e) {
        logger.warn(e);
      } finally {
        await driver.close(); // このタブを閉じて
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }

    return res;
  }
}
// クリック
class CitClick extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/click.jsp";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await this.openUrl(this.targetUrl); // 操作ページ表示

    let sele = [".click_list a>img", ".pochitto a[target='_blank']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 3000, 40);
        await this.closeOtherWindow(driver);
      }
    }
    await this.openUrl(this.firstUrl); // 操作ページ表示
    if (await this.isExistEle(sele[1], true, 2000)) {
      let eles = await this.getEles(sele[1], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 3000, 40);
        await this.closeOtherWindow(driver);
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
const { PartsFurufuru } = require("./parts/parts-furufuru.js");
// ふるふる
class CitGameFurufuru extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[alt='ふるふるチャンシー']"];
    let gameUrlHost = "https://chanceit.dropgame.jp/";
    if (this.isMob) {
      this.targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
      gameUrlHost = "https://chanceit-sp.dropgame.jp/";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEleScrollWeak(eles[0], 2000, 100);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await Furufuru.doFuru(gameUrlHost, wid);
    }
    return res;
  }
}
// ふるふるの探し
class CitGameFurufuruSearch extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[alt='ふるふるチャンシー']"];
    let gameUrlHost = "https://chanceit.dropgame.jp/";
    if (this.isMob) {
      this.targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
      gameUrlHost = "https://chanceit-sp.dropgame.jp/";
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
// 告白
class CitGameKokuhaku extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let PGame = new PartsGame(this.para);
    let se = ["img[alt='告白アルバム']"];
    let gameUrlHost = "https://chanceit.dropgame.jp/";
    if (this.isMob) {
      this.targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
      gameUrlHost = "https://chanceit-sp.dropgame.jp/";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(se[0], true, 2000)) {
      let el = await this.getEle(se[0], 3000);
      await this.clickEleScrollWeak(el, 2000);
      await this.ignoreKoukoku();
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await PGame.doKokuhaku(wid);
    }
    return res;
  }
}
// どこまでのびるかな
class CitGameDokomade extends CitMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://www.chance.com/game/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let PGame = new PartsGame(this.para);
    let se = ["img[alt='どこまでのびるかな？']"];
    if (this.isMob) {
      this.targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
    }
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(se[0], true, 2000)) {
      let el = await this.getEle(se[0], 3000);
      await this.clickEleScrollWeak(el, 2000, 100);
      await this.ignoreKoukoku();
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      res = await PGame.doDokomade(wid);
    }
    return res;
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケート 漫画 mobile用
class CitAnqManga extends CitMissonSupper {
  firstUrl = "https://www.chance.com/sp/";
  targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["img[alt='漫画でアンケート']", ".enquete-list div>a"];
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
            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
            await this.clickEle(eles[eles.length - 1], 6000, 250);
            res = await AnkPark.doMobManga();
            await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            await this.sleep(2000);
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
// アンケート 健康 mobile用
class CitAnqKenkou extends CitMissonSupper {
  firstUrl = "https://www.chance.com/sp/";
  targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["img[alt='さらさら健康コラム']", ".enquete-list div>a"];
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
            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
            await this.clickEle(eles[eles.length - 1], 6000, 250);
            res = await AnkPark.doMobKenkou();
            await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            await this.sleep(2000);
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
// アンケート 料理 mobile用
class CitAnqCook extends CitMissonSupper {
  firstUrl = "https://www.chance.com/sp/";
  targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["img[alt='料理とアンケート']", ".enquete-list div>a:not(.answered)"];
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
            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
            await this.clickEle(eles[eles.length - 1], 6000, 250);
            res = await AnkPark.doMobCook();
            await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            await this.sleep(2000);
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
// アンケートパーク mobile用
class CitAnqPark extends CitMissonSupper {
  firstUrl = "https://www.chance.com/sp/";
  targetUrl = "https://www.chance.com/sp/mypage/tasklist.jsp";
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
      "img[alt='アンケートパーク']",
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
                case "偉人":
                  res = await AnkPark.doMobIjin();
                  break;
                case "ひらめき":
                  res = await AnkPark.doMobHirameki();
                  break;
                // case "漫画":
                //   res = await AnkPark.doMobManga();
                //   break;
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
exports.CitCommon = CitCommon;
exports.Cit = CitBase;
