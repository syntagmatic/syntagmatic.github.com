function stocksFinal() {
  var playing = true;

  var sidebarHTML = [
    "<p>After a record high in 2007, the US stock market began a steep slide in 2008 due to the collapse of the housing bubble. The stock market continued to dip during Obama's first two months in office, before hitting a nadir in March 2009.</p>",
    "<p>Although the stock market has more than doubled in value since this point, fewer Americans own stocks today than at any time since 1999, according to pollster Gallup. Each year since 2007 has seen a fall in stock ownership.</p>",
    "<p>Stock markets are not necessarily correlated with economic performance: Although the Dow Jones has soared, household income and GDP growth have stagnated or grown slowly over the past four years.</p>"
  ];

  var banks = ["Bank of America", "Goldman Sachs", "JP Morgan"]; 
  var techs = ["Apple", "Google", "Microsoft"]; 
  var manufacturers = ["US Steel", "Caterpillar", "Alcoa"]; 

  var margin = {top: 20, right: 120, bottom: 20, left: 30},
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,0]),
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
      name: "Microsoft",
      source: "data/yahoo-finance-MSFT.csv"
    },
    {
      name: "US Steel",
      source: "data/yahoo-finance-X.csv"
    },
    {
      name: "Bank of America",
      source: "data/yahoo-finance-BAC.csv"
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

    var color_scale = d3.scale.category10();
    var color = function(d,i) {
      return color_scale(i);
    };

    xscale.domain([minDate, maxDate]);
    yscale.domain([0, 1.1*d3.max(values)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(d3.format(",.0f"));

    var svg = d3.select("#chart3")
      .html("")
      .data(_(data).map(function(d) { return d.values }))
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip3")
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
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .style("font-weight", "bold")
        .text("Share Price");

    var path = d3.svg.line()
      .x(function(p) { return xscale(p.date); })
      .y(function(p) { return yscale(p.value); });

    var lines = svg.selectAll("path.line")
        .data(data)
        .enter().append("path")
        .classed("line", true)
        .style("stroke-opacity", 0)
        .attr("stroke", color)
        .attr("clip-path", "url(#clip3)")
        .attr("d", function(d,i) { return path(d.values); });

    var legend = svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", color)
        .style("fill-opacity", 0)
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(maxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });

    var stepNames = [
      "Technology",
      "Finance",
      "Manufacturing"
    ];

    var steps = d3.select("#chart-steps3")
      .html("")
      .selectAll(".step")
        .data([step1, step2, step3])
      .enter().append("span")
        .attr("class", function(d,i) { return "step step-" + i; })
        .text(function(d,i) { return stepNames[i]; })
        .on("click", function(step) {
          playing = false;
          clearOut();
          setTimeout(step, 140);
        });

    step1();

    function updateSidebar(i) {
      d3.selectAll("#chart-steps3 .step").classed("active", false);
      d3.select("#chart-steps3 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
          .html(sidebarHTML[i])
    };

    function step1() {
      updateSidebar(0);

      var flattened = _(data).chain()
        .filter(function(d) { return _.contains(techs, d.key ); })
        .pluck('values')
        .flatten()
        .value();
      var values = _(flattened).pluck('value');

      yscale.domain([0, 1.1*d3.max(values)]);

      svg.select("g.y.axis")
        .transition()
        .duration(800).delay(400)
        .call(yAxis);

      legend
        .transition()
        .duration(0).delay(800)
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
      lines
        .filter(function(d,i) { return _.contains(techs, d.key); })
        .transition()
        .duration(0).delay(100)
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) { return _.contains(techs, d); })
        .transition()
        .duration(0).delay(100)
        .style("fill-opacity", 1); 

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 170)
        .attr("y", 75)
        .text("Technology")
        .style("fill-opacity", 0)
        .style("font-weight", "bold")
        .transition()
        .duration(0).delay(600)
        .style("fill-opacity", 1);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        step2();
      }, 3800);
    };

    function step2() {
      updateSidebar(1);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 170)
        .attr("y", 75)
        .text("Finance")
        .style("fill-opacity", 0)
        .style("font-weight", "bold")
        .transition()
        .duration(0).delay(700)
        .style("fill-opacity", 1);

      var flattened = _(data).chain()
        .filter(function(d) { return _.contains(banks, d.key ); })
        .pluck('values')
        .flatten()
        .value();
      var values = _(flattened).pluck('value');

      yscale.domain([0, 1.1*d3.max(values)]);

      svg.select("g.y.axis")
        .transition()
        .duration(1200).delay(800)
        .call(yAxis);

      legend
        .transition()
        .duration(0).delay(800)
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      lines
        .filter(function(d,i) { return _.contains(banks, d.key); })
        .transition()
        .duration(0).delay(800)
        .attr("d", function(d,i) { return path(d.values); })
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) { return _.contains(banks, d); })
        .transition()
        .duration(0).delay(800)
        .style("fill-opacity", 1); 

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        step3();
      }, 3800);
    };

    function step3() {
      updateSidebar(2);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 170)
        .attr("y", 75)
        .text("Manufacturing")
        .style("fill-opacity", 0)
        .style("font-weight", "bold")
        .transition()
        .duration(0).delay(700)
        .style("fill-opacity", 1);


      var flattened = _(data).chain()
        .filter(function(d) { return _.contains(manufacturers, d.key ); })
        .pluck('values')
        .flatten()
        .value();
      var values = _(flattened).pluck('value');

      yscale.domain([0, 1.1*d3.max(values)]);

      svg.select("g.y.axis")
        .transition()
        .duration(1200).delay(800)
        .call(yAxis);

      legend
        .transition()
        .duration(0).delay(800)
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      lines
        .filter(function(d,i) { return _.contains(manufacturers, d.key); })
        .transition()
        .duration(0).delay(800)
        .attr("d", function(d,i) { return path(d.values); })
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) { return _.contains(manufacturers, d); })
        .transition()
        .duration(0).delay(800)
        .style("fill-opacity", 1); 

      setTimeout(function() {
        if (!playing) return;
        //clearOut();
        //step5();
      }, 2800);
    };

    function clearOut() {
      lines
        .transition()
        .duration(0).delay(300)
        .style("stroke-opacity", 0);
      legend
        .transition()
        .duration(0).delay(300)
        .style("fill-opacity", 0);

      svg.selectAll(".annotation")
        .transition()
        .duration(0).delay(0)
        .style("fill-opacity", 0)
        .transition()
        .delay(1400)
        .remove();
    };


    // to bail out
    window.chartInvalidate = function() { playing = false};
  };
};
