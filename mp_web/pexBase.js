const { BaseExecuter } = require("../ml_utl/BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const { Login } = require("../com_cls/login");

class pexBase extends BaseExecuter {
  code = D.CODE.PEX;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logDebug(`${this.code} constructor`);
  }
  async exec() {
    // ■基本機能
    // ログイン処理追加(最初に実行でも例外で落ちたあとこいつがキャプチャ必要で、失敗したらアテンション→DBに書いて、定期実行。日時も出す。)
    // ポイント取得処理追加(最後に実行)
    // 実行ミッションを実施

    // this.logInfo("きた？", this.siteInfo.entry_url);
    // let rakuCom = new rakuCommon({
    //   retryCnt: this.retryCnt,
    //   account: this.account,
    //   logger: this.logger,
    //   driver: this.driver,
    //   siteInfo: this.siteInfo,
    // });

    // ログイン用の処理の中で、ログインしてなかったらそのページ開いて、何もしないことを統一
    let loginCls = new Login(0, this.account, this.logger, this.driver, this.siteInfo);
    await loginCls.login(this.code);

    // if (!isLoginNow) {
    //   if (!loginCls) {
    //     loginCls = new Login(0, aca, this.logger, this.driver, null);
    //     this.logInfo("ログいんしました");
    //   }
    //   await loginCls.login(site);
    //   isLoginNow = true;
    // }

    //$('rktn-btn[ratid="web-ecare-6"] button').click() // ログイン後の通信量ページへのリンク
    const seleList = [
      "#d_home_2-5 > div > button > span.rktn-btn-name.ng-star-inserted", // 日毎データ量ページへのリンク
      "div.daily__table div._last-column", // １日のデータ量テキスト
    ];
    if (this.isExistEle(seleList[0], true, 6000)) {
      let ele = await this.getEle(seleList[0], 0);
      await ele.click(); // 日毎のデータ量ページに遷移
      // await this.driver.sleep(5000);
      if (this.isExistEle(seleList[1], true, 6000)) {
        let eles = await this.getEles(seleList[1]); // 日毎の数字
        let sum3 = 0;
        for (let i = 1; i < 4; i++) {
          let pureText = await eles[i].getText();
          // trimしてGB（単位）削って利用 加算が必要
          // 1.3 GB だったはず
          sum3 += this.getNumSize(pureText);
          this.logInfo("楽", i, pureText);
        }
        let mes = `${this.code} ${sum3}GB`;
        // DBに書き込む
        await this.updateLutl(
          { code: this.code },
          { date: new Date(), used: sum3, disp_mess: mes, code: this.code }
        );
      }
    }
  }
  // isExistEle(selector, showFlag) {
  //   By register = By.cssSelector(selector);
  //   boolean is = isExistEle(driver.findElements(register), logg);
  // }
}

// class pexCommon extends loginBase {
class pexCommon  {
  code = D.CODE.PEX;
  para;
  // retryCnt;
  // account;
  // logger;
  // driver;
  // siteInfo;
  constructor(para) {
    this.para = para;
    // this.retryCnt = para.retryCnt;
    // this.account = para.account;
    // this.logger = para.logger;
    // this.driver = para.driver;
    // this.siteInfo = para.siteInfo;
    this.logDebug("rakuCommon constructor");
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await driver.get(siteInfo.entry_url); // エントリーページ表示
    // let a = await this.driver.findElement(By.css("html"));
    // this.logInfo(await a.getAttribute('innerHTML'));
    // ログインページへのリンクをクリック
    // リンクが存在することを確認
    let seleIsLogin = "li.header-mymenu_point";
    // let ele = await this.driver.findElements(By.css(seleIsLogin));
    let ele = await this.findElements(seleIsLogin);
    // this.logInfo(ele.length);
    if (ele.length) {
      await ele[0].click();
      await this.sleep(5000);
      let seleInput = { id: "#loginInner_u", pass: "#loginInner_p", login: 'input[type="submit"]' };
      let inputEle = await this.driver.findElement(By.css(seleInput.id));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.code].loginid);
      inputEle = await this.driver.findElement(By.css(seleInput.pass));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.code].loginpass);

      inputEle = await this.driver.findElement(By.css(seleInput.login));
      inputEle.click();
      // let a = await this.driver.findElement(By.css("html"));
      // this.logInfo(a);
    }
  }
}
// module.
exports.pexCommon = pexCommon;
// module.
exports.pex = pexBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
