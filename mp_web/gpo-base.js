const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select, Key } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class GpoBase extends BaseExecuter {
  code = D.CODE.GPO;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let gpoCom = new GpoCommon(para);
    let islogin = await gpoCom.login();
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
            execCls = new GpoCm(para, cmMissionList);
            break;
          case D.MISSION.QUIZ_KENTEI:
            execCls = new GpoQuizKentei(para);
            break;
          case D.MISSION.CLICK:
            execCls = new GpoClick(para);
            break;
          case D.MISSION.CLICK_NEWS:
            execCls = new GpoClickNews(para);
            break;
          case D.MISSION.GPO_ANQ:
            execCls = new GpoAnq(para);
            break;
          case D.MISSION.URANAI:
            execCls = new GpoUranai(para);
            break;
          case D.MISSION.ANQ_COLUM:
            execCls = new GpoAnqColum(para);
            break;
          case D.MISSION.ANQ_PHOTO:
            execCls = new GpoAnqPhoto(para);
            break;
          case D.MISSION.ANQ_COOK:
            execCls = new GpoAnqCook(para);
            break;
          case D.MISSION.ANQ_HIRAMEKI:
            execCls = new GpoAnqHirameki(para);
            break;
          case D.MISSION.ANQ_ZUKAN:
            execCls = new GpoAnqZukan(para);
            break;
          case D.MISSION.ANQ_IJIN:
            execCls = new GpoAnqIjin(para);
            break;
          case D.MISSION.ANQ_JAPAN:
            execCls = new GpoAnqJapan(para);
            break;
          case D.MISSION.ANQ_SITE:
            execCls = new GpoAnqSite(para);
            break;
          case D.MISSION.ANQ_KENKOU:
            execCls = new GpoAnqKenkou(para);
            break;
          case D.MISSION.GAME_FURUFURU:
            execCls = new GpoGameFurufuru(para);
            break;
          case D.MISSION.GAME_FURUFURU_SEARCH:
            execCls = new GpoGameFurufuruSearch(para);
            break;
          case D.MISSION.MOLL_KOKUHAKU:
          case D.MISSION.MOLL_DOKOMADE:
          case D.MISSION.MOLL_TRAIN:
          case D.MISSION.MOLL_YUUSYA:
          case D.MISSION.MOLL_EGG:
          case D.MISSION.MOLL_TENKI:
          case D.MISSION.MOLL_HIGHLOW:
          // case D.MISSION.MOLL_TRAIN:
          // case D.MISSION.MOLL_TRAIN:
          // case D.MISSION.MOLL_TRAIN:
          case D.MISSION.POINT_MOLL:
            execCls = new GpoPointMoll(para, mission.main);
            // TODO 2回やモバイルできそうなやつは、別のMISSIONとして、このクラスを利用するように
            break;
        }
        if (execCls) {
          this.logger.info(`${this.isMob ? "m_":""}${this.code}${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${this.isMob ? "m_":""}${this.code}${mission.main} 終了--`);
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
    let startPage = "https://www.gpoint.co.jp/scripts/direct/userinfo/MMMyPage.do";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["span#point"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class GpoMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.GPO;
  para;
  constructor(para) {
    super(para.isMob);
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay(seleStr) {
    let sele0 = ["#modal20th .btn_close>img"];
    if (seleStr) sele0 = [seleStr];
    if (await this.isExistEle(sele0[0], true, 2000)) {
      let ele = await this.getEle(sele0[0], 3000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 3000);
      }
    }
  }
}
// このサイトの共通処理クラス
class GpoCommon extends GpoMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.status-ellipsis";
    if (this.isMob) seleIsLoggedIn = ".point>a>strong";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li.btn-login>a";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input#userid",
          pass: "input#passwd",
          login: "input.btn-login-gp",
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
const { PartsCmManage, Uranai } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class GpoCm extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/sitemap/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let sele = ["a[href*='www.gpoint.co.jp/LoginGate/gw/entry.do']"];
    if (this.isMob) {
      await this.openUrl("https://www.gpoint.co.jp/gpark/"); // 操作ページ表示
      sele[0] = "a[onclick*='kuji']";
    } else await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(this.para, this.cmMissionList, "https://gpoint.cmnw.jp/game/");
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsQuizKentei } = require("./parts/parts-quiz-kentei.js");
// クイズ検定
class GpoQuizKentei extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    let res = D.STATUS.FAIL;
    let QuizKentei = new PartsQuizKentei(this.para);
    let sele = [
      "img[alt='クイズ検定Q']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a", // 2
      "input[alt='OK']",
    ];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
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
class GpoClick extends GpoMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/daily.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let urls = [
      "https://pmall.gpoint.co.jp/free/",
      "https://pmall.gpoint.co.jp/monitor/",
      "https://pmall.gpoint.co.jp/kokangen/",
      "https://www.gpoint.co.jp/special/all/",
    ];
    let sele = ["#dailyChallenge a>img", "#marutokuchallenge a>img", ".mainichi1g a>img", "#atarima10 a>img"];
    for (let j in urls) {
      await this.openUrl(urls[j]); // 操作ページ表示
      if (await this.isExistEle(sele[j], true, 2000)) {
        let eles = await this.getEles(sele[j], 2000);
        for (let i = 0; i < eles.length; i++) {
          await this.clickEle(eles[i], 4000);
          await this.closeOtherWindow(driver);
        }
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// クリックニュース
class GpoClickNews extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let sele = ["#gnewsh div.content:not([style='display: none;']) li>a", "#gnewsh div.menu"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      // 勘違い。12件読む必要なさそうなので、2件くらいで終了に
      // for (let i = 0; i < eles.length; i++) {
      for (let i = 0; i < 2; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
      // if (await this.isExistEle(sele[1], true, 2000)) {
      //   let eles2 = await this.getEles(sele[1], 2000);
      //   await this.clickEle(eles2[1], 4000);
      //   if (await this.isExistEle(sele[0], true, 2000)) {
      //     eles = await this.getEles(sele[0], 2000);
      //     for (let i = 0; i < 3; i++) {
      //       await this.clickEle(eles[i], 4000);
      //       await this.closeOtherWindow(driver);
      //     }
      //   }
      // }
    }

    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}
// GPOアンケート
class GpoAnq extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    let sele = [
      ".surveyList div.button>a",
      "button[value='movenext']",
      ".question-text", // 2
      "label:not(.hide)",
      "select", // 4
      "button[value='movesubmit']",
      "button.nextBtn", // 6
      "button[type='type']:not(.nextBtn)",
      "#dynamicReloadContainer a[data-bs-dismiss='modal']",
    ];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      let limit = eles.length;
      for (let j = 0; j < limit; j++) {
        if (j !== 0 && (await this.isExistEle(sele[0], true, 2000))) eles = await this.getEles(sele[0], 3000);
        if (!eles.length) break;
        await this.clickEle(eles[0], 4000); //
        let wid = await driver.getWindowHandle();
        await this.changeWindow(wid); // 別タブに移動する
        try {
          if (await this.isExistEle(sele[1], true, 2000)) {
            let ele = await this.getEle(sele[1], 3000);
            await this.clickEle(ele, 3000);
            await this.hideOverlay(sele[8]);  // 選択しないで回答した場合、選んでポップアップが表示
            let noFoundCnt = 0;
            if (await this.isExistEle(sele[1], true, 2000)) {
              // 多分15問あり
              for (let i = 0; i < 15; i++) {
                if (await this.isExistEle(sele[2], true, 3000)) {
                  ele = await this.getEle(sele[2], 3000);
                  let q = await ele.getText(),
                    qTmp = "";
                  q = q.split("\n").forEach((t) => {
                    qTmp += t.trim();
                  });
                  let regex = "\\* (\\d+)*",
                    qNo = "";
                  let matches = qTmp.match(regex);
                  logger.info(qTmp);
                  matches && matches.length > 1 ? (qNo = matches[1]) : null;
                  let choiceNum = 0,
                    ansSele = sele[3];
                  if (qNo == "") {
                    if (qTmp.indexOf("このアンケートに最後まで答えていただけますか") > -1) qNo = "1";
                    else if (qTmp.indexOf("本アンケートへの回答に利用しているデバイスはどれですか") > -1) qNo = "2";
                    else if (qTmp.indexOf("あなたの性別をお選びください") > -1) qNo = "3";
                    else if (qTmp.indexOf("あなたは結婚をしていますか") > -1) qNo = "4";
                    else if (qTmp.indexOf("あなたの年齢をお選びください") > -1) qNo = "5";
                    else if (qTmp.indexOf("あなたのご職業をお選びください") > -1) qNo = "6";
                    else if (qTmp.indexOf("あなたの居住形態をお選びください") > -1) qNo = "7";
                    else if (qTmp.indexOf("お住まいの都道府県をお選びください") > -1) qNo = "8";
                    else qNo = "9";
                  }
                  switch (qNo) {
                    case "1": // *1 このアンケートに最後まで答えていただけますか？
                      choiceNum = 0;
                      break;
                    case "2": // * 2 本アンケートへの回答に利用しているデバイスはどれですか？
                    case "3": // *3 性別は？
                    case "4": // 結婚？
                      break;
                    case "5": // *5 年齢は？
                      choiceNum = 2;
                      break;
                    case "6": // *6 職業は？
                      choiceNum = 8;
                      break;
                    case "7": // *7 居住は？
                      choiceNum = 5;
                      break;
                    case "8": // *8 都道府県は？
                      choiceNum = "13";
                      ansSele = sele[4];
                      break;
                    default: // ランダムで。 *9~*15
                      choiceNum = -1; // 仮値
                  }
                  if (ansSele === sele[3] && !(await this.isExistEle(ansSele, true, 2000))) {
                    ansSele = sele[4];
                  }
                  if (await this.isExistEle(ansSele, true, 2000)) {
                    let eles = await this.getEles(ansSele, 3000);
                    if (choiceNum === -1) {
                      choiceNum = libUtil.getRandomInt(0, eles.length - 1);
                    }
                    if (ansSele === sele[4]) {
                      let select = new Select(eles[0]);
                      if (!choiceNum) choiceNum++;
                      await select.selectByValue(choiceNum.toString());
                    } else {
                      await this.clickEle(eles[choiceNum], 2000);
                    }
                    if (await this.isExistEle(sele[1], true, 2000)) {
                      ele = await this.getEle(sele[1], 3000);
                      await this.clickEle(ele, 5000); // 次のページ
                    } else if (await this.isExistEle(sele[5], true, 2000)) {
                      ele = await this.getEle(sele[5], 3000);
                      await this.clickEle(ele, 2000); // 次のページ
                    }
                  }
                } else {
                  if (noFoundCnt++ > 1) break;
                }
              }
              if (await this.isExistEle(sele[6], true, 2000)) {
                ele = await this.getEle(sele[6], 3000);
                await this.clickEle(ele, 2000); // 次のページ
                if (await this.isExistEle(sele[7], true, 2000)) {
                  ele = await this.getEle(sele[7], 3000);
                  await this.clickEle(ele, 2000); // 次のページ
                  await this.ignoreKoukoku();
                  res = D.STATUS.DONE;
                }
              }
            }
          }
          await driver.close(); // このタブを閉じて
        } catch (e) {
          logger.warn(e);
          await driver.close(); // このタブを閉じて
        } finally {
          await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
          await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
        }
      }
    } else res = D.STATUS.DONE;
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// 占い
class GpoUranai extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = ["img[alt='ガチャ付き12星座占い']", "input[alt='OK']"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele0 = await this.getEle(sele[1], 3000);
          await this.clickEle(ele0, 3000);
          let execCls = new Uranai(this.para);
          res = await execCls.do();
        }
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
const { PartsFurufuru } = require("./parts/parts-furufuru.js");
// ふるふる
class GpoGameFurufuru extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[alt='ふるふるパニック']", "input[alt='OK']"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    let gameUrlHost = "https://gpoint.dropgame.jp/";
    if (this.isMob) (gameUrlHost = "https://gpoint-sp.dropgame.jp/"), (sele[1] = "input[value='OK']");
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele0 = await this.getEle(sele[1], 3000);
        await this.clickEle(ele0, 3000);
        res = await Furufuru.doFuru(gameUrlHost, wid);
      }
    }
    return res;
  }
}
// ふるふるの探し
class GpoGameFurufuruSearch extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let Furufuru = new PartsFurufuru(this.para);
    let sele = ["img[alt='ふるふるパニック']", "input[alt='OK']"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    let gameUrlHost = "https://gpoint.dropgame.jp/";
    if (this.isMob) (gameUrlHost = "https://gpoint-sp.dropgame.jp/"), (sele[1] = "input[value='OK']");
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele0 = await this.getEle(sele[1], 3000);
        await this.clickEle(ele0, 3000);
        res = await Furufuru.doSearch(gameUrlHost, wid);
      }
    }
    return res;
  }
}
const { PartsGame } = require("./parts/parts-game.js");
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// ポイントモール
class GpoPointMoll extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
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
    let sele = ["img[alt='メダルモール']", "input[alt='OK']"];
    if (this.isMob) sele[1] = "input[value='OK']";
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 3000);
      await this.clickEle(ele, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      if (await this.isExistEle(sele[1], true, 2000)) {
        let ele0 = await this.getEle(sele[1], 3000);
        await this.clickEle(ele0, 3000);
        try {
          let anqSeleMap = {
            // [D.MISSION.MOLL_IJIN]: "div>img[src*='img_ijin']",
            // [D.MISSION.MOLL_HIRAMEKI]: "div>img[src*='img_hirameki']",
            // [D.MISSION.MOLL_COOK]: "div>img[src*='img_food']",
            // [D.MISSION.MOLL_JAPAN]: "div>img[src*='img_hyakkei']",
            // [D.MISSION.MOLL_SITE]: "div>img[src*='img_kansatsu']",
            // [D.MISSION.MOLL_MANGA]: "div>img[src*='img_manga']",
            // [D.MISSION.MOLL_PHOTO]: "div>img[src*='img_photo']",
            // [D.MISSION.MOLL_COLUM]: "div>img[src*='img_column']",
          };
          let anqSeleList = Object.values(anqSeleMap);
          let mainSeleMap = {
            ...anqSeleMap,
            [D.MISSION.MOLL_KOKUHAKU]: "div>img[src*='img_kokuhaku']",
            [D.MISSION.MOLL_DOKOMADE]: "div>img[src*='nobi']",
            [D.MISSION.MOLL_TRAIN]: "div>img[src*='train']",
            [D.MISSION.MOLL_YUUSYA]: "div>img[src*='img_yusha']",
            [D.MISSION.MOLL_EGG]: "div>img[src*='egg_choice']",
            [D.MISSION.MOLL_HIGHLOW]: "div>img[src*='high_and_low']",
            [D.MISSION.MOLL_TENKI]: "div>img[src*='tenkiate']",
          };
          let cSeleList = [
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
              if (cSele.indexOf("img_kokuhaku") > -1) {
                // 告白
                res = await Game.doKokuhaku(); // wid2は外で閉じるので引数で渡さない
              } else if (cSele.indexOf("nobi") > -1) {
                // どこまで
                res = await Game.doDokomade();
              } else if (cSele.indexOf("train") > -1) {
                // ピタットトレイン
                res = await Game.doTrain();
              } else if (cSele.indexOf("img_yusha") > -1) {
                cSele = "form[action='index.php'] input[type='submit']";
                if (await this.isExistEle(cSele, true, 2000)) {
                  ele = await this.getEle(cSele, 3000);
                  await this.clickEle(ele, 3000);
                }
                // 誰でも勇者
                res = await Game.doYuusya();
              } else if (cSele.indexOf("egg_choice") > -1) {
                // エッグチョイス
                res = await Game.doEgg();
              } else if (cSele.indexOf("high_and_low") > -1) {
                // ハイアンドロー
                res = await Game.doHighLow();
              } else if (cSele.indexOf("tenkiate") > -1) {
                // 天気当て
                res = await Game.doTenki();
              } else if (anqSeleList.indexOf(cSele) > -1) {
                try {
                  let se = ["div>a:not(.answered)"];
                  if (await this.isExistEle(se[0], true, 3000)) {
                    let eles = await this.getEles(se[0], 3000);
                    let limit = eles.length;
                    for (let i = 0; i < limit; i++) {
                      if (i != 0 && (await this.isExistEle(se[0], true, 3000))) eles = await this.getEles(se[0], 3000);
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
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}

// 以下mobile
// アンケート コラム　mobile
class GpoAnqColum extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='columntoenquete']", ".enquete-list div>a", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobColum();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 写真
class GpoAnqPhoto extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='shashintoenquete']", ".enquete-list div>a", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobPhoto();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 動物図鑑
class GpoAnqZukan extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='doubutsu']", ".enquete-list div>a.ui-btn-c", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobZukan();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 偉人
class GpoAnqIjin extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='ijin']", ".enquete-list div>a:not(.answered)", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobIjin();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート ひらめき
class GpoAnqHirameki extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='hirameki']", ".enquete-list div>a:not(.answered)", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobHirameki();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 日本百景
class GpoAnqJapan extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='nihonhyakkeitoenquete']", ".enquete-list div>a:not(.answered)", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobJapan();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 観察
class GpoAnqSite extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='kansatsuryokutoenquete']", ".enquete-list div>a", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobSite();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 料理
class GpoAnqCook extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://kotaete.gpoint.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["a[onclick*='ryori']", ".enquete-list div>a:not(.answered)", "", "input.LgBtnsbmt"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              let ele = eles[eles.length - 1];
              let rect = await ele.getRect();
              await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
              // await this.clickEle(ele, 5000);
              let action = await driver.actions();
              await action.keyDown(Key.CONTROL).click(ele).keyUp(Key.CONTROL).perform();
              await this.sleep(2000);
              let wid2 = await driver.getWindowHandle();
              await this.changeWindow(wid2); // 別タブに移動する
              try {
                res = await AnkPark.doMobCook();
              } catch (e) {
                logger.warn(e);
              } finally {
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
                await driver.switchTo().window(wid2); // 元のウインドウIDにスイッチ
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else {
            res = D.STATUS.DONE;
          }
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
// アンケート 健康 mobile
class GpoAnqKenkou extends GpoMissonSupper {
  firstUrl = "https://www.gpoint.co.jp/";
  targetUrl = "https://www.gpoint.co.jp/gpark/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = ["img[alt*='さらさら健康コラム']", ".enquete-list div>a:not(.answered)", "", "input.LgBtnsbmt"];
    await this.openUrl(this.targetUrl); // 操作ページ表示
    await this.hideOverlay();
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[3], true, 2000)) {
          let ele0 = await this.getEle(sele[3], 3000);
          await this.clickEle(ele0, 3000);
          if (await this.isExistEle(sele[1], true, 2000)) {
            let eles = await this.getEles(sele[1], 3000);
            let limit = eles.length;
            for (let i = 0; i < limit; i++) {
              if (i !== 0 && (await this.isExistEle(sele[1], true, 2000))) eles = await this.getEles(sele[1], 3000);
              await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
              await this.clickEle(eles[eles.length - 1], 6000, 250);
              res = await AnkPark.doMobKenkou();
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
              await this.sleep(2000);
            }
          } else res = D.STATUS.DONE;
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

exports.GpoCommon = GpoCommon;
exports.Gpo = GpoBase;
