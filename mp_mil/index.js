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
    this.logger.info("PointMailClass constractor", "target:", targetList);
  }
  async main(missionList) {
    this.logger.info("PointMailClass main");
    // リアルタイムで受信をrecieve https://liginc.co.jp/web/service/facebook/153850/2
    // メールを受信したい。からDBからメールアカウントを取得したい。
    // googleapisを利用したプロジェクトは、リアルタイムで処理するときに対応。一番最後。
    // このプロジェクトでは、通常のmailの期間を指定して受信に制限し、捌くのみとする。
    // DBからmailアカウントを取得

    let urlMap = {};
    // メールを抽出
    await search(db, this.logger, urlMap);
    this.logger.info("抽出したURLを開くを始めます");

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
      this.logger.info(`${site.toUpperCase()} は${uniqueUrls.length}件 今から開きます`);
      let isLoginNow = false;
      for (let i in uniqueUrls) {
        this.logger.debug("1");
        let url = uniqueUrls[i];
        try {
          if (!this.driver) {
            this.driver = await this.webDriver(false, conf.chrome.headless);
          }
          this.logger.info(`${Number(i) + 1}/${uniqueUrls.length}`, url);
          if (!isLoginNow && loginSiteList.indexOf(site) !== -1) {
            // ログインが必要そうなサイトだけログイン
            if (!loginCls) {
              let siteInfos = await db("www", "find", {
                kind: "web-pc",
                code: { $in: [site == "rin" ? D.CODE.RAKU : site] },
              });

              loginCls = new Login(
                0,
                aca,
                this.logger,
                this.driver,
                siteInfos.filter((i) => ((i.code == site) == "rin" ? D.CODE.RAKU : site))[0]
              );
              // this.logger.info("ログいんしました");
            }
            await loginCls.login(site);
            isLoginNow = true;
          }
          // siteごとに処理を分けたいかも
          // url = "https://r.rakuten.co.jp/2Ec9C56IK1AVeYT81V51t5hI?mpe=552111"; // test
          // url = "https://pmrd.rakuten.co.jp/?r=MzI1MDQ3fDE%3D&p=C92DE7E&u=BAB68077";
          // let a = await this.driver.get(url); // エントリーページ表示
          // this.logger.info("3", a);
          // if (site === "cri") {
          //   this.logger.info("２分待ってみる");
          //   this.sleep(120000); // 2分待ってみる
          // }
          // this.sleep(1000);
          // this.logger.info("4");
          let res = await this.openUrl(url);
          if (res) {
            if (site === D.CODE.CRI) {
              this.logger.info("２分待ってみる");
              await this.driver.sleep(120000); // 2分待ってみる
            } else if ([D.CODE.PST, D.CODE.PIL]) {
              // ポイント獲得ボタンをクリック
              let sele = ["[name='getpoint']"];
              if (site === D.CODE.PIL) {
                if (await this.isExistEle(sele[0], true, 2000)) {
                  let ele = await this.getEle(sele[0], 0,2000);
                  await this.clickEle(ele, 1000);
                  await this.closeOtherWindow(this.driver);
                }
              } else if (site === D.CODE.PST) {
                sele = [
                  "img[hsrc*='bt_cert_01_o.gif']",
                  "img[src*='_close_']",
                  "li>input[type='radio']",
                  "input[type='submit']", // 3
                  "input[type='button']"
                ];
                if (await this.isExistEle(sele[4], true, 2000)) {
                  let ele = await this.getEle(sele[4], 2000);
                  await this.clickEle(ele, 1000);
                  if (await this.isExistEle(sele[1], true, 2000)) {
                    let ele = await this.getEle(sele[1], 2000);
                    await this.clickEle(ele, 1000);
                    for (let i = 0; i < 10; i++) {
                      if (await this.isExistEle(sele[2], true, 2000)) {
                        let eles = await this.getEles(sele[2], 2000);
                        let choiceNum = libUtil.getRandomInt(0, eles.length - 2); // 最後は否定的な選択肢なので選ばないのがいい
                        await this.clickEle(eles[choiceNum], 1000);
                        if (await this.isExistEle(sele[3], true, 2000)) {
                          let ele = await this.getEle(sele[3], 2000);
                          await this.clickEle(ele, 1000);
                        }
                      }
                    }
                    if (await this.isExistEle(sele[3], true, 2000)) {
                      let ele = await this.getEle(sele[3], 2000);
                      await this.clickEle(ele, 1000);
                    }
                  }
                }
                else if (await this.isExistEle(sele[0], true, 2000)) {
                  let ele = await this.getEle(sele[0], 2000);
                  await this.clickEle(ele, 1000);
                  await this.closeOtherWindow(this.driver);
                }
              }
            }
          } else {
            await this.driver.quit();
            this.driver = null;
            loginCls = null;
            isLoginNow = false;
          }
        } catch (e) {
          this.logger.info(e);
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
    if (missionList && missionList[0]["mission_date"]) {
      this.logger.info(`${missionList.main} 終了--`);
      // ミッションの状況更新
      missionList[0].mod_date = new Date();
      missionList[0].status = D.STATUS.DONE;
      await db(D.DB_COL.MISSION_QUE, "update", { _id: missionList[0]._id }, missionList[0]);
    }
    this.logger.info("やりきりました");
  }
  async openUrl(url) {
    return new Promise(async (resolve, reject) => {
      try {
        // driverのタイムアウトを設定して例外の発生有無に変更したい　TODO
        await this.driver.manage().setTimeouts({ pageLoad: 10000 });
        await this.driver.get(url);
        await this.sleep(3000);
        resolve(true);
        // let a = this.driver.get(url); // エントリーページ表示
        // await a.catch((e) => {
        //   isComp = true;
        //   this.logger.warn(e);
        //   reject(false);
        // });
        // let isComp = false,
        //   cnt = 0;
        // while (!isComp) {
        //   this.logger.debug("sleep", cnt++);
        //   await this.sleep(1000);
        //   if (a.state_ === "fulfilled") {
        //     // fullfiledになってれば
        //     this.logger.info("大丈夫らしい", cnt + "秒");
        //     isComp = true;
        //   } else {
        //     if (cnt == 10) {
        //       isComp = true;
        //       this.logger.info("30超えたので強制終了です");
        //       resolve(isComp); // なんか仕様変わったかも
        //     }
        //   }
        // }
        // resolve(isComp);
      } catch (e) {
        // throw e;
        reject(false);
      }
    }).catch((ee) => {
      this.logger.info(ee);
      return false;
    });
  }

  // TODO 多分もう一つ親クラス作ってそこに実装がいいかも
  async getEle(sele, time) {
    try {
      if (!sele) throw "is not param[0] or param[1] is invalid";
      let eles = await this.getEles(sele, time);
      return eles[0];
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async getEles(sele, time) {
    try {
      if (!sele) throw "is not param[0]";
      time = time ? time : 0;
      return await this.driver.wait(until.elementsLocated(By.css(sele)), time);
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async getElesFromEles(ele, sele, time) {
    try {
      if (!sele) throw "is not param[1]";
      time = time ? time : 0;
      return await ele.findElements(By.css(sele), time);
    } catch (e) {
      this.logger.warn(e);
    }
  }
  async isExistEle(sele, showFlag, time) {
    try {
      if (!sele) throw "is not param[0]";
      // showFlag = showFlag === void 0 ? true : false;
      time = time ? time : 0;
      // let register = By.css(selector);
      // let is = isExistEle(this.driver.findElements(register));
      var eles = await this.driver.wait(until.elementsLocated(By.css(sele)), time);
      this.logger.info(`showFlag[${showFlag}] elelen[${eles.length}]`);
      if (showFlag && !!eles.length) {
        return true;
      } else if (!showFlag && !eles.length) {
        return true;
      }
    } catch (e) {
      this.logger.warn(e);
    }
  }
}
exports.PointMailClass = PointMailClass;
