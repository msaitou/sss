// MissionPointMaILの大文字をファイル名にしてるつもり
const { initBrowserDriver, db } = require("../initter");
const { libUtil: util, libUtil } = require("../lib/util");
const { Builder, By, until } = require("selenium-webdriver");
const { resolveObjectURL } = require("buffer");
const { BaseWebDriverWrapper } = require("../base-webdriver-wrapper");
const { Login } = require("../com_cls/login");
const D = require("../com_cls/define").Def;
const conf = require("config");
const { url } = require("inspector");
const { search } = require("./mail_operate");
const targetList = conf.p_mil.target;

class PointMailClass extends BaseWebDriverWrapper {
  logger;
  driver;
  constructor() {
    super();
    this.logger = global.log;
    this.logInfo("PointMailClass constractor", "target:", targetList);
  }
  async main() {
    this.logInfo("PointMailClass main");
    // リアルタイムで受信をrecieve https://liginc.co.jp/web/service/facebook/153850/2
    // メールを受信したい。からDBからメールアカウントを取得したい。
    // googleapisを利用したプロジェクトは、リアルタイムで処理するときに対応。一番最後。
    // このプロジェクトでは、通常のmailの期間を指定して受信に制限し、捌くのみとする。
    // DBからmailアカウントを取得

    let urlMap = {};
    // メールを抽出
    await search(db, this.logger, urlMap);
    this.logInfo("抽出したURLを開くを始めます");

    let loginSiteList = [D.CODE.RAKU, "rin"];
    let aca = await db("config", "findOne", { type: "login" });
    for (let site in urlMap) {
      let loginCls = null;
      let urls = urlMap[site];
      let uniqueUrls = [];
      for (let url of urls) {
        if (uniqueUrls.indexOf(url) === -1) {
          uniqueUrls.push(url);
        }
      }
      this.logInfo(`${site.toUpperCase()} は${uniqueUrls.length}件 今から開きます`);
      let isLoginNow = false;
      for (let i in uniqueUrls) {
        this.logDebug("1");
        let url = uniqueUrls[i];
        try {
          if (!this.driver) {
            this.driver = await this.webDriver();
          }
          this.logInfo(`${Number(i) + 1}/${uniqueUrls.length}`, url);
          if (!isLoginNow && loginSiteList.indexOf(site) !== -1) {
            // ログインが必要そうなサイトだけログイン
            if (!loginCls) {
              loginCls = new Login(0, aca, this.logger, this.driver, null);
              this.logInfo("ログいんしました");
            }
            await loginCls.login(site);
            isLoginNow = true;
          }
          // siteごとに処理を分けたいかも
          // url = "https://r.rakuten.co.jp/2Ec9C56IK1AVeYT81V51t5hI?mpe=552111"; // test
          // url = "https://pmrd.rakuten.co.jp/?r=MzI1MDQ3fDE%3D&p=C92DE7E&u=BAB68077";
          // let a = await this.driver.get(url); // エントリーページ表示
          // this.logInfo("3", a);
          // if (site === "cri") {
          //   this.logInfo("２分待ってみる");
          //   this.sleep(120000); // 2分待ってみる
          // }
          // this.sleep(1000);
          // this.logInfo("4");
          let res = await this.openUrl(url);
          if (res) {
            if (site === D.CODE.CRI) {
              this.logInfo("２分待ってみる");
              await this.driver.sleep(120000); // 2分待ってみる
            }
          } else {
            await this.driver.quit();
            this.driver = null;
            loginCls = null;
            isLoginNow = false;
          }
        } catch (e) {
          this.logInfo(e);
          await this.driver.quit();
          this.driver = null;
          loginCls = null;
          isLoginNow = false;
        }
      }
    }
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
      // this.driver.kill();
    }
    this.logInfo("やりきりました");
  }
  async openUrl(url) {
    return new Promise(async (resolve, reject) => {
      try {
        let a = this.driver.get(url); // エントリーページ表示
        a.catch((e) => {
          isComp = true;
          this.logWarn(e);
          reject(false);
        });
        let isComp = false,
          cnt = 0;
        while (!isComp) {
          this.logDebug("sleep", cnt++);
          await this.sleep(1000);
          if (a.state_ === "fulfilled") {
            // fullfiledになってれば
            this.logInfo("大丈夫らしい", cnt + "秒");
            isComp = true;
          } else {
            if (cnt == 30) {
              isComp = true;
              this.logInfo("30超えたので強制終了です");
              reject(false);
            }
          }
        }
        resolve(isComp);
      } catch (e) {
        // throw e;
        reject(false);
      }
    }).catch((ee) => {
      this.logInfo(ee);
      return false;
    });
  }

  // TODO 多分もう一つ親クラス作ってそこに実装がいいかも
  async getEle(sele, i, time) {
    try {
      if (!sele || !libUtil.isZeroOver(i)) throw "is not param[0] or param[1] is invalid";
      let eles = await this.getEles(sele, time);
      return eles[i];
    } catch (e) {
      this.logWarn(e);
    }
  }
  async getEles(sele, time) {
    try {
      if (!sele) throw "is not param[0]";
      time = time ? time : 0;
      return await this.driver.wait(until.elementsLocated(By.css(sele)), time);
    } catch (e) {
      this.logWarn(e);
    }
  }
  async getElesFromEles(ele, sele, time) {
    try {
      if (!sele) throw "is not param[1]";
      time = time ? time : 0;
      return await ele.findElements(By.css(sele), time);
    } catch (e) {
      this.logWarn(e);
    }
  }
  async isExistEle(sele, showFlag, time) {
    try {
      if (!sele) throw "is not param[0]";
      showFlag = showFlag === void 0 ? true : false;
      time = time ? time : 0;
      // let register = By.css(selector);
      // let is = isExistEle(this.driver.findElements(register));
      var eles = await this.driver.wait(until.elementsLocated(By.css(sele)), time);
      this.logInfo(`showFlag[${showFlag}] elelen[${eles.length}]`);
      if (showFlag && !!eles.length) {
        return true;
      } else if (!showFlag && !eles.length) {
        return true;
      }
    } catch (e) {
      this.logWarn(e);
    }
  }
  // logInfo(...a) {
  //   (this ? this.logger : global.log).info(a);
  // }
  // logWarn(...a) {
  //   (this ? this.logger : global.log).warn(a);
  // }
}
exports.PointMailClass = PointMailClass;
