// winかlinuxかでコマンドが変わるだけ
const { execSync, exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");
const { Def: D } = require("./com_cls/define");
const { db } = require("./initter.js");
const { libUtil } = require("./lib/util.js");
const conf = require("config");
const IS_WIN = process.platform === "win32";
const IS_LINUX = process.platform === "linux";
const LOG_FILE = "./log/a.log";
const EXEC_P_WEB_H = " ./index.js P_WEB_H";
const PS = {
  WIN: {
    PS: {
      NAME: "node-sss",
      CHECK_CMD: "Get-Process -name ",
      KILL_CMD: "Stop-Process -Name ",
      KILL_OTHER: "chrome, chromedriver",
    },
  },
  LINUX: {
    PS: {
      NAME: "node-sss",
      CHECK_CMD: "ps -ae | grep ",
      KILLALL_CMD: "killall ",
      KILLSIGINT_CMD: "kill -2 ",
      KILL_OTHER: " chrome chromedriver",
    },
  },
};
async function mainLinux() {
  let count = 0;
  let lastLogTime = undefined;
  
  const APP_NAME = PS.LINUX.PS.NAME; // "node-sss"
  const PS_KILLALL_CMD = `${PS.LINUX.PS.KILLALL_CMD}${PS.LINUX.PS.KILL_OTHER}`;

  const monitoring = async () => {
    console.log(count++);
    let isLive = false;
    let needsRestart = false;

    // 1. プロセスの生存確認 (psコマンドではなく、pm2のリストから確認)
    try {
      const stdout = execSync("pm2 jlist", { encoding: "utf-8" });
      const list = JSON.parse(stdout);
      // PM2上に "node-sss" が登録されていて、かつ online かどうか
      const app = list.find((item) => item.name === APP_NAME);
      if (app && app.pm2_env.status === "online") {
        isLive = true;
      }
    } catch (e) {
      console.warn("PM2 check warn:", e.message);
    }

    if (isLive) {
      console.log("lived");
      try {
        let fileStatus = fs.statSync(LOG_FILE);
        if (lastLogTime) {
          console.log(
            lastLogTime.toString(),
            fileStatus.mtime.toString(),
            lastLogTime.toString() === fileStatus.mtime.toString()
          );
          if (lastLogTime.toString() === fileStatus.mtime.toString()) {
            console.log("not different (process frozen)");
            // ログが更新されていない = ハングアップしているため再起動フラグON
            needsRestart = true;
          }
        }
        console.log(fileStatus.mtime);
        lastLogTime = fileStatus.mtime;
      } catch (e) {
        console.warn("Log stat error:", e.toString());
      }
    } else {
      // 死んでいれば再起動フラグON
      needsRestart = true;
    }

    // 2. 再起動が必要な場合の処理
    if (needsRestart) {
      console.log("Process needs restart...");

      // A. ゾンビChromeの退治
      try {
        const stdout = execSync(PS_KILLALL_CMD);
        console.log(stdout.toString(), "chrome is killed!!");
      } catch (e) {
        console.warn("chrome kill warn:", e.message);
      }

      // B. DBのステータス更新処理（旧: callbackExitProcess でやっていた処理）
      // ※ PM2が管理するため exit イベントを捕捉できなくなるので、再起動直前に実行します
      try {
        let missionDate = libUtil.getYYMMDDStr(new Date());
        let missionList = await db(D.DB_COL.MISSION_QUE, "find", {
          mission_date: missionDate,
          status: D.STATUS.NOW,
          machine: conf.machine,
        });
        for (let m of missionList) {
          await libUtil.updateMissionQueUtil(db, m, D.STATUS.FAIL, m.site_code);
          console.log("実行時間書き込み (FAILへ更新完了)");
        }
      } catch (err) {
        console.error("DB update error:", err.message);
      }

      // C. PM2によるプロセスの起動・再起動処理
      try {
        // 既にPM2に登録されているかチェック
        execSync(`pm2 describe ${APP_NAME} > /dev/null`, { stdio: "ignore" });
        
        console.log(`Restarting ${APP_NAME} via PM2...`);
        // 登録済みなら restart。自動的に SIGINT -> 1.6秒待機 -> 立ち上げ直し が行われます
        execSync(`pm2 restart ${APP_NAME}`);
      } catch (e) {
        // 未登録の場合は start で新規起動
        console.log(`Starting ${APP_NAME} via PM2 for the first time...`);
        const cmds = EXEC_P_WEB_H.trim().split(" ");
        const targetJS = cmds[0]; // ./index.js
        const arg = cmds[1];      // P_WEB_H
        
        // 旧環境と同じく node-sss という実行体を利用するため --interpreter を指定
        execSync(`pm2 start ${targetJS} --name ${APP_NAME} --interpreter ${APP_NAME} -- ${arg}`);
      }
      
      // 再起動後は前回のログタイムをリセット（次回即再起動されるのを防ぐ）
      lastLogTime = undefined;
    }
  };

  await monitoring();
  // await setInterval は await の意味をなさないため、通常通りセット
  setInterval(monitoring, D.INTERVAL[180] + 10000); 
}
async function mainWin() {
  let count = 0;
  let prePid = "";
  let lastLogTime = undefined;

  // 実行中かどうかを判定するフラグ
  let isRunning = false;

  const PS_CHECK_CMD = `powershell.exe -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${PS.WIN.PS.CHECK_CMD}${PS.WIN.PS.NAME}"`;
  const PS_KILL_CMD = `powershell.exe -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${PS.WIN.PS.KILL_CMD}${PS.WIN.PS.KILL_OTHER}"`;

  // const PS_CHECK_CMD = `powershell.exe -Command "${PS.WIN.PS.CHECK_CMD}${PS.WIN.PS.NAME}"`;
  // const PS_KILL_CMD = `powershell.exe -Command "${PS.WIN.PS.KILL_CMD}${PS.WIN.PS.KILL_OTHER}"`;
  const EXEC_P_WEB_H_CMD = `${PS.WIN.PS.NAME}${EXEC_P_WEB_H}`;
  // const toString = (bytes) => {
  //   const Encoding = require("encoding-japanese");
  //   return Encoding.convert(bytes, {
  //     from: "SJIS",
  //     to: "utf8",
  //     type: "string",
  //   });
  // };
  const monitoring = async () => {
    // 前の処理がまだ終わっていない場合は、今回の実行をスキップする
    if (isRunning) {
      console.log(
        "警告: 前回のチェック処理がまだ完了していません。今回のチェックはスキップします。",
      );
      return;
    }

    isRunning = true; // ロックをかける
    console.log(count++);

    try {
      let isLive = false;
      let needsRestart = false;

      try {
        // 【対策2】execにタイムアウト（例: 30秒）を設定し、永久にフリーズするのを防ぐ
        const { stdout } = await execPromise(PS_CHECK_CMD, { timeout: 30000 });
        if (stdout && stdout.trim().length > 0) {
          isLive = true;
        }
      } catch (e) {
        console.log(
          "プロセスが見つかりません、またはタイムアウトエラー:",
          e.message,
        );
      }

      if (isLive) {
        console.log("生きてるよ");
        try {
          let fileStatus = fs.statSync(LOG_FILE);
          // 生きてる場合、ログファイルの更新時間を取得
          if (lastLogTime) {
            if (lastLogTime.toString() === fileStatus.mtime.toString()) {
              console.log("ログが更新されていません。プロセスを再起動します。");
              needsRestart = true;
            }
          }
          lastLogTime = fileStatus.mtime;
        } catch (err) {
          console.warn("Log stat error:", err.message);
        }
      } else {
        needsRestart = true;
      }

      // 再起動処理
      if (needsRestart) {
        try {
          // キル処理にもタイムアウトを設ける
          await execPromise(PS_KILL_CMD, { timeout: 30000 });
          console.log("しんだよ（キル処理開始）");
        } catch (e) {
          console.log("キル処理エラー（または対象なし）:", e.message);
        }

        const pid = String(prePid).trim();
        if (pid) {
          try {
            // SIGINT シグナルを送信
            process.kill(pid, "SIGINT");
            console.log(`node-sss is killed!! with PID: ${pid}`);
          } catch (err) {
            console.error(`Error while sending SIGINT: ${err.message}`);
          }
        }

        // 新しいプロセスの起動
        let cmds = EXEC_P_WEB_H_CMD.split(" ");
        let child = spawn(".\\" + cmds[0], [cmds[1], cmds[2]], {
          stdio: "ignore",
          detached: true,
          env: process.env,
        });

        child.on("exit", callbackExitProcess);
        prePid = child.pid;
        child.unref();

        lastLogTime = undefined;
      }
    } finally {
      // 【重要】エラーが起きても起きなくても、最後に必ずロックを解除する
      isRunning = false;
    }
  };
  setInterval(monitoring, D.INTERVAL[180] - 10000); // 3分-10毎にチェックでエンドレス
  monitoring();
}
if (IS_LINUX) {
  mainLinux();
} else {
  mainWin();
}
async function callbackExitProcess(_, signal) {
  if (signal === "SIGINT") {
    // 強制終了時
    console.log("Child process was killed with a SIGINT signal");
    // ここでSIGINT成功時の処理を実行します
    let missionDate = libUtil.getYYMMDDStr(new Date());
    let missionList = await db(D.DB_COL.MISSION_QUE, "find", {
      mission_date: missionDate, // 今日
      status: D.STATUS.NOW,
      machine: conf.machine,
    });
    for (let m of missionList) {
      await libUtil.updateMissionQueUtil(db, m, D.STATUS.FAIL, m.site_code);
      console.log("実行時間書き込み");
    }
  }
}

