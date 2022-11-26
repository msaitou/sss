const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PicBase extends BaseExecuter {
  code = D.CODE.PIC;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let sugCom = new PicCommon(para);
    let islogin = await sugCom.login();
    if (islogin) {
      // cm系のミッションはまとめてやるため、ここでは1つ扱いのダミーミッションにする
      let cmMissionList = this.missionList.filter((m) => m.main.indexOf("cm_") === 0);
      this.missionList = this.missionList.filter((m) => m.main.indexOf("cm_") === -1);
      if (cmMissionList.length) {
        this.missionList.push({ main: D.MISSION.CM });
      }
      for (let i in this.missionList) {
        let mission = this.missionList[i];
        let execCls = null;
        switch (mission.main) {
          case D.MISSION.CM:
            execCls = new PicCm(para, cmMissionList);
            break;
          case D.MISSION.OTANO:
            execCls = new PicOtano(para);
            break;
          case D.MISSION.CLICK:
            execCls = new PicClick(para);
            break;
          case D.MISSION.READ_DOG:
            execCls = new PicReadDog(para);
            break;
          case D.MISSION.READ_CAT:
            execCls = new PicReadCat(para);
            break;
          case D.MISSION.READ_THANK:
            execCls = new PicReadThank(para);
            break;
          case D.MISSION.READ_ICHI:
            execCls = new PicReadIchi(para);
            break;
        }
        if (execCls) {
          this.logger.info(`${mission.main} 開始--`);
          let res = await execCls.do();
          this.logger.info(`${mission.main} 終了--`);
          if (mission.main != D.MISSION.CM) {
            await this.updateMissionQue(mission, res, this.code);
          }
        }
      }
      // ポイント数取得し保持
      await this.saveNowPoint();
    }
  }
  async saveNowPoint() {
    let startPage = "https://pointi.jp/";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["span.red.pt_count"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele = await this.getEle(sele[0], 2000);
      let nakedNum = await ele.getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class PicMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PIC;
  para;
  constructor(para) {
    super();
    this.para = para;
    this.setDriver(this.para.driver);
    // this.logger.debug(`${this.constructor.name} constructor`);
  }
  async hideOverlay() {
    let seleOver = ["div.overlay-item a.button-close"];
    if (await this.isExistEle(seleOver[0], true, 3000)) {
      let ele = await this.getEle(seleOver[0], 2000);
      if (await ele.isDisplayed()) {
        await this.clickEle(ele, 2000);
      } else this.logger.debug("オーバーレイは表示されてないです");
    }
  }
}
// このサイトの共通処理クラス
class PicCommon extends PicMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "span.red.pt_count";

    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      let seleLoginLink = "a[href='/entrance.php']";
      if (await this.isExistEle(seleLoginLink, true, 2000)) {
        logger.debug(11102);
        let ele = await this.getEle(seleLoginLink, 2000);
        await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
        let seleInput = {
          id: "input[name='email_address']",
          pass: "input[name='password']",
          login: "input[name='Submit']",
        };
        // アカウント（メール）入力
        let inputEle = await this.getEle(seleInput.id, 500);
        await inputEle.clear();
        inputEle.sendKeys(account[this.code].loginid);

        // パスワード入力
        inputEle = await this.getEle(seleInput.pass, 500);
        await inputEle.clear();
        inputEle.sendKeys(account[this.code].loginpass);

        ele = await this.getEle(seleInput.login, 1000);
        await this.clickEle(ele, 4000);
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

const { PartsCmManage } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class PicCm extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/game/";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='CMくじ']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://pointi.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsOtano } = require("./parts/parts-otano.js");
// お楽しみアンケート
class PicOtano extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/contents/research/research_enquete/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let Otano = new PartsOtano(this.para);
    let sele = ["tr.ank_column>td.red.bold", "tr.ank_column a.answer_btn"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles0 = await this.getEles(sele[0], 3000),
        limit = eles0.length;
      for (let i = 0; i < limit; i++) {
        if (i !== 0 && (await this.isExistEle(sele[0], true, 2000)))
          eles0 = await this.getEles(sele[0], 3000);
        let limit2 = eles0.length;
        for (let j = 0; j < limit2; j++) {
          let index = limit2 - 1 - j;
          let text = await eles0[index].getText();
          if (text.trim() == "2pt") {
            // picのお楽しみは2ptのみ
            if (await this.isExistEle(sele[1], true, 2000)) {
              let eles = await this.getEles(sele[1], 3000);
              await this.clickEle(eles[index], 3000);
              let wid = await driver.getWindowHandle();
              await this.changeWindow(wid); // 別タブに移動する
              try {
                res = await Otano.do();
                logger.info(`${this.constructor.name} END`);
              } catch (e) {
                logger.warn(e);
                await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
              } finally {
                await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
              }
            }
          } else {
            res = D.STATUS.DONE;
          }
        }
      }
    }
    return res;
  }
}
// クリック
class PicClick extends PicMissonSupper {
  firstUrl = "https://pointi.jp/";
  targetUrl = "https://pointi.jp/daily.php";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);
    await this.openUrl(this.targetUrl); // 操作ページ表示

    let sele = ["div.click_btn"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
    }
    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}

const { PartsReadPic } = require("./parts/parts-read.js");
// 犬の気持ち
class PicReadDog extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='いぬのきもち']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// 猫の気持ち
class PicReadCat extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='ねこのきもち']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// サンキュ
class PicReadThank extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='サンキュ！']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}
// 一押し
class PicReadIchi extends PicMissonSupper {
  firstUrl = "https://www.chance.com/";
  targetUrl = "https://pointi.jp/contents/magazine/";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    let res = D.STATUS.FAIL;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[alt='イチオシ']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let PartsReadCls = new PartsReadPic(this.para);
      res = await PartsReadCls.do();
    }
    return res;
  }
}

// module.
exports.PicCommon = PicCommon;
// module.
exports.Pic = PicBase;
// module.
// exports = { pex: pexBase, pexCommon: pexCommon };
