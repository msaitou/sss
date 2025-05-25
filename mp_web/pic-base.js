const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");
const conf = require("config");

class PicBase extends BaseExecuter {
  code = D.CODE.PIC;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
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
          case D.MISSION.MOLL_DOKOMADE:
          case D.MISSION.MOLL_MANGA:
          case D.MISSION.MOLL_COLUM:
          case D.MISSION.MOLL_PHOTO:
          case D.MISSION.MOLL_FOOD:
          case D.MISSION.MOLL_HIRAMEKI:
          case D.MISSION.MOLL_IJIN:
          case D.MISSION.MOLL_JAPAN:
          case D.MISSION.MOLL_SITE:
          case D.MISSION.MOLL_TRAIN:
          case D.MISSION.MOLL_YUUSYA:
          case D.MISSION.MOLL_EGG:
          case D.MISSION.MOLL_TENKI:
          case D.MISSION.MOLL_HIGHLOW:
          case D.MISSION.MOLL_QUIZ_KENTEI_1:
          case D.MISSION.MOLL_QUIZ_KENTEI_2:
          case D.MISSION.MOLL_QUIZ_KENTEI_3:
          case D.MISSION.MOLL_QUIZ_KENTEI_4:
          case D.MISSION.MOLL_QUIZ_KENTEI_5:
          // case D.MISSION.POINT_MOLL:
          case D.MISSION.MOLL_OTSUKAI:
          case D.MISSION.MOLL_COOK:
          case D.MISSION.MOLL_FASHION:
          case D.MISSION.MOLL_OTE:
          case D.MISSION.MOLL_BUS:
          case D.MISSION.MOLL_SUPPA:
          case D.MISSION.MOLL_KOTAE:
          case D.MISSION.MOLL_GEKIKARA:
            execCls = new PicPointMoll(para, mission.main);
            break;
          case D.MISSION.PIC_VARIABLE:
            execCls = new PicVariable(para);
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
    let seleOver = ["#pfx_interstitial_close", "div.overlay-item a.button-close"];
    for (let s of seleOver) {
      if (["a.gmoam_close_button"].indexOf(s) > -1) {
        let iSele = ["iframe[title='GMOSSP iframe']"];
        if (await this.silentIsExistEle(iSele[0], true, 3000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
          let inputEle = await this.getEle(s, 1000);
          if (await inputEle.isDisplayed()) {
            await this.clickEle(inputEle, 2000);
          } else this.logger.debug("オーバーレイは表示されてないです");
          // もとのフレームに戻す
          await this.driver.switchTo().defaultContent();
        }
      } else if (["#pfx_interstitial_close"].indexOf(s) > -1) {
        let iSele = ["iframe.profitx-ad-frame-markup"];
        if (await this.silentIsExistEle(iSele[0], true, 3000)) {
          let iframe = await this.getEles(iSele[0], 1000);
          if (await iframe[0].isDisplayed()) {
            await this.driver.switchTo().frame(iframe[0]); // 違うフレームなのでそっちをターゲットに
            let isExists = await this.silentIsExistEle(s, true, 1000);
            // もとのフレームに戻す
            await this.driver.switchTo().defaultContent();
            if (isExists) await this.exeScriptNoTimeOut(`document.querySelector("${iSele[0]}").contentWindow.document.querySelector("${s}").click()`);
            else if (await this.silentIsExistEle(s, true, 3000)) {
              await this.exeScriptNoTimeOut(`document.querySelector("${s}").click()`);
            } 
          }
        }else if (await this.silentIsExistEle(s, true, 1000)) {
          let ele = await this.getEle(s, 1000);
          if (await ele.isDisplayed()) {
            await this.clickEle(ele, 1000);
          } else this.logger.debug("オーバーレイは表示されてないです");
        }
      } else if (await this.silentIsExistEle(s, true, 3000)) {
        let ele = await this.getEle(s, 2000);
        if (s == seleOver[0]) {
          await this.exeScriptNoTimeOut(`arguments[0].click()`, ele);
        } else if (await ele.isDisplayed()) {
          await this.clickEle(ele, 2000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
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
        (seleLoginLink = "a.login_btn>div.nav_img"),
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
      let cmManage = new PartsCmManage(this.para, this.cmMissionList, "https://pointi.cmnw.jp/game/");
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
        if (i !== 0 && (await this.isExistEle(sele[0], true, 2000))) eles0 = await this.getEles(sele[0], 3000);
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
        await driver.navigate().refresh();
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
    let sele = ["div.go_btn"];
    if (this.isMob) {
      // 先に　カードです
      sele = ["img[alt='スタートボタン']", "#last_btn"];
      await this.openUrl("https://sp.pointi.jp/sites/campaign/carddess/"); // 操作ページ表示
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEle(ele, 10000);
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 2000);
          await this.clickEle(ele, 1000);
        }
      }
      sele = ["div.go_btn", "li.send_ok_btn>a", "li.send_cancel_btn"];
      await this.openUrl("https://sp.pointi.jp/daily/"); // 操作ページ表示
    } else await this.openUrl(this.targetUrl); // 操作ページ表示

    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 2000);
        if (this.isMob) {
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles2 = await this.getEles(sele[1], 2000);
            for (let j in eles2) {
              let ele = eles2[j];
              if (await ele.isDisplayed()) {
                await this.clickEle(ele, 2000);
                if (await this.isExistEle(sele[2], true, 2000)) {
                  let eles3 = await this.getEles(sele[2], 2000);
                  await this.clickEle(eles3[j], 1000);
                }
                break;
              }
            }
          }
        }
        await this.closeOtherWindow(driver);
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// ぽ太郎を探せ
class PicVariable extends PicMissonSupper {
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
    let sele = ["div.box_wrap>p"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      let kind = await eles[0].getText(); // 0番目
      if (kind == "ポ太郎を探せ！") {
        sele = ["div.start_button img", "div[style*='box_close']", "#game_js_area>iframe"];
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 2000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[2], true, 2000)) {
            let iframe = await this.getEle(sele[2], 1000);
            await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles = await this.getEles(sele[1], 2000);
              for (let i = 0; i < 2; i++) {
                if (i != 0) eles = await this.getEles(sele[1], 2000);
                await this.clickEle(eles[i], 4000);
              }
            }
            await driver.switchTo().defaultContent(); // もとのフレームに戻す
          }
          await this.sleep(4000);
        }
      } else if (kind == "ポイントインカム ダービー") {
        sele = ["div.start_button img", "div[style*='intro_select_btn']", "#game_js_area>iframe"];
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 2000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[2], true, 2000)) {
            let iframe = await this.getEle(sele[2], 1000);
            await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles = await this.getEles(sele[1], 2000);
              await this.clickEle(eles[libUtil.getRandomInt(0, eles.length)], 3000);
              await this.sleep(20000);
            }
            await driver.switchTo().defaultContent(); // もとのフレームに戻す
          }
          await this.sleep(4000);
        }
      } else if (kind == "ポ太郎 神経衰弱") {
        sele = ["div.start_button img", "div[style*='card.png']", "#game_js_area>iframe"];
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 2000);
          await this.clickEle(ele, 2000);
          if (await this.isExistEle(sele[2], true, 2000)) {
            let iframe = await this.getEle(sele[2], 1000);
            await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles = await this.getEles(sele[1], 2000);
              // 8枚あって、ペアを見つける。開かれたカードのセレクタを要チェック　TODO
              await this.clickEle(eles[libUtil.getRandomInt(0, eles.length)], 3000);
              await this.sleep(20000);
            }
            await driver.switchTo().defaultContent(); // もとのフレームに戻す
          }
          await this.sleep(4000);
        }
      }

      // if ("ダービーなら") sele[2] = "div[style*='intro_select_btn']";
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
          [D.MISSION.MOLL_IJIN]: "div>img[src*='img_ijin.']",
          [D.MISSION.MOLL_HIRAMEKI]: "div>img[src*='img_hirameki.']",
          [D.MISSION.MOLL_FOOD]: "div>img[src*='img_food.']",
          [D.MISSION.MOLL_JAPAN]: "div>img[src*='img_hyakkei.']",
          [D.MISSION.MOLL_SITE]: "div>img[src*='img_kansatsu.']",
          [D.MISSION.MOLL_MANGA]: "div>img[src*='img_manga.']",
          [D.MISSION.MOLL_PHOTO]: "div>img[src*='img_photo.']",
          [D.MISSION.MOLL_COLUM]: "div>img[src*='img_column.']",
        };
        let anqSeleList = Object.values(anqSeleMap);
        let mainSeleMap = {
          ...anqSeleMap,
          [D.MISSION.MOLL_QUIZ_KENTEI_1]: "#game img[src*='img_quiz01']",
          [D.MISSION.MOLL_QUIZ_KENTEI_2]: "#game img[src*='img_quiz02']",
          [D.MISSION.MOLL_QUIZ_KENTEI_3]: "#game img[src*='img_quiz03']",
          [D.MISSION.MOLL_QUIZ_KENTEI_4]: "#game img[src*='img_quiz04']",
          [D.MISSION.MOLL_QUIZ_KENTEI_5]: "#game img[src*='img_quiz05']",
        };
        let gameSeleMap = {
          [D.MISSION.MOLL_KOKUHAKU]: "div>img[src*='img_kokuhaku']",
          [D.MISSION.MOLL_DOKOMADE]: "div>img[src*='nobi']",
          [D.MISSION.MOLL_TRAIN]: "div>img[src*='train']",
          [D.MISSION.MOLL_YUUSYA]: "div>img[src*='img_yusha']",
          [D.MISSION.MOLL_EGG]: "div>img[src*='egg_choice']",
          [D.MISSION.MOLL_HIGHLOW]: "div>img[src*='high_and_low']",
          [D.MISSION.MOLL_TENKI]: "div>img[src*='tenkiate']",
          [D.MISSION.MOLL_OTSUKAI]: `${this.isMob? "#enq": "#game"} img[src*='img_otsukai']`,
          [D.MISSION.MOLL_COOK]: `${this.isMob? "#enq": "#game"}  img[src*='img_cooking']`,
          [D.MISSION.MOLL_FASHION]: `${this.isMob? "#enq": "#game"}  img[src*='img_fashion']`,
          [D.MISSION.MOLL_OTE]: `${this.isMob? "#enter": "#enter"}  img[src*='img_ote']`,
          [D.MISSION.MOLL_BUS]: `${this.isMob? "#enter": "#game"}  img[src*='img_bus']`,
          [D.MISSION.MOLL_SUPPA]: `${this.isMob? "#enter": "#game"}  img[src*='img_sour']`,
          [D.MISSION.MOLL_KOTAE]: `${this.isMob? "#enter": "#game"}  img[src*='img_kotae']`,
          [D.MISSION.MOLL_GEKIKARA]: `${this.isMob? "#enter": "#game"}  img[src*='img_ramen']`,
        };
        mainSeleMap = Object.assign(mainSeleMap, gameSeleMap);
        let cSeleList = [
          // "img[src*='img_seiza']",　// なんか0しか稼げないので
          // ...Object.values(mainSeleMap), // 値を配列で列挙して展開
        ];
        if (this.main) {
          cSeleList = [mainSeleMap[this.main]]; // 単体実行
        } else {
          if (this.isMob) cSeleList = Object.values(anqSeleMap);
        }
        let Game = new PartsGame(this.para, this.main);
        let AnkPark = new PartsAnkPark(this.para);
        let QuizKentei = new PartsQuizKentei(this.para);
        let dirtyFlg = false;
        for (let cSele of cSeleList) {
          dirtyFlg = true;
          if (await this.isExistEle(cSele, true, 2000)) {
            ele = await this.getEle(cSele, 3000);
            await this.clickEle(ele, 300);
            let wid2 = await driver.getWindowHandle();
            await this.changeWindow(wid2); // 別タブに移動する
            if (cSele.indexOf("img_quiz0") > -1) {
              // クイズ検定系
              res = await QuizKentei.startKentei();
            } else if (cSele.indexOf("img_seiza") > -1) {
              // 占い
              let execCls = new Uranai(this.para);
              res = await execCls.do();
            } else if (Object.values(gameSeleMap).indexOf(cSele) > -1) {
              res = await Game.doMethod();
            } else if (anqSeleList.indexOf(cSele) > -1) {
              try {
                let se = ["div>a:not(.answered)"];
                if (await this.isExistEle(se[0], true, 3000)) {
                  let eles = await this.getEles(se[0], 3000);
                  let limit = eles.length;
                  for (let i = 0; i < limit; i++) {
                    if (i != 0 && (await this.isExistEle(se[0], true, 3000))) eles = await this.getEles(se[0], 3000);
                    let wid3 = await driver.getWindowHandle();
                    await this.hideOverlay();
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
                      await this.exeScriptNoTimeOut(`arguments[0].click()`, eles[eles.length - 1]);
                      // await this.clickEle(eles[eles.length - 1], 2000);
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
                      case mainSeleMap[D.MISSION.MOLL_FOOD]: //"料理":
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
            if (wid2 != wid) {
              await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
              await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
            }
          }
        }
        if (!(dirtyFlg && res == D.STATUS.FAIL)) res = D.STATUS.DONE;
      } catch (e) {
        logger.warn(e);
      } finally {
        try {
          await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
        } catch (e) {}
      }
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}

const { PartsReadPic } = require("./parts/parts-read.js");
const { util } = require("config");
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
