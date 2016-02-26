if (window.File && window.FileList && window.FileReader) {
    init();
} else {
    alert("Not supported for your browser");
}

$(function () {
    var sidebar = $('#sidebar');
    var bottom = $(document).height() - ( $('#stop-affix').offset().top) + ($(this).outerHeight() - $(this).height());

    sidebar.affix({
        offset: {
            top: sidebar.offset().top,
            bottom: bottom
        }
    });
    sidebar.on('affix.bs.affix', function () {
        $('.file-info-area').addClass("col-md-offset-4")
    });
    sidebar.on('affix-top.bs.affix', function () {
        $('.file-info-area').removeClass("col-md-offset-4")
    });
    sidebar.on('affix-bottom.bs.affix', function () {
        $('.file-info-area').removeClass("col-md-offset-4");
    });

    //init chosen on language search box
    $('#lang-search').chosen({
        width: '170px'
    });
});

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

    createForm();
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
    var drop_area_ele = document.getElementById("drop-zone");
    drop_area_ele.className = (e.type == "dragover" ? "upload-drop-zone drop" : "upload-drop-zone")
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
            if (currentFileInLoop == totalFiles) {
                window.totalFiles = filesData.data.length;
                sendHashToServer();
            }
        });
    });
}

/**
 * Sends data to server by submitting the form.
 * @see createForm()
 */
function sendHashToServer() {
    document.getElementById("hash-string").value = JSON.stringify(filesData);
    document.getElementById("hash_data_form").submit();
}


/**
 * Creates a form we use to submit hashes and language the user selected.
 * For language we use select tag whose form attribute is set to this. HTML5 stuff.
 */
function createForm() {
    var f = document.createElement("form");
    f.setAttribute('id', 'hash_data_form');
    f.setAttribute('action', '/results');
    f.setAttribute('method', "POST");

    var i = document.createElement("input");
    i.setAttribute('id', 'hash-string');
    i.setAttribute('type', "hidden");
    i.setAttribute('name', "data");

    f.appendChild(i);

    document.body.appendChild(f);
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

/**
 * Opensubtitles db is messed up with wrong data. So wrong that there can be times when it returns 2 different imdb
 * ids for one hash. In case something like that happens, we give user an option to browse the other imdb id(s).
 * This function implements the functionality to view the next imdbId.
 *
 * By imdbId here I mean movie or episode.
 * By hash I mean the file user browsed.
 *
 * @param index_in_ul index of the hash in whole list
 * @param index_in_li index of imdbId for one hash.
 * @param totalItems Total number of imdbIds returned by db for that one hash.
 */
function nextListItem(index_in_ul, index_in_li, totalItems) {
    var next_index = index_in_li + 1;
    var nextLiElement = $("#file-" + index_in_ul + "-" + next_index);

    $("#file-" + index_in_ul + "-" + index_in_li).addClass("hidden");
    nextLiElement.removeClass("hidden");

    if (next_index > 1) {
        nextLiElement.find(".previous-file-item").removeClass("disabled");
    }
    if (next_index == totalItems) {
        nextLiElement.find(".next-file-item").addClass("disabled");
    }
}


/**
 * Opensubtitles db is messed up with wrong data. So wrong that there can be times when it returns 2 different imdb
 * ids for one hash. In case something like that happens, we give user an option to browse the other imdb id(s).
 * This function implements the functionality to view the previous imdbId.
 *
 * By imdbId here I mean movie or episode.
 * By hash I mean the file user browsed.
 *
 * @param index_in_ul index of the hash in whole list
 * @param index_in_li index of imdbId for one hash.
 * @param totalItems Total number of imdbIds returned by db for that one hash.
 */
function previousListItem(index_in_ul, index_in_li, totalItems) {
    var previous_index = index_in_li - 1;
    var previousLiElement = $("#file-" + index_in_ul + "-" + previous_index);

    $("#file-" + index_in_ul + "-" + index_in_li).addClass("hidden");
    previousLiElement.removeClass("hidden");

    if (previous_index < totalItems) {
        previousLiElement.find(".next-file-item").removeClass("disabled");
    }
    if (previous_index == 1) {
        previousLiElement.find(".previous-file-item").addClass("disabled");
    }
}