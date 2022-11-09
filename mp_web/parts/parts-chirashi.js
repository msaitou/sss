const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");

class PartsChirashi extends BaseWebDriverWrapper {
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do(targetUrl) {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    // URLをクリックか抽出してURLを開く　これ以降は共通？
    await driver.get(targetUrl); // チラシの最初のページ表示
    // pexは同一ページを更新（タブ変更不要）
    // 多分共通なのでパーツを読み込んでそっちで処理をやる
    let sele = ["ul>li>figure a"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      logger.debug("kita?");
      let eles = await this.getEles(sele[0], 2000);
      await eles[0].click(); // 多分別タブ
      await this.sleep(1000);
      await this.closeOtherWindow(this.driver);
    }
  }
}
exports.PartsChirashi = PartsChirashi;
