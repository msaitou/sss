const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PtoBase extends BaseExecuter {
  code = D.CODE.PTO;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
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
      if (cmMissionList.length) {
        this.missionList.push({ main: D.MISSION.CM });
      }
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
class PtoCommon extends PtoMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "div.c-header-user-point>p.c-point-large-label";

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li>a[href='/login']";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移 なぜかログインボタン押しただけでおｋ
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
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
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
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
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
      "",
      "",
    ];
    try {
      await this.openUrl(this.targetUrl);
      if (await this.isExistEle(sele[0], true, 2000)) {
        let ele = await this.getEle(sele[0], 2000);
        await this.clickEle(ele, 3000);
        if (await this.isExistEle(sele[1], true, 2000)) {
          ele = await this.getEle(sele[1], 2000);
          await this.clickEle(ele, 3000);

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
                  ele = await this.getEle(sele[5], 2000);
                  await this.clickEle(ele, 3000); // 動画再生
                  let seleIframe = [
                    "div[id*='google_ads_iframe']>iframe",
                    "div.rewardResumebutton",
                  ];
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
                    i = -1; // リセット
                  }
                }
              }
            }
          }
          res = D.STATUS.DONE;
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
exports.PtoCommon = PtoCommon;
exports.Pto = PtoBase;
