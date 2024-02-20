// winかlinuxかでコマンドが変わるだけ
const { execSync, exec, spawn } = require("child_process");
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
  let prePid = "";
  let lastLogTime = undefined;
  const PS_CHECK_CMD = `${PS.LINUX.PS.CHECK_CMD}${PS.LINUX.PS.NAME}`;
  // const PS_KILL_CMD = `${PS.LINUX.PS.KILL_CMD}${PS.LINUX.PS.NAME}${PS.LINUX.PS.KILL_OTHER}`;
  const PS_KILLALL_CMD = `${PS.LINUX.PS.KILLALL_CMD}${PS.LINUX.PS.KILL_OTHER}`;
  const EXEC_P_WEB_H_CMD = `${PS.LINUX.PS.NAME}${EXEC_P_WEB_H}`;
  const monitoring = async () => {
    console.log(count++);
    // プロセスが生きてるかチェック
    let isLive = false;
    try {
      const stdout = execSync(PS_CHECK_CMD);
      console.log(stdout.toString());
      // // 生きてる
      // let res = stdout.toString();
      // let resList = res.split('\n');
      // // res = res.replace("\n", "").replace("\r", "");
      // console.log("[" + resList + "]");
      // // TODO 解析
      // resList.indexOf(psName)
      isLive = true;
    } catch (e) {
      // 生きてない
      console.warn(e.toString());
    }
    if (isLive) {
      console.log("lived");
      let fileStatus = fs.statSync(LOG_FILE);
      // 生きてる場合、ログファイルの更新時間を取得
      if (lastLogTime) {
        // 前回の更新時間と比較
        console.log(
          lastLogTime.toString(),
          fileStatus.mtime.toString(),
          lastLogTime.toString() === fileStatus.mtime.toString()
        );
        if (lastLogTime.toString() === fileStatus.mtime.toString()) {
          console.log("not different");
          // 変化がなければプロセスをキルする
          isLive = false;
        }
        // 変化があれば何もしない
      }
      console.log(fileStatus.mtime);
      lastLogTime = fileStatus.mtime;
    }
    if (!isLive) {
      const pid = String(prePid).trim();
      try {
        const stdout = execSync(PS_KILLALL_CMD);
        console.log(stdout.toString(), "chrome is killed!!");
      } catch (e) {
        console.warn(e.toString());
      }
      if (pid) {
        try {
          const KILL_SIGINT_CMD = `${PS.LINUX.PS.KILLSIGINT_CMD}${pid}`;
          const stdout = execSync(KILL_SIGINT_CMD);
          console.log(stdout.toString(), "node-sss is killed!!");
        } catch (e) {
          console.warn(e.toString());
        }
      }
      let cmds = EXEC_P_WEB_H_CMD.split(" ");
      // 起動(非同期)
      const child = spawn(cmds[0], [cmds[1], cmds[2]], {
        stdio: "ignore", // piping all stdio to /dev/null
        detached: true, // メインプロセスから切り離す設定
        env: process.env, // NODE_ENV を tick.js へ与えるため
      });
      child.on("exit", callbackExitProcess); // sigint終了時のリスナー
      prePid = child.pid; // プロセスIDゲット
      child.unref(); // メインプロセスから切り離す
    }
  };
  await monitoring();
  await setInterval(monitoring, D.INTERVAL[180] + 10000); // 6分毎にチェックでエンドレス
  // await setInterval(monitoring, 6 * 1000); // 6分毎にチェックでエンドレス
}
async function mainWin() {
  let count = 0;
  let prePid = "";
  let lastLogTime = undefined;
  const PS_CHECK_CMD = `${PS.WIN.PS.CHECK_CMD}${PS.WIN.PS.NAME}`;
  // const PS_KILL_CMD = `${PS.WIN.PS.KILL_CMD}${PS.WIN.PS.NAME},${PS.WIN.PS.KILL_OTHER}`;
  const PS_KILL_CMD = `${PS.WIN.PS.KILL_CMD}${PS.WIN.PS.KILL_OTHER}`;
  const EXEC_P_WEB_H_CMD = `${PS.WIN.PS.NAME}${EXEC_P_WEB_H}`;
  const toString = (bytes) => {
    const Encoding = require("encoding-japanese");
    return Encoding.convert(bytes, {
      from: "SJIS",
      to: "utf8",
      type: "string",
    });
  };
  const monitoring = async () => {
    console.log(count++);
    // プロセスが生きてるかチェック
    let isLive = false;
    var child = spawn("powershell.exe", ["-Command", "-"]);
    let self = { stout: "", sterr: "" };

    let ok = () => {
      return new Promise((res, rej) => {
        child.stdout.on("end", function (data) {
          console.log("end");
          res();
        });
      });
    };
    child.stdout.on("data", function (data) {
      let stout = data.toString();
      stout = stout.split("\n").join("").split("\r").join("").trim();
      if (stout) console.log("stdout: " + stout), (self.stout += stout);
    });
    child.stderr.on("data", function (data) {
      self.sterr = data.toString();
      console.log("stderr: " + self.sterr);
    });
    try {
      // const stdout = execSync(PS_CHECK_CMD, { encoding: 'Shift_JIS' });
      // const stdout = execSync("Get-Process");
      child.stdin.write(PS_CHECK_CMD + "\n");
      child.stdin.end();
      await ok();
      // console.log("ok:  ", self.stout);
      // isLive = true;
    } catch (e) {
      console.log("errrrrr");
      console.log(e); // 生きてない
    }
    if (self.stout) isLive = true;
    self = { stout: "", sterr: "" };
    if (isLive) {
      console.log("生きてるよ");
      let fileStatus = fs.statSync(LOG_FILE);
      // 生きてる場合、ログファイルの更新時間を取得
      if (lastLogTime) {
        // 前回の更新時間と比較
        console.log(
          lastLogTime.toString(),
          fileStatus.mtime.toString(),
          lastLogTime.toString() === fileStatus.mtime.toString()
        );
        if (lastLogTime.toString() === fileStatus.mtime.toString()) {
          // 変化がなければプロセスをキルする
          // const stdout = execSync(PS_KILL_CMD);
          // console.log('dededede');
          isLive = false;
        } // else 変化があれば何もしない
      }
      console.log(fileStatus.mtime);
      lastLogTime = fileStatus.mtime;
    }
    if (!isLive) {
      child = spawn("powershell.exe", ["-Command", "-"]);
      await child.stdin.write(PS_KILL_CMD + "\n");
      child.stdin.end();
      await ok();
      const pid = String(prePid).trim();
      if (pid) {
        try {
          // SIGINT シグナルを送信
          process.kill(pid, "SIGINT");
          console.log(`node-sss is killed!! with PID: ${pid}`);
        } catch (err) {
          console.error(`Error while sending SIGINT: ${err}`);
        }
      } else {
        console.log(`No process found with the name: ${PS.WIN.PS.NAME}`);
      }
      console.log("しんだよ");
      let cmds = EXEC_P_WEB_H_CMD.split(" ");
      // 起動(非同期)
      child = spawn(".\\" + cmds[0], [cmds[1], cmds[2]], {
        stdio: "ignore", // piping all stdio to /dev/null
        detached: true, // メインプロセスから切り離す設定
        env: process.env, // NODE_ENV を tick.js へ与えるため
      });
      child.on("exit", callbackExitProcess); // sigint終了時のリスナー
      prePid = child.pid; // プロセスIDゲット
      child.unref(); // メインプロセスから切り離す
    }
  };
  await monitoring();
  await setInterval(monitoring, D.INTERVAL[180] + 10000); // 6分毎にチェックでエンドレス
  // await setInterval(monitoring, 20 * 1000); // 6分毎にチェックでエンドレス
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

