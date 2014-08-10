// ==UserScript==
// @name           Sketchfab download script
// @description    lets you download Sketchfab models
// @author         Reinitialized
//
//Version Number
// @version        1.01
//
// Urls process this user script on
// @include        /^https?://(www\.)?sketchfab\.com/models/.*$/
// ==/UserScript==

window.onload=function() {
    try {
        window.models = [];
		OSG.osg.Geometry.prototype.originalDrawImplementation = OSG.osg.Geometry.prototype.drawImplementation;
		OSG.osg.Geometry.prototype.drawImplementation = function(a) {
            this.originalDrawImplementation(a);
            if (!this.computedOBJ) {
                this.computedOBJ = true;
                var dlName = document.title + "-" + window.models.length;
                window.dlOBJ(OBJforGeometry(this), dlName);
            }
        };
    }
    catch(err) {
        console.log("failed to override method");
    }
};
 
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

window.dlOBJ = function(objString, objName) {
    // Credit: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
    function destroyClickedElement(event)
    {
        document.body.removeChild(event.target);
    }
    var textToWrite = objString;
    var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
    
    // Credit: http://phpjs.org/functions
    function basename (path, suffix) {
        var b = path.replace(/^.*[\/\\]/g, '');
        
        if (typeof suffix === 'string' && b.substr(b.length - suffix.length) == suffix) {
            b = b.substr(0, b.length - suffix.length);
        }
        
        return b;
    }
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
