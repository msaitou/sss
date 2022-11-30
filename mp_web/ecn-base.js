const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class EcnBase extends BaseExecuter {
  code = D.CODE.ECN;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let ecnCom = new EcnCommon(para);
    let islogin = await ecnCom.login();
    if (islogin) {
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CHIRASHI:
            execCls = new EcnChirashi(para);
            break;
          case D.MISSION.NEWS:
            execCls = new EcnNewsWatch(para);
            break;
          case D.MISSION.CLICK:
            execCls = new EcnClick(para);
            break;
          case D.MISSION.CHINJU:
            execCls = new EcnChinju(para);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          await this.updateMissionQue(mission, res, this.code);
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://ecnavi.jp/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(3000);
    let sele = ["a>span.new-my-menu-point__point"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.driver.findElement(By.css(sele[0]));
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class EcnMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.ECN;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let sele0 = ["button.chomedama-popup__close-button"];
    if (await this.isExistEle(sele0[0], true, 2000)) {
      let ele = await this.getEle(sele0[0], 3000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 3000);
      }
    }
  }
}
// このサイトの共通処理クラス
class EcnCommon extends EcnMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    await this.hideOverlay();
    let seleIsLoggedIn = "a>span.new-my-menu-point__point"; // ポイント数のセレクタでもあります
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "button.logout-menu__login";
      // logger.info(ele.length);
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000);
        let seleInput = {
          id: "input[name='email']",
          pass: "input[name='passwd']",
          login: "button[type='submit']",
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
        await ele.click();
        this.sleep(4000);
        await this.hideOverlay();
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
const { PartsChirashi } = require("./parts/parts-chirashi.js");
// オリチラ
class EcnChirashi extends EcnMissonSupper {
  firstUrl = "https://ecnavi.jp/";
  targetUrl = "https://pex.jp/chirashi";
  ChirashiCls;
  constructor(para) {
    super(para);
    this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.firstUrl); // 操作ページ表示
    let sele = ["li.type-daily>button.global-menu__link", "a[href*='chirashi']"];
    // ポップアップから動線をクリックして遷移
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      await this.clickEle(ele, 2000); // ポップアップオープン
      if (await this.isExistEle(sele[1], true, 2000)) {
        ele = await this.getEle(sele[1], 2000);
        await this.clickEle(ele, 2000);
        return await this.ChirashiCls.do();
      }
    }
    return D.STATUS.FAIL;
  }
}
// 珍獣先生
class EcnChinju extends EcnMissonSupper {
  firstUrl = "https://ecnavi.jp/";
  targetUrl = "https://pex.jp/chirashi";
  ChirashiCls;
  constructor(para) {
    super(para);
    this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.firstUrl); // 操作ページ表示
    let sele = [
      "li.type-daily>button.global-menu__link",
      "a[href*='chinju_lesson']",
      "a.chinju-lesson-question__link",
    ];
    // ポップアップから動線をクリックして遷移
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      await this.clickEle(ele, 2000); // ポップアップオープン
      if (await this.isExistEle(sele[1], true, 2000)) {
        ele = await this.getEle(sele[1], 2000);
        await this.clickEle(ele, 2000);
        if (await this.isExistEle(sele[2], true, 2000)) {
          let eles = await this.getEles(sele[2], 2000);
          let choiceNum = libUtil.getRandomInt(0, eles.length);
          await this.clickEle(eles[choiceNum], 2000); // 同一ページを切り替えてます
          return D.STATUS.DONE;
        }
      }
    }
    return D.STATUS.FAIL;
  }
}
// まいにちニュース
class EcnNewsWatch extends EcnMissonSupper {
  firstUrl = "https://ecnavi.jp/";
  targetUrl = "https://pex.jp/point_news";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは朝7時から
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      await this.openUrl(this.firstUrl); // 操作ページ表示
      let sele0 = ["li.type-daily>button.global-menu__link", "a[href*='mainichi_news']"];
      // ポップアップから動線をクリックして遷移
      if (await this.isExistEle(sele0[0], true, 2000)) {
        let ele = await this.getEle(sele0[0], 2000);
        await this.clickEle(ele, 2000); // ポップアップオープン
        if (await this.isExistEle(sele0[1], true, 2000)) {
          ele = await this.getEle(sele0[1], 2000);
          await this.clickEle(ele, 2000);
          let sele = [
            ".article-latest li:not([style*='display: none'])>a",
            "button.article-reaction__feeling-button",
            "a[href='/mainichi_news/']",
            "nnnn",
            "p.is-done", // 4
          ];
          if (await this.isExistEle(sele[0], true, 2000)) {
            let eles;
            // 基本は5回ループ
            let repeatNum = 0;
            if (await this.isExistEle(sele[4], true, 2000)) {
              let tmpEle = await this.getEles(sele[4], 2000);
              repeatNum = 5 - tmpEle.length;
            } else repeatNum = 5;
            let cnt = 0;
            for (let i = 0; i < repeatNum; i++) {
              eles = await this.getEles(sele[0], 2000);
              for (let j = eles.length - 1; j >= 0; j--) {
                // なんか既読じゃなかったらみたいな条件ない
                await this.clickEle(eles[j - i], 2000); // 同一ページを切り替えてます
                // リアクションを選ぶ
                let eles1 = await this.getEles(sele[1], 2000);
                // ランダムで。
                let choiceNum = libUtil.getRandomInt(0, eles1.length);
                // クリック場所へスクロールが必要（画面に表示しないとだめぽい）
                await this.clickEle(eles1[choiceNum], 2000); // 同一ページを切り替えてます
                cnt++;
                if (await this.isExistEle(sele[2], true, 2000)) {
                  ele = await this.getEle(sele[2], 2000);
                  await this.clickEle(ele, 2000); // newsのトップページへ戻る
                  break;
                }
              }
            }
            if (repeatNum === cnt) {
              res = D.STATUS.DONE;
            }
          } else logger.info("今日はもう獲得済み");
        }
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
// クリック
class EcnClick extends EcnMissonSupper {
  firstUrl = "https://ecnavi.jp/";
  targetUrl = "https://pex.jp/point_news";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは朝7時から
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      await this.openUrl(this.firstUrl); // 操作ページ表示
      let sele = ["li.type-daily>button.global-menu__link"];
      let missionSeleList = [
        "a[href*='vote/choice']", // 教えてどっち
        "a[href*='doron']", // たぬきときつね
        "a[href*='garapon']", //　宝くじ　ガラポン  // 2
        "a[href*='search_fund']", // 検索募金
        ".secondary-contents__item>a[href*='click_fund']", // クリック募金 // 4
        "a[href*='dictionary_search']", // 辞書検索
      ];
      for (let i in missionSeleList) {
        let mSele = missionSeleList[i];
        // ポップアップから動線をクリックして遷移
        if (await this.isExistEle(sele[0], true, 2000)) {
          let ele = await this.getEle(sele[0], 2000);
          await this.clickEle(ele, 2000); // ポップアップオープン
          if (await this.isExistEle(mSele, true, 2000)) {
            ele = await this.getEle(mSele, 2000);
            await this.clickEle(ele, 2000);
            let eachSele = [];
            switch (i) {
              case "0": // 教えてどっち
                eachSele = ["ul.answer_botton button"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  let choiceNum = libUtil.getRandomInt(0, eles.length);
                  await this.clickEle(eles[choiceNum], 2000);
                }
                break;
              case "1": // たぬきときつね
                eachSele = ["img[alt='itemName']"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  for (let ele0 of eles) {
                    await this.clickEle(ele0, 2000);
                    await this.closeOtherWindow(driver);
                  }
                }
                break;
              case "2": // 宝くじ　ガラポン TODO
                // 月初は、参加するみたいなボタンをクリックしないといけない
                eachSele = [".unit a>img"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  for (let ele0 of eles) {
                    await this.clickEle(ele0, 2000);
                    await this.closeOtherWindow(driver);
                  }
                }
                break;
              case "3": // 検索募金
                eachSele = ["dl.word>dd>button"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  let cnt = 0;
                  for (let ele0 of eles) {
                    await this.clickEle(ele0, 2000);
                    await this.closeOtherWindow(driver);
                    if (++cnt > 1) break;
                  }
                }
                break;
              case "4": // クリック募金
                eachSele = ["a>p>img"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  for (let ele0 of eles) {
                    await this.clickEle(ele0, 2000);
                    await this.closeOtherWindow(driver);
                  }
                }
                break;
              case "5": // 辞書検索
                eachSele = ["dl.dictionary-search-word-list>dd>a"];
                if (await this.isExistEle(eachSele[0], true, 2000)) {
                  let eles = await this.getEles(eachSele[0], 2000);
                  let limit = eles.length;
                  for (let j = 0; j < limit; j++) {
                    if (j != 0 && (await this.isExistEle(eachSele[0], true, 2000))) {
                      eles = await this.getEles(eachSele[0], 2000);
                    }
                    await this.clickEle(eles[j], 2000);
                  }
                }
                break;
            }
          }
        }
        res = D.STATUS.DONE;
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
exports.EcnCommon = EcnCommon;
exports.Ecn = EcnBase;