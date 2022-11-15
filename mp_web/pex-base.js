const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PexBase extends BaseExecuter {
  code = D.CODE.PEX;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec() {
    // ■基本機能
    // 実行ミッションを実施
    let para = {
      retryCnt: 0,
      account: this.account,
      logger: this.logger,
      driver: this.driver,
      siteInfo: this.siteInfo,
    };
    let pexCom = new PexCommon(para);
    let islogin = await pexCom.login();
    if (islogin) {
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.chirashi:
            execCls = new PexChirashi(para);
            break;
          case D.MISSION.news:
            execCls = new PexNewsWatch(para);
            break;
          case D.MISSION.cm:
            execCls = new PexCm(para);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          if (mission["mission_date"]) {
            // ミッションの状況更新
            mission.mod_date = new Date();
            mission.status = res;
            await db(D.DB_COL.MISSION_QUE, "update", { _id: mission._id }, mission);
            // サブミッションの場合、次のサブミッション開始日を更新
            if (mission.sub && mission.valid_term && mission.valid_term.current_m_from) {
              // 続けるミッションのドキュメントを予め確保しておくか、否か
              let nextMission = await db(D.DB_COL.MISSION_QUE, "findOne", {
                site_code: this.code,
                main: mission.main,
                sub: (++mission.sub).toString(), // 次のやつ。数字で定義
              });
              let nextDate = new Date();
              nextDate.setMinutes(nextDate.getMinutes() + mission.valid_term.current_m_from);
              nextMission.valid_time.from = nextDate;
              await db(D.DB_COL.MISSION_QUE, "update", { _id: nextMission._id }, nextMission);
            }
          }
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://pex.jp/";
    let pointPage = "https://pex.jp/user/point_passbook/all";
    await this.driver.get(startPage);
    await this.driver.get(pointPage);
    await this.driver.sleep(3000);
    let sele = ["dl.point_area>dd>span"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.driver.findElement(By.css(sele[0]));
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class PexMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PEX;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
}
// このサイトの共通処理クラス
class PexCommon extends PexMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.g-icon_point"; // ポイント数のセレクタでもあります

    // let ele = await driver.findElements(By.css(seleIsLoggedIn));
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li.header-mymenu_login>a";
      // logger.info(ele.length);
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await ele.click();
        await this.sleep(2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "#pex_user_login_email",
          pass: "#pex_user_login_password",
          login: "[type='submit'][name='commit']",
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
        if (this.isExistEle(seleRecap.panel_iframe, true, 2000)) {
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
const { db } = require("../initter.js");
// オリチラ
class PexChirashi extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
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
    await driver.get(this.firstUrl); // 最初のページ表示
    return await this.ChirashiCls.do(this.targetUrl);
  }
}
// みんなのNEWSウォッチ
class PexNewsWatch extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
  targetUrl = "https://pex.jp/point_news";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    try {
      await driver.get(this.firstUrl); // 最初のページ表示
      await driver.get(this.targetUrl); // 操作ページ表示
      let sele = [
        "ul#point-action-0>li.pt.ungained",
        "div.panel_img",
        "td>input[type='submit']",
        "a>div.go_top",
        "ul#point-action-",
      ];
      if (await this.isExistEle(sele[0], true, 2000)) {
        // let eles = await this.getEles(sele[0], 2000);
        // let repeatNum = eles.length === 3 ? 5 : eles.length === 2 ? 3 : 1;
        let eles;
        // 基本は5回ループ
        let repeatNum = 0;
        for (let i = 0; i < 6; i++) {
          let tmpSele = sele[4] + i;
          let tmpEle = await this.getEle(tmpSele, 2000);
          if (await tmpEle.isDisplayed()) {
            repeatNum = 5 - i;
            break;
          }
        }
        let cnt = 0;
        for (let i = 0; i < repeatNum; i++) {
          eles = await this.getEles(sele[1], 2000);
          let selePart = ["div.panel_label>span.emo_action", "img"];
          for (let j = eles.length - 1; j >= 0; j--) {
            // なんか既読じゃなかったらみたいな条件あり
            if (await this.isExistElesFromEle(eles[j], selePart[0], false, 2000)) {
              let ele0 = await this.getElesFromEles(eles[j], selePart[1], 2000);
              await this.clickEle(ele0[0], 2000); // 同一ページを切り替えてます
              // リアクションを選ぶ
              let eles1 = await this.getEles(sele[2], 2000);
              // ランダムで。
              let choiceNum = libUtil.getRandomInt(0, eles1.length);
              // クリック場所へスクロールが必要（画面に表示しないとだめぽい）
              await this.clickEle(eles1[choiceNum], 2000); // 同一ページを切り替えてます
              cnt++;
              if (await this.isExistEle(sele[3], true, 2000)) {
                let ele = await this.getEle(sele[3], 2000);
                await this.clickEle(ele, 2000); // newsのトップページへ戻る
                break;
              }
            }
          }
        }
        if (repeatNum === cnt) {
          res = D.STATUS.DONE;
        }
      } else logger.info("今日はもう獲得済み");
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
class PexCm extends PexMissonSupper {
  firstUrl = "https://pex.jp/";
  targetUrl = "https://pex-pc.cmnw.jp/cm";
  // ChirashiCls;
  constructor(para) {
    super(para);
    // this.ChirashiCls = new PartsChirashi(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  // ポイントゲットのチャンスは1日2回チラシが更新される朝6時と夜20時
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(this.firstUrl); // 最初のページ表示
    await driver.get(this.targetUrl); // 操作ページ表示
    let selePre = [
      "form[action='/cmd/profiledone']",
      "label[for='radio01'],label[for='radio02']", // 性別  非表示inputをクリックできない　！！
      "select[name='age']", // 年齢
      "select[name='pref']", // 都道府県
      "label[for='radio03'],label[for='radio04']", // 結婚
      "label[for='radio05'],label[for='radio06']", // 子供
      "button[type='submit']", // 回答を送る
    ];
    if (await this.isExistEle(selePre[0], true, 2000)) {
      let ele0,
        select,
        formEle = await this.getEle(selePre[0], 2000);
      if (await this.isExistElesFromEle(formEle, selePre[1], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[1], 2000);
        await this.clickEle(ele0[0], 2000); // 男性を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[2], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[2], 2000);
        select = new Select(ele0[0]);
        await select.selectByValue("38"); // 38歳を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[3], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[3], 2000);
        select = new Select(ele0[0]);
        await select.selectByValue("13"); // 東京を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[4], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[4], 2000);
        await this.clickEle(ele0[1], 2000); // 結婚　無を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[5], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[5], 2000);
        await this.clickEle(ele0[1], 2000); // 子供　無を選択
      }
      if (await this.isExistElesFromEle(formEle, selePre[6], true, 2000)) {
        ele0 = await this.getElesFromEles(formEle, selePre[6], 2000);
        await this.clickEle(ele0[0], 2000); // 回答を送る
      }
      logger.info("cm最初のアンケートに回答しました");
    }
  }
}
// module.
exports.PexCommon = PexCommon;
// module.
exports.Pex = PexBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
