const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PicBase extends BaseExecuter {
  code = D.CODE.PIC;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob) {
    super(retryCnt, siteInfo, aca, isMob);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let sugCom = new PicCommon(para);
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
            execCls = new PicCm(para, cmMissionList);
            break;
          case D.MISSION.OTANO:
            execCls = new PicOtano(para);
            break;
          case D.MISSION.CLICK:
            execCls = new PicClick(para);
            break;
          case D.MISSION.READ_DOG:
            execCls = new PicReadDog(para);
            break;
          case D.MISSION.READ_CAT:
            execCls = new PicReadCat(para);
            break;
          case D.MISSION.READ_THANK:
            execCls = new PicReadThank(para);
            break;
          case D.MISSION.READ_ICHI:
            execCls = new PicReadIchi(para);
            break;
          case D.MISSION.MOLL_KOKUHAKU:
          // case D.MISSION.POINT_MOLL:
          case D.MISSION.POINT_MOLL:
            execCls = new PicPointMoll(para, mission.main);
            // TODO 2回やモバイルできそうなやつは、別のMISSIONとして、このクラスを利用するように
            break;
          case D.MISSION.POTARO_FIND:
            execCls = new PicPotaroFind(para);
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
    let startPage = "https://pointi.jp/";
    let sele = ["span.red.pt_count"];
    if (this.isMob) (startPage = "https://sp.pointi.jp/"), (sele = ["span.pt_count"]);
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
class PicMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PIC;
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
class PicCommon extends PicMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.red.pt_count";
    let seleLoginLink = "a[href='/entrance.php']";
    let seleInput = {
      id: "input[name='email_address']",
      pass: "input[name='password']",
      login: "input[name='Submit']",
    };
    if (this.isMob)
      (seleIsLoggedIn = "span.pt_count"),
        (seleLoginLink = "img[alt='ログイン']"),
        (seleInput.login = "input[name='subject']");
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
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
        if (this.isMob) {
          let sele = ["label[for='checkcrr4']", "#form_btn"];
          if (await this.isExistEle(sele[0], true, 2000)) {
            // 次のページで、利用キャリアを選択せなあかん
            ele = await this.getEle(sele[0], 1000);
            await this.clickEle(ele, 1000);
            if (await this.isExistEle(sele[1], true, 2000)) {
              ele = await this.getEle(sele[1], 1000);
              await this.clickEle(ele, 1000);
            }
          }
        }
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

const { PartsCmManage, Uranai } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class PicCm extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/game/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='CMくじ']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://pointi.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsOtano } = require("./parts/parts-otano.js");
// お楽しみアンケート
class PicOtano extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/contents/research/research_enquete/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let Otano = new PartsOtano(this.para);
    let sele = ["tr.ank_column>td.red.bold", "tr.ank_column a.answer_btn"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles0 = await this.getEles(sele[0], 3000),
        limit = eles0.length;
      for (let i = 0; i < limit; i++) {
        if (i !== 0 && (await this.isExistEle(sele[0], true, 2000)))
          eles0 = await this.getEles(sele[0], 3000);
        let limit2 = eles0.length;
        for (let j = 0; j < limit2; j++) {
          let index = limit2 - 1 - j;
          let text = await eles0[index].getText();
          if (text.trim() == "2pt") {
            // picのお楽しみは2ptのみ
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles = await this.getEles(sele[1], 3000);
              await this.clickEle(eles[index], 3000);
              let wid = await driver.getWindowHandle();
              await this.changeWindow(wid); // 別タブに移動する
              try {
                res = await Otano.do();
                logger.info(`${this.constructor.name} END`);
              } catch (e) {
                logger.warn(e);
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
              } finally {
                await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
              }
            }
          } else {
            res = D.STATUS.DONE;
          }
        }
      }
    }
    return res;
  }
}
// クリック
class PicClick extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/daily.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await this.openUrl(this.targetUrl); // 操作ページ表示

    let sele = ["div.click_btn"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// ぽ太郎を探せ
class PicPotaroFind extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/amusement_daily.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await this.openUrl(this.targetUrl); // 操作ページ表示

    let sele = ["div.start_button img", ""];
    if ("ダービーなら") sele[2] = "div[style*='intro_select_btn']";
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < 2; i++) {
        if (i != 0) eles = await this.getEles(sele[0], 2000);
        await this.clickEle(eles[i], 4000);
        // await this.closeOtherWindow(driver);
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
const { PartsGame } = require("./parts/parts-game.js");
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
const { PartsQuizKentei } = require("./parts/parts-quiz-kentei.js");
// ポイントモール
class PicPointMoll extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/game/";
  main = "";
  constructor(para, main) {
    super(para);
    this.main = main == D.MISSION.POINT_MOLL ? null : main;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    if (this.isMob) this.targetUrl = "https://sp.pointi.jp/daily/daily_list.php";
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='メダルモール']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        let anqSeleMap = {
          [D.MISSION.MOLL_IJIN]: "div>img[src*='img_ijin']",
          [D.MISSION.MOLL_HIRAMEKI]: "div>img[src*='img_hirameki']",
          [D.MISSION.MOLL_COOK]: "div>img[src*='img_food']",
          [D.MISSION.MOLL_JAPAN]: "div>img[src*='img_hyakkei']",
          [D.MISSION.MOLL_SITE]: "div>img[src*='img_kansatsu']",
          [D.MISSION.MOLL_MANGA]: "div>img[src*='img_manga']",
          [D.MISSION.MOLL_PHOTO]: "div>img[src*='img_photo']",
          [D.MISSION.MOLL_COLUM]: "div>img[src*='img_column']",
        };
        let anqSeleList = Object.values(anqSeleMap);
        let mainSeleMap = {
          ...anqSeleMap,
          [D.MISSION.MOLL_KOKUHAKU]: "div>img[src*='img_kokuhaku']",
        };
        let cSeleList = [
          "img[src*='img_quiz01']",
          "img[src*='img_quiz02']",
          "img[src*='img_quiz03']",
          "img[src*='img_quiz04']",
          "img[src*='img_quiz05']",
          // "img[src*='img_seiza']",　// なんか0しか稼げないので
          // ...Object.values(mainSeleMap), // 値を配列で列挙して展開
        ];
        if (this.main) {
          cSeleList = [mainSeleMap[this.main]]; // 単体実行
        } else {
          if (this.isMob) cSeleList = Object.values(anqSeleMap);
        }
        let Game = new PartsGame(this.para);
        let AnkPark = new PartsAnkPark(this.para);
        let QuizKentei = new PartsQuizKentei(this.para);
        for (let cSele of cSeleList) {
          if (await this.isExistEle(cSele, true, 2000)) {
            ele = await this.getEle(cSele, 3000);
            await this.clickEle(ele, 3000);
            let wid2 = await driver.getWindowHandle();
            await this.changeWindow(wid2); // 別タブに移動する
            if (cSele.indexOf("img_quiz0") > -1) {
              // クイズ検定系
              res = await QuizKentei.startKentei();
            } else if (cSele.indexOf("img_seiza") > -1) {
              // 占い
              let execCls = new Uranai(this.para);
              res = await execCls.do();
            } else if (cSele.indexOf("img_kokuhaku") > -1) {
              // 告白
              res = await Game.doKokuhaku(); // wid2は外で閉じるので引数で渡さない
            } else if (anqSeleList.indexOf(cSele) > -1) {
              try {
                let se = ["div>a:not(.answered)"];
                if (await this.isExistEle(se[0], true, 3000)) {
                  let eles = await this.getEles(se[0], 3000);
                  let limit = eles.length;
                  for (let i = 0; i < limit; i++) {
                    if (i != 0 && (await this.isExistEle(se[0], true, 3000)))
                      eles = await this.getEles(se[0], 3000);
                    let wid3 = await driver.getWindowHandle();
                    if (cSele == mainSeleMap[D.MISSION.MOLL_HIRAMEKI]) {
                      // 終了後一覧に戻らずブラウザが閉じるので、矯正別タブで
                      let rect = await eles[eles.length - 1].getRect();
                      await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
                      let action = await driver.actions();
                      await action
                        .keyDown(Key.CONTROL)
                        .click(eles[eles.length - 1])
                        .keyUp(Key.CONTROL)
                        .perform();
                      await this.sleep(2000);
                      await this.changeWindow(wid3); // 別タブに移動する
                    } else {
                      await this.clickEle(eles[eles.length - 1], 2000);
                    }
                    // アンケート系
                    switch (cSele) {
                      case mainSeleMap[D.MISSION.MOLL_IJIN]: // "偉人":
                        res = await AnkPark.doMobIjin();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_HIRAMEKI]: //"ひらめき":
                        res = await AnkPark.doMobHirameki();
                        await this.closeDriver(); // このタブを閉じて
                        await driver.switchTo().window(wid3); // 別タブが閉じるので、一覧が表示されてるタブへスイッチ
                        break;
                      case mainSeleMap[D.MISSION.MOLL_MANGA]: //"漫画":
                        res = await AnkPark.doMobManga();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_COLUM]: //"コラム":
                        res = await AnkPark.doMobColum();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_JAPAN]: //"日本百景":
                        res = await AnkPark.doMobJapan();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_SITE]: //"観察力":
                        res = await AnkPark.doMobSite();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_COOK]: //"料理":
                        res = await AnkPark.doMobCook();
                        break;
                      case mainSeleMap[D.MISSION.MOLL_PHOTO]: // "写真":
                        res = await AnkPark.doMobPhoto();
                        break;
                    }
                    await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
                  }
                } else res = D.STATUS.DONE;
              } catch (e) {
                logger.warn(e);
              }
              //  finally {
              //   await this.closeDriver(); // このタブを閉じて
              //   await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              // }
            } else if (cSele.indexOf("aaaaa") > -1) {
            }
            await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
            await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
          }
        }
        res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      } finally {
        await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}

const { PartsReadPic } = require("./parts/parts-read.js");
// 犬の気持ち
class PicReadDog extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='いぬのきもち']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// 猫の気持ち
class PicReadCat extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='ねこのきもち']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// サンキュ
class PicReadThank extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='サンキュ！']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// 一押し
class PicReadIchi extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='イチオシ']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
exports.PicCommon = PicCommon;
exports.Pic = PicBase;
