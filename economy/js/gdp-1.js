function gdp1() {

  var margin = {top: 20, right: 140, bottom: 20, left: 70},
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y-%m");

  d3.tsv("data/bea-gdp-quarterly.tsv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.date = (timeFormat.parse(d.date)).getTime();
      d['billions'] = +(d['billions'].replace(",",""));
      d['billions-2005'] = +(d['billions-2005'].replace(",",""));
    });

    var minDate = (new Date(raw[0].date)).getTime();
    var currentMaxDate = (new Date(2012, 6)).getTime();
    var maxDate = (new Date(raw[raw.length-1].date)).getTime();
    var dates = _(raw).pluck('date');

    var color = d3.scale.category10();

    xscale.domain([minDate, currentMaxDate]);
    yscale.domain([0.95*d3.min(raw,function(d) { return d['billions-2005']; }), 1.05*d3.max(raw,function(d) { return d['billions-2005']; })]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(d3.format(",.0f"));

    var svg = d3.select("#chart")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip")
      .append("svg:rect")
        .attr("width", width)
        .attr("height", height);

    svg.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    svg.selectAll("path.line")
        .data([raw])
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .attr("clip-path", "url(#clip)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d['billions-2005']); }));

  });
};
