'use strict';

var express = require('express');
var http = require('http');
var uuid = require('node-uuid');
var Firebase = require('firebase');
//
//var myRootRef = new Firebase('https://glaring-fire-5327.firebaseIO.com');
var fb = {
  ROOT_URL: "https://glaring-fire-5327.firebaseIO.com/"
};
fb.ROOT = new Firebase(fb.ROOT_URL);

var app = express();
var port = process.argv[2];
var host = process.argv[3];

console.log('Server Starting')

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.use(express.basicAuth('beaker', process.env.beaker_plugin_password));

// route for testing service is alive
app.get('/pulse', function (request, response) {
  response.send('node server is running');
});

app.post('/shell', function (request, response) {
  var returnObject = {'shellID': uuid.v4()};
  response.setHeader('Content-Type', 'application/json');
  response.send(JSON.stringify(returnObject));
});

app.post('/evaluate', function (request, response) {
  var shellID = request.body.shellID;
  var code = decodeURIComponent(request.body.code);
  var evalId = request.body.evalId;

  var ref = new Firebase(fb.ROOT_URL + "_evaluations/" + evalId);

  var evaluationResult = processCode(code);
  if (evaluationResult.processed) {
    response.statusCode = 200;
  } else {
    response.statusCode = 422;
  }
  var result = evaluationResult.evaluation.toString();
  ref.update({"output": {"result": result}});
  response.send(result);
});

function processCode(code) {
  var returnValue;
  var result;
  try {
    result = eval(code);
    if (typeof result === "undefined") {
      result = 'undefined';
    }
    returnValue = {evaluation: result,
      processed: true};
  } catch (e) {
    returnValue = {evaluation: 'Error: ' + e.message + '\n' + e.stack,
      processed: false};
  }
  return returnValue;
}

app.listen(port, host);
