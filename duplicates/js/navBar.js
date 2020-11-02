
navDragger = document.getElementById('draggerContainer')
bodyElt = document.getElementById('body')

navDragger.addEventListener("mousedown",draggerMouseDown)
navDragger.addEventListener("mouseup",draggerMouseUp)

window.addEventListener("resize",adjustNavOnResize)


nav1 = document.getElementById('nav1')
nav2 = document.getElementById('nav2')


var nav1Height = nav1.offsetHeight
nav1.setAttribute("style", "top:"+(-nav1Height))


var clickPoint;
var dragFlag;
var click_y;
var nav1Start_y;
var nav2Start_y;

function draggerMouseDown(evt){
    click_y=evt.clientY;
    nav1Start_y = nav1.offsetTop
    nav2Start_y = nav2.offsetTop
    body.addEventListener('mousemove', draggerMouseMove, false);
    body.addEventListener('mouseup', draggerMouseUp, false);
    dragFlag=true;
}
function draggerMouseUp(evt){
    body.removeEventListener('mousemove', draggerMouseMove, false);
    dragFlag=false;
}


function draggerMouseMove(evt){
    if (dragFlag){
        var dragDelta = click_y-evt.clientY;
        nav1.setAttribute("style", "top:"+(nav1Start_y-dragDelta))
        nav2.setAttribute("style", "top:"+(nav2Start_y-dragDelta))
    }
}

function adjustNavOnResize(evt){
    alignEltTopToBottom(nav2,nav1);
}

function alignEltTopToBottom(fixedElt,movingElt){
    // moves the bottom of movingElt to align the top of fixedElt
    nav1Height = nav1.offsetHeight
    nav1.setAttribute("style", "top:"+(nav2.offsetTop-nav1Height))
}



//   nodeEnter.call(insertTextPills,"keyPill",function(d) { return d.name; })
var legendData = [
    {yTrans:0,groupClass:"node node_object",pillClass:"keyPill",pillText:"key pill"},
    {yTrans:30,groupClass:"node node_object",pillClass:"valPill",pillText:"value pill of type Object"},
    {yTrans:60,groupClass:"node node_number",pillClass:"valPill",pillText:"value pill of type number"},
    {yTrans:90,groupClass:"node node_string",pillClass:"valPill",pillText:"value pill of type string"},
    {yTrans:120,groupClass:"node node_array",pillClass:"valPill",pillText:"value pill of type array"},
    {yTrans:150,groupClass:"node node_boolean",pillClass:"valPill",pillText:"value pill of type boolean"},
    {yTrans:180,groupClass:"node node_null",pillClass:"valPill",pillText:"value pill of type null"}
]

var legendSvg = d3.selectAll("#legendSvg")
legendSvg.selectAll("g").data(legendData).enter()
    .append("g")
    .attr("class",function(d){return d.groupClass})
    .attr("transform",function(d){return "translate(0,"+d.yTrans+")"})
    .call(insertTextPills,function(d){return d.pillClass},function(d){return d.pillText})
