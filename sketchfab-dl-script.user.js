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
    OSG.osg.Geometry.prototype.originalDrawImplementation = OSG.osg.Geometry.prototype.drawImplementation;
    OSG.osg.Geometry.prototype.drawImplementation = function(a) {
        this.originalDrawImplementation(a);
        if (!this.computedOBJ) {
            this.computedOBJ = true;
            this.name = safeName(document.title.replace(' - Sketchfab', '')) + '-' + models.length;
            this.textures = textureInfoForGeometry(this);
            models.push({
                name: this.name,
                obj: OBJforGeometry(this),
                mtl: MTLforGeometry(this),
                textures: this.textures
            });
        }
    };
}

// source: http://stackoverflow.com/a/8485137
function safeName(s) {
    return s.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
}
 
function InfoForGeometry(geom) {
    var info = {
        'vertices' : geom.attributes.Vertex._elements,
        'texCoords' : geom.attributes.TexCoord0._elements,
        'primitives' : [],
        'name' : geom.name
    };
    for (i = 0; i < geom.primitives.length; ++i) {
        var primitive = geom.primitives[i];
        info.primitives.push({
            'mode' : primitive.mode,
            'indices' : primitive.indices._elements
        });
    }
    return info;
}

var nl = '\n';
function OBJforGeometry(geom) {
    var obj = '';
    var info = InfoForGeometry(geom);
    obj += 'mtllib ' + MTLFilenameForGeometry(geom) + nl;
    obj += 'o ' + geom.name + nl;
    for (var i = 0; i < info.vertices.length; i += 3) {
        obj += 'v ';
        for (j = 0; j < 3; ++j) {
            obj += info.vertices[i + j] + ' ';
        }
        obj += nl;
    }
    for (var i = 0; i < info.texCoords.length; i += 2) {
     	obj += 'vt ';
        for (j = 0; j < 2; ++j) {
            obj += info.texCoords[i + j] + ' ';
        }
        obj += nl;  
    }
    obj += 'usemtl ' + MTLNameForGeometry(geom) + nl;
    obj += 's on' + nl;
    for (var i = 0; i < info.primitives.length; ++i) {
        var primitive = info.primitives[i];
        if (primitive.mode == 4 || primitive.mode == 5) {
            for (j = 0; j + 2 < primitive.indices.length; primitive.mode == 4 ? j += 3 : ++j) {
                obj += 'f ';
                var isOddFace = (j % 2) % 2 == 1;
                var order = [ 0, 1, 2];
                if (isOddFace) 
                    order = [ 0, 2, 1];
                for (k = 0; k < 3; ++k) {
                    obj += (primitive.indices[j + order[k]] + 1) + ' ';
                }
                obj += nl;
            }
        }
        else {
            throw 'Primitive mode not implemented';
        }
    }
    return obj;
}

var textureMTLMap = {
    DiffuseColor: "map_Kd",
    SpecularColor: "map_Ks",
    NormalMap : "map_bump",
    EmitColor : "map_Ke",
    AlphaMask : "map_d",
    Opacity : "map_o"
};

// source: http://stackoverflow.com/a/3820412
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
   return base;
}

function ext(str) {
    return str.split('.').pop();
}

function textureInfoForGeometry(geom) {
    var textureMap = [];
    if (stateset = geom.stateset) {
        if (textures = stateset.textureAttributeMapList) {
            textures.forEach(function(texture) {
                var object = texture.Texture._object;
                if (texture = object._texture) {
                    if (imageProxy = texture._imageProxy) {
                        var textureURL = imageProxy.attributes.images[0].url;
                        var texture = {
                            url: textureURL,
                            type: textureMTLMap[object._channel._name],
                            ext: ext(textureURL)
                        };
                        texture.filename = textureFilename(geom, texture);
                        textureMap.push(texture);
                    }   
                }
            });
        }
    }
	return textureMap;
}

function textureFilename(geom, texture) {
    return baseName(texture.url) + '.' + texture.ext;
}

function MTLFilenameForGeometry(geom) {
 	return MTLNameForGeometry(geom) + '.mtl';   
}

function MTLNameForGeometry(geom) {
 	return geom.name;
}

function MTLforGeometry(geom) {
    var mtl = '';
    mtl += 'newmtl ' + MTLNameForGeometry(geom) + nl;
    geom.textures.forEach(function(texture) {
    	mtl += texture.type + ' ' + texture.filename + nl;
    });
    return mtl;
}

// source: http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
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


// source: http://stackoverflow.com/questions/10596417/is-there-a-way-to-get-element-by-xpath-in-javascript
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

// source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
function downloadString(filename, ext, str) {
    function destroyClickedElement(event)
    {
        document.body.removeChild(event.target);
    }
    var textFileAsBlob = new Blob([str], {type:'text/plain'});
    var fileNameToSaveAs = filename + '.' + ext;
    
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
}

// source: http://muaz-khan.blogspot.com/2012/10/save-files-on-disk-using-javascript-or.html
function downloadFileAtURL(fileURL) {
    var save = document.createElement('a');
    save.href = fileURL;
    save.target = '_blank';
    save.download = '';
    var event = document.createEvent('Event');
    event.initEvent('click', true, true);
    save.dispatchEvent(event);
    (window.URL || window.webkitURL).revokeObjectURL(save.href);
}

function downloadModels() {
    if (models.length == 0) {
    	alert("Download script failed... try refreshing the page");
        return;
    }
    models.forEach(function(model) {
        downloadString(model.name, 'obj', model.obj);
        downloadString(model.name, 'mtl', model.mtl);
        model.textures.forEach(function(texture) {
        	downloadFileAtURL(texture.url);
        });
    });
}

function addDownloadButton(downloadButtonParent) {
    var downloadButton = document.createElement("a");
    downloadButton.setAttribute("class", "control");
    downloadButton.innerHTML = "<pre>DOWNLOAD  </pre>";
    downloadButton.addEventListener("click", downloadModels , false);
    downloadButtonParent.appendChild(downloadButton);
}
