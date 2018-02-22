'use strict'; // http://www.w3schools.com/js/js_strict.asp

// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var zlib = require("zlib");

var forgeSDK = require('forge-apis');

/////////////////////////////////////////////////////////////////
// Get the list of export file formats supported by the
// Model Derivative API
/////////////////////////////////////////////////////////////////
router.get('/formats', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getFormats({}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (formats) {
            res.json(formats.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Get the manifest of the given file. This will contain
// information about the various formats which are currently
// available for this file
/////////////////////////////////////////////////////////////////
router.get('/manifests/:urn', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getManifest(req.params.urn, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

router.delete('/manifests/:urn', function (req, res) {
    var tokenSession = new token(req.session);

    var derivatives = new forgeSDK.DerivativesApi();
    try {
        derivatives.deleteManifest(req.params.urn, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
            .then(function (data) {
                res.json(data.body);
            })
            .catch(function (error) {
                res.status(error.statusCode).end(error.statusMessage);
            });

    } catch (err) {
        res.status(500).end(err.message);
    }
});

/////////////////////////////////////////////////////////////////
// Get the metadata of the given file. This will provide us with
// the guid of the avilable models in the file
/////////////////////////////////////////////////////////////////
router.get('/metadatas/:urn', function (req, res) {
    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    derivatives.getMetadata(req.params.urn, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Send a translation request in order to get an SVF or other
// file format for our file
/////////////////////////////////////////////////////////////////
router.post('/export', jsonParser, function (req, res) {
    //env, token, urn, format, rootFileName, fileExtType, advanced
    var item = {
        "type": req.body.format
    };

    if (req.body.format === 'svf') {
        item.views = ['2d', '3d'];
    }

    if (req.body.advanced) {
        item.advanced = req.body.advanced;
    }

    var input = (req.body.fileExtType && req.body.fileExtType === 'versions:autodesk.a360:CompositeDesign' ? {
        "urn": req.body.urn,
        "rootFilename": req.body.rootFileName,
        "compressedUrn": true
    } : {"urn": req.body.urn});
    var output = {
        "destination": {
            "region": "us"
        },
        "formats": [item]
    };

    var derivatives = new forgeSDK.DerivativesApi();

    var tokenSession = new token(req.session);

    if (!derivatives)
        return;

    derivatives.translate({"input": input, "output": output}, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
        .then(function (data) {
            res.json(data.body);
        })
        .catch(function (error) {
            res.status(error.statusCode).end(error.statusMessage);
        });
});

/////////////////////////////////////////////////////////////////
// Return the router object that contains the endpoints
/////////////////////////////////////////////////////////////////
module.exports = router;