var dataIn;
var rawData;
var componentLine;
var plotOpts, comp;

growthLookback = 1;
growthVal = "abs";
growthPeriod = "annualized";

var svgDim = { h: 530, w: 700 },
  plotWidths = 600,
  plotX = 80,
  compPlotDim = { h: 300, w: plotWidths },
  compPlotPos = { x: plotX, y: 30 },
  growthPlotDim = { h: 100, w: plotWidths },
  growthPlotPos = { x: plotX, y: 390 },
  axPad = 10;
yLabOffset = -70;

// function makeGrowthData(data,lookback){
//   //note: we reverse() the array to get the data updates and redraws to work better.
//   return data.map(function(d,i){
//     if (i<lookback) {
//       return {date:d.date, change: NaN, pct:NaN}
//     } else {
//       return {date:d.date,
//               abs: yValFnc(d)-yValFnc(data[i-lookback]),
//               pct: (yValFnc(d)-yValFnc(data[i-lookback]))/yValFnc(data[i-lookback]),
//               annualizedAbs: (365/lookback)*(yValFnc(d)-yValFnc(data[i-lookback])),
//               annualizedPct: (365/lookback)*(yValFnc(d)-yValFnc(data[i-lookback]))/yValFnc(data[i-lookback])}
//     }
//   }).reverse()
// }

function makeGrowthData(data, period) {
  //note: we reverse() the array to get the data updates and redraws to work better.
  return data
    .map(function (d, i) {
      if (i < 1) {
        return { date: d.date, change: NaN, pct: NaN };
      } else {
        if (period == "daily") {
          return {
            date: d.date,
            abs: yValFnc(d) - yValFnc(data[i - 1]),
            pct: (yValFnc(d) - yValFnc(data[i - 1])) / yValFnc(data[i - 1]),
            annualizedAbs: 365 * (yValFnc(d) - yValFnc(data[i - 1])),
            annualizedPct:
              ((365 / 1) * (yValFnc(d) - yValFnc(data[i - 1]))) /
              yValFnc(data[i - 1]),
          };
        } else if (period == "annualized") {
          return {
            date: d.date,
            abs: 365 * (yValFnc(d) - yValFnc(data[i - 1])),
            pct:
              (365 * (yValFnc(d) - yValFnc(data[i - 1]))) /
              yValFnc(data[i - 1]),
          };
        }
      }
    })
    .reverse();
}

function initMainPlot() {
  d3.select("#mainSvg").remove();
  mainSvg = d3
    .select("#svg-component")
    .append("svg")
    .attr("id", "mainSvg")
    .attr("width", svgDim.w)
    .attr("height", svgDim.h);

  timeExtent = d3.extent(
    dataIn.map(function (d) {
      return d.date;
    })
  );
  timeScale = d3.time.scale.utc().range([0, plotWidths]).domain(timeExtent);
  timeAxis = d3.svg.axis().scale(timeScale).orient("bottom");

  comp = getActiveComponents();
  yValFnc = function (d) {
    return comp
      .map(function (k) {
        return d.hasOwnProperty(k) ? d[k] : 1;
      })
      .reduce(function (x, y) {
        return x * y;
      });
  };
  rawYValFnc = function (d) {
    return ["trend", "seasonal", "weekly", "outlier", "noise"]
      .map(function (key) {
        return d[key];
      })
      .reduce(function (x, y) {
        return x * y;
      });
  };
  yDataExtent = d3.extent(dataIn.map(yValFnc));
  // IMPORTANT: polylinear Y-scale is required to clip enormous SVG coordinates returned when input values on the order of 100M are mapped to output values order of 100B, which is bigger than svg knows how to render
  yScale = d3.scale
    .linear()
    .domain([yDataExtent[1] * 1.1, yDataExtent[1] * 1.1, 0, 0])
    .range([0, 0, compPlotDim.h, compPlotDim.h]);
  yAxis = d3.svg
    .axis()
    .scale(yScale)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  mainPlotObj = setupPlot(
    mainSvg,
    "mainPlot",
    compPlotPos,
    compPlotDim,
    [
      {
        class: "timeAxis",
        pos: { x: 0, y: compPlotDim.h + axPad },
        fnc: timeAxis,
      },
      { class: "yAxis", pos: { x: -axPad, y: 0 }, fnc: yAxis },
    ],
    {
      textLabels: [
        {
          transform: { x: yLabOffset, y: compPlotDim.h / 2, theta: -90 },
          attrs: [
            { k: "class", v: "yLab" },
            { k: "id", v: "compYLab" },
          ],
          styles: [{ k: "text-anchor", v: "middle" }],
          text: "Number of instances",
        },
      ],
    }
  );
  mainPlot = mainPlotObj.group;
  mainPlotCanvas = mainPlotObj.canvas;
  canvasOverlay = mainPlotObj.overlay;

  timeScaleFnc = function (d) {
    return timeScale(d.date);
  };
  yScaleFncRaw = function (d) {
    return yScale(rawYValFnc(d));
  };
  (yScaleFnc = function (d) {
    return yScale(yValFnc(d));
  }),
    (growthData = makeGrowthData(dataIn, growthPeriod));
  growthValFnc = function (d) {
    return d[growthVal];
  };
  growthExtent = d3.extent(growthData.map(growthValFnc));
  growthScale = d3.scale
    .linear()
    .domain(padExtent(growthExtent, 0.1).reverse())
    .range([0, growthPlotDim.h]);
  growthScaleFnc = function (d) {
    return growthScale(growthValFnc(d));
  };
  growthTickFormat = function (val) {
    if (growthVal == "abs") {
      return d3.format(".2s")(val);
    } else if (growthVal == "pct") {
      return d3.format(".2%")(val);
    }
  };

  growthAxis = d3.svg
    .axis()
    .scale(growthScale)
    .orient("left")
    .tickFormat(growthTickFormat)
    .ticks(5);

  growthPlotObj = setupPlot(
    mainSvg,
    "growthPlot",
    growthPlotPos,
    growthPlotDim,
    [
      {
        class: "timeAxis",
        pos: { x: 0, y: growthPlotDim.h + axPad },
        fnc: timeAxis,
      },
      { class: "growthAxis", pos: { x: -axPad, y: 0 }, fnc: growthAxis },
    ],
    {
      textLabels: [
        {
          transform: { x: yLabOffset, y: growthPlotDim.h / 2, theta: -90 },
          attrs: [
            { k: "class", v: "yLab" },
            { k: "id", v: "growthYLab" },
          ],
          styles: [{ k: "text-anchor", v: "middle" }],
          text: "Annualized Change",
        },
      ],
    }
  );
  forecastGroupGrowth = growthPlotObj.canvas
    .append("g")
    .attr("class", "forecastGroupGrowth");

  rawDataLine = ChartPath(mainPlotCanvas, dataIn, timeScaleFnc, yScaleFncRaw, {
    classStr: "line rawDataLine",
  });
  referenceLine = ChartPath(
    mainPlotCanvas,
    timeExtent,
    function (d) {
      return timeScale(d);
    },
    function (d) {
      return yScale(1);
    },
    { classStr: "line referenceLine" }
  ).style("opacity", 0);

  forecastGroup = mainPlotCanvas.append("g").attr("id", "forecastGroup");
  forecastGroupJan1 = forecastGroup
    .append("g")
    .attr("class", "forecastGroupJan1 jan1");
  forecastGroupYtd = forecastGroup
    .append("g")
    .attr("class", "forecastGroupYtd ytd");

  componentLine = ChartPath(mainPlotCanvas, dataIn, timeScaleFnc, yScaleFnc, {
    classStr: "line componentLine",
  });

  growthRefLine = ChartPath(
    growthPlotObj.canvas,
    timeExtent,
    function (d) {
      return timeScale(d);
    },
    function (d) {
      return growthScale(0);
    },
    { classStr: "line referenceLine" }
  ).style("opacity", 1);

  growthLine = ChartPath(
    growthPlotObj.canvas,
    growthData,
    timeScaleFnc,
    growthScaleFnc,
    {
      classStr: "line componentLine",
      definedFnc: function (d) {
        return !isNaN(growthScaleFnc(d));
      },
    }
  );

  outlierScatter = ChartScatter(
    mainPlotCanvas,
    dataIn.filter(function (d) {
      return d.outlier == 1 ? false : true;
    }),
    timeScaleFnc,
    yScaleFnc,
    { sizeFnc: 1.5, classStr: "outlierScatter" }
  );

  hoverPointCirc = hoverPointForPath(mainPlot, componentLine, {
    r: 2,
    classStr: "hoverPoint",
    redrawFncs: [
      function (d) {
        d3.select(".obsTextRow")
          .select(".hoverVal")
          .text(d ? d3.format(".4s")(yValFnc(d)) : "--");
      },
    ],
  });
  hoverPointCircGrowth = hoverPointForPath(growthPlotObj.group, growthLine, {
    r: 2,
    classStr: "hoverPoint",
    redrawFncs: [
      function (d) {
        d3.select(".obsTextRow")
          .select(".growthAbs")
          .text(d ? d3.format(".2s")(d.abs) : "--");
      },
      function (d) {
        d3.select(".obsTextRow")
          .select(".growthPct")
          .text(d ? d3.format(".2%")(d.pct) : "--");
      },
    ],
  });
}

function getActiveComponents() {
  a = [];
  d3.selectAll("#componentButtons .btn").each(function (d, i) {
    if (d3.select(this).classed("active"))
      a.push(d3.select(this).attr("data-key"));
  });
  return a;
}

function getActiveOptions(d, i) {
  return objOfActiveDataKeysInSelection("#optionsMenu li");
}

function getActiveDataKeysInSelection(selStr) {
  a = [];
  d3.selectAll(selStr).each(function (d, i) {
    d3.select(this).classed("active")
      ? a.push(d3.select(this).attr("data-key"))
      : null;
  });
  return a;
}

function objOfActiveDataKeysInSelection(selStr) {
  a = {};
  d3.selectAll(selStr).each(function (d, i) {
    a[d3.select(this).attr("data-key")] = d3.select(this).classed("active");
  });
  return a;
}

function updateYAxes(yExtent) {
  mainSvg
    .selectAll(".yAxis")
    .transition()
    .duration(1200)
    .call(yAxis.scale(yScale));

  mainSvg
    .selectAll(".growthAxis")
    .transition()
    .duration(1200)
    .call(growthAxis.scale(growthScale));
}

function updateTimeAxis() {
  mainSvg
    .selectAll(".timeAxis")
    .transition()
    .duration(1200)
    .call(timeAxis.scale(timeScale));
}

function handleComponentBtnClick(d, i) {
  $(this.parentNode).toggleClass("active");
  comp = getActiveComponents();
  if (comp.length == 0) {
    $(this.parentNode).toggleClass("active");
    return;
  } else if (comp.length != 5) {
    $("#allButton .btn").removeClass("active");
  } else {
    $("#allButton .btn").addClass("active");
  }
  updateComponents(comp);
}

function handleAllBtnClick(d, i) {
  $(this.parentNode).addClass("active");
  $("#componentButtons .btn").addClass("active");
  comp = getActiveComponents();
  updateComponents(comp);
}

var daysSelected = 0;
var plotTimeExtent;
function handleDateBtnClick(d, i) {
  $("#dateToolbar .btn").removeClass("active");
  // $(this.parentNode).addClass("active")
  thisButton = d3.select(this.parentNode);
  thisButton.classed("active", true);
  daysSelected = 1.0 * thisButton.attr("num-days");
  updateTimeScaleAndAxis();
}

function handleGrowthPeriodClick(d, i) {
  $("#growthButtons .btn").removeClass("active");
  thisButton = d3.select(this.parentNode);
  thisButton.classed("active", true);
  growthPeriod = thisButton.attr("data-key");
  if (growthPeriod == "daily") {
    d3.select("#growthYLab").text("One Day Change");
  } else if (growthPeriod == "annualized") {
    d3.select("#growthYLab").text("Annualized Change");
  }
}

function handleGrowthValClick(d, i) {
  $("#growthValButtons .btn").removeClass("active");
  thisButton = d3.select(this.parentNode);
  thisButton.classed("active", true);
  growthVal = thisButton.attr("data-key");
}

function updateTimeScaleAndAxis() {
  if (daysSelected != 0) {
    var endDate = rawDataTimeExtent[1];
    timeExtent[0] = new Date(endDate - daysSelected * 24 * 3600 * 1000);
  } else {
    timeExtent[0] = rawDataTimeExtent[0];
  }

  if (activeForecastFlag) {
    timeExtent[1] = endOfYearDate;
  } else {
    timeExtent[1] = rawDataTimeExtent[1];
  }

  numDays = (timeExtent[1] - timeExtent[0]) / (24 * 3600 * 1000);
  if (numDays == 0) {
    timeAxis.ticks(d3.time.years.utc, 1).tickFormat(d3.time.format.utc("%Y"));
  } else if (numDays > 0 && numDays < 20) {
    timeAxis.ticks(d3.time.days.utc, 1).tickFormat(d3.time.format.utc("%d"));
  } else if (20 <= numDays && numDays < 60) {
    timeAxis
      .ticks(d3.time.sundays.utc, 1)
      .tickFormat(d3.time.format.utc("%a %d"));
  } else if (60 <= numDays && numDays < 690) {
    timeAxis.ticks(d3.time.months.utc, 1).tickFormat(d3.time.format.utc("%b"));
  } else {
    timeAxis.ticks(d3.time.years.utc, 1).tickFormat(d3.time.format.utc("%Y"));
  }

  timeScale.domain(timeExtent);
  comp = getActiveComponents();
  updateComponents(comp);
  updateTimeAxis();
}

function handleComponentLinkClick(d, i) {
  compKey = d3.select(this).attr("comp-key");
  $("#componentButtons .btn").removeClass("active");
  $("#allButton .btn").removeClass("active");
  d3.selectAll("#componentButtons .btn")
    .filter(function (d, i) {
      return d3.select(this).attr("data-key") == compKey;
    })
    .classed("active", true);
  comp = getActiveComponents();
  updateComponents(comp);
}

function handleTooltipMouseover(d, i) {
  x0 = d3.mouse(this)[0];
  var t0 = timeScale.invert(x0);

  var textDate =
    t0.getUTCHours() <= 12 ? t0 : new Date(t0 - -1000 * 60 * 60 * 24);
  hoveredDate.html(d3.time.format.utc("%a, %b %d %Y")(textDate));

  hoverPointCircGrowth.moveToClosest(x0);
  hoverPointCirc.moveToClosest(x0);
  hoverPointCircJan1.moveToClosest(x0);
  hoverPointCircYtd.moveToClosest(x0);
  hoverPointCircJan1Growth.moveToClosest(x0);
  hoverPointCircYtdGrowth.moveToClosest(x0);
}

function elt(array, obj) {
  return array.indexOf(obj) != -1;
}

function updateComponents(comp) {
  yValFnc = function (d) {
    return comp
      .map(function (key) {
        return d[key];
      })
      .reduce(function (x, y) {
        return x * y;
      });
  };
  var yExtent = d3.extent(dataIn.map(yValFnc));
  var yExtentDisplay = padExtent(yExtent, 0.15);

  growthData = makeGrowthData(dataIn, growthPeriod);
  foreJan1Growth = makeGrowthData(decompJan1.concat(foreJan1), growthPeriod);
  foreYtdGrowth = makeGrowthData(decompYtd.concat(foreYtd), growthPeriod);

  growthExtent = d3.extent(growthData.map(growthValFnc));
  d3.selectAll(".hoverPoint").style("opacity", 0);

  if (elt(comp, "trend")) {
    //if "trend" IS present
    yExtentDisplay[0] = 0;
    yAxis.tickFormat(d3.format(".2s"));
    referenceLine.targetOpacity(0);
    rawDataLine.targetOpacity(plotOpts["rawInBkgd"] ? 1 : 0);
    d3.select("#compYLab").text("Number of Instances");
  } else {
    yAxis.tickFormat(d3.format(".2"));
    referenceLine.targetOpacity(1);
    rawDataLine.targetOpacity(0);
    d3.select("#compYLab").text("Multiple of Trend");
  }

  yScale.domain([
    yExtentDisplay[1],
    yExtentDisplay[1],
    yExtentDisplay[0],
    yExtentDisplay[0],
  ]);
  growthScale.domain(padExtent(growthExtent, 0.1).reverse());

  componentLine.trans();
  outlierScatter.trans();
  referenceLine.trans();
  rawDataLine.trans();

  growthLine.updateData(growthData);
  growthRefLine.trans();
  jan1GrowthLine.updateData(foreJan1Growth);
  ytdGrowthLine.updateData(foreYtdGrowth);

  foreJan1Line.trans();
  foreJan1Area.trans();

  foreYtdLine.trans();
  foreYtdArea.trans();

  updateYAxes(yExtent);
}

function handleOptionsButtonClick(d, i) {
  $("#optionsButton").addClass("open");
}

function toggleOptions(d, i) {
  if ($(this).toggleClass("active").hasClass("active")) {
    // var checkSpan=
    d3.select(this)
      .select("span")
      .classed("glyphicon-check", true)
      .classed("glyphicon-unchecked", false);
  } else {
    d3.select(this)
      .select("span")
      .classed("glyphicon-check", false)
      .classed("glyphicon-unchecked", true);
  }
  handleOptions();
}

var activeForecastFlag = false;
function handleOptions() {
  plotOpts = getActiveOptions();
  outlierScatter.targetOpacity(plotOpts["highlightOutliers"] ? 1 : 0);
  rawDataLine.targetOpacity(plotOpts["rawInBkgd"] ? 1 : 0);

  foreJan1Line.targetOpacity(plotOpts["foreJan1"] ? 0.7 : 0);
  foreJan1Area.targetOpacity(plotOpts["foreJan1"] ? 0.4 : 0);
  jan1GrowthLine.targetOpacity(plotOpts["foreJan1"] ? 0.7 : 0);

  foreYtdLine.targetOpacity(plotOpts["foreYtd"] ? 0.7 : 0);
  foreYtdArea.targetOpacity(plotOpts["foreYtd"] ? 0.4 : 0);
  ytdGrowthLine.targetOpacity(plotOpts["foreYtd"] ? 0.7 : 0);

  if (plotOpts["foreJan1"] || plotOpts["foreYtd"]) {
    activeForecastFlag = true;
    updateTimeScaleAndAxis();
  } else {
    activeForecastFlag = false;
    updateTimeScaleAndAxis();
  }

  d3.selectAll("#forecastHeader")
    .transition()
    .duration(200)
    .style("line-height", activeForecastFlag ? "20px" : "0px");
  d3.selectAll("tr.jan1TextRow td")
    .transition()
    .duration(200)
    .style("line-height", plotOpts["foreJan1"] ? "20px" : "0px");
  d3.selectAll("tr.ytdTextRow td")
    .transition()
    .duration(200)
    .style("line-height", plotOpts["foreYtd"] ? "20px" : "0px");
}

var foreYtd, foreJan1, decompJan1, decompYtd;
var filesToLoad = 4;

function parseYtdForecast(parsedRows) {
  foreYtd = parseForecast(parsedRows);
  if (!--filesToLoad) initForecastLines();
}
function parseJan1Forecast(parsedRows) {
  foreJan1 = parseForecast(parsedRows);
  endOfYearDate = d3.extent(
    foreJan1.map(function (d) {
      return d.date;
    })
  )[1];
  if (!--filesToLoad) initForecastLines();
}
function parseDecompJan1(parsedRows) {
  decompJan1 = parseDecomp(parsedRows);
  if (!--filesToLoad) initForecastLines();
}
function parseDecompYtd(parsedRows) {
  decompYtd = parseDecomp(parsedRows);
  if (!--filesToLoad) initForecastLines();
}

function parseForecast(parsedRows) {
  var parsedData = parsedRows.map(function (d) {
    var o = {};
    // console.log(d3.keys(d))
    d3.keys(d).forEach(function (k) {
      if (k == "date") {
        o[k] = new Date(d[k]);
      } else if (k == "dayOfWeek") {
        o[k] = d[k];
      } else if (k == "forecast") {
        o["trend"] = d[k];
      } else {
        o[k] = d[k] * 1.0;
      }
    });
    return o;
  });
  return parsedData;
}

function parseDecomp(parsedRows) {
  var dataOut = parsedRows.map(function (d) {
    var o = {};
    for (var prop in d) {
      if (!d.hasOwnProperty(prop)) {
        //The current property is not a direct property of p
        continue;
      }
      if (prop == "date") {
        o[prop] = new Date(d[prop]);
      } else if (prop == "dayOfWeek") {
        o[prop] = d[prop];
      } else {
        o[prop] = +d[prop];
      }
    }
    return o;
  });
  return dataOut;
}

function foreErrorYValFnc(errorKey) {
  return function (d) {
    return comp
      .filter(function (key) {
        return key != "noise" && key != "outlier";
      })
      .map(function (key) {
        return key == "trend" ? d[errorKey] : d[key];
      })
      .reduce(function (x, y) {
        return x * y;
      }, 1);
  };
}

function initForecastLines() {
  foreJan1Area = ChartArea(
    forecastGroupJan1,
    foreJan1,
    timeScaleFnc,
    function (d) {
      return yScale(foreErrorYValFnc("high95")(d));
    },
    function (d) {
      return yScale(foreErrorYValFnc("low95")(d));
    },
    { classStr: "area forecastArea 95pct jan1", targetOpacity: 0 }
  );

  foreYtdArea = ChartArea(
    forecastGroupYtd,
    foreYtd,
    timeScaleFnc,
    function (d) {
      return yScale(foreErrorYValFnc("high95")(d));
    },
    function (d) {
      return yScale(foreErrorYValFnc("low95")(d));
    },
    { classStr: "area forecastArea 95pct ytd", targetOpacity: 0 }
  );

  foreJan1Line = ChartPath(
    forecastGroupJan1,
    decompJan1.concat(foreJan1),
    timeScaleFnc,
    yScaleFnc,
    { classStr: "line forecastLine jan1", targetOpacity: 0 }
  );

  foreYtdLine = ChartPath(forecastGroupYtd, foreYtd, timeScaleFnc, yScaleFnc, {
    classStr: "line forecastLine ytd",
    targetOpacity: 0,
  });

  foreJan1Growth = makeGrowthData(decompJan1.concat(foreJan1), growthPeriod);
  foreYtdGrowth = makeGrowthData(decompYtd.concat(foreYtd), growthPeriod);
  hoverPointCircYtd = hoverPointForPath(mainPlot, foreYtdLine, {
    r: 2,
    classStr: "ytd hoverPoint",
    redrawFncs: [
      function (d) {
        d3.select(".ytdTextRow .hoverVal").text(
          d ? d3.format(".2s")(yValFnc(d)) : "--"
        );
      },
    ],
  });
  hoverPointCircJan1 = hoverPointForPath(mainPlot, foreJan1Line, {
    r: 2,
    classStr: "jan1 hoverPoint",
    redrawFncs: [
      function (d) {
        d3.select(".jan1TextRow .hoverVal").text(
          d ? d3.format(".2s")(yValFnc(d)) : "--"
        );
      },
    ],
  });

  jan1GrowthLine = ChartPath(
    forecastGroupGrowth,
    foreJan1Growth,
    timeScaleFnc,
    growthScaleFnc,
    { classStr: "line forecastLine jan1" }
  );
  ytdGrowthLine = ChartPath(
    forecastGroupGrowth,
    foreYtdGrowth,
    timeScaleFnc,
    growthScaleFnc,
    {
      classStr: "line forecastLine ytd",
      definedFnc: function (d) {
        return d.date - dataIn.slice(-1)[0].date > 0;
      },
    }
  );

  hoverPointCircJan1Growth = hoverPointForPath(
    forecastGroupGrowth,
    jan1GrowthLine,
    {
      r: 2,
      classStr: "jan1 hoverPoint",
      redrawFncs: [
        function (d) {
          d3.select(".jan1TextRow")
            .select(".growthAbs")
            .text(d ? d3.format(".2s")(d.abs) : "--");
        },
        function (d) {
          d3.select(".jan1TextRow")
            .select(".growthPct")
            .text(d ? d3.format(".2%")(d.pct) : "--");
        },
      ],
    }
  );
  hoverPointCircYtdGrowth = hoverPointForPath(
    forecastGroupGrowth,
    ytdGrowthLine,
    {
      r: 2,
      classStr: "ytd hoverPoint",
      redrawFncs: [
        function (d) {
          d3.select(".ytdTextRow")
            .select(".growthAbs")
            .text(d ? d3.format(".2s")(d.abs) : "--");
        },
        function (d) {
          d3.select(".ytdTextRow")
            .select(".growthPct")
            .text(d ? d3.format(".2%")(d.pct) : "--");
        },
      ],
    }
  );

  comp = getActiveComponents();
  plotOpts = getActiveOptions();
  updateComponents(comp);
  handleOptions();
}

var rawDataTimeExtent;
d3.csv("data/blocklistDecomposition.csv", function (parsedRows) {
  rawData = parsedRows;
  dataIn = parseDecomp(parsedRows);
  rawDataTimeExtent = d3.extent(
    dataIn.map(function (d) {
      return d.date;
    })
  );
  initMainPlot();

  d3.selectAll("#componentButtons .btn input").on(
    "click",
    handleComponentBtnClick
  );
  d3.selectAll("#allButton .btn input").on("click", handleAllBtnClick);
  d3.selectAll(".componentLink").on("click", handleComponentLinkClick);
  d3.selectAll("#dateToolbar .btn input").on("click", handleDateBtnClick);
  d3.selectAll("#growthButtons .btn input").on(
    "click",
    handleGrowthPeriodClick
  );
  d3.selectAll("#growthValButtons .btn input").on(
    "click",
    handleGrowthValClick
  );
  d3.selectAll("#optionsMenu li").on("click", toggleOptions);

  hoveredDate = d3.select(".activeDateText");
  hoverPointTextVal = d3.select(".activeValText");
  jan1ForecastText = d3.select(".jan1ForecastText");
  ytdForecastText = d3.select(".ytdForecastText");

  $("html").click(function (e) {
    $("#optionsButton").removeClass("open");
  });
  /* Clicks within the dropdown won't make
     it past the dropdown itself */
  $("#optionsButton").click(function (e) {
    e.stopPropagation();
    $("#optionsButton").toggleClass("open");
  });
  $("#optionsButton li").click(function (e) {
    e.stopPropagation();
  });

  bisectDate = d3.bisector(function (d) {
    return d.date;
  }).left;
  d3.selectAll(".canvasOverlay").on("mousemove", handleTooltipMouseover);
  var maxDate = d3.time.format.utc("%A, %B %d %Y")(
    d3.max(
      dataIn.map(function (d) {
        return d.date;
      })
    )
  );
  d3.select("#dataCurrentThrough").text(maxDate);
  $("#componentAccordion").accordion({
    animate: 400,
    heightStyle: "content",
    collapsible: true,
    active: false,
  });
  d3.csv("data/forecast_ytdToYearEnd.csv", parseYtdForecast);
  d3.csv("data/forecast_yearStartToYearEnd.csv", parseJan1Forecast);
  d3.csv("data/blocklistDecomposition_yearStartToYearEnd.csv", parseDecompJan1);
  d3.csv("data/blocklistDecomposition_ytdToYearEnd.csv", parseDecompYtd);
});
