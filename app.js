const express = require("express");
const { MongoClient } = require("mongodb");
const csvtojson = require("csvtojson");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/"
const DB_DB = process.env.DB_DB || "plz_geosearch"
const INPUT_DATA = process.env.INPUT_DATA || "data_setup/data.csv";
const MAX_DIST_KM = process.env.MAX_DIST_KM || 200
const FORCE_RECREATE = process.env.FORCE_RECREATE || false


/**
 * Calculates distances from plzData and puts element by element into the Database
 * @param  {mongodb.Collation} coll    Collation to insert the objects in
 * @param  {Array} plzData PLZ Object Data
 */
async function insertDocuments(coll, plzData)
{
  //remove unessecary columns
  for (let i=0; i < plzData.length; i++)
  {
    delete plzData[i].id;
    delete plzData[i].loc_id
    const location = {
      type: "Point",
      coordinates: [Number.parseFloat(plzData[i].lat), Number.parseFloat(plzData[i].lon)]
    }
    delete plzData[i].lat;
    delete plzData[i].lon;
    plzData[i].location = location;
  }

  //db insert and memory cleanup
  await coll.insertMany(plzData);
    
}

/**
 * Init function, checks and initializes database
 */
async function init() {
  const client = MongoClient(DB_URL, { useUnifiedTopology: true}, { useNewUrlParser: true }, { connectTimeoutMS: 120000 }, { keepAlive: 1});

  try {
    await client.connect();

    let db = client.db(DB_DB);
    let coll = db.collection("zip");
    let count = await coll.countDocuments();

    if (count <= 0 || FORCE_RECREATE) {
      if (FORCE_RECREATE) {
        console.log("Recreating the datasets");
      } else {
        console.log("No Datasets");
      }
      await setupDatabase(coll);
      console.log("Datasets inserted, creating indices");
      await coll.createIndex({zip_code: "text", name: "text"});
      await coll.createIndex({location: "2dsphere"});
      console.log("Done");
    } else {
      console.log("Found " + count + " entities");
    }


  } finally {
    await client.close();
  }
}

/**
 * Truncates the database collation, parses csv data and calls calculate function
 * @param  {mongodb.Collation} coll Collation for inserting data
 */
async function setupDatabase(coll) {
  console.log("Setting up database");

  await coll.drop((error, result) => {});

  await csvtojson()
  .fromFile(INPUT_DATA)
  .then(async csvData => {
    console.log("Parsed " + csvData.length + " entities")
    await insertDocuments(coll, csvData);

  });

  let count = await coll.countDocuments();
  console.log("Inserted " + count + " entities");
}

/**
 * Main app function
 */
async function run() {
  await init();

  var app = express();

  app.get('/:zip/:rng', async (req, res) => {
    if (!req.params.zip || !req.params.rng || (req.params.rng < 0 || req.params.rng > MAX_DIST_KM)) {
      res.status(400).send('Bad Request');
      return;
    }

    const client = MongoClient(DB_URL, { useUnifiedTopology: true}, { useNewUrlParser: true }, { connectTimeoutMS: 3000 }, { keepAlive: 1});

    try {
      await client.connect();
      let db = client.db(DB_DB);
      let coll = db.collection("zip");
      const query = { zip_code: req.params.zip };
      const point = await coll.findOne(query);
      if (!point) {
        return res.json([]);
      }
      const nearby = await coll.find({ location: { $nearSphere: { $geometry: point.location, $maxDistance: req.params.rng * 1000 } } }).toArray();
      if (!nearby) {
        return res.json([]);
      }

      var result = {
        country_code: point.country_code,
        zip_code: point.zip_code,
        name: point.name,
        nearest: []
      };
      for (let i=0; i < nearby.length; i++) {
        result.nearest.push({
          zip_code: nearby[i].zip_code
        });
      }

      //console.log(result);
      res.json(result);
    } finally {
      await client.close();
    }
  });

  app.get('/:search?', async (req, res) => {
    if (!req.params.search) {
      res.status(400).send('Bad Request');
      return;
    }

    const client = MongoClient(DB_URL, { useUnifiedTopology: true}, { useNewUrlParser: true }, { connectTimeoutMS: 3000 }, { keepAlive: 1});
    try {
      await client.connect();
      let db = client.db(DB_DB);
      let coll = db.collection("zip");
      let query = { $text: { $search: req.params.search } };
      
      var zip = await coll.find(
        query,
        {score: { $meta: "textScore" }, projection: {_id: 0, nearest: 0}})
        .sort( { score: { $meta: "textScore" } } )
        .limit(5)
        .toArray();

      console.log(zip);
      res.json(zip);
    } finally {
      await client.close();
    }

  });

  app.listen(8080, () => {
   console.log("Server running on port 8080");
  });

}


run();
