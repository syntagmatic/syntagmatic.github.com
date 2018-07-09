function inflationFinal() {
  var playing = true;

  var sidebarHTML = [
    "<p>Despite fears to the contrary, inflation in the US has stayed quite low during the past four years. During the height of the financial crisis, the US witnessed deflation, or a fall in prices.</p>",
    "<p>Some politicians have criticised the Federal Reserve - the US' central banking system - for its massive bond-buying programmes, which they believe will lead, at some point in the future, to a rise in prices. Some have also lambasted President Obama for spikes in the price of gasoline.</p>",
    "<p>Although inflation is relatively low, with many Americans still hurting from the recession, even small increases in the prices of goods and services can be tough on consumers.</p>",
    "<p>Why is inflation low? At least part of the low inflation rates are due to high rates of unemployment: with fewer people spending money, demand for goods and services are down, and so prices are not rising as quickly.</p>"
  ];

  var margin = {top: 20, right: 160, bottom: 20, left: 30},
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,0]),
      timeFormat = d3.time.format("%B %Y");

  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var sources = [
    {
      name: "Inflation",
      source: "data/bls-inflation-cpi.csv"
    },
    {
      name: "Rent",
      source: "data/bls-inflation-rent-CUSR0000SEHA.csv"
    },
    {
      name: "Personal Computers",
      source: "data/bls-inflation-pcs-CUSR0000SEEE01.csv"
    },
    {
      name: "Medical Care",
      source: "data/bls-inflation-medical-CUUR0000SAM.csv"
    },
    {
      name: "College Tuition",
      source: "data/bls-inflation-college-CUSR0000SEEB01.csv"
    },
    {
      name: "Tobacco",
      source: "data/bls-inflation-tobacco-CUSR0000SEGA.csv"
    },
    {
      name: "Cable and Satellite TV",
      source: "data/bls-inflation-cable-CUSR0000SERA02.csv"
    },
    {
      name: "Motor Fuel",
      source: "data/bls-inflation-motorfuel-CUSR0000SETB.csv"
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
      _(raw).each(function(d) {
        delete d[''];
        delete d['Annual'];
        delete d['HALF1'];
        delete d['HALF2'];
      });
      return {
        key: sources[i].name,
        values: utils.date_value(raw)
      }
    });

    var flattened = _(data).chain().pluck('values').flatten().value();
    var values = _(flattened).pluck('value');
    var dates = _(flattened).pluck('date');

    var minDate = (new Date(2008, 8)).getTime();
    var maxDate = (new Date(d3.max(dates))).getTime();

    var color_scale = d3.scale.category10();
    var color = function(d,i) {
      if (i == 0) { return "#222"; }
      return color_scale(i);
    };

    xscale.domain([minDate, maxDate]);
    yscale.domain([150, 330]);
    //yscale.domain([0.95*d3.min(values), 1.05*d3.max(values)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left");

    var svg = d3.select("#chart1")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip1")
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
      .attr("class", "y-label")
      .text("Consumer Price Index");

    var lines = svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .classed("line", true)
        .classed("bold", function(d,i) { return i == 0; })
        .attr("stroke", color)
        .style("opacity", function(d,i) { return i == 0 ? 1 : 0; })
        .attr("clip-path", "url(#clip1)")
        .attr("d", path());

    var legend = svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", color)
        .style("opacity", function(d,i) { return i == 0 ? 1 : 0; })
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(maxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });

    var stepNames = [
      "Inflation",
      "Big Picture"
    ];

    var steps = d3.select("#chart-steps1")
      .html("")
      .selectAll(".step")
        .data([step1, step2])
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
      d3.selectAll("#chart-steps1 .step").classed("active", false);
      d3.select("#chart-steps1 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
          .html(sidebarHTML[i])
    };

    function step1() {
      updateSidebar(0);

      var minDate = (new Date(2008, 8)).getTime();

      xscale.domain([minDate, maxDate]);
      yscale.domain([150, 330]);

      svg.selectAll("path.line")
          .transition()
          .duration(1800)
          .style("opacity", 1)
          .transition()
          .delay(300)
          .duration(1000)
          .ease("quad-in-out")
          .attr("d", path());

      svg.selectAll(".legend text")
          .transition()
          .duration(1800)
          .style("opacity", 1)
          .transition()
          .delay(300)
          .duration(1000)
          .ease("quad-in-out")
          .attr("x", function(d,i) { return xscale(maxDate) + 4;})
          .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      svg.selectAll("g.x")
          .transition()
          .delay(300)
          .duration(1000)
          .ease("quad-in-out")
          .call(xAxis);

      svg.selectAll("g.y")
          .transition()
          .delay(300)
          .duration(1000)
          .ease("quad-in-out")
          .call(yAxis);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step2, 600);
      }, 3200);
    };

    function step2() {
      updateSidebar(1);

      var minDate = (new Date(1984, 0)).getTime();

      yscale.domain([0.95*d3.min(values), 1.05*d3.max(values)]);
      xscale.domain([minDate, maxDate]);

      svg.selectAll("path.line")
          .transition()
          .duration(0)
          .style("opacity", 1)
          .transition()
          .delay(80)
          .duration(3000)
          .ease("quad-in-out")
          .attr("d", path());

      svg.selectAll(".legend text")
          .transition()
          .duration(0)
          .style("opacity", 1)
          .transition()
          .delay(80)
          .duration(3000)
          .ease("quad-in-out")
          .attr("x", function(d,i) { return xscale(maxDate) + 4;})
          .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      svg.selectAll("g.x")
          .transition()
          .delay(80)
          .duration(3000)
          .ease("quad-in-out")
          .call(xAxis);

      svg.selectAll("g.y")
          .transition()
          .delay(80)
          .duration(3000)
          .ease("quad-in-out")
          .call(yAxis);
    };

    function path() {
      return d3.svg.line()
        .x(function(d) { return xscale(d.date); })
        .y(function(d) { return yscale(d.value); })
    };

    function clearOut() {
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

