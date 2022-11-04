const conf = require("config");
const nodemailer = require("nodemailer");

// https://developers.google.com/gmail/api
const { google } = require("googleapis");
const credentials = require("./config/gCre.json");
const tokens = require("./config/token.json"); // 1度取得したtoken.json（refreshtoken）があれば
// なんか認証トークンを取得するためのコードを取得
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// TODO 外だしで（ファイル単位（このファイル単体とnodeが依存関係な感じ？）でいいや）
sssSendMail = async () => {
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
    subject: "こんにちは3",
    text: "さいとうさん",
    auth: {
      user: myGmailAddress,
      accessToken: accessToken,
      refreshToken: refreshToken,
    },
  });

  console.log(response);
};
(async ()=>{
  await sssSendMail();
  console.log('owari');
})();
