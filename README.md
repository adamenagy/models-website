# Sample showing models from Fusion Team folder

[![Node.js](https://img.shields.io/badge/Node.js-4.4.3-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-2.15.1-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![License](https://img.shields.io/badge/license-mit-blue.svg)](http://opensource.org/licenses/MIT)

[![OAuth2](https://img.shields.io/badge/OAuth2-v1-green.svg)](http://developer.autodesk.com/)
[![OSS](https://img.shields.io/badge/OSS-v2-green.svg)](http://developer.autodesk.com/)
[![Model-Derivative](https://img.shields.io/badge/Model%20Derivative-v2-green.svg)](http://developer.autodesk.com/)

# Description

This sample shows how you can use the **Data Management API** to access a specific folder from **Fusion Team** (or BIM 360 Docs, A360) and list all the models in it on your website. Then when the user clicks on any of them they will bo shown in the **Forge Viewer**. 

Before others can access the webpage, you need to open it and log into it so that the server from then on will have access to your folder. 

Also, in the **data.management.js** file you need to modify the **projectId** and **folderId** variables so the server app knows which folder's content to show. In order to find that information you can follow the instructions in this blog post: [ID's in the Data Management API](https://forge.autodesk.com/blog/ids-data-management-api)

![](www/img/indexpage.png)

It also includes code that enables you to show data that was "attached" to objects of the model inside **Fusion 360** using the **add-in** talked about in this blog post:
https://aps.autodesk.com/blog/enrich-fusion-360-data-viewer

## Live version

See it live at [https://fusion-models.autodesk.io/](https://fusion-models.autodesk.io/)  

## Setup

In order to use this sample you need Autodesk developer credentials. Visit the [Forge Developer Portal](https://forge.autodesk.com), sign up for an account, then [create an app](https://forge.autodesk.com/myapps/create). For this new app, use <b>http://localhost:3000/api/forge/callback/oauth</b> as Callback URL. Finally take note of the <b>Client ID</b> and <b>Client Secret</b>.


### Run locally

Install [NodeJS](https://nodejs.org).

Clone this project or download it. It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (<b>Terminal</b> on MacOSX/Linux, <b>Git Shell</b> on Windows):

    git clone https://github.com/adamenagy/models-website

To run it, install the required packages, set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal)

    npm install
    export APS_CLIENT_ID=<<YOUR CLIENT ID FROM FORGE DEVELOPER PORTAL>>
    export APS_CLIENT_SECRET=<<YOUR FORGE CLIENT SECRET>>
    npm run dev

Windows (use <b>Node.js command line</b> from Start menu)

    npm install
    set APS_CLIENT_ID=<<YOUR CLIENT ID FROM FORGE DEVELOPER PORTAL>>
    set APS_CLIENT_SECRET=<<YOUR FORGE CLIENT SECRET>>
    npm run dev

Open the browser: [http://localhost:3000](http://localhost:3000).

<b>Important:</b> do not use <b>npm start</b> locally, this is intended for PRODUCTION only with HTTPS (SSL) secure cookies.

### Deploy on Heroku

To deploy this application to Heroku, the <b>Callback URL</b> & <b>redirect_uri</b> must use your .herokuapp.com address. After clicking on the button below, at the Heroku Create New App page, set your Client ID & Secret and the correct callback URL.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/adamenagy/models-website)

## Packages used

All Autodesk Forge NPM packages are included by default, see complete list of what's available at [NPM website](https://www.npmjs.com/browse/keyword/autodesk). OAuth, Model Derivative and OSS are used. Some other non-Autodesk packaged are used, including [express](https://www.npmjs.com/package/express) and its session/cookie middlewares ([express-session](https://www.npmjs.com/package/express-session) and [cookie-parser](https://www.npmjs.com/package/cookie-parser)) for user session handling. The front-end uses [bootsrap](https://www.npmjs.com/package/bootstrap) and [jquery](https://www.npmjs.com/package/jquery).

# Tips & tricks

For local development/testing, consider use [nodemon](https://www.npmjs.com/package/nodemon) package, which auto restart your node application after any modification on your code. To install it, use:

    sudo npm install -g nodemon

Then, instead of <b>npm run dev</b>, use the following:

    npm run nodemon

Which executes <b>nodemon server.js --ignore www/</b>, where the <b>--ignore</b> parameter indicates that the app should not restart if files under <b>www</b> folder are modified.

## Troubleshooting

After installing Github desktop for Windows, on the Git Shell, if you see a <b>*error setting certificate verify locations*</b> error, use the following:

    git config --global http.sslverify "false"

# License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT).
Please see the [LICENSE](LICENSE) file for full details. 

## Written by

Adam Nagy (Forge Partner Development)<br />
http://forge.autodesk.com<br />
