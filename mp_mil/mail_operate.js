const conf = require("config");
const D = require("../com_cls/define").Def;
const nodemailer = require("nodemailer");
const Imap = require("node-imap"),
  inspect = require("util").inspect;
const simpleParser = require("mailparser").simpleParser;

// https://developers.google.com/gmail/api
const { google } = require("googleapis");
const credentials = require("../config/gCre.json");
const tokens = require("../config/token.json"); // 1度取得したtoken.json（refreshtoken）があれば
// なんか認証トークンを取得するためのコードを取得
const { client_secret, client_id, redirect_uris } = credentials.installed;
const labelmap = {
  // code:{dir:メールフォルダ名, key:ポイントありの印}
  raku: { dir: "p/rakuten01", key: "" },
  rin: { dir: "p/depoint", key: "" }, // UIからクリックする！
  cit: { dir: "p/chanceit", key: "" },
  gmy: { dir: "p/getmoney", key: "" },
  pic: { dir: "p/pointincome", key: "クリック" },
  cri: { dir: "p/chobi", key: "おみくじ付き" },
  ecn: { dir: "p/ECナビ", key: "" }, // webdriver起動中にログインしないと記憶してくれないポイ
  i2i: { dir: "p/i2iポイント", key: "pt付" },
  pto: { dir: "p/ポイントタウン", key: "" },
  mop: { dir: "p/モッピー", key: "付" },

  gen: { dir: "p/げん玉", key: "【クリック", key2: "】オススメサービス" },
  sug: {
    dir: "p/sugutama",
    key: "号外",
    key2: "週刊すぐたま",
    key3: "すぐたまグレードステータス",
  },
  pil: { dir: "p/pointisland", key: "" },
  pst: { key: "", dir: "p/pointstadium" },
  ntm: { dir: "p/netmairu", key: "週刊ネットマイル" },
  mitaiou: {
    pex: { dir: "p/PEX", key: "クリック1P" },
    war: { dir: "p/warau", key: "じゃんけんちゃん", key2: "ワラウマガジン" },
    pmo: { dir: "p/pointmonkey", key: "ポイモン南の島NEWS" },
    koz: { dir: "p/kozukai", key: "【ポイント探し】" },
    hap: {
      dir: "p/hapitas",
      key: "【クリック",
      key2: "宝くじ交換券付き",
    },
    test: { dir: "p/test", key: "" },
  },
};
const targetList = conf.p_mil.target;

// gmailでメール抽出
exports.search = async (db, log, urlMap) => {
  let rec = await db("config", "findOne", { type: "mail" });
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(tokens); // 許可を取り消さない限り、永久に利用可能。
  let tokenObj = await oAuth2Client.getAccessToken();
  log.info(`token: ${tokenObj.token}`);

  // user=someuser@example.com^Aauth=Bearer ya29.vF9dft4qmTc2Nvb3RlckBhdHRhdmlzdGEuY29tCg^A^A
  const _build_XOAuth2_token = (user = "", access_token = "") =>
    Buffer.from(
      [`user=${user}`, `auth=Bearer ${access_token}`, "", ""].join("\x01"),
      "utf-8"
    ).toString("base64");

  let imap = new Imap({
    user: rec.user,
    password: rec.password,
    host: rec.host,
    port: rec.port,
    tls: true,
    xoauth2: _build_XOAuth2_token(rec.user, tokenObj.token),
    // debug: console.debug,
  });
  // clonecopyfakeのgmailapiのoauthクライアントID
  // {"installed":{"client_id":"565402329685-uuvouldfci20inm8b6ndr8848ug7khsn.apps.googleusercontent.com","project_id":"just-experience-353604","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost"]}}

  // 抽出対象の　いつから（いつまで）の日付情報を作成
  let sinceDates = setSinceDates();
  log.info(
    `${sinceDates[0].toLocaleString()} から ${
      sinceDates[1] ? sinceDates[1].toLocaleString() + " まで" : ""
    }のメールを抽出します`
  );
  if (true) {
    await new Promise((resolve, reject) => {
      // let { logInfo, logWarn } = this; // 使えん！// PointMailClassではこれでいけてたけど。
      async function openInbox() {
        await targetList.reduce((promise, target) => {
          return promise.then(async () => {
            await promiseTargetBox(target);
          });
        }, Promise.resolve());
        imap.end(); // ここで処理は終わり。

        function promiseTargetBox(target) {
          return new Promise(async (res2, rej2) => {
            const targetInfo = labelmap[target];
            await imap.openBox(targetInfo.dir, true, async (err, box) => {
              if (err) throw err;
              // "Mar 1, 2022"
              let cond = [["SINCE", sinceDates[0]]];
              if (sinceDates[1]) {
                cond.push(["SENTBEFORE", sinceDates[1]]);
              }
              await imap.search(cond, (err, results) => {
                if (err) throw err;
                log.info(results);
                if (results.length) {
                  var f = imap.fetch(results, { bodies: "" });
                  f.on("message", (msg, seqno) => {
                    // log.info("Message #%d", seqno);
                    // var prefix = "(#" + seqno + ") ";
                    msg.on("body", (stream, info) => {
                      simpleParser(stream, null, (err, parsed) => {
                        log.info(parsed.date.toLocaleString(), parsed.subject);
                        log.info(parsed.headers.get("content-type").value);
                        // 件名をチェック。
                        if (targetInfo.key || targetInfo.key2) {
                          if (targetInfo.key && parsed.subject.indexOf(targetInfo.key) === -1) {
                            return;
                          }
                          if (targetInfo.key2 && parsed.subject.indexOf(targetInfo.key2) === -1) {
                            return;
                          }
                        }
                        let content = "";
                        if (parsed.headers.get("content-type").value == "text/html") {
                          content = parsed.html;
                        } else {
                          content = parsed.text;
                        }
                        // 対象のメールだったら、ヘッダーからhtmlかtextを判別して、テキストを抽出。
                        getPointUrls(urlMap, target, content);
                      });
                    });
                    // msg.once("attributes", function (attrs) {
                    //   log.info(prefix + "Attributes: %s", inspect(attrs, false, 8));
                    // });
                    msg.once("end", () => {
                      // log.info(prefix + "Finished");
                    });
                  });
                  f.once("error", function (err) {
                    rej2(), log.info("Fetch error: " + err);
                  });
                  f.once("end", () => {
                    res2(), log.info("Done fetching all messages!");
                  });
                } else {
                  res2(), log.info("no result!");
                }
              });
            }); // ラベル名は完全一致なので注意　大文字
          });
        }
      }
      imap.once("ready", () => {
        openInbox();
      });
      imap.once("error", function (err) {
        reject(), log.warn(err);
      });
      imap.once("end", function (a) {
        log.info("Connection ended", a);
        resolve();
      });
      imap.connect();
    });
  } else {
    urlMap = {
      pto: [
        "https://www.pointtown.com/ptu/r.g?rid=RUNYbxEkTDHj",
        "https://www.pointtown.com/ptu/r.g?rid=z4sT9FVdPEr4",
        "https://www.pointtown.com/ptu/r.g?rid=ZRMrJipVe78k",
        "https://www.pointtown.com/ptu/r.g?rid=rYb2EnBicdPx",
        "https://www.pointtown.com/ptu/r.g?rid=ev6dGTZgBfVv",
      ],
    };
  }
};
/**
 *
 * @param {*} urlMap 抽出したURLとサイトのマップ
 * @param {*} target サイトコード
 * @param {*} content 本文の文字列
 */
function getPointUrls(urlMap, target, content) {
  let contentRow = content.split("\n");
  let urls = [];
  let signs = [];
  for (let row of contentRow) {
    switch (target) {
      case D.CODE.RAKU:
        for (let key of [
          "https://r.rakuten.co.jp/",
          "http://ac.rakuten-card.co.jp/s.p",
          "http://ac.rakuten-card.co.jp/c.p",
        ]) {
          if (row.indexOf(key) > -1) {
            let url = "";
            if (row.indexOf('"', row.indexOf(key)) > 0) {
              url = row.substring(row.indexOf(key), row.indexOf('"', row.indexOf(key)));
            } else {
              console.log(row);
              url = row.substring(row.indexOf(key));
            }
            if (url) {
              // .gif が含まれてるやつ、?fbu= が含まれてるやつをスキップ
              if (url.indexOf(".gif") === -1 && url.indexOf("?fbu=") === -1) {
                urls.push(url);
              }
            }
          }
        }
        break;
      case "rin":
        for (let key of ["https://r.rakuten.co.jp/", "https://pmrd.rakuten.co.jp/?r="]) {
          if (row.indexOf(key) > -1) {
            let url = "";
            if (row.indexOf('"', row.indexOf(key)) > 0) {
              url = row.substring(row.indexOf(key), row.indexOf('"', row.indexOf(key)));
            } else {
              console.log(row);
              url = row.substring(row.indexOf(key));
            }
            if (url) {
              // .gif が含まれてるやつ、?fbu= が含まれてるやつをスキップ
              if (url.indexOf(".gif") === -1 && url.indexOf("?fbu=") === -1) {
                urls.push(url);
              }
            }
          }
        }
        break;
      case D.CODE.CIT:
        for (let key of ["&s="]) {
          if (row.indexOf(key) > -1) {
            let url = "";
            // text/plain　前提
            url = row.substring(row.indexOf("https://"));
            if (url) {
              urls.push(url.trim());
            }
          }
        }
        break;
      case D.CODE.GMY:
        // https://dietnavi.com/click.php?cid=51513&id=2539124&sec=a38c5a03
        signs = ["cid=", "sec="];
        if (row.indexOf(signs[0]) > -1 && row.indexOf(signs[1]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf("https://"));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.PIC:
        // https://pointi.jp/al/click_mail_magazine.php?no=109510&hash=58ef3a987844c9f74d905c3c3463a94b&html=1&a=2880110292mpf9u7him3t5qlfo09
        // https://pointi.jp/al/click_mail_magazine.php?no=109525&hash=62647bae009fc978b5adadeef5e3f305&html=1&a=2880110292mpf9u7him3t5qlfo09
        signs = ["no=", "&a="];
        if (row.indexOf(signs[0]) > -1 && row.indexOf(signs[1]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf("https://"));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.CRI:
        signs = ["/cm/om/"];
        if (row.indexOf(signs[0]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf("http"));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.ECN:
        // https://ecnavi.jp/m/go/5QrIrSbi90/
        // https://ecnavi.jp/shopping_magazine/?p=zNck05beUJ1KRwb21PW3kh1nJhenUtpz7Qokd5Fen%2BbgGraEoeEGTF7Pg6mWB2fjKp1%2FCIEilXInjSbwM7Z0F8Qkc6YKlRLx7D2A0vNGO39Etlg7Kp%2FUyynjJIdgaPs8HyNsDXMtApbakvHB9xphdPfqbAA%2Byfc4Laqav1DCdfdLxujsHzpTF%2FH2Qo%2BRGnD0
        signs = ["/m/go/", "https://ecnavi.jp/shopping_magazine/?p="];
        if (row.indexOf(signs[0]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf("https"));
          if (url) {
            urls.push(url.trim());
          }
        } else if (row.indexOf(signs[1]) > -1) {
          let url = "";
          // text/html　前提
          url = row.substring(row.indexOf(signs[1]), row.indexOf('"', row.indexOf(signs[1])));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.I2I:
        // https://point.i2i.jp/click/M9sdyWbq
        signs = ["https://point.i2i.jp/click/"];
        if (row.indexOf(signs[0]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf(signs[0]));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.PTO:
        // 【コイン付】 https://www.pointtown.com/mail/click?t=zf&u=91c0ed988dd18aab3015b30f18294bde2326631e9575dfc21a60d7705037357b
        // https://www.pointtown.com/ptu/r.g?rid=cD6dGTZgBfVv
        signs = ["【コイン付】", "https://www.pointtown.com/mail/click?t="];
        if (row.indexOf(signs[0]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf(signs[0]) + signs[0].length);
          if (url.indexOf(signs[1]) > -1) {
            urls.push(url.trim());
          }
        } else if (row.indexOf(signs[1]) > -1) {
          // text/html　前提
          let url = "";
          let lastIndex = row.indexOf('"', row.indexOf(signs[1]));
          if (lastIndex > -1) {
            url = row.substring(row.indexOf(signs[1]), lastIndex);
          } else {
            url = row.substring(row.indexOf(signs[1]));
          }
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
      case D.CODE.MOP:
        // https://pc.moppy.jp/clc/?clc_tag=LP33116563YToxOntpOjA7czo4OiIxMTE0NjYzMiI7fQ==
        signs = ["https://pc.moppy.jp/clc/?clc_tag="];
        if (row.indexOf(signs[0]) > -1) {
          let url = "";
          // text/plain　前提
          url = row.substring(row.indexOf(signs[0]));
          if (url) {
            urls.push(url.trim());
          }
        }
        break;
    }
    if (!urlMap[target]) {
      urlMap[target] = [];
    }
    urlMap[target] = urlMap[target].concat(urls);
  }
}

// 抽出対象の　いつから（いつまで）の日付情報を作成
function setSinceDates() {
  let dates = [];
  ["since", "since_to"].some((field) => {
    let tmpDate = new Date();
    let minusDayNum = 1,
      hour = 18;
    if (conf.p_mil[field] && conf.p_mil[field][0]) {
      minusDayNum = conf.p_mil[field][0];
      hour = conf.p_mil[field].length == 2 ? conf.p_mil[field][1] : hour; // 2つ目は時間
    } else if ("since_to" === field) {
      // こっちのない場合はスキップ
      return false; // continue
    }
    tmpDate.setHours(hour, 0, 0, 0);
    tmpDate.setDate(tmpDate.getDate() - minusDayNum);
    dates.push(tmpDate);
  });
  if (!conf.p_mil.since && conf.p_mil.before) {
    // 古いbeforeの設定があれば一応採用
    let tmpDate0 = new Date();
    tmpDate0.setHours(18, 0, 0, 0);
    tmpDate0.setDate(tmpDate0.getDate() - conf.p_mil.before);
    dates[0] = tmpDate0;
  }
  return dates;
}

// gmailでメール送信
exports.send = async (log, body) => {
  // TODO 宛先はDBから取得したい けど、メール送信のたびにDBから取得はいやかな。オブジェクトにもたせるのめんどいかな。。
  const to = conf.mail.to;
  const myGmailAddress = conf.mail.from;
  const refreshToken = tokens.refresh_token;
  const accessToken = tokens.access_token;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      clientId: client_id,
      clientSecret: client_secret,
    },
  });

  transporter.on("token", (token) => {
    console.log(`AccessToken: ${token.accessToken}`);
    console.log(`Expires: ${new Date(token.expires)}`);
  });

  const response = await transporter.sendMail({
    to: to,
    subject: body.subject ? body.subject : "件名がない",
    text: body.contents ? body.contents : "本文がない",
    auth: {
      user: myGmailAddress,
      accessToken: accessToken,
      refreshToken: refreshToken,
    },
  });
  log.debug(response);
};
// 試し時使用用
// (async () => {
//   await send();
//   console.log("owari");
// })();
