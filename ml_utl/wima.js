const { BaseExecuter } = require("./BaseExecuter.js");
const { Builder, By, until } = require("selenium-webdriver");

class wima extends BaseExecuter {
  code = "wima";
  constructor(retryCnt, siteInfo, aca) {
    super(retryCnt, siteInfo, aca);
    this.logger.debug("wima constructor");
  }
  async exec() {
    this.logInfo("きた？", this.siteInfo.entry_url);
    await this.driver.get(this.siteInfo.entry_url); // エントリーページ表示
    let seleInput = {
      id: "#loginid",
      pass: "#biglobe_pw",
      login: "input#submit",
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
        "a#hd-icn-member", // マイページへのリンク(別タブへ)
        "a[onclick*='wimax2_limit']", // wimax通信量へのリンク(別タブへ)
        "button#detail_link", // 日別の通信量へのリンク
        "table.packet-info-table--detail", // 日別の通信量table
      ];
      if (this.isExistEle(seleList[0], true, 6000)) {
        let eles = await this.getEles(seleList[0], 0);
        await eles[0].click();
        // 別ウィンドウになる // マイページへ
        const tabs = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(tabs[1]);
        if (this.isExistEle(seleList[1], true, 6000)) {
          let eles = await this.getEles(seleList[1], 0);
          await eles[0].click();
          // 別ウィンドウになる // wimax通信量へ
          const tabs = await this.driver.getAllWindowHandles();
          await this.driver.switchTo().window(tabs[2]);
          if (this.isExistEle(seleList[2], true, 6000)) {
            let eles = await this.getEles(seleList[2], 0);
            await eles[0].click();
            // 日別の通信量へ
            if (this.isExistEle(seleList[3], true, 6000)) {
              var trEles = await this.getEles(seleList[3], 0);
              trEles = await this.getElesFromEle(trEles[0], "tr", 5000);
              let max = trEles.length;
              let cnt = 0, sum3 = 0;
              for (let i = max - 1; i > max - 4; i--) {
                let eles = await this.getElesFromEle(trEles[i], "td", 5000);
                let pureText = await eles[3].getText();
                let tmpTxt = this.getNumSize(pureText);
                if (!isNaN(tmpTxt)) {
                  sum3 += tmpTxt;
                  cnt++;
                }
              }
              let mes = `${this.code} ${cnt}日分で${sum3}MBused`;
              // DBに書き込む
              await this.updateLutl(
                { code: this.code },
                { date: new Date(), used: sum3, disp_mess: mes, code: this.code }
              );
            }
          }
        }
      }
    }
  }
}
exports.wima = wima;
