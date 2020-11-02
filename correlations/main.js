var centralProp = 0.01;
var indices = nb.cartesianProduct(
  _.range(numericCols.length),
  _.range(numericCols.length)
);

let xColInit = "Hours app open (28 day mean)";
let yColInit = "Games played (total)";
let scatterAlpha = 0.2;
let scatterPointSize = 0.5;

// standard d3 plot setup
let margin = { top: 250, right: 80, bottom: 25, left: 260 };
let width = 800 - margin.left - margin.right;
let height = 1100 - margin.top - margin.bottom;
let domain = d3.set(numericCols).values();
let colorScale = d3
  .scaleLinear() // our color scale fom red to white to blue
  .domain([-1, 0, 1])
  .range(["#B22222", "#fff", "#000080"]);

// set-up x and y scale
let x = d3.scaleOrdinal().range([0, width]).domain(domain);
let y = d3.scaleOrdinal().range([0, height]).domain(domain);

let svgElt = d3
  .select("#heavyUserPlot")
  .html("") //clear the canvas
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

let corrMatGroup = svgElt
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

let squareEdge = 20; //the length of an edge of a cell in the corr matrix
let corrMatrixEdge = squareEdge * (1 + Object.keys(rankCorrMat).length); //the length of an edge of the whole corr matrix

let fontSize = 13.5;

corrMatGroup
  .selectAll("rect.correlation")
  .data(indices)
  .enter()
  .append("rect")
  .attr("class", "correlation")
  .attr("width", squareEdge - 1)
  .attr("height", squareEdge - 1)
  .attr("x", (ij) => ij[1] * squareEdge - squareEdge / 2)
  .attr("y", (ij) => ij[0] * squareEdge - squareEdge / 2)
  // .style("fill", (ij) => colorScale(rankCorrMat[ij[0]][ij[1]]))
  .style("fill", (ij) =>
    colorScale(rankCorrMat[numericCols[ij[0]]][numericCols[ij[1]]])
  )
  .on("mouseover", mouseoverHighlight)
  .on("mouseout", mouseoutUnhighlight)
  .on("click", (ij) =>
    mousedownShowDetails(numericCols[ij[0]], numericCols[ij[1]])
  );

corrMatGroup
  .append("g")
  .attr("class", "rowLabels")
  .selectAll("text")
  .data(numericCols)
  .enter()
  .append("text")
  .attr("x", -squareEdge)
  .attr("y", (d, i) => i * squareEdge)
  .attr("dy", ".32em")
  .attr("text-anchor", "end")
  .attr("font-size", fontSize)
  .text((d) => d);

corrMatGroup
  .append("g")
  .attr("class", "rowLabels")
  .attr("transform", "rotate(-90)")
  .selectAll("text")
  .data(numericCols)
  .enter()
  .append("text")
  .attr("x", +squareEdge)
  .attr("y", (d, i) => i * squareEdge)
  .attr("dy", ".32em")
  .attr("font-size", fontSize)
  .text((d) => d);

let corrDetailFontSize = 13;
correlationDetailText1 = corrMatGroup
  .append("text")
  .attr("x", -squareEdge / 2)
  .attr("y", corrMatrixEdge - 60)
  .attr("font-size", corrDetailFontSize);
correlationDetailText2 = corrMatGroup
  .append("text")
  .attr("x", -squareEdge / 2)
  .attr("y", corrMatrixEdge - 60 + corrDetailFontSize)
  .attr("font-size", corrDetailFontSize);

function mouseoverHighlight(d, i) {
  // d is [i,j],
  var [i, j] = [d[0], d[1]];
  d3.select(this).attr("stroke", "red").attr("stroke-width", "3px");
  correlationDetailText1.text(`${numericCols[i]} vs ${numericCols[j]}`);
  correlationDetailText2.text(
    `Rank Correlation: ${nb.prettyFormatNumber(
      rankCorrMat[numericCols[i]][numericCols[j]],
      4
    )}`
  );
}

function mouseoutUnhighlight(d, i) {
  // d is [i,j],
  var [i, j] = [d[0], d[1]];
  d3.select(this).attr("stroke", "none");
}

function addCanvasPlotToSvg(svgElt, xPos, yPos, width, height, axisTextOffset) {
  console.log("xPos, yPos", xPos, yPos);
  let canvasGroup = svgElt
    .append("g")
    .attr("transform", `translate(${xPos},${yPos})`);
  // add foreign object to svg-- https://gist.github.com/mbostock/1424037
  let foreignObject = canvasGroup
    .append("foreignObject")
    .attr("width", width)
    .attr("height", height);
  // add embedded body to foreign object
  let foBody = foreignObject
    .append("xhtml:body")
    .style("margin", "0px")
    .style("padding", "0px")
    .style("background-color", "none")
    .style("width", width + "px")
    .style("height", height + "px");
  // add embedded canvas to embedded body
  let canvas = foBody
    .append("canvas")
    .attr("width", width)
    .attr("height", height);
  return {
    canvas: canvas,
    ctx: canvas.node().getContext("2d"),
    xAxisGroup: canvasGroup
      .append("g")
      .attr("transform", "translate(0," + (height + 5) + ")"),
    yAxisGroup: canvasGroup.append("g").attr("transform", "translate(-5,0)"),
    xText: canvasGroup
      .append("text")
      .attr("transform", `translate(${width / 2},${height + axisTextOffset})`)
      .style("text-anchor", "middle"),
    yText: canvasGroup
      .append("text")
      .attr(
        "transform",
        `translate(${-axisTextOffset},${height / 2})rotate(-90)`
      )
      .style("text-anchor", "middle"),
    title: canvasGroup
      .append("text")
      .attr("transform", `translate(${width / 2},${-20})`)
      .style("text-anchor", "middle"),
  };
}

var twoPi = Math.PI * 2;
let axisTextOffset = 45;

let canvasDimRank = { width: 250, height: 250 };
let canvasPosRank = { x: 500, y: margin.top + corrMatrixEdge + 50 };
let rankPlot = addCanvasPlotToSvg(
  svgElt,
  canvasPosRank.x,
  canvasPosRank.y,
  canvasDimRank.width,
  canvasDimRank.height,
  axisTextOffset
);

let canvasPosRaw = { x: 100, y: margin.top + corrMatrixEdge + 50 };

let rawPlot = addCanvasPlotToSvg(
  svgElt,
  canvasPosRaw.x,
  canvasPosRaw.y,
  canvasDimRank.width,
  canvasDimRank.height,
  axisTextOffset
);

let detailPlotTitles = svgElt.append("g").attr(
  "transform",
  `translate(${(canvasPosRank.x + canvasPosRaw.x + canvasDimRank.width) / 2},
            ${margin.top + corrMatrixEdge - 10})`
);

function mousedownShowDetails(xCol, yCol) {
  detailPlotTitles.html("");
  detailPlotTitles
    .append("text")
    .style("text-anchor", "middle")
    .text(`${xCol} vs. ${yCol}`);
  console.log("xCol, yCol", xCol, yCol);
  let thisRankCorr = nb.prettyFormatNumber(
    // rankCorrMat[numericCols.indexOf(xCol)][numericCols.indexOf(yCol)],
    rankCorrMat[xCol][yCol],
    4
  );

  detailPlotTitles
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", 20)
    .text(`(rank correlation: ${thisRankCorr})`);

  rankPlot.title.text(`Percentiles`);
  rankPlot.xText.text(`Percentile of ${xCol}`);
  rankPlot.yText.text(`Percentile of ${yCol}`);
  rawPlot.title.text(`Raw values (central ${(1 - centralProp) * 100}%)`);
  rawPlot.xText.text(`${xCol}`);
  rawPlot.yText.text(`${yCol}`);
  let [xMin, xMax] = d3.extent(rankColDf[xCol]);
  let [yMin, yMax] = d3.extent(rankColDf[yCol]);
  let xScaleRank = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, canvasDimRank.width]);
  let yScaleRank = d3
    .scaleLinear()
    .domain([0, 1])
    .range([canvasDimRank.height, 0]);
  rankPlot.xAxisGroup.call(d3.axisBottom(xScaleRank).ticks(4));
  rankPlot.yAxisGroup.call(d3.axisLeft(yScaleRank).ticks(4));

  let xScaleRaw = d3
    .scaleLinear()
    .domain(centralExtents[xCol])
    .range([0, canvasDimRank.width]);
  let yScaleRaw = d3
    .scaleLinear()
    .domain(centralExtents[yCol])
    .range([canvasDimRank.height, 0]);
  rawPlot.xAxisGroup.call(d3.axisBottom(xScaleRaw).ticks(5, "s"));
  rawPlot.yAxisGroup.call(d3.axisLeft(yScaleRaw).ticks(5, "s"));
  // update canvas
  // clear canvas
  rankPlot.ctx.clearRect(0, 0, canvasDimRank.width, canvasDimRank.height);
  rawPlot.ctx.clearRect(0, 0, canvasDimRank.width, canvasDimRank.height);
  // set opacity for data elements
  rankPlot.ctx.globalAlpha = scatterAlpha;
  rawPlot.ctx.globalAlpha = scatterAlpha;

  rankColDf[xCol].forEach(function (xRank, i) {
    let yRank = rankColDf[yCol][i];
    if (xRank && yRank) {
      rankPlot.ctx.beginPath();
      rankPlot.ctx.arc(
        xScaleRank(xRank / xMax),
        yScaleRank(yRank / yMax),
        scatterPointSize,
        0,
        twoPi,
        true
      );
      rankPlot.ctx.fillStyle = "#000";
      rankPlot.ctx.closePath();
      rankPlot.ctx.fill();
    }

    let x = dfCols[xCol][i];
    let y = dfCols[yCol][i];
    if (x && y) {
      rawPlot.ctx.beginPath();
      rawPlot.ctx.arc(
        xScaleRaw(x),
        yScaleRaw(y),
        scatterPointSize,
        0,
        twoPi,
        true
      );
      rawPlot.ctx.fillStyle = "#000";
      rawPlot.ctx.closePath();
      rawPlot.ctx.fill();
    }
  });
}
mousedownShowDetails(xColInit, yColInit);
