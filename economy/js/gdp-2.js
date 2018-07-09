
  var color = d3.scale.linear()
    .range(["#800", "#777", "#0a0"])
    .domain([-0.05, 0, 0.02])
    .interpolate(d3.interpolateLab);

function gdp2() {

  var margin = {top: 20, right: 30, bottom: 20, left: 70},
      width = 450 - margin.left - margin.right,
      height = 260 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y-%m");

  d3.tsv("data/bea-gdp-quarterly.tsv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.date = (timeFormat.parse(d.date)).getTime();
      d['billions'] = +(d['billions'].replace(",",""));
      d['billions-2005'] = +(d['billions-2005'].replace(",",""));
      d['percentage'] = (d['billions-2005']-13326.0)/13326.0; // q4 2007
    });
    var barwidth = (width/raw.length)-1;

    var minDate = (new Date(raw[0].date)).getTime();
    var maxDate = (new Date(raw[raw.length-1].date)).getTime();
    var dates = _(raw).pluck('date');

    xscale.domain([minDate, maxDate]);
    yscale.domain([1.05*d3.min(raw,function(d) { return d['percentage']; }), 1.05*d3.max(raw,function(d) { return d['percentage']; })]);

    var xAxis = d3.svg.axis().scale(xscale).ticks(4);
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(function(d) { return (d*100).toPrecision(2) + "%";});

    var svg = d3.select("#chart-gdp")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      svg.append("text")
        .attr("text-anchor", "left")
        .style("font-weight", "bold")
        .attr("x", 20)
        .attr("y", 20)
        .text("Gross Domestic Product");

      svg.append("text")
        .attr("text-anchor", "left")
        .attr("x", 20)
        .attr("y", 34)
        .text("Compared to 2007 Q4 output");

    var xAxisSvg = svg.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)

    xAxisSvg
        .selectAll("text")
        .style("font-size", "12px")
        .attr("transform", "translate(25, -6)");
    xAxisSvg
        .selectAll("path")
        .style("display", "none")
    xAxisSvg
        .selectAll("line")
        .style("stroke", "#ccc")
        .attr("transform", "translate(-" + (barwidth/2+1)+ ", 3)");

    svg.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    svg.append("rect")
      .attr("x", 0)
      .attr("y", yscale(0)-0.5)
      .attr("width", width+barwidth/2)
      .attr("height", 1)
      .style("stroke", "none")
      .style("fill", "#ccc");

    svg.selectAll("rect")
        .data(raw)
        .enter().append("rect")
        .attr("stroke", "none")
        .attr("fill", function(d,i) { return color(d.percentage) })
        .attr("x", function(d) { return xscale(d.date)-barwidth/2; })
        .attr("y", function(d) { return yscale(0); })
        .attr("width", barwidth)
        .attr("height", 0)
        .transition()
        .delay(function(d,i) { return 50*i; })
        .attr("y", function(d) { return d.percentage < 0 ? yscale(0) : yscale(d.percentage); })
        .attr("height", function(d) { return Math.abs(yscale(d.percentage)- yscale(0)); })

  });
};
