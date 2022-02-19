const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");

class moba extends BaseExecuter {
  code = "moba";
  constructor(retryCnt, siteInfo, aca) {
    super(retryCnt, siteInfo, aca);
    this.logger.debug("moba constructor");
  }
  async exec() {
    this.logInfo("きた？", this.siteInfo.entry_url);
    await this.driver.get(this.siteInfo.entry_url); // エントリーページ表示
    let seleInput = {
      id: "input[name='LOGINID']",
      pass: "input[name='PASSWORD']",
      login: "input[onclick*='submit']",
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
        "table.form_table tr>td", // この月の残容量
      ];
      if (this.isExistEle(seleList[0], true, 6000)) {
        let eles = await this.getEles(seleList[0], 0);
        let sum3 = 0;
        let pureText = await eles[0].getText();
        // trimしてGB（単位）削って利用 加算が必要
        // 1.3 GB だったはず
        sum3 += this.getNumSize(pureText);
        let mes = `${this.code} ${sum3}MB`;
        // DBに書き込む
        await this.updateLutl(
          { code: this.code },
          { date: new Date(), used: sum3, disp_mess: mes, code: this.code }
        );
      }
    }
  }
}
exports.moba = moba;
