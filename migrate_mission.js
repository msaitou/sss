// {
//   _id: ObjectId('6a3fe5bc847fc5b99d41492b'),
//   main: 'game_furufuru',
//   sub: '1',
//   type: 'chain',
//   is_valid_cond: true,
//   valid_time: {
//     from: ISODate('2026-06-27T15:00:00.000Z'),
//     to: ISODate('2026-06-27T17:00:00.000Z')
//   },
//   valid_term: {
//     const_h_from: NumberInt('0'),
//     const_h_to: NumberInt('2')
//   },
//   status: 'done',

//   site_code: 'sug',
//   machine: 'subuntu',

//   mod_date: ISODate('2026-06-27T15:03:27.907Z'),
//   mission_date: '260628',
//   exec_time_start: ISODate('2026-06-27T15:01:30.516Z'),
//   tryCnt: NumberInt('1'),
//   exec_time: NumberInt('117391')
// }
// "m_lfm": [
//   {
//     "main": "anq_park",
//     "sub": "",
//     "type": "chain",
//     "is_valid_cond": true,
//     "valid_time": "",
//     "valid_term": { "const_h_from": 0 }
//   }
// ],
const mdb = require("mongodb");
const conf = require("config");
const D = require("./com_cls/define").Def;

let localMissions = conf.p_web_h?.["1"];
async function main () {
  if (Object.keys(localMissions)?.length) {
    try {
      let insertRecs = Object.entries(localMissions).flatMap(([key, missions]) => {
        if (
          Object.values(D.CODE).some(
            (code) => key === `m_${code}` || key === code,
          )
        ) { // 一応、登録されていないミッションは実行されないように
          if (Array.isArray(missions)) {
            return missions.map((mission) => ({
              ...mission,
              site_code: key,
              machine: conf.machine,
            }));
          }
          return [{
            ...missions,
            site_code: key,
            machine: conf.machine,
          }];
        }
        return [];
      });
      if (insertRecs.length) {
        const dbClient = mdb.MongoClient;
        let db = await dbClient.connect(`mongodb://${conf.db.host}/`);
        const dbName = db.db("sm");
        const collection = dbName.collection(D.DB_COL.MISSION_MSTS);
        let deleteResult = await collection.deleteMany({machine: conf.machine});
        console.log(
          `Deleted ${deleteResult.deletedCount} documents from ${D.DB_COL.MISSION_MSTS}`,
        );
        let insertResult = await collection.insertMany(insertRecs);
        console.log(
          `Inserted ${insertResult.insertedCount} documents into ${D.DB_COL.MISSION_MSTS}`,
        );
        db.close();
      }
    } catch (e) {
      console.log(e);
    }
  }
  process.exit(0);
}

main();
