/* *********************************************
 * Echobot: A Simple Bot Example for Slack
 *
 * Tomomi Imura (@girlie_mac)
 * *********************************************/

 /* Slack App setup
  * Slash Command
  * Enable Bot user
  * Scopes: "commands" (slash command) & "users:read" (to get a user's name)
  *
  */

'use strict';

const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname + '/public'));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

// I am using this to store tokens quickly for this demo, but you probably want to use a real DB!
const storage = require('node-persist');
storage.initSync();

let apiUrl = 'https://slack.com/api';

/* *******************************
/* Handle SIG
/* ***************************** */
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

let connections = [];

server.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);

    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}

/* *******************************
/* Mongo DB
/* ***************************** */
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
// Connection URL
const uri = process.env.MONGO_DB_CONNECTION_URL || 'mongodb://localhost:27017';

// Database Name
const dbName = process.env.MONGO_DB_NAME || 'dev';
const client = new MongoClient(uri, { useNewUrlParser: true });


// client.connect(err => {
//   const collection = client.db("test").collection("slack");
//
//   // Insert one
//   var myobj = { name: "Company Inc", address: "Highway 37" };
//
//   collection.save(myobj, function(err, result) {
//     if (err) throw err;
//     console.log("1 document inserted for testing: a");
//   });
//
//   collection.save(myobj, function(err, result) {
//     if (err) throw err;
//     console.log("1 document inserted for testing: b");
//   });
//
// });
//
// client.connect(err => {
//   const collection = client.db("test").collection("slack");
//
//   // Insert one
//   var myobj = { name: "Company Inc", address: "Highway 37" };
//
//   collection.save(myobj, function(err, result) {
//     if (err) throw err;
//     console.log("1 document inserted for testing: a");
//   });
//
//   collection.save(myobj, function(err, result) {
//     if (err) throw err;
//     console.log("1 document inserted for testing: b");
//   });
//
// });

/* *******************************
/* Slash Command
/* ***************************** */

app.post('/echo', (req, res) => {
  //console.log(req.body);

  if(req.body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
    // the request is NOT coming from Slack!
    res.sendStatus(401);
    return;
  } else {
    getReply(req.body)
      .then((result) => {
        res.json(result);
      });
  }
});

// User info
const getUserFullname = (team, user) => new Promise((resolve, reject) => {
  let oauthToken = storage.getItemSync(team);
  console.log(oauthToken);
  request.post('https://slack.com/api/users.info', {form: {token: oauthToken, user: user}}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
      return resolve(JSON.parse(body).user.real_name);
    } else {
      return resolve('The user');
    }
  });
});

// Reply in JSON
const getReply = (body) => new Promise((resolve, reject) => {
  let data = {};
  if(body.text) {
    getUserFullname(body.team_id, body.user_id)
      .then((result) => {
        data = {
          response_type: 'in_channel', // public to the channle
          text: result + ' said',
          attachments:[{
            text: body.text
          }]
        };
        return resolve(data);
      })
      .catch(console.error);

  } else { // no query entered
    data = {
      response_type: 'ephemeral', // private message
      text: 'How to use /echo command:',
      attachments:[
      {
        text: 'Type some text after the command, e.g. `/echo hello`',
      }
    ]};
    return resolve(data);
  }
});


/* *******************************
/* OAuth
/* implement when distributing the bot
/* ***************************** */

app.get('/auth', function(req, res){
  if (!req.query.code) { // access denied
    console.log('Access denied');
    return;
  }
  var data = {form: {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: req.query.code
  }};
  request.post(apiUrl + '/oauth.access', data, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      console.log("New authorization:")
      console.log(body)

      var printError = function(error, explicit) {
        console.log(`[${explicit ? 'EXPLICIT' : 'INEXPLICIT'}] ${error.name}: ${error.message}`);
      }

      try{

        // Get an auth token (and store the team_id / token)
        storage.setItemSync(JSON.parse(body).team_id, JSON.parse(body).access_token);

        res.sendStatus(200);

        // Show a nicer web page or redirect to Slack, instead of just giving 200 in reality!
        //res.redirect(__dirname + "/public/success.html");

        // Mongodb: Insert slack info
        // client.connect(function(err) {
        //   assert.equal(null, err);
        //   console.log("Connected successfully to server");
        //
        //   const db = client.db(dbName);
        //
        //   insertDocuments(db, JSON.parse(body), function() {
        //     //client.close();
        //   });
        //
        //   //client.close();
        // });


        client.connect(err => {
          const collection = client.db("test").collection("slack");

          var insertObj = { _id: JSON.parse(body).team_id, data: JSON.parse(body) }

          collection.save(insertObj, function(err, result) {
            if (err) throw err;
            console.log("1 document inserted for team: "+JSON.parse(body).team_id);
          });

        });

      } catch (e) {
          if (e instanceof SyntaxError) {
              printError(e, true);
          } else {
              printError(e, false);
          }
      }

    }
  })
});

/* Extra */

app.get('/team/:id', function (req, res) {

  try {
    let id = req.params.id;
    let token = storage.getItemSync(id);

    res.send({
      'team_id': id,
      'token': token
    });

  } catch(e) {
    res.sendStatus(404);
  }

});

/* *******************************
/* Mongo DB
/* ***************************** */
// const insertDocuments = function(db, slackJSON, callback) {
//
//   // Get the documents collection
//   const collection = db.collection(process.env.MONGO_COLLECTION || 'slack');
//
//   // Insert some documents
//   // collection.insertMany([
//   //   {a : 1}, {a : 2}, {a : 3}
//   // ], function(err, result) {
//   //   assert.equal(err, null);
//   //   assert.equal(3, result.result.n);
//   //   assert.equal(3, result.ops.length);
//   //   console.log("Inserted 3 documents into the collection");
//   //   callback(result);
//   // });
//
//   // Insert one
//   //var myobj = { name: "Company Inc", address: "Highway 37" };
//
//   var insertObj = { _id: slackJSON.team_id, data: slackJSON }
//
//   collection.save(insertObj, function(err, result) {
//     if (err) throw err;
//     console.log("1 document inserted for team: "+slackJSON.team_id);
//     callback(result);
//   });
// }
