/* API: must return the selection of the added component to be acted on by d3's normal selection methods.

outlierScatter=mainPlotCanvas.addScatter(
          {data: dataIn.filter(function(d){return( d.outlier==1 ? false : true)}),
          xFnc: function(d){return timeScale(d.date)},
          yFnc: function(d){return yScale(yValueFnc(d))},
          size: 1.5,
          class: " outlierScatter")

outlierScatter.update({xFnc:function(d){return yScale(yValueFnc(d))}})

referenceLine=mainPlotCanvas.addPath(
          timeExtent,
          function(d){return timeScale(d)},
          function(d){return yScale(1)},
          "line referenceLine clippedComponentPath",
          function(d){return true;}).style("opacity",0)

referenceLine.update()


setupPlot creates a group in the targetSvg svg with:
a plot group
a clipping path
optional axis functions and positions
*/

chartDefaults={class:""}



function setupPlot(targetSvg,id,pos,dim,axes,args){
  var clipId="clipPath-"+id
  targetSvg.append("defs").append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", dim.w)
    .attr("height", dim.h);

  var mainPlot = targetSvg.append("g").attr("id",id)
    .classed("plotGroup",1).attr("transform","translate("+pos.x+","+pos.y+")")



  var mainPlotCanvas = mainPlot.append("g").attr("id",id+"-canvas").style( "clip-path", "url(#"+clipId+")")

  var canvasOverlay = mainPlot.append("rect")
      .attr("width", dim.w).attr("height", dim.h)
      .style("fill","rgba(0,0,0,0)")
      .attr("id",id+"-canvasOverlay")
      .classed("canvasOverlay",1)

  axes.forEach(function(axis){
    mainPlot.append("g").attr("class", "axis "+axis.class)
      .attr("transform","translate("+axis.pos.x+","+axis.pos.y+")").call(axis.fnc);
    })

  if (args!=undefined){
    textLabels = args.textLabels!=undefined ? args.textLabels : []

    textLabels.forEach(function(l){
        var t =mainPlot.append("g")
          .attr("transform","translate("+l.transform.x+","+l.transform.y+") rotate("+l.transform.theta+")")
          .append("text")
          .text(l.text)

        if (l.attrs!=undefined){ l.attrs.forEach(function(a){t.attr(a.k,a.v)}) }
        if (l.styles!=undefined){ l.styles.forEach(function(s){t.style(s.k,s.v)}) }
      })
  }

  return {group:mainPlot, canvas:mainPlotCanvas, overlay:canvasOverlay}
}




function chartStateAccessor(obj,prop){
  return( function(val){
      if (val!=undefined){
        obj.state[prop]=val
        return obj
      } else {return obj.state[prop]}
  })
}


function ChartPath(container,data,xFnc,yFnc,args){
  if (!args){var args={}}
  args.xFnc=xFnc
  args.yFnc=yFnc

  var lineFnc = d3.svg.line()
    .x(xFnc)
    .y(yFnc)
  if (args.definedFnc!=undefined){lineFnc.defined(args.definedFnc)}

  var newLine = container.append("path")
    .datum(data)
    .attr("d", lineFnc);
  if (args.classStr!=undefined){newLine.attr("class",args.classStr)}
  if (args.targetOpacity!=undefined){newLine.style("opacity",args.targetOpacity)}

  newLine.state=args
  newLine.state.lineFnc=lineFnc
  newLine.state.targetOpacity = args.targetOpacity!=undefined ? args.targetOpacity : 1


  //this sets up ACCESSOR FNCs like:
  // obj.xFnc() -> get xFnc
  // obj.xFnc(foo) -> set xFnc to foo
  // so to CALL xFnc on 'ba', you need obj.xFnc()('ba')
  var accessible=["xFnc","yFnc","definedFnc","targetOpacity"]
  for (var prop in accessible){
    newLine[accessible[prop]] = chartStateAccessor(newLine,accessible[prop])
  }
  
  newLine.trans = function(){updateChartPath(this)}
  newLine.updateData = function(newData){updateChartPathData(this,newData)}
  newLine.displayExtent = function(){return getDisplayPathExtents(this)}
  return newLine
}

function getDisplayPathExtents(target){
  return d3.extent(
    target.datum()
    .filter(target.state.definedFnc!=undefined ? target.state.definedFnc : function(){return 1})
    .map(target.state.xFnc)
    )
}
function updateChartPath(target){
  target.transition()
    .duration(1200)
    .ease("sin-in-out")
    .attr("d", target.state.lineFnc)
    .style("opacity",target.state.targetOpacity)
  return(target)
}
function updateChartPathData(target,newData){
  target.datum(newData)
    .transition()
    .duration(1200)
    .ease("sin-in-out")
    .attr("d", target.state.lineFnc)
    .style("opacity",target.state.targetOpacity)
  return(target)
}


function hoverPointForPath(container,chartPath,args){
  // console.log(chartPath)
  var newPoint = container.append("circle")
      .attr("r", args.r!=undefined ? args.r : 1)
      .attr("transform", "translate(0,0)")
      .style("opacity", args.targetOpacity!=undefined ? args.targetOpacity : 1);

  newPoint.hoveredDatum = null
  newPoint.path = chartPath

  if (args.idStr!=undefined){newPoint.attr("id",args.idStr)}
  if (args.classStr!=undefined){newPoint.attr("class",args.classStr)}

  newPoint.redrawFncs = args.redrawFncs!=undefined  ? args.redrawFncs : [] //an array of functions to be called on redraw
  newPoint.nearFnc = args.nearFnc!=undefined ? args.nearFnc : newPoint.path.xFnc()
  newPoint.outOfBoundsFnc = args.outOfBoundsFnc!=undefined ? args.outOfBoundsFnc : function(d){return isNaN(newPoint.path.yFnc()(d))}

  newPoint.redraw = function(d){
    if (newPoint.outOfBoundsFnc(d)) {
      newPoint.style("opacity",0)
    } else {
      newPoint.style("opacity",newPoint.path.state.targetOpacity).attr("transform", "translate("+newPoint.path.xFnc()(d)+","+newPoint.path.yFnc()(d)+")")
    }


    return newPoint
  }
  newPoint.moveToClosest = function(x0){
    if (newPoint.path.displayExtent()[0]<=x0 & x0<=newPoint.path.displayExtent()[1]) {
    var d=getNearestDatum(newPoint.path.datum(),newPoint.nearFnc,x0)
    newPoint.hoveredDatum = d
    newPoint.redraw(d)
    } else{
      d = null
      newPoint.hoveredDatum = null
      newPoint.style("opacity",0)
    }
    if (newPoint.redrawFncs.length>0) {
      newPoint.redrawFncs.forEach(function(f){f(d)})
    }
    return newPoint
  }

  return newPoint
}












function ChartScatter(container,data,xFnc,yFnc,args){
  if (args){var state=args} else {var state={}}
  if (args.classStr){state.classStr=args.classStr} else {state.classStr=""}

  state.xFnc=xFnc
  state.yFnc=yFnc
  state.sizeFnc = args.sizeFnc!=undefined ? args.sizeFnc : 1
  state.targetOpacity = args.targetOpacity!=undefined ? args.targetOpacity : 1

  var newScatter = container.append("g").attr("class", "scatter "+state.classStr)
    .selectAll("circle")
    .data(data).enter()
    .append("circle")
    .attr("class", "scatterPoint")
    .attr("r", state.sizeFnc)
    .attr("cx", xFnc)
    .attr("cy", yFnc)
  if (args.targetOpacity){newScatter.style("opacity",args.targetOpacity)}

  newScatter.state=state

  accessible=["xFnc","yFnc","sizeFnc","targetOpacity"]
  for (var prop in accessible){
    newScatter[accessible[prop]] = chartStateAccessor(newScatter,accessible[prop])
  }
  
  newScatter.trans = function(){updateChartScatter(this)}
  return newScatter
}

function updateChartScatter(target){
  target.transition()
    .duration(1200)
    .ease("sin-in-out")
    .attr("r", target.state.sizeFnc)
    .attr("cx", target.state.xFnc)
    .attr("cy", target.state.yFnc)
    .style("opacity",target.state.targetOpacity)
  return(target)
}










function ChartArea(container,data,xFnc,yFncHigh,yFncLow,args){
  if (!args){var args={}}
  args.xFnc=xFnc
  args.yFncHigh=yFncHigh
  args.yFncLow=yFncLow

  var areaFnc = d3.svg.area()
    .x(xFnc)
    .y0(yFncHigh)
    .y1(yFncLow)

  var newArea = container.append("path")
    .datum(data)
    .attr("d", areaFnc);
    
  if (args.classStr!=undefined){newArea.attr("class",args.classStr)}
  if (args.targetOpacity!=undefined){newArea.style("opacity",args.targetOpacity)}

  newArea.state=args
  newArea.state.areaFnc=areaFnc
  newArea.state.targetOpacity = args.targetOpacity!=undefined ? args.targetOpacity : 1

  var accessible=["xFnc","yFncHigh","yFncLow","targetOpacity"]
  for (var prop in accessible){
    newArea[accessible[prop]] = chartStateAccessor(newArea,accessible[prop])
  }
  
  newArea.trans = function(){updateChartArea(this)}
  return newArea
}


function updateChartArea(target){
  target.transition()
    .duration(1200)
    .ease("sin-in-out")
    .attr("d", target.state.areaFnc)
    .style("opacity",target.state.targetOpacity)
  return(target)
}


// *****************************************************
// *******   Utilities   *******************************
// *****************************************************
// *****************************************************


function padExtent(ex,p){
  delta=ex[1]-ex[0]
  return [ex[0]-delta*p,ex[1]+delta*p]
}

function getNearestDatum(data,accFnc,x){
  var bestDist = Infinity
  var dOut = null
  var thisDist = Infinity
  for (var i = 0; i < data.length; i++){
    thisDist = Math.abs(accFnc(data[i])-x)
    if (thisDist<bestDist){
      bestDist=thisDist
      dOut=data[i]
    }
  }
  return dOut
}

function dateLt(a,b){
  return a-b<0
}
function dateLteq(a,b){
  return a-b<0
}
function dateInRange(a,range){
  return dateLteq(range[0],a) & dateLteq(a,range[1])
}