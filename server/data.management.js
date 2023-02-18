'use strict'; // http://www.w3schools.com/js/js_strict.asp

// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var formidable = require('formidable');
var path = require('path');
var fs = require('fs');

var config = require('./config');

var forgeSDK = require('forge-apis');

// Get the item id and version number from the
// base64 encoded version id
function getIdAndVersion(urn64) {
    var urn = new Buffer(urn64, 'base64').toString("ascii");
    // urn will be something like this:
    // urn:adsk.wipprod:fs.file:vf.dhFQocFPTdy5brBtQVvuCQ?version=1
    urn = urn.replace('urn:adsk.wipprod:fs.file:vf.', '')
    var parts = urn.split('?version=');

    var itemId = parts[0];
    var version = parts[1];

    return { itemId: "urn:adsk.wipprod:dm.lineage:" + itemId, version: parseInt(version) };
}

// Expose an end point through which the client can check if our
// mongo db contains info about the selected body
router.get('/fusionData/:urn/:path', function (req, res) {
    var urn = req.params.urn;
    var path = req.params.path;

    var mongodb = require('mongodb');
    var mongoClient = mongodb.MongoClient;

    // You could also put the connection URL here, but it's nicer to have it
    // in an Environment variable - MLAB_URL
    mongoClient.connect(process.env.MLAB_URL, function(err, db){
        if (err) {
            console.log(err);
            console.log("Failed to connect to MongoDB on mLab");
            res.status(500).end();
        } else {
            mongoClient.db = db; // keep connection
            console.log("Connected to MongoDB on mLab");

            var query = getIdAndVersion(urn);
            query.fullPath = path;

            var coll = db.collection("mycollection");

            coll.find(query).toArray(function(err, results) {
                console.log(results);

                res.json(results);
            });
        }
    });
})

function getThumbnail(tokenSession, projectId, versionId) {
    return new Promise(function (_resolve, _reject) {
        var versions = new forgeSDK.VersionsApi();

        versions.getVersion(projectId, versionId, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
            .then(function (data) {
                var url = data.body.data.relationships.thumbnails.meta.link.href;
                var displayName = data.body.data.attributes.displayName;
                _resolve({
                    'thumbnailUrl': url,
                    'displayName': displayName,
                    'projectId': projectId,
                    'versionId': versionId
                });
            })
            .catch(function () {
                _reject('error');
            })
    })
}

/**
 * @param  {string} '/designs' 
 * @param  {request} req 
 * @param  {result} res
 */
router.get('/designs', function (req, res) {
    console.log("GET /designs");

    var tokenSession = new token(req.session);
    
    // 'CustomerProjects'
    var projectId = 'a.cGVyc29uYWw6dWUyOWM4YjZiIzIwMTcxMDI5MTAxMjA1OTMx';
    // 'PublicWebsite'
    var folderId = 'urn:adsk.wipprod:fs.folder:co.z4k5EwwkTQSXbnk93wWC-Q';

    var folders = new forgeSDK.FoldersApi();
    var versions = new forgeSDK.VersionsApi();
    folders.getFolderContents(projectId, folderId, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (folderContents) {
            var data = folderContents.body.data;
            // var promises = [];
            var info = [];
            for (var key in data) {
                var item = data[key];
                var displayName = item.attributes.displayName;
                var versionId = item.relationships.tip.data.id;

                info.push({
                    'displayName': displayName,
                    'versionId': versionId
                })
                // promises.push(getThumbnail(tokenSession, projectId, versionId));
            }

            // Promise.all(promises).then(function (data) {
            //     res.json(data);
            // })
            res.json(info);
        })
        .catch(function (error) {
            console.log(error);
            res.status(error.statusCode).end(error.statusMessage);
        });
})

/**
 * @param  {string} '/designs' 
 * @param  {request} req 
 * @param  {result} res
 */
router.get('/thumbnails/:versionId64', function (req, res) {
    console.log("GET /thumbnails/:versionId64");
    var tokenSession = new token(req.session);

    /*
    var derivatives = new forgeSDK.DerivativesApi();
    derivatives.getThumbnail (req.params.versionId64, {width: 400, height: 400}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            if (data.statusCode === 200) {
              let buf = Buffer.from(data.body, 'utf8');
                res.end(buf); 
            } else {
                fs.readFile(__dirname + '/../www/img/NoImageYetMsg.png', function(err, image) {
                    if (err) {
                        res.status(500).end('Could not get image');
                        return;
                    }

                    res.writeHead(200, {'Content-Type': 'image/png'});
                    res.end(image); 
                });
            }
        })
        */
    let r = require("request");
    r.get({
      method: "GET",
      uri: `https://developer.api.autodesk.com/modelderivative/v2/designdata/${req.params.versionId64}/thumbnail`,
      encoding: null,
      headers: {
        "Authorization": `Bearer ${tokenSession.getInternalCredentials().access_token}` 
      }
    }, (err, httpResponse, body) => {
      if (err) {
        res.status(500).end('Could not get image');
        return;
      }
      res.writeHead(200, {'Content-Type': 'image/png'});
      res.end(body); 
    })
})

/////////////////////////////////////////////////////////////////
// Return the router object that contains the endpoints
/////////////////////////////////////////////////////////////////
module.exports = router;