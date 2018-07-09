var utils = {};

utils.date_value = function(data) {
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var years = _.pluck(data, "Year");

  return _(years).chain()
    .map(function(year,i) {
      return _(months).map(function(month,j) {
        return {
          date: (new Date(year, months.indexOf(month))).getTime(),
          value: parseFloat(data[i][month])
        }
      });
    })
    .flatten()
    .reject(function(d) {
      return d.value == " " ||
             _.isNaN(d.value);
    })
    .value();
};

// removes whitespace for values of objects in a collection
// returns an array of objects
utils.trim_table = function(table) { 
  return _(table).map(function(d) { 
    for (k in d)
      d[k] = _.str.trim(d[k]);
    return d;
  });
};

// requires file input "uploader" and "dropbox" for drag and drop
utils.upload_tsv = function(callback) {
  function handleFiles() {
    
    _(this.files).each(function(file) {
      var reader = new FileReader();
      var loading_msg = d3.select("#content")
        .append("div")
        .attr("class", "loading-msg")
        .text("loading...");

      reader.onload = function(e) {
        var contents = e.target.result;
        var data = d3.tsv.parse(contents);
        callback(data, file.name);
        loading_msg.remove();
      };

      reader.readAsText(file);
    });
  };

  var dropbox;
   
  dropbox = document.body;
  dropbox.addEventListener("dragenter", dragenter, false);
  dropbox.addEventListener("dragover", dragover, false);
  dropbox.addEventListener("drop", drop, false);

  function drop(e) {
    e.stopPropagation();
    e.preventDefault();
   
    var dt = e.dataTransfer;
    handleFiles.call(dt);
  };

  function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
  };

  function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
  };
};

utils.load_csv = function(csv) {
  return function(callback) {
    function callback_tsv(data) {
      return callback(null, data);
    };
    d3.csv(csv, callback_tsv);
  };
};
