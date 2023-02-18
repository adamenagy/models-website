/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

'use strict'; // http://www.w3schools.com/js/js_strict.asp

// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

var forgeSDK = require('forge-apis');

// forge config information, such as client ID and secret
var config = require('./config');

var cryptiles = require('cryptiles');

// this end point will logoff the user by destroying the session
// as of now there is no Forge endpoint to invalidate tokens
router.get('/user/logoff', function (req, res) {
  console.log('/user/logoff')

  req.session.destroy();

  res.end('/');
});

router.get('/api/forge/clientID', function (req, res) {
  res.json({
    'ForgeClientId': config.credentials.client_id
  });
});

// return the public token of the current user
// the public token should have a limited scope (read-only)
router.get('/user/token', async function (req, res) {
  console.log('Getting user token'); // debug
  var tokenSession = new token(req.session);
  
  // json returns empty object if the entry values are undefined
  // so let's avoid that
  var tp = tokenSession.getPublicCredentials() ? tokenSession.getPublicCredentials().access_token : "";
  var te = tokenSession.getPublicCredentials() ? tokenSession.getPublicCredentials().expires_in : 0;
  console.log('Public token:' + tp);

  if (tp === "") {
    let tokens = await getStoredRefreshToken();
    if (tokens.refresh_token !== "") {
      tokenSession.setPublicCredentials({ 
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "expires_at": 0
      });
      tp = tokens.access_token;
      te = 0;
    }
  }

  // if the token expired then get a new one
  // we always set the public one last so that should have the correct refresh_token, that's 
  // why using session.getPublicCredentials()
  // to be on the safe side we subtract 5 minutes (300,000 seconds) from the value, so we 
  // refresh before it's needed
  if (tp !== "" && new Date(tokenSession.getPublicCredentials().expires_at).getTime() - 300000 <= Date.now()) {
    console.log('Need to refresh token'); // debug
    var req2 = new forgeSDK.AuthClientThreeLegged(config.credentials.client_id, config.credentials.client_secret, config.callbackURL, config.scopePublic);
    req2.refreshToken(tokenSession.getPublicCredentials(), config.scopeInternal)
      .then(function (internalCredentials) {
        tokenSession.setInternalCredentials(internalCredentials);
        tokenSession.setInternalOAuth(req2);
        console.log('New internal token: ' + internalCredentials.access_token); // debug

        // Also update the refresh token for the public credentials
        var req3 = new forgeSDK.AuthClientThreeLegged(config.credentials.client_id, config.credentials.client_secret, config.callbackURL, config.scopePublic);
        req3.refreshToken(internalCredentials, config.scopePublic)
          .then(function (publicCredentials) {
            tokenSession.setPublicCredentials(publicCredentials);
            tokenSession.setPublicOAuth(req3);
            setStoredRefreshToken(publicCredentials.access_token, publicCredentials.refresh_token, publicCredentials.expires_at);
            console.log('New public token (limited scope): ' + publicCredentials.access_token); // debug
            res.json({token: tp, expires_in: te});
          })
          .catch(function (error) {
            res.end(JSON.stringify(error));
          });
      })
      .catch(function (error) {
        setStoredRefreshToken("", "");
        res.end(JSON.stringify(error));
      });
  } else {
    res.json({token: tp, expires_in: te});
  }
});

// return the forge authenticate url
router.get('/user/authenticate', function (req, res) {
  req.session.csrf = cryptiles.randomString(24);

  console.log('using csrf: ' + req.session.csrf);

  console.log('/user/authenticate');

  // redirect the user to this page
  var url =
    "https://developer.api.autodesk.com" +
    '/authentication/v1/authorize?response_type=code' +
    '&client_id=' + config.credentials.client_id +
    '&redirect_uri=' + config.callbackURL +
    '&state=' + req.session.csrf +
    '&scope=' + config.scopeInternal.join(" ");
  res.end(url);
});


async function getStoredRefreshToken() {
  return new Promise(async (resolve, reject) => {
    let {MongoClient} = require('mongodb');
    let mongoClient = new MongoClient(process.env.MLAB_URL)
  
    try {
      await mongoClient.connect();
      console.log("Connected to MongoDB on Atlas");
    } catch (err) {
      console.log(err);
      console.log("Failed to connect to MongoDB on Atlas");
      reject(err);
      await mongoClient.close();
    } 
   
    try {
      let db = mongoClient.db("tokens_db");
      let coll = db.collection("tokens");
      let item = await coll.findOne({});
      console.log(item);
      resolve(item);
    } catch (err) {
      console.log(err);
      reject(err);
    } finally {
      await mongoClient.close();
    }
  });
}

async function setStoredRefreshToken(accessToken, refreshToken, expiresAt) {
  let {MongoClient} = require('mongodb');
  let mongoClient = new MongoClient(process.env.MLAB_URL)

  try {
    await mongoClient.connect();
    console.log("Connected to MongoDB on Atlas");
  } catch (err) {
    console.log(err);
    console.log("Failed to connect to MongoDB on Atlas");
    await mongoClient.close();
  } 
 
  try {
    let db = mongoClient.db("tokens_db");
    let coll = db.collection("tokens");
    await coll.updateOne({}, 
      { $set: { "access_token": accessToken, "refresh_token": refreshToken, "expires_at": expiresAt } })
    console.log("Saved tokens in Atlas");
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
}

/*
var _refreshTokenRequests = [];
function refreshToken(req, res) {
  if (_refreshTokenRequests.length < 1) {
    var auth = new forgeSDK.AuthClientThreeLegged(config.credentials.client_id, config.credentials.client_secret, config.callbackURL, config.scopePublic);
    auth.refreshToken(config.credentials)
        .then(function (publicCredentials) {
          tokenSession.setPublicCredentials(publicCredentials);
          tokenSession.setPublicOAuth(auth);

          console.log('Public token (limited scope): ' + publicCredentials.access_token); // debug

          for (var key in _refreshTokenRequests) {
            var refreshTokenRequest = _refreshTokenRequests[key];
            refreshTokenRequest.res.end
          }
        })
        .catch(function (error) {
          res.end(JSON.stringify(error));
        });
  } else {
    _refreshTokenRequests.push({req: req, res: res});
  }
}
*/

// wait for Autodesk callback (oAuth callback)
router.get('/api/forge/callback/oauth', function (req, res) {
  var csrf = req.query.state;

  console.log('stored csrf: ' + req.session.csrf);
  console.log('got back csrf: ' + csrf);

  if (csrf !== req.session.csrf) {
    res.status(401).end();
    return;
  }

  var code = req.query.code;
  if (!code) {
    res.redirect('/');
  }

  var tokenSession = new token(req.session);

  // first get a full scope token for internal use (server-side)
  var req = new forgeSDK.AuthClientThreeLegged(config.credentials.client_id, config.credentials.client_secret, config.callbackURL, config.scopeInternal, true);
  console.log(code);
  req.getToken(code)
    .then(function (internalCredentials) {

      tokenSession.setInternalCredentials(internalCredentials);
      tokenSession.setInternalOAuth(req);

      console.log('Internal token (full scope): ' + internalCredentials.access_token); // debug

      // then refresh and get a limited scope token that we can send to the client
      var req2 = new forgeSDK.AuthClientThreeLegged(config.credentials.client_id, config.credentials.client_secret, config.callbackURL, config.scopePublic);
      req2.refreshToken(internalCredentials, config.scopePublic)
        .then(function (publicCredentials) {
          tokenSession.setPublicCredentials(publicCredentials);
          tokenSession.setPublicOAuth(req2);
          setStoredRefreshToken(publicCredentials.access_token, publicCredentials.refresh_token, publicCredentials.expires_at);

          console.log('Public token (limited scope): ' + publicCredentials.access_token); // debug
          res.redirect('/');
        })
        .catch(function (error) {
          res.end(JSON.stringify(error));
        });
    })
    .catch(function (error) {
      res.end(JSON.stringify(error));
    });
});

module.exports = router;