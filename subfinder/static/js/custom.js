if (window.File && window.FileList && window.FileReader) {
    init();
} else {
    alert("Not supported for your browser");
}

function init() {
    var inputElement = document.getElementById("input-file");
    inputElement.addEventListener("change", fileSelectHandler, false);
}

function fileSelectHandler(e) {
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