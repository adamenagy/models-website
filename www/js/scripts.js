var MyVars = {
    keepTrying: true
};

$(document).ready(function () {

    // 
    $('#forgeViewerBackground').click(function () {
        var viewer = document.getElementById('forgeViewer')
        viewer.style.display = 'none';
        var background = document.getElementById('forgeViewerBackground')
        background.style.display = 'none';
    })
   
    // Get the tokens
    get3LegToken(function(token) {
        var auth = $("#authenticate");

        if (!token) {
            signIn();
        } else {
            listDesigns();
        }
    });
});

function listDesigns() {
    $.ajax({
        url: '/dm/designs',
        success: function (data) {
            var content = '';

            // Fill with new content, something like this:
            // <div class="w3-row-padding">
            //     <div class="w3-col l3 m6 w3-margin-bottom">
            //         <div class="w3-display-container">
            //             <div class="w3-display-topleft w3-black w3-padding">Summer House</div>
            //             <img src="/w3images/house5.jpg" alt="House" style="width:100%">
            //         </div>
            //     </div>
            // </div>
            var row_max = Math.ceil(data.length / 4);
            for (var row = 0, count = 0; row < row_max; row++) {
                content += '<div class="w3-row-padding">';
                for (var col = 0; col < 4 && count < data.length; col++, count++) {
                    var item = data[count];
                    var versionId64 = base64encode(item.versionId);
                    content += '<div class="w3-col l3 m6 w3-margin-bottom" onclick=initializeViewer("' + versionId64 + '")>';
                    content += '<div class="w3-display-container">';
                    content += '<div class="w3-display-topleft w3-black w3-padding">' + item.displayName + '</div>';
                    content += '<img src="/dm/thumbnails/' + versionId64 + '" style="width:100%"></div></div>';
                }
                content += '</div';
            }

            $('#content').html(content);
        }
    });
}

function base64encode(str) {
    var ret = "";
    if (window.btoa) {
        ret = window.btoa(str);
    } else {
        // IE9 support
        ret = window.Base64.encode(str);
    }

    // Remove ending '=' signs
    // Use _ instead of /
    // Use - insteaqd of +
    // Have a look at this page for info on "Unpadded 'base64url' for "named information" URI's (RFC 6920)"
    // which is the format being used by the Model Derivative API
    // https://en.wikipedia.org/wiki/Base64#Variants_summary_table
    var ret2 = ret.replace(/=/g, '').replace(/[/]/g, '_').replace(/[+]/g, '-');

    console.log('base64encode result = ' + ret2);

    return ret2;
}

function signIn() {
    $.ajax({
        url: '/user/authenticate',
        success: function (rootUrl) {
            location.href = rootUrl;
        }
    });
}

function get3LegToken(callback) {

    if (callback) {
        $.ajax({
            url: '/user/token',
            success: function (data) {
                MyVars.token3Leg = data.token;
                console.log('Returning new 3 legged token (User Authorization): ' + MyVars.token3Leg);
                callback(data.token, data.expires_in);
            }
        });
    } else {
        console.log('Returning saved 3 legged token (User Authorization): ' + MyVars.token3Leg);

        return MyVars.token3Leg;
    }
}

/////////////////////////////////////////////////////////////////
// Viewer
// Based on Autodesk Viewer basic sample
// https://developer.autodesk.com/api/viewerapi/
/////////////////////////////////////////////////////////////////

function cleanupViewer() {
    // Clean up previous instance
    if (MyVars.viewer && MyVars.viewer.model) {
        console.log("Unloading current model from Autodesk Viewer");

        //MyVars.viewer.impl.unloadModel(MyVars.viewer.model);
        //MyVars.viewer.activeModel = null;
        //MyVars.viewer.impl.sceneUpdated(true);
        MyVars.viewer.tearDown();
        MyVars.viewer.setUp(MyVars.viewer.config);
    }
}

function initializeViewer(urn) {
    var viewer = document.getElementById('forgeViewer')
    viewer.style.display = 'block';
    var background = document.getElementById('forgeViewerBackground')
    background.style.display = 'block';

    cleanupViewer();

    console.log("Launching Autodesk Viewer for: " + urn);

    var options = {
        document: 'urn:' + urn,
        env: 'AutodeskProduction',
        getAccessToken: get3LegToken // this works fine, but if I pass get3LegToken it only works the first time
    };

    if (MyVars.viewer) {
        loadDocument(MyVars.viewer, options.document);
    } else {
        var viewerElement = document.getElementById('forgeViewer');
        var config = {
            // extensions: ['Autodesk.Viewing.webVR', 'Autodesk.Viewing.MarkupsGui'],
            // experimental: ['webVR_orbitModel']
        };
        MyVars.viewer = new Autodesk.Viewing.Private.GuiViewer3D(viewerElement, config);
        Autodesk.Viewing.Initializer(
            options,
            function () {
                MyVars.viewer.start(); // this would be needed if we also want to load extensions
                loadDocument(MyVars.viewer, options.document);
            }
        );
    }
}

// Get the full path of the selected body
function getFullPath(tree, dbId) {
    var path = [];
    while (dbId) {
        var name = tree.getNodeName(dbId);
        path.unshift(name);
        dbId = tree.getNodeParentId(dbId);
    }

    // We do not care about the top 2 items because it's just the file name
    // and root component name
    path = path.splice(2, path.length - 1)

    return path.join('+');
}

function showAllProperties(viewer) {
    var instanceTree = viewer.model.getData().instanceTree;

    var allDbIds = Object.keys(instanceTree.nodeAccess.dbIdToIndex);

    for (var key in allDbIds) {
        var id = allDbIds[key];
        viewer.model.getProperties(id, function (data) {
            var str = "";
        });
    }
}

// Adds a button to the toolbar that can be used
// to check for body sepcific data in our mongo db
// Call this once the Viewer has been set up
function addFusionButton(viewer) {
    var button = new Autodesk.Viewing.UI.Button('toolbarFusion');
    button.onClick = function (e) {
        var ids = viewer.getSelection();
        if (ids.length === 1) {
            var tree = viewer.model.getInstanceTree();
            var fullPath = getFullPath(tree, ids[0]);
            console.log(fullPath);

            $.ajax ({
                url: '/dm/fusionData/' + viewer.model.loader.svfUrn + '/' + encodeURIComponent(fullPath),
                type: 'GET'
            }).done (function (data) {
                console.log('Retrieved data');
                console.log(data);

                alert(JSON.stringify(data, null, 2));
            }).fail (function (xhr, ajaxOptions, thrownError) {
                alert('Failed to retrieve data') ;
            }) ;
        }
    };
    button.addClass('toolbarFusionButton');
    button.setToolTip('Show Fusion properties');

    // SubToolbar
    var subToolbar = new Autodesk.Viewing.UI.ControlGroup('myFusionAppGroup');
    subToolbar.addControl(button);

    viewer.toolbar.addControl(subToolbar);
}

function loadDocument(viewer, documentId) {

    Autodesk.Viewing.Document.load(
        documentId,
        // onLoad
        function (doc) {
            var geometryItems = [];
            // Try 3d geometry first
            geometryItems = Autodesk.Viewing.Document.getSubItemsWithProperties(doc.getRootItem(), {
                'type': 'geometry',
                'role': '3d'
            }, true);

            // If no 3d then try 2d
            if (geometryItems.length < 1)
                geometryItems = Autodesk.Viewing.Document.getSubItemsWithProperties(doc.getRootItem(), {
                    'type': 'geometry',
                    'role': '2d'
                }, true);

            if (geometryItems.length > 0) {
                var path = doc.getViewablePath(geometryItems[0]);
                //viewer.load(doc.getViewablePath(geometryItems[0]), null, null, null, doc.acmSessionId /*session for DM*/);
                var options = {};
                viewer.loadModel(path, options);
                addFusionButton(viewer);
            }
        },
        // onError
        function (errorMsg) {
            //showThumbnail(documentId.substr(4, documentId.length - 1));
        }
    )
}