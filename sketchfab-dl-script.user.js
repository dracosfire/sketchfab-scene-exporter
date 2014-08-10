// ==UserScript==
// @name           Sketchfab download script
// @description    lets you download Sketchfab models
// @author         Reinitialized
//
//Version Number
// @version        1.01
//
// Urls process this user script on
// @include        /^https?://(www\.)?sketchfab\.com/models/.*/embed.*$/
// ==/UserScript==

window.onload=function() {
    overrideDrawImplementation();
};

var models = [];
function overrideDrawImplementation() {
    models = [];
    OSG.osg.Geometry.prototype.originalDrawImplementation = OSG.osg.Geometry.prototype.drawImplementation;
    OSG.osg.Geometry.prototype.drawImplementation = function(a) {
        this.originalDrawImplementation(a);
        if (!this.computedOBJ) {
            this.computedOBJ = true;
            models.push({
                name: document.title + "-" + models.length,
                obj: OBJforGeometry(this)
            });
        }
    };
}
 
function InfoForGeometry(geom) {
    info = {
        'name' : geom._name,
        'vertices' : geom.attributes.Vertex._elements,
        'primitives' : []
    };
    for (i = 0; i < geom.primitives.length; ++i) {
        var primitive = geom.primitives[i];
        if (primitive.mode == 1)
            return null;
        info.primitives.push({
            'mode' : primitive.mode,
            'indices' : primitive.indices._elements
        });
    }
    return info;
}

function OBJforGeometry(geom) {
    return OBJforGeometryInfo(InfoForGeometry(geom));
}

function OBJforGeometryInfo(info) {
    var obj = "";
    if (!info)
        return;
    for (var i = 0; i < info.vertices.length; i += 3) {
        obj += 'v ';
        for (j = 0; j < 3; ++j) {
            obj += info.vertices[i + j] + ' ';
        }
        obj += '\n';
    }
    for (var i = 0; i < info.primitives.length; ++i) {
        var primitive = info.primitives[i];
        if (primitive.mode == 4 || primitive.mode == 5) {
            for (j = 0; j + 2 < primitive.indices.length; primitive.mode == 4 ? j += 3 : ++j) {
                obj += 'f ';
                for (k = 0; k < 3; ++k) {
                    obj += (primitive.indices[j + k] + 1) + ' ';
                }
                obj += '\n';
            }
        }
        else {
            console.log('Primitive mode not implemented');
        }
    }
    return obj;
}

// Credit: http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // have the observer observe foo for changes in children
            obs.observe( obj, { childList:true, subtree:true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();


// Credit: http://stackoverflow.com/questions/10596417/is-there-a-way-to-get-element-by-xpath-in-javascript
function getElementByXpath(path) {
    return document.evaluate(path, document, null, 9, null).singleNodeValue;
}

var addedDownloadButton = false;
var downloadButtonParentXPath = "//div[@class='controls']";

observeDOM(document.body, function(){ 
    var downloadButtonParent = getElementByXpath(downloadButtonParentXPath);
    if (downloadButtonParent && !addedDownloadButton) {
        addDownloadButton(downloadButtonParent);
        addedDownloadButton = true;
    }
});

window.dlOBJ = function(objString, objName) {
    // Credit: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
    function destroyClickedElement(event)
    {
        document.body.removeChild(event.target);
    }
    var textFileAsBlob = new Blob([objString], {type:'text/plain'});
    var fileNameToSaveAs = objName + ".obj";
    
    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null)
    {
        // Chrome allows the link to be clicked
        // without actually adding it to the DOM.
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    }
    else
    {
        // Firefox requires the link to be added to the DOM
        // before it can be clicked.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }
    downloadLink.click();
};

function dlOBJs() {
    if (models.length == 0) {
    	alert("Download script failed... try refreshing the page");
        return;
    }
    models.forEach(function(model) {
        dlOBJ(model.obj, model.name);
    });
}

function addDownloadButton(downloadButtonParent) {
    var downloadButton = document.createElement("a");
    downloadButton.setAttribute("class", "control");
    downloadButton.innerHTML = "<pre>DOWNLOAD  </pre>";
    downloadButton.addEventListener("click", dlOBJs , false);
    downloadButtonParent.appendChild(downloadButton);
}
