const { BaseWebDriverWrapper } = require("../../base-webdriver-wrapper");
const D = require("../../com_cls/define").Def;

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
    let res = D.STATUS.FAIL;
    try {
      // URLをクリックか抽出してURLを開く　これ以降は共通？
      if (targetUrl) await driver.get(targetUrl); // チラシの最初のページ表示
      // pexは同一ページを更新（タブ変更不要）
      let sele = ["ul>li>figure a"];
      if (siteInfo.code === D.CODE.ECN) sele[0] = "#search_result p.image>a>img";
      if (await this.isExistEle(sele[0], true, 2000)) {
        logger.debug("kita?");
        let eles = await this.getEles(sele[0], 2000);
        await eles[0].click(); // 多分別タブ
        await this.sleep(1000);
        await this.closeOtherWindow(driver);
        res = D.STATUS.DONE;
      }
    } catch (e) {
      logger.warn(e);
    }
    return res;
  }
}
exports.PartsChirashi = PartsChirashi;
