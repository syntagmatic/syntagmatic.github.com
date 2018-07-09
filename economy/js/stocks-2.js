function stocks2() {
  var banks = ["Citigroup", "Bank of America", "Goldman Sachs", "JP Morgan"]; 
  var techs = ["Apple", "Google", "Yahoo", "Microsoft"]; 
  var manufacturers = ["Ford", "US Steel", "Caterpillar", "Alcoa"]; 

  var margin = {top: 20, right: 150, bottom: 20, left: 30},
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.log().range([height,0]),
      timeFormat = d3.time.format("%B %Y"),
      stockTimeFormat = d3.time.format("%Y-%m-%d");

  var sources = [
    {
      name: "Apple",
      source: "data/yahoo-finance-AAPL.csv"
    },
    {
      name: "Google",
      source: "data/yahoo-finance-GOOG.csv"
    },
    {
      name: "Yahoo",
      source: "data/yahoo-finance-YHOO.csv"
    },
    {
      name: "Microsoft",
      source: "data/yahoo-finance-MSFT.csv"
    },
    {
      name: "US Steel",
      source: "data/yahoo-finance-X.csv"
    },
    {
      name: "Citigroup",
      source: "data/yahoo-finance-C.csv"
    },
    {
      name: "Bank of America",
      source: "data/yahoo-finance-BAC.csv"
    },
    {
      name: "Ford",
      source: "data/yahoo-finance-F.csv"
    },
    {
      name: "JP Morgan",
      source: "data/yahoo-finance-JPM.csv"
    },
    {
      name: "Goldman Sachs",
      source: "data/yahoo-finance-GS.csv"
    },
    {
      name: "Caterpillar",
      source: "data/yahoo-finance-CAT.csv"
    },
    {
      name: "Alcoa",
      source: "data/yahoo-finance-AA.csv"
    }
  ];

  // load data
  var q = queue();
  _(sources).each(function(v) {
    q.defer(utils.load_csv(v.source))
  });
  q.await(create_graph);

  function create_graph(error, results) {
    // clean up BLS data format
    var data = _(results).map(function(raw,i) {
      return {
        key: sources[i].name,
        values: _(raw).map(function(d) {
          return {
            date: stockTimeFormat.parse(d['Date']).getTime(),
            value:  parseFloat(d['Close'])
          }
        }).reverse()
      }
    });

    var flattened = _(data).chain().pluck('values').flatten().value();
    var values = _(flattened).pluck('value');
    var dates = _(flattened).pluck('date');

    var minDate = (new Date(2000, 1)).getTime();
    var maxDate = (new Date(d3.max(dates))).getTime();

    var color_scale = d3.scale.category20();
    var color = function(d,i) {
      return color_scale(i);
    };

    xscale.domain([minDate, maxDate]);
    yscale.domain([0.95*d3.min(values), 1.05*d3.max(values)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(d3.format(",.0f"));

    var svg = d3.select("#chart")
      .data(_(data).map(function(d) { return d.values }))
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
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .classed("line", true)
        .attr("stroke", color)
        .attr("clip-path", "url(#clip)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));

    svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", color)
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(maxDate) + 4;})
        .attr("y", function(d,i) { console.log(i,data[i].values); return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });
  };
};
