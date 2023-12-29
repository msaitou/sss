const { initBrowserDriver, db } = require("./initter.js");
exports.main = async (logger) => {
  global.log.info("こっちに来たね");
  // site数で回す
  // DBからsiteを取得
  // let recs = await db("www", "find", { kind: "data-traffic" });
  // if (recs.length) {
  let driver = await initBrowserDriver();
  await driver.get("https://pex.jp/");

  logger.info("rec");
  await driver.quit();
  // }
};
exports.alone = async (logger) => {
  return new Promise((resolve, reject) => {
    try {
      let driver = initBrowserDriver(global.mobile);
    } catch (e) {
      logger.info("owata");
      resolve();
    }
  });
};

// https://developers.google.com/gmail/api
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const credentials = require("./config/gCre.json");

// // なんか認証トークンを取得するためのコードを取得する？
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
// const GET_CODE_FLAG = true;    // で、コンソールにでたURLをクリックして、なんか許可して進んでアクセスできないURLのcode=　の値を以下コードに書き換えて、下を有効にして実行するとtoken.jsonができる
const GET_CODE_FLAG = false;
if (!(global.manual || global.mobile)) {
  if (GET_CODE_FLAG) {
    const GMAIL_SCOPES = ["https://mail.google.com/"];
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GMAIL_SCOPES,
    });
    console.log("Authorize this app by visiting this url:", url);
    // //ブラウザで認証用URLを開く
    // const exec = require('child_process').exec;
    // exec('start ' + url.replaceAll('&', '^&')); //^&は&のエスケープ処理
  } else {
    // // 認証コードの取得
    // Replace with the code you received from Google
//     const code = "4/0AWtgzh7q1Sbsh4rNZYpKJonH710FkqGTJqDQ4RgzaNEeF3gttjMT5QZMMY_x1PvnMDLX-Q";
    const code = "4/0AfJohXmzDYSLlqDZHueGDN-AvXzBxVJJpDiEuFfxyTA1XodwGWZAT0vcCymHp5fPb6z5LA"; // win11

    oAuth2Client.getToken(code).then(({ tokens }) => {
      const tokenPath = path.join(__dirname, "token.json");
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      console.log("Access token and refresh token stored to token.json");
    });
  }
}

// 下リフレッシュトークンを利用した試し
// const { client_secret, client_id, redirect_uris } = credentials.installed;
// const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
// const tokens = require('./config/token.json'); // 1度取得したtoken.json（refreshtoken）があれば
// oAuth2Client.setCredentials(tokens);  // 許可を取り消さない限り、永久に利用可能。

// oAuth2Client.getAccessToken().then(({token}) => {
//   console.log('retoken',token);
// });
