const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;

class uqmo extends BaseExecuter {
  code = D.CODE.UQMO;
  constructor(retryCnt, siteInfo, aca) {
    super(retryCnt, siteInfo, aca);
    this.logDebug(`${this.code} constructor`);
  }
  async exec() {
    this.logInfo("きた？", this.siteInfo.entry_url);
    await this.driver.get(this.siteInfo.entry_url); // エントリーページ表示
    let seleInput = {
      id: "#myPortalId",
      pass: "#password",
      login: "div.uqv2-parts-btnWrap>a[data-bind*='login']",
    };
    if (this.isExistEle(seleInput.id, true, 6000)) {
      let inputEle = await this.driver.findElement(By.css(seleInput.id));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.siteInfo.code].loginid);
      inputEle = await this.driver.findElement(By.css(seleInput.pass));
      await inputEle.clear();
      inputEle.sendKeys(this.account[this.siteInfo.code].loginpass);

      inputEle = await this.driver.findElement(By.css(seleInput.login));
      await inputEle.click();
      const seleList = [
        "span[data-bind='text: topInfo.currentMonthDataTraffic']", // この月の使用量
      ];
      if (this.isExistEle(seleList[0], true, 6000)) {
        let eles = await this.getEles(seleList[0], 0);
        let sum3 = 0;
        let pureText = await eles[0].getText();
        // trimしてGB（単位）削って利用 加算が必要
        // 1.3 GB だったはず
        sum3 += this.getNumSize(pureText);
        let mes = `${this.code} ${sum3}GB利`;
        // DBに書き込む
        await this.updateLutl(
          { code: this.code },
          { date: new Date(), used: sum3, disp_mess: mes, code: this.code }
        );
      }
    }
  }
}
exports.uqmo = uqmo;
