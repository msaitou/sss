const { BaseExecuter } = require("../ml_utl/BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const { rakuCommon } = require("../com_cls/c_raku.js");
const D = require("../com_cls/define").Def;
class pexBase extends BaseExecuter {
  code = D.CODE.PEX;
  constructor(retryCnt, siteInfo, aca) {
    super(retryCnt, siteInfo, aca);
    this.logger.debug("pex constructor");
  }
  async exec() {
    // ■基本機能
    // ログイン処理追加(最初に実行でも例外で落ちたあとこいつがキャプチャ必要で、失敗したらアテンション→DBに書いて、定期実行。日時も出す。)
    // ポイント取得処理追加(最後に実行)
    // 実行ミッションを実施
    
    // this.logInfo("きた？", this.siteInfo.entry_url);
    let rakuCom = new rakuCommon({
      retryCnt: this.retryCnt,
      account: this.account,
      logger: this.logger,
      driver: this.driver,
      siteInfo: this.siteInfo,
    });
    await rakuCom.login();

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
exports.pex = pexBase;
