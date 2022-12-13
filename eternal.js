// winかlinuxかでコマンドが変わるだけ
const { execSync, exec, spawn } = require("child_process");
const fs = require("fs");
const IS_WIN = process.platform === "win32";
const IS_LINUX = process.platform === "linux";
const LOG_FILE = "./log/a.log";
const EXEC_P_WEB_H = " ./index.js P_WEB_H";
const PS = {
  WIN: { PS: { NAME: "node-sss", CHECK_CMD: "Get-Process -name ", KILL_CMD: "Stop-Process -Name ",KILL_OTHER: " chrome" } },
  LINUX: {
    PS: {
      NAME: "node-sss",
      CHECK_CMD: "ps -ae | grep ",
      KILL_CMD: "killall ",
      KILL_OTHER: " chrome",
    },
  },
};
async function mainLinux() {
  let count = 0;
  let lastLogTime = undefined;
  const PS_CHECK_CMD = `${PS.LINUX.PS.CHECK_CMD}${PS.LINUX.PS.NAME}`;
  const PS_KILL_CMD = `${PS.LINUX.PS.KILL_CMD}${PS.LINUX.PS.NAME},${PS.LINUX.PS.KILL_OTHER}`;
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
    }
    if (isLive) {
      let fileStatus = fs.statSync(LOG_FILE);
      // 生きてる場合、ログファイルの更新時間を取得
      if (lastLogTime) {
        // 前回の更新時間と比較
        if (lastLogTime.toString() === fileStatus.mtime.toString()) {
          // 変化がなければプロセスをキルする
          const stdout = execSync(PS_KILL_CMD);
          console.log(stdout, "node-sss is killed!!");
          isLive = false;
        }
        // 変化があれば何もしない
      }
      console.log(fileStatus.mtime);
      lastLogTime = fileStatus.mtime;
    }
    if (!isLive) {
      let cmds = EXEC_P_WEB_H_CMD.split(" ");
      // 起動(非同期)
      const child = spawn(cmds[0], [cmds[1], cmds[2]], {
        stdio: "ignore", // piping all stdio to /dev/null
        detached: true, // メインプロセスから切り離す設定
        env: process.env, // NODE_ENV を tick.js へ与えるため
      });
      child.unref(); // メインプロセスから切り離す
    }
  };
  await monitoring();
  await setInterval(monitoring, 6 * 60 * 1000); // 6分毎にチェックでエンドレス
  // await setInterval(monitoring, 6 * 1000); // 6分毎にチェックでエンドレス
}
async function mainWin() {
  let count = 0;
  let lastLogTime = undefined;
  const PS_CHECK_CMD = `${PS.WIN.PS.CHECK_CMD}${PS.WIN.PS.NAME}`;
  const PS_KILL_CMD = `${PS.WIN.PS.KILL_CMD}${PS.WIN.PS.NAME}${PS.WIN.PS.KILL_OTHER}`;
  const EXEC_P_WEB_H_CMD = `${PS.WIN.PS.NAME}${EXEC_P_WEB_H}`;
  const Encoding = require("encoding-japanese");
  const toString = (bytes) => {
    return Encoding.convert(bytes, {
      from: "SJIS",
      to: "UNICODE",
      type: "string",
    });
  };
  const monitoring = async () => {
    console.log(count++);
    // プロセスが生きてるかチェック
    let isLive = false;
    try {
      const stdout = execSync(PS_CHECK_CMD);
      console.log(toString(stdout));
      // // 生きてる
      // let res = stdout.toString();
      // let resList = res.split('\n');
      // // res = res.replace("\n", "").replace("\r", "");
      // console.log("[" + resList + "]");
      // // TODO 解析
      // resList.indexOf(psName)
      isLive = true;
    } catch (e) {
      console.log(toString(e));
      // 生きてない
    }
    if (isLive) {
      console.log('生きてるよ');
      let fileStatus = fs.statSync(LOG_FILE);
      // 生きてる場合、ログファイルの更新時間を取得
      if (lastLogTime) {
        // 前回の更新時間と比較
        if (lastLogTime.toString() === fileStatus.mtime.toString()) {
          // 変化がなければプロセスをキルする
          const stdout = execSync(PS_KILL_CMD);
          console.log(stdout, "node-sss is killed!!");
          isLive = false;
        }
        // 変化があれば何もしない
      }
      console.log(fileStatus.mtime);
      lastLogTime = fileStatus.mtime;
    }
    if (!isLive) {
      console.log('しんだよ');
      let cmds = EXEC_P_WEB_H_CMD.split(" ");
      // 起動(非同期)
      const child = spawn('.\\'+cmds[0], [cmds[1], cmds[2]], {
        stdio: "ignore", // piping all stdio to /dev/null
        detached: true, // メインプロセスから切り離す設定
        env: process.env, // NODE_ENV を tick.js へ与えるため
      });
      child.unref(); // メインプロセスから切り離す
    }
  };
  await monitoring();
  await setInterval(monitoring, 5 * 60 * 1000); // 6分毎にチェックでエンドレス
  // await setInterval(monitoring, 6 * 1000); // 6分毎にチェックでエンドレス
}
if (IS_LINUX) {
  mainLinux();
} else {
  mainWin();
}