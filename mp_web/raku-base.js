const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");
const { log } = require("../initter.js");

class RakuBase extends BaseExecuter {
  code = D.CODE.RAKU;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList, isMob, isHeadless) {
    super(retryCnt, siteInfo, aca, isMob, isHeadless);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let rakuCom = new RakuCommon(para);
    let islogin = await rakuCom.login();
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
          case D.MISSION.CLICK:
            execCls = new RakuClick(para);
            break;
          case D.MISSION.NEWS:
            execCls = new RakuNews(para);
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
    let startPage = "https://www.rakuten-card.co.jp/e-navi/members/index.xhtml";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["#rakutenSuperPoints"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class RakuMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.RAKU;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["div.overlay-item a.button-close", "img[src*='close-interstitial']"];
    for (var sele of seleOver) {
      if (await this.isExistEle(sele, true, 3000)) {
        let ele = await this.getEle(sele, 2000);
        if (await ele.isDisplayed()) {
          await this.clickEle(ele, 2000);
        } else this.logger.debug("オーバーレイは表示されてないです");
      }
    }
  }
}
// このサイトの共通処理クラス
class RakuCommon extends RakuMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "#rakutenSuperPoints";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      let seleInput = { id: "#u", pass: "#p", login: "#loginButton" };
      let seleInput2 = {
        id: "#loginInner_u",
        pass: "#loginInner_p",
        login: 'input[type="submit"]',
        birth: "#loginInner_birthday",
      };
      if (await this.isExistEle(seleInput.id, true, 2000)) {
        logger.debug(11102);
        for (let seleGroup of [seleInput, seleInput2]) {
          if (await this.isExistEle(seleGroup.id, true, 2000)) {
            // アカウント（メール）入力
            let inputEle = await this.getEle(seleGroup.id, 500);
            await inputEle.clear();
            await inputEle.sendKeys(account[this.code].loginid);
            // パスワード入力
            inputEle = await this.getEle(seleGroup.pass, 500);
            await inputEle.clear();
            await inputEle.sendKeys(account[this.code].loginpass);
            if (seleGroup.birth) {
              inputEle = await this.getEle(seleGroup.birth, 500);
              await inputEle.clear();
              await inputEle.sendKeys(account[this.code].birth);
            }
            let ele = await this.getEle(seleGroup.login, 1000);
            await this.clickEle(ele, 3000); // ログインボタン押下
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
// クリック
class RakuClick extends RakuMissonSupper {
  firstUrl = "https://www.rakuten-card.co.jp/e-navi/members/index.xhtml";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = [
      ".rce-userDetails__linkItem a[href*='click-point']",
      "span.rce-number",
      "p.dateArrival img", // 2
      "div.bnrBoxInner a>img",
      "ancestor::div[contains(@class, 'topArea')]",
    ];
    await this.openUrl(this.firstUrl); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      if (await this.isExistElesFromEle(ele, sele[1], true, 2000)) {
        // 未クリック数があれば
        // ele = await this.getElesFromEle(ele, sele[1], 2000);
        await this.clickEleScrollWeak(ele, 4000, 90); // 遷移
        if (await this.isExistEle(sele[2], true, 2000)) {
          let eles = await this.getEles(sele[2], 2000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i != 0) eles = await this.getEles(sele[2], 2000);
            let ele2 = await this.getElesXFromEle(eles[0], sele[4], 2000);
            ele2 = await this.getElesFromEle(ele2[0], sele[3]);
            await this.clickEle(ele2[0], 4000);
            await this.closeOtherWindow(driver);
          }
        }
      }
      res = D.STATUS.DONE;
    }
    await this.openUrl("https://point-g.rakuten.co.jp/point_get/"); // 操作ページ表示
    sele = [
      "iframe[name*='PointGet/Rect_']",
      "img[src*='click_rectangle_A_Before_login']",
      "", // 2
      "",
      "",
    ];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i in eles) {
        let iframe = eles[i];
        let rect = await iframe.getRect();
        await driver.executeScript(`window.scrollTo(0, ${rect.y});`);
        await driver.switchTo().frame(iframe); // 違うフレームなのでそっちをターゲットに
        if (await this.isExistEle(sele[1], true, 2000)) {
          let ele = await this.getEle(sele[1], 2000);
          await this.clickEle(ele, 2000);
          await this.closeOtherWindow(driver);
        }
        await driver.switchTo().defaultContent();
      }
      res = D.STATUS.DONE;
    }
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
// infoseek
class RakuNews extends RakuMissonSupper {
  firstUrl = "https://www.infoseek.co.jp/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    let res = D.STATUS.FAIL;
    let sele = [
      "#missionBox div.missionBox_text",
      "div.topic-detail-title>h1>a", // 1
      "a[data-ratid*='MissionList_GetPoint']",
      "ancestor::div[contains(@class, 'topArea')]", // 3
      "li.list-challenge>div>h4",
      "a[href='/mission/visit/']", //5
      "",
      "",
    ];
    // topに飛ぶ
    try {
      await this.driver.manage().setTimeouts({ pageLoad: 10000 });
      await this.openUrl(this.firstUrl); // 操作ページ表示
    } catch (e) {
      if (e.name != "TimeoutError") {
        throw e;
      } else {
        try {
          await this.driver.navigate().refresh(); // 画面更新  しないとなにも起きない
        } catch (e) {
          this.logger.warn(e);
        }
      }
    } finally {
      await this.driver.manage().setTimeouts({ pageLoad: 180000 });
    }

    let ele,
      eles,
      readedList = [];
    // if (await this.isExistEle(sele[0], true, 2000)) {
    //   ele = await this.getEle(sele[0], 2000);
    //   await this.clickEle(ele, 2000);
    // }
    await this.openUrl("https://www.infoseek.co.jp/mission/list/");
    await this.driver.navigate().back(); // 戻って
    await this.driver.navigate().forward(); // 行く
    if (await this.isExistEle(sele[5], true, 2000)) {
      ele = await this.getEle(sele[5], 2000);
      await this.clickEle(ele, 2000); // タブの切り替え
    }
    // if (await this.isExistEle(sele[4], true, 2000)) {
    //   eles = await this.getEles(sele[4], 2000);
    //   for (let el of eles) {
    //     let text = await el.getText();
    //     if ("週に3日アクセスで1ポイント" === text.trim()) {
    //       // let ele2 = await this.getElesXFromEle(el, sele[4], 2000);
    //       // ele2 = await this.getElesFromEle(ele2[0], sele[3]);
    //     }
    //   }
    // }

    // TODO　月1？月初にミッションの参加をしないとあかんぽい
    // TODO 週3回アクセスは先にアクセス
    let cSeleList = [
      "#topics-category-entertainment",
      "#topics-category-poli-soci",
      "#topics-category-sports",
      "#topics-category-busi-econ",
      "#topics-category-world",
      "#topics-category-it",
      "#topics-category-life",
      "#topics-category-all",
    ];
    await this.openUrl(this.firstUrl); // 操作ページ表示
    try {
      var cnt = 0;
      for (let cSele of cSeleList) {
        while (true) {
          let scSele = `a[href='${cSele}']`;
          if (await this.isExistEle(scSele, true, 2000)) {
            ele = await this.getEle(scSele, 2000);
            await this.clickEle(ele, 1000); // タブの切り替え
            let acSele = `${cSele} div.main-topics-body a`;
            if (await this.isExistEle(acSele, true, 2000)) {
              eles = await this.getEles(acSele, 2000);
              let unReadEle = null;
              for (let j = eles.length - 1; j > -1; j--) {
                let tmpUrl = await eles[j].getAttribute("href");
                if (readedList.indexOf(tmpUrl) === -1) {
                  readedList.push(tmpUrl);
                  unReadEle = eles[j];
                  break;
                }
              }
              if (unReadEle) {
                await this.clickEle(unReadEle, 2000);
                if (await this.isExistEle(sele[1], true, 2000)) {
                  ele = await this.getEle(sele[1], 2000);
                  let reactionSele = ["#reaction-icon-container li>button", "#reaction-icon-container li>button.is-disabled",".pager>li>ul>li"];
                  if (await this.isExistEle(reactionSele[2], true, 1000)) {
                    eles = await this.getEles(reactionSele[2], 1000);
                    await this.clickEle(eles[eles.length-1], 3000); // 最後のページに移動
                  }
                  // 1記事を10秒待機。その後ページの最下部へ移動して、2秒待機？TOPページを表示
                  await this.hideOverlay();
                  await this.clickEle(ele, 10000); // 10秒待機
                  if (await this.isExistEle(reactionSele[1], false, 1000) // リアクション済みでない
                    && await this.isExistEle(reactionSele[0], true, 1000)) {
                    eles = await this.getEles(reactionSele[0], 1000);
                    let choiceNum = libUtil.getRandomInt(0, eles.length);
                    await this.clickEle(eles[choiceNum], 1000); // リアクションする
                    cnt++;
                  }
                  await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
                  await this.sleep(2000);
                }
                await this.openUrl(this.firstUrl); // 操作ページ表示
              } else {
                logger.debug("このタブは全部読んだので次のタブを見る");
                break;
              }
            }
          } else break;
          if (readedList.length > 25 && cnt > 25) break;
        }
        if (readedList.length > 25 && cnt > 25) break;
      }
    }
    catch(e) {
      this.logger.warn(e);
    }
    // if (await this.isExistEle(sele[0], true, 2000)) {
    //   ele = await this.getEle(sele[0], 2000);
    //   await this.clickEle(ele, 2000);
    // }
    await this.openUrl("https://www.infoseek.co.jp/mission/list/");
    // ループ完了後、ミッションページでポイント獲得ボタンを押下（押せるやつのみ）
    if (await this.isExistEle(sele[2], true, 2000)) {
      eles = await this.getEles(sele[2], 2000);
      let limit = eles.length;
      for (let i = 0; i < limit; i++) {
        if (i != 0) eles = await this.getEles(sele[2], 2000);
        await this.clickEle(eles[0], 2000);
        await this.driver.navigate().back(); // 戻って
      }
      res = D.STATUS.DONE;
    }
    // TOPページの総合タブに表示されてるリンクを下から順に表示する
    // リンクは保持して、同じものはスキップする。このタブに表示するものがなくなったら次のタブ。
    // 26回ループ
    logger.info(`${this.constructor.name} END`);
    return res;
  }
}
exports.RakuCommon = RakuCommon;
exports.Raku = RakuBase;
