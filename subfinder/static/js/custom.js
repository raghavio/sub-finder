if (window.File && window.FileList && window.FileReader) {
    init();
} else {
    alert("Not supported for your browser");
}

function init() {
    var inputElement = document.getElementById("input-file");
    var dragElement = document.getElementById("drop-zone");

    inputElement.addEventListener("change", fileSelectHandler, false);

    dragElement.addEventListener("dragover", fileDragHover, false);
    dragElement.addEventListener("dragleave", fileDragHover, false);
    dragElement.addEventListener("drop", fileSelectHandler, false);
}

function fileSelectHandler(e) {
    fileDragHover(e);  // Changes class name
    var files = e.target.files || e.dataTransfer.files;
    var filesListElement = document.getElementById("files");
    filesListElement.innerHTML = ""; //Clear everything
    for (var i = 0, file; file = files[i]; i++) {
        calculateHash(file, sendHashToServer);
    }
}

function fileDragHover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = (e.type == "dragover" ? "upload-drop-zone drop" : "upload-drop-zone")
}

/**
 * This is a special hash function to match a subtitle files against the
 * movie files. Got this Javascript implementation from opensubtitles's site.
 *
 * http://trac.opensubtitles.org/projects/opensubtitles/wiki/HashSourceCodes
 * @param file The file
 * @param callback Calls this callback after calculation
 */
function calculateHash(file, callback) {
    var HASH_CHUNK_SIZE = 65536, //64 * 1024
        longs = [],
        temp = file.size;

    function read(start, end, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            callback.call(reader, process(e.target.result));
        };

        if (end === undefined) {
            reader.readAsBinaryString(file.slice(start));
        } else {
            reader.readAsBinaryString(file.slice(start, end));
        }
    }

    function process(chunk) {
        for (var i = 0; i < chunk.length; i++) {
            longs[(i + 8) % 8] += chunk.charCodeAt(i);
        }
    }

    function binl2hex(a) {
        var b = 255,
            d = '0123456789abcdef',
            e = '',
            c = 7;

        a[1] += a[0] >> 8;
        a[0] = a[0] & b;
        a[2] += a[1] >> 8;
        a[1] = a[1] & b;
        a[3] += a[2] >> 8;
        a[2] = a[2] & b;
        a[4] += a[3] >> 8;
        a[3] = a[3] & b;
        a[5] += a[4] >> 8;
        a[4] = a[4] & b;
        a[6] += a[5] >> 8;
        a[5] = a[5] & b;
        a[7] += a[6] >> 8;
        a[6] = a[6] & b;
        a[7] = a[7] & b;
        for (d, e, c; c > -1; c--) {
            e += d.charAt(a[c] >> 4 & 15) + d.charAt(a[c] & 15);
        }
        return e;
    }


    for (var i = 0; i < 8; i++) {
        longs[i] = temp & 255;
        temp = temp >> 8;
    }

    read(0, HASH_CHUNK_SIZE, function () {
        read(file.size - HASH_CHUNK_SIZE, undefined, function () {
            callback.call(null, file, binl2hex(longs));
        });
    });
}

function sendHashToServer(file, hash) {
    addFileToListItem(file);
}

function addFileToListItem(file) {
    var listItemElement = document.createElement("a");
    listItemElement.text = file.name;
    listItemElement.className = "list-group-item";
    document.getElementById("files").appendChild(listItemElement);
}