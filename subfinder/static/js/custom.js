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
        var listItemElement = document.createElement("a");
        listItemElement.text = file.name;
        listItemElement.className = "list-group-item";
        filesListElement.appendChild(listItemElement);
    }
}

function fileDragHover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = (e.type == "dragover" ? "upload-drop-zone drop" : "upload-drop-zone")
}