const { initBrowserDriver, db } = require("../initter.js");
const pexBase = require("./pex-base");
const mopBase = require("./mop-base");
const cmsBase = require("./cms-base");
const gpoBase = require("./gpo-base");
const gmyBase = require("./gmy-base");
const genBase = require("./gen-base");
const ptoBase = require("./pto-base");
const citBase = require("./cit-base");
const criBase = require("./cri-base");
const sugBase = require("./sug-base");
const config = require("config");
const { Entry } = require("selenium-webdriver/lib/logging");
const D = require("../com_cls/define").Def;
const { libUtil } = require("../lib/util.js");

class PointWebCls {
  logger;
  exeKind;
  constructor(kind) {
    this.logger = global.log;
    this.exeKind = kind ? kind.toLowerCase() : "";
    this.logger.debug(`${this.constructor.name} constructor`);
  }
  async main(missionMap) {
    this.logger.info("PointWebCls main begin!");
    if (missionMap && Object.keys(missionMap).length) {
      let targetKeys = Object.keys(missionMap);

      let aca = await db("config", "findOne", { type: "login" });
      let siteInfos = await db("www", "find", {
        kind: "web-pc",
        code: { $in: targetKeys },
      });
      for (let [key, line] of Object.entries(missionMap)) {
        await this.execOperator(key, line, aca, siteInfos.filter((i) => i.code === key)[0]);
      }
    } else this.logger.info("ミッションは登録されていません");
  }
  /**
   * 単体実行の入口（デバック実行含む）
   */
  async once() {
    let missionMap = config[this.exeKind][""];
    await this.main(missionMap);
  }

  /**
   * 定期実行の入口
   */
  async endless() {
    let count = 0;
    let isRunning = false;
    const countUp = async () => {
      console.log(count++);
      if (!isRunning) {
        isRunning = true;
        let now = new Date();
        let missionDate = libUtil.getYYMMDDStr(now);
        let missionList = await db(D.DB_COL.MISSION_QUE, "find", {
          mission_date: missionDate, // 今日
        });
        // DBのミッションキューが今日か
        if (!missionList.length) {
          // 今日出ない場合、その時点のミッションキューテーブルデータをヒストリーに移動
          let oldMissionList = await db(D.DB_COL.MISSION_QUE, "find", {});
          if (oldMissionList.length) {
            let lastDate = oldMissionList[0].mission_date;
            await db(
              D.DB_COL.MISSION_QUE_HIS,
              "update",
              { _id: lastDate },
              {
                _id: lastDate,
                details: oldMissionList,
              }
            );
            // 一度ミッションキューを全削除
            await db(D.DB_COL.MISSION_QUE, "delete", {});
          }
        }
        // クリアした今日のミッションテンプレートを更新
        let defaultMission = config[this.exeKind]["1"]; // 1に意味はないよ
        // DB用の形に整形
        let insertList = [];
        for (let [siteCode, list] of Object.entries(defaultMission)) {
          list.forEach((line) => {
            // 実行条件がある場合、開始時刻等を計算して設定
            if (line.is_valid_cond && line.valid_term) {
              line.valid_time = {};
              if (line.valid_term.const_h_from || line.valid_term.const_h_from === 0) {
                let d = new Date();
                d.setHours(line.valid_term.const_h_from, 0, 0, 0);
                line.valid_time.from = d;
              }
              if (line.valid_term.const_h_to) {
                let d = new Date();
                d.setHours(line.valid_term.const_h_to, 0, 0, 0);
                line.valid_time.to = d;
              }
            }
            let mission = {
              ...line,
              status: D.STATUS.BEFO,
              site_code: siteCode,
              machine: config.machine,
              mod_date: null,
              mission_date: missionDate,
            };
            insertList.push(mission);
          });
        }
        if (missionList.length) {
          let addMissionList = [];
          // すでに今日のミッションはキューにある場合、差分を追加
          for (let insertM of insertList) {
            let dupMissionList = missionList.filter(
              (m) =>
                m.main == insertM.main && m.sub == insertM.sub && m.site_code == insertM.site_code
            );
            if (!dupMissionList.length) {
              addMissionList.push(insertM);
            }
          }
          insertList = addMissionList;
        }
        if (insertList.length) {
          let list = await db(D.DB_COL.MISSION_QUE, "insertMany", {}, insertList);
          this.logger.info(list);
          missionList.concat(insertList);
        }

        // このマシンで実行すべきミッションだけを抽出
        missionList = missionList.filter((m) => {
          if (
            [D.STATUS.DONE, D.STATUS.RUN].indexOf(m.status) === -1 &&
            m.machine == config.machine
          ) {
            if (!m.is_valid_cond) {
              return true;
            } else {
              // 今の時間でやるべきものだけ、やるべきものだけ
              if (m.valid_time.from && m.valid_time.from < now) {
                if (m.valid_time.to) {
                  if (m.valid_time.to > now) {
                    return true;
                  }
                  this.logger.debug("定時過ぎたためできません");
                } else {
                  return true;
                }
              }
            }
          }
        });

        let missionMap = {};
        missionList.forEach((m) => {
          if (!missionMap[m.site_code]) {
            missionMap[m.site_code] = [];
          }
          missionMap[m.site_code].push(m);
        });
        await this.main(missionMap);
        isRunning = false;
      } else this.logger.debug("前回のタスクが実行中です");
    };
    await countUp();
    await setInterval(countUp, 5 * 60 * 1000);
    // いま時点で未実行のミッションを抽出
    // main()に未実行ミッションリストを渡す　同期的に
    // 5分ごとにエンドレス・・
  }
  async execOperator(code, missionList, aca, siteInfo) {
    let opeCls = null;
    switch (code) {
      case "any": // メール用
        const Mail = require("../mp_mil/index.js").PointMailClass;
        const PMil = new Mail();
        await PMil.main(missionList);
        break;
      case D.CODE.RAKU:
        // opeCls = new pex(0, missionList, aca);
        break;
      case D.CODE.PEX:
        opeCls = new pexBase.Pex(0, siteInfo, aca, missionList);
        break;
      case D.CODE.MOP:
        opeCls = new mopBase.Mop(0, siteInfo, aca, missionList);
        break;
      case D.CODE.CMS:
        opeCls = new cmsBase.Cms(0, siteInfo, aca, missionList);
        break;
      case D.CODE.GPO:
        opeCls = new gpoBase.Gpo(0, siteInfo, aca, missionList);
        break;
      case D.CODE.GMY:
        opeCls = new gmyBase.Gmy(0, siteInfo, aca, missionList);
        break;
      case D.CODE.GEN:
        opeCls = new genBase.Gen(0, siteInfo, aca, missionList);
        break;
      case D.CODE.PTO:
        opeCls = new ptoBase.Pto(0, siteInfo, aca, missionList);
        break;
      case D.CODE.CIT:
        opeCls = new citBase.Cit(0, siteInfo, aca, missionList);
        break;
      case D.CODE.CRI:
        opeCls = new criBase.Cri(0, siteInfo, aca, missionList);
        break;
      case D.CODE.SUG:
        opeCls = new sugBase.Sug(0, siteInfo, aca, missionList);
        break;
    }
    if (opeCls) {
      await opeCls.main().catch((e) => {
        this.logger.warn(e);
      });
    }
  }
}
exports.PointWebCls = PointWebCls;
