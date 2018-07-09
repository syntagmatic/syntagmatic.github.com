function random_matrix(size) {
    var matrix = [];
    for (var i=0; i<size; i++) {
        var row = [];
        for (var j=0; j<size; j++) {
            var num = Math.round(100*Math.pow(Math.random(),2)+1);
            row.push(num);
        }
        matrix.push(row);
    }
    return matrix;
};
