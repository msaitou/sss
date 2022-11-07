const { BaseExecuter } = require("./BaseExecuter.js");
const { BaseWebDriverWrapper } = require("../BaseWebDriverWrapper");
const { Builder, By, until } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const { Login } = require("../com_cls/login");

class pexBase extends BaseExecuter {
  code = D.CODE.PEX;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.code} constructor`);
  }
  async exec() {
    // ■基本機能
    // ログイン処理追加(最初に実行でも例外で落ちたあとこいつがキャプチャ必要で、失敗したらアテンション→DBに書いて、定期実行。日時も出す。)
    // ポイント取得処理追加(最後に実行)
    // 実行ミッションを実施

    // this.logger.info("きた？", this.siteInfo.entry_url);
    // let rakuCom = new rakuCommon({
    //   retryCnt: this.retryCnt,
    //   account: this.account,
    //   logger: this.logger,
    //   driver: this.driver,
    //   siteInfo: this.siteInfo,
    // });

    // ログイン用の処理の中で、ログインしてなかったらそのページ開いて、何もしないことを統一
    // let loginCls = new Login(0, this.account, this.logger, this.driver, this.siteInfo);
    // await loginCls.login(this.code);
    let pexCom = new pexCommon({
      retryCnt: 0,
      account: this.account,
      logger: this.logger,
      driver: this.driver,
      siteInfo: this.siteInfo,
    });
    await pexCom.login();

    // if (!isLoginNow) {
    //   if (!loginCls) {
    //     loginCls = new Login(0, aca, this.logger, this.driver, null);
    //     this.logger.info("ログいんしました");
    //   }
    //   await loginCls.login(site);
    //   isLoginNow = true;
    // }

    //$('rktn-btn[ratid="web-ecare-6"] button').click() // ログイン後の通信量ページへのリンク
    // const seleList = [
    //   "#d_home_2-5 > div > button > span.rktn-btn-name.ng-star-inserted", // 日毎データ量ページへのリンク
    //   "div.daily__table div._last-column", // １日のデータ量テキスト
    // ];
    // if (this.isExistEle(seleList[0], true, 6000)) {
    //   let ele = await this.getEle(seleList[0], 0);
    //   await ele.click(); // 日毎のデータ量ページに遷移
    //   // await this.driver.sleep(5000);
    //   if (this.isExistEle(seleList[1], true, 6000)) {
    //     let eles = await this.getEles(seleList[1]); // 日毎の数字
    //     let sum3 = 0;
    //     for (let i = 1; i < 4; i++) {
    //       let pureText = await eles[i].getText();
    //       // trimしてGB（単位）削って利用 加算が必要
    //       // 1.3 GB だったはず
    //       sum3 += this.getNumSize(pureText);
    //       this.logger.info("楽", i, pureText);
    //     }
    //     let mes = `${this.code} ${sum3}GB`;
    //     // DBに書き込む
    //     await this.updateLutl(
    //       { code: this.code },
    //       { date: new Date(), used: sum3, disp_mess: mes, code: this.code }
    //     );
    //   }
    // }
  }
  // isExistEle(selector, showFlag) {
  //   By register = By.cssSelector(selector);
  //   boolean is = isExistEle(driver.findElements(register), logg);
  // }
}

// class pexCommon extends loginBase {
class pexCommon extends BaseWebDriverWrapper {
  code = D.CODE.PEX;
  para;
  // retryCnt;
  // account;
  // logger;
  // driver;
  // siteInfo;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug("pexCommon constructor");
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.g-icon_point"; // ポイント数のセレクタでもあります

    // let ele = await driver.findElements(By.css(seleIsLoggedIn));
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "li.header-mymenu_login>a";
      // logger.info(ele.length);
      if (this.isExistEle(seleLoginLink, true, 2000)) {
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
          panel_iframe: "iframe[title*='reCAPTCHA ']", // 適当
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
            return;
          }
        }
        ele = await this.getEle(seleInput.login, 1000);
        await ele.click();
        this.sleep(4000);
        // ログインできてるか、チェック
        if (this.isExistEle(seleIsLoggedIn, true, 2000)) {
          // ログインできてるのでOK
          logger.info("ログインできました！");
        } else {
          // ログインできてないので、メール
          logger.info("ログインできませんでした");
        }


      } else {
        // 未ログインで、ログインボタンが見つかりません。
      }
    } else logger.debug("ログイン中なのでログインしません");

  }
}
// module.
exports.pexCommon = pexCommon;
// module.
exports.pex = pexBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
