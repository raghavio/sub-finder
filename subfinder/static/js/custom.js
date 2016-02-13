if (window.File && window.FileList && window.FileReader) {
    init();
} else {
    alert("Not supported for your browser");
}


function init() {

    window.filesData = {
        data: []
    };

    window.totalFiles = undefined;

    var inputElement = document.getElementById("input-file");
    var dragElement = document.getElementById("drop-zone");

    inputElement.addEventListener("change", fileSelectHandler, false);

    dragElement.addEventListener("dragover", fileDragHover, false);
    dragElement.addEventListener("dragleave", fileDragHover, false);
    dragElement.addEventListener("drop", fileSelectHandler, false);


    /*var app = angular.module('sub-finder', []).filter('split', function () {
        return function (input, splitChar) {
            // do some bounds checking here to ensure it has that index
            return input.split(splitChar);
        }
    });

    app.controller('FilesController', ['$scope', function ($scope) {
        // the last received msg
        $scope.files = [];

        // handles the callback from the received event
        var handleCallback = function (e) {
            $scope.$apply(function () {
                var data = JSON.parse(e.data);
                var isError = false;
                if ("error" in data)
                    isError = true;
                else
                    $scope.files.push(data);
                updateProgressBar();
            });
        };

        var source = new EventSource('/stream');
        source.addEventListener('message', handleCallback, false);
    }]); */

}

function fileSelectHandler(e) {
    fileDragHover(e);  // Changes class name
    var files = e.target.files || e.dataTransfer.files;
    for (var i = 0, file; file = files[i]; i++) {
        calculateHash(file, i, files.length - 1);
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
 * @param currentFileInLoop Position of file in loop. When this equals totalFiles we send data to server.
 * @param totalFiles Total number of files.
 */
function calculateHash(file, currentFileInLoop, totalFiles) {
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
            filesData.data.push({"fileName": file.name, "hash": binl2hex(longs), "fileSize": file.size});
            if (currentFileInLoop == totalFiles)
                sendHashToServer();
        });
    });
}

function sendHashToServer() {
    window.totalFiles = filesData.data.length;
    var f = document.createElement("form");
    f.setAttribute('method',"POST");
    var i = document.createElement("input");
    i.setAttribute('type',"text");
    i.setAttribute('name', "data");
    i.setAttribute('value', JSON.stringify(filesData));
    f.appendChild(i);
    document.body.appendChild(f);
    f.submit();
}

/**
 * Updates the progress bar.
 * Gets called every time we get data from server.
 */
function updateProgressBar() {
    var progressBar = $("#progress-bar");
    var parentWidth = +$(".progress").width();
    var newWidth = Math.min(+progressBar.width() + Math.ceil(parentWidth / totalFiles), parentWidth);
    var percentage = newWidth / parentWidth * 100;

    progressBar.width(newWidth);
    progressBar.attr("aria-valuenow", percentage);
    $("#progress-bar-span").html(percentage + "% Complete");
    if (newWidth == parentWidth)
        progressBar.removeClass("active");
}