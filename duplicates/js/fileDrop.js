window.addEventListener('drop', fileDrop, false);

window.addEventListener("dragover",function(e){
  console.log("dragover")
  e = e || event;
  e.preventDefault();
},false);

function fileDrop(evt) {
    evt = evt || event;
    evt.preventDefault();

    console.log("drop")
    console.log(evt.dataTransfer)
    var files = evt.dataTransfer.files; // FileList object
    for (var i = 0, f; f = files[i]; i++) {
      reader = new FileReader();
      // Closure to capture the file information.
          reader.onload = (function(theFile) {
            return function(e) {
              rawText = e.target.result
              parseFileAndDraw(rawText)
              }
          })(f);
      reader.readAsText(f);
    }
  }