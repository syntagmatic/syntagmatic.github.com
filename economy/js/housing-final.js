function housingFinal() {
  var sidebarHTML = [
    "<p>Home prices declined over the past six years as inflated prices corrected themselves. Prices today are roughly at 2004 levels, and have shown minimal recovery in the past year.</p>",
    "<p>Las Vegas, Phoenix, and Miami were hit hard by the collapse of the housing bubble. Prices dropped precipitously after a dramatic rise in the early-to-mid 2000s.</p>",
    "<p>Home prices in Washington, Los Angeles, and New York bounced back more quickly than those in the rest of the nation.</p>",
    "<p>Home prices in Denver, Dallas, and Cleveland remained mostly flat through the whole period.</p>"
  ];

  var playing = true;

  var cities = [ "Composite-20", "AZ-Phoenix", "CA-Los Angeles", "CA-San Diego", "CA-San Francisco", "CO-Denver", "DC-Washington", "FL-Miami", "FL-Tampa", "GA-Atlanta", "IL-Chicago", "MA-Boston", "MI-Detroit", "MN-Minneapolis", "NC-Charlotte", "NV-Las Vegas", "NY-New York", "OH-Cleveland", "OR-Portland", "TX-Dallas", "WA-Seattle", "Composite-10"];
  var margin = {top: 20, right: 100, bottom: 20, left: 30},
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,0]),
      timeFormat = d3.time.format("%B %Y"),
      format = function(d) { 
        // slice off state abbreviation
        if (d.indexOf("Composite") == 0) return d;
        return d.slice(3)
      };

  d3.csv("data/case-shiller-small2.csv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.YEAR = (timeFormat.parse(d.YEAR)).getTime();
    });

    var minDate = (new Date(raw[0].YEAR)).getTime();
    var currentMaxDate = (new Date(2012, 6)).getTime();
    var maxDate = (new Date(raw[raw.length-1].YEAR)).getTime();
    var dates = _(raw).pluck('YEAR');

    var color = function(i) { return d3.hcl(i*20,50,50).toString(); };

    var data = [];
    _(cities)
      .each(function(k) {
        if (k == "YEAR") return;
        data.push({
          key: k,
          values: _(raw)
            .chain()
            .map(function(d) {
              return {
                date: d.YEAR,
                value: parseFloat(d[k]) ? parseFloat(d[k]) : null
              }
            })
            .filter(function(d) {
              return d.value != null;
            })
            .value()
        });
      });

    var flattened = _(data).chain().pluck('values').flatten().pluck('value').value();

    xscale.domain([minDate, currentMaxDate]);
    yscale.domain([0.95*d3.min(flattened), 1.05*d3.max(flattened)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left");

    var svg = d3.select("#chart2")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style("font-weight", "bold")
      .text("Case-Shiller Index");

    var legend = svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", function(d,i) { return color(i) })
        .style("fill-opacity", 0)
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(currentMaxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(format);

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip2")
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

    var lines = svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .style("stroke-opacity", function(d,i) { return 0; })
        .attr("clip-path", "url(#clip2)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));

    var stepNames = [
      "Composite",
      "Recession",
      "Recovery",
      "Stagnation",
    ];

    var steps = d3.select("#chart-steps2")
      .html("")
      .selectAll(".step")
        .data([step1, step2, step3, step4])
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
      d3.selectAll("#chart-steps2 .step").classed("active", false);
      d3.select("#chart-steps2 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
        .html(sidebarHTML[i]); 
    };

    function step1() {
      updateSidebar(0);

      lines
        .filter(function(d,i) { return i == cities.indexOf("Composite-20"); })
        .classed("visible", true)
        .transition()
        .duration(0).delay(100)
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) { return d == "Composite-20"; })
        .classed("visible", true)
        .transition()
        .duration(0).delay(100)
        .style("fill-opacity", 1); 

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 500)
        .attr("y", 254)
        .text("Home prices have stagnated the past four years.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(700)
        .style("fill-opacity", 1);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step2, 600);
      }, 3200);
    };

    function step2() {
      updateSidebar(1);

      var hitCities = [ "AZ-Phoenix", "FL-Miami","MI-Detroit","NV-Las Vegas"];
      lines
        .filter(function(d,i) {
          return _(hitCities).chain()
            .map(function(city) { return cities.indexOf(city); })
            .contains(i)
            .value();
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) {
          return _(hitCities).contains(d);
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("fill-opacity", 1); 

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 140)
        .attr("y", 60)
        .text("After rising through the early 2000s...")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(1400)
        .style("fill-opacity", 1);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 486)
        .attr("y", 60)
        .text("...prices dropped precipitously.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(3500)
        .style("fill-opacity", 1);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 530)
        .attr("y", 146)
        .text("Recovery has been slow.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(5200)
        .style("fill-opacity", 1);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step3, 600);
      }, 7600);
    };

    function step3() {
      updateSidebar(2);

      var bounceCities = ["CA-Los Angeles","DC-Washington","NY-New York"];
      lines
        .filter(function(d,i) {
          return _(bounceCities).chain()
            .map(function(city) { return cities.indexOf(city); })
            .contains(i)
            .value();
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) {
          return _(bounceCities).contains(d);
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("fill-opacity", 1); 

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 506)
        .attr("y", 78)
        .text("Some cities have made")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(2200)
        .style("fill-opacity", 1);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 506)
        .attr("y", 92)
        .text("a modest recovery.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(2200)
        .style("fill-opacity", 1);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step4, 600);
      }, 5400);
    };

    function step4() {
      updateSidebar(3);

      var flatCities = [ "CO-Denver", "OH-Cleveland", "TX-Dallas"];
      lines
        .filter(function(d,i) {
          return _(flatCities).chain()
            .map(function(city) { return cities.indexOf(city); })
            .contains(i)
            .value();
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("stroke-opacity", 1);

      legend
        .filter(function(d,i) {
          return _(flatCities).contains(d);
        })
        .classed("visible", true)
        .transition()
        .duration(0).delay(function(d,i) { return i*600; })
        .style("fill-opacity", 1); 

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 320)
        .attr("y", 172)
        .text("Others have remained flat, losing value against inflation.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(2300)
        .style("fill-opacity", 1);

      setTimeout(function() {
        if (!playing) return;
        //clearOut();
        //step5();
      }, 6800);
    };

    function step5() {
      lines
        .filter(function() { return d3.select(this).classed("visible"); })
        .on("mouseover", function(d,i) {
          d3.select(this).style("stroke-opacity", 1);
          /*
          legend.filter(function(p) { return p == cities[i]; })
            .style("fill-opacity", 1);
            */
        })
        .on("mouseout", function() {
          d3.select(this).style("stroke-opacity", 0.17);
          legend.filter(function() { return d3.select(this).classed("visible"); })
            .style("fill-opacity", 0.17);
        })
    };

    function clearOut() {
      lines
        .filter(function() { return d3.select(this).classed("visible"); })
        .transition()
        .duration(0).delay(300)
        .style("stroke-opacity", 0);
      legend
        .filter(function() { return d3.select(this).classed("visible"); })
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
  });
};
