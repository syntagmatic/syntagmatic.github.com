var margin = {top: 20, right: 150, bottom: 20, left: 30},
    width = 560 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom,
    xscale = d3.time.scale().range([0,width]),
    yscale = d3.scale.linear().range([height,0]),
    timeFormat = d3.time.format("%B %Y");
