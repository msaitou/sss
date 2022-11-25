const { BaseExecuter } = require("./base-executer.js");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { libUtil } = require("../lib/util.js");
const { Builder, By, until, Select } = require("selenium-webdriver");
const D = require("../com_cls/define").Def;
const mailOpe = require("../mp_mil/mail_operate");

class PilBase extends BaseExecuter {
  code = D.CODE.PIL;
  missionList;
  constructor(retryCnt, siteInfo, aca, missionList) {
    super(retryCnt, siteInfo, aca);
    this.missionList = missionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async exec(para) {
    let pilCom = new PilCommon(para);
    let islogin = await pilCom.login();
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
          case D.MISSION.ANQ_PARK:
            execCls = new PilAnqPark(para);
            break;
          case D.MISSION.CLICK:
            execCls = new PilClick(para);
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
    let startPage = "https://www.point-island.com/service.asp";
    await this.openUrl(startPage); // 操作ページ表示
    await this.driver.sleep(1000);
    let sele = ["table.memberinfo strong"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      let nakedNum = await eles[1].getText();
      this.logger.info("now point total:" + nakedNum);
      await this.pointSummary(this.code, nakedNum);
    }
  }
}
class PilMissonSupper extends BaseWebDriverWrapper {
  code = D.CODE.PIL;
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
class PilCommon extends PilMissonSupper {
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async login() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;

    await driver.get(siteInfo.entry_url); // エントリーページ表示
    let seleIsLoggedIn = "table.memberinfo strong";
    logger.debug(11100);
    // ログインしてるかチェック(ログインの印がないことを確認)
    if (await this.isExistEle(seleIsLoggedIn, false, 2000)) {
      logger.debug(11101);
      // リンクが存在することを確認
      // let seleLoginLink = "img[alt='ログイン']";
      // if (await this.isExistEle(seleLoginLink, true, 2000)) {
      //   logger.debug(11102);
      //   let ele = await this.getEle(seleLoginLink, 2000);
      //   await this.clickEle(ele, 2000); // ログイン入力画面へ遷移
      let seleInput = {
        id: "input[name='mailadr']",
        pass: "input[name='passwd']",
        login: "input[name='btnlogin']",
      };
      // アカウント（メール）入力
      let inputEle = await this.getEle(seleInput.id, 500);
      await inputEle.clear();
      inputEle.sendKeys(account[this.code].loginid);

      // パスワード入力
      inputEle = await this.getEle(seleInput.pass, 500);
      await inputEle.clear();
      inputEle.sendKeys(account[this.code].loginpass);

      let ele = await this.getEle(seleInput.login, 1000);
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
      // } else {
      //   // 未ログインで、ログインボタンが見つかりません。
      //   return;
      // }
    } else logger.debug("ログイン中なのでログインしません");
    return true;
  }
}

const { PartsCmManage } = require("./parts/parts-cm-manage.js");
// CM系のクッション
class PilCm extends PilMissonSupper {
  firstUrl = "https://www.netmile.co.jp/sugutama/";
  targetUrl = "https://www.netmile.co.jp/sugutama/game?lo=124";
  cmMissionList;
  constructor(para, cmMissionList) {
    super(para);
    this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let sele = ["img[src*='d854486f003a29cac6a7dae61f8c40ed.png']"];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 3000);
      await this.clickEle(eles[0], 2000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      let cmManage = new PartsCmManage(
        this.para,
        this.cmMissionList,
        "https://sugutama.cmnw.jp/game/"
      );
      await cmManage.do();
      await driver.close(); // このタブを閉じて
      await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
    }
  }
}
const { PartsAnkPark } = require("./parts/parts-ank-park.js");
// アンケートパーク
class PilAnqPark extends PilMissonSupper {
  firstUrl = "https://www.point-island.com/service.asp";
  targetUrl = "https://www.point-island.com/wes_enqpark.asp";
  // cmMissionList;
  constructor(para) {
    super(para);
    // this.cmMissionList = cmMissionList;
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    await this.openUrl(this.targetUrl); // 操作ページ表示
    let res = D.STATUS.FAIL;
    let AnkPark = new PartsAnkPark(this.para);
    let sele = [
      "input[name='entrybtn']",
      ".enquete-list td.cate",
      ".enquete-list td.status>a", // 2
      "td>form>input[name='submit']",
    ];
    if (await this.isExistEle(sele[0], true, 2000)) {
      let ele0 = await this.getEle(sele[0], 3000);
      await this.clickEle(ele0, 3000);
      let wid = await driver.getWindowHandle();
      await this.changeWindow(wid); // 別タブに移動する
      try {
        if (await this.isExistEle(sele[1], true, 2000)) {
          let eles = await this.getEles(sele[1], 3000);
          let limit = eles.length;
          for (let i = 0; i < limit; i++) {
            if (i !== 0 && (await this.isExistEle(sele[1], true, 2000)))
              eles = await this.getEles(sele[1], 3000);
            let text = await eles[eles.length - 1].getText();
            if (await this.isExistEle(sele[2], true, 2000)) {
              let eles2 = await this.getEles(sele[2], 3000);
              await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight);`);
              let ele = eles2[eles.length - 1];
              let ele2 = null;
              try {
                ele2 = await this.getElesXFromEle(ele, "ancestor::tr");
                ele2 = await this.getElesFromEle(ele2[0], sele[3]);
              } catch (e) {
                logger.debug(e);
              }
              if (ele2 && ele2.length) ele = ele2[0]; // 回答ボタンが実際別の場合が半分くらいあるので置き換え
              await this.clickEle(ele, 3000);
              switch (text.trim()) {
                case "コラム":
                  res = await AnkPark.doColum();
                  break;
                case "偉人":
                  res = await AnkPark.doIjin();
                  break;
                case "動物図鑑":
                  res = await AnkPark.doZukan();
                  break;
                case "漫画":
                  res = await AnkPark.doManga();
                  break;
                case "日本百景":
                  res = await AnkPark.doJapan();
                  break;
                case "観察力":
                  res = await AnkPark.doSite();
                  break;
                case "料理":
                  res = await AnkPark.doCook();
                  break;
                case "ひらめき":
                  res = await AnkPark.doHirameki();
                  break;
                case "写真":
                  res = await AnkPark.doPhoto();
                  break;
              }
              await driver.navigate().refresh(); // 画面更新  しないとエラー画面になる
            }
          }
        } else {
          res = D.STATUS.DONE;
        }
      } catch (e) {
        logger.warn(e);
      } finally {
        await driver.close(); // このタブを閉じて(picはこの前に閉じちゃう)
        await driver.switchTo().window(wid); // 元のウインドウIDにスイッチ
      }
    }
    return res;
  }
}
// クリック
class PilClick extends PilMissonSupper {
  firstUrl = "https://www.chobirich.com/";
  targetUrl = "https://www.point-island.com/mincp.asp";
  constructor(para) {
    super(para);
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async do() {
    let { retryCnt, account, logger, driver, siteInfo } = this.para;
    logger.info(`${this.constructor.name} START`);

    let sele = ["#frmMain a>img", "#mlist>li>a", "input[name='btnentry']"];
    let urlList = [
      this.targetUrl,
      "https://www.point-island.com/otokuc2.asp",
    ];
    await this.openUrl(urlList[0]); // 操作ページ表示
    if (await this.isExistEle(sele[0], true, 2000)) {
      let eles = await this.getEles(sele[0], 2000);
      for (let i = 0; i < eles.length; i++) {
        await this.clickEle(eles[i], 4000);
        await this.closeOtherWindow(driver);
      }
    }
    for (let j = 1; j < 2; j++) {
      await this.openUrl(urlList[j]); // 操作ページ表示
      if (await this.isExistEle(sele[1], true, 2000)) {
        let eles = await this.getEles(sele[1], 2000);
        for (let i = 0; i < eles.length && i < 6; i++) {
          await this.clickEle(eles[i], 4000);
          await this.closeOtherWindow(driver);
        }
        if (await this.isExistEle(sele[2], true, 2000)) {
          let ele = await this.getEle(sele[2], 2000);
          await this.clickEle(ele, 4000);
        }
      }
    }

    logger.info(`${this.constructor.name} END`);
    return D.STATUS.DONE;
  }
}

exports.PilCommon = PilCommon;
exports.Pil = PilBase;
