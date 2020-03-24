//                                      __
//     ____ ___  ___  ____ ___  ____   / /__   __
//    / __ `__ \/ _ \/ __ `__ \/ __ \ / __/ | / /
//   / / / / / /  __/ / / / / / /_/ // /_ | |/ /
//  /_/ /_/ /_/\___/_/ /_/ /_/\____(_)__/ |___/
//
//
//  Created by Memo Akten, www.memo.tv
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.


// PRESETS
var preset1 = {
  r0 : 1, // how many people get infected 
  maxLevels : 16, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 2,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.5,
};

var preset2 = {
  r0 : 2, // how many people get infected 
  maxLevels : 10, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 3,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.5,
};

var preset3 = {
  r0 : 3, // how many people get infected 
  maxLevels : 7, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 2,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.5,
};

var preset4 = {
  r0 : 4, // how many people get infected 
  maxLevels : 6, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 2,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.25,
};

var preset5 = {
  r0 : 5, // how many people get infected 
  maxLevels : 6, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 2,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.07,
};

var preset6 = {
  r0 : 6, // how many people get infected 
  maxLevels : 5, // maximum number of levels
  nodeRadiusStart : 10, // radius of each node
  nodeRadiusEnd : 2,
  criticalRadiusMult : 1.25, // how much bigger critical nodes are
  strokeWidthStart : 1,
  strokeWidthEnd : 0.15,
};


var preset = preset2;

//------------------------------------------------------------------------------

// other parameters
var criticalPerc = 0.2; // what percentage of infections are critical
var levelSpeed = 250; // time delay (in ms) between adding new levels at startup
var criticalColor; // display color for critical infections (eg red)
var nonCriticalColor; // display color for non critical infections (eg black)
var stayHomeColor; // display color for those who stay home (eg blue)
var nonactiveAlpha = 0.1; // alpha for non-active (i.e. non-infected or 'prevented')
var alphaFadeSpeed = 1; // fade speed for alpha (1 to disable fade animations)
var statsSmoothSpeed = 0.1; // smoothing speed for stats changing

// coordinates for legend & stats
// TODO: this is a nasty hack, might be different on different systems
var posBranchFactor = [192, 25];
var posStayHomes = [192, 95];
var posInfectedCriticalLegend = [155, 61];
var posInfectedTotalLegend = [155, 78];
var posStayHomesLegend = [155, 95];


//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
// A single node
class Node {
  constructor(pos, parent) {
    this.pos = pos; // position on screen (assuming 0,0 to be screen center)
    this.parent = parent; // parent node
    this.level = parent ? parent.level + 1 : 0; // depth level in hierarchy (0 is root)
    this.children = []; // list of children nodes
    this.critical = random() < criticalPerc; // whether node is critical or not
    this.active = true; // whether node is active (i.e. infected) or not
    this.alpha = 0; // display alpha (between 0 and 1)
    this.stayHome = false; // whether node stayed home or not

    if (parent) parent.children.push(this); // add to parent's children
  }

  // set the active state of this node and all of its children
  setActive(b) {
    this.active = b;
    for (let ci = 0; ci < this.children.length; ci++) {
      this.children[ci].setActive(b);
    }
  }
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
// Expanding circle animation (used for hilighting things in the legend etc)
class AnimCircle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.alpha = 0;
    
    this.fadeSpeed = 0.15;
    this.startRadius = 50;
  }

  start(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;//this.startRadius;
    this.alpha = 255;
  }

  draw() {
    if(this.alpha > 10) {
      push();
      noFill();
      strokeWeight(5);
      stroke(0, this.alpha);
      circle(this.x, this.y, this.radius);
      this.radius += (1 + 1 * this.fadeSpeed);
      this.alpha *= (1 - this.fadeSpeed);    
      pop();
    }
  }
}


//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
// variables
var nodes; // flat list of all Nodes
var root; // tree of Nodes
var curLevel; // current level (depth in heirarchy) we're creating
var levelRadius; // radius per level
var startTimestamp; // timestamp at which app was started
var imgLogo; // logo image

// stats
var numTotalActive;
var numTotalInactive;
var numCriticalActive;
var numCriticalInactive;
var numStayHomes;

// circle animations
var mouseAnimCircle = new AnimCircle();
var statsAnimCircle = new AnimCircle(); // for stats / legend


//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
// create a node at desired position as child of parent (can be null for root)
function createNode(pos, parent) {
  let node = new Node(pos, parent); // create node
  nodes.push(node); // add to (flat) nodes array
  return node; // return node
}


//------------------------------------------------------------------------------
// create a new level (add children to all nodes without children)
function createNewLevel() {
  // iterate all nodes to find leaves (i.e. childless nodes)
  let leaves = []
  for (let ni = 0; ni < nodes.length; ni++) {
    let node = nodes[ni];
    if (node.children.length == 0) leaves.push(node);
  }

  // iterate all leaves to create children
  for (let li = 0; li < leaves.length; li++) {
    let leafNode = leaves[li]; // this will be parent for the new child nodes
    level = leafNode.level + 1; // this will be the level for the new nodes
    let ang = atan2(leafNode.pos.y, leafNode.pos.x); // angle from centre to parent node
    let angInc = TWO_PI / pow(preset.r0, level); // angle between children
    // ang -= angInc * preset.r0 * 0.5;
    for (let ci = 0; ci < preset.r0; ci++) {
      // calculate position for new child node
      pos = createVector(levelRadius * level, 0);
      pos.rotate(ang);
      createNode(pos, leafNode);
      ang += angInc;
    }
  }
}


//------------------------------------------------------------------------------
// Reset everything
function reset() {
  console.log('reset');
  nodes = []; // clear all nodes
  root = createNode(createVector(0, 0), null); // create root node
  curLevel = 0; // reset levels to 0
  levelRadius = width/2 * 0.8 / preset.maxLevels; // calculate radius per level

  // reset stats
  numTotalActive = 0;
  numTotalInactive = 0;
  numCriticalActive = 0;
  numCriticalInactive = 0;
  numStayHomes = 0;

  // hilight branching factor
  statsAnimCircle.start(posBranchFactor[0], posBranchFactor[1]);
  
  // reset timer
  startTimestamp = millis();
}


//------------------------------------------------------------------------------
function preload() {
  imgLogo = loadImage('assets/MSA_HEAD_WHITECIRCLE_STROKE_85.png');
}


//------------------------------------------------------------------------------
function setup() {
  createCanvas(800, 800, P2D );
  criticalColor = color(255, 0, 0);
  nonCriticalColor = color(0, 0, 0);
  stayHomeColor = color(0, 100, 255);
  reset();
}


//------------------------------------------------------------------------------
// interpolate value to target with speed
function smoothValue(value, target, speed) {
  return abs(value - target) > 1 ? lerp(value, target, speed) : target;
}


//------------------------------------------------------------------------------
// Update nodes and calculate stats
function updateNodes() {
  // temp stats which will act as targets to smooth the main ones towards
  let numTotalActiveT = 0;
  let numTotalInactiveT = 0;
  let numCriticalActiveT = 0;
  let numCriticalInactiveT = 0;
  let numStayHomesT = 0;

  // iterate all nodes
  for (let ni = 0; ni < nodes.length; ni++) {
    let node = nodes[ni];

    if(node.stayHome) numStayHomesT++;
    if(node.active) numTotalActiveT ++; else numTotalInactiveT++;
    if(node.critical) 
      if(node.active) numCriticalActiveT ++; else numCriticalInactiveT++;
    
    // update node alpha if fading in or out
    nodeTargetAlpha = node.active ? 1 : nonactiveAlpha;
    node.alpha += (nodeTargetAlpha - node.alpha) * alphaFadeSpeed;
  }
  
  // smooth stats
  numTotalActive = smoothValue(numTotalActive, numTotalActiveT, statsSmoothSpeed);
  numTotalInactive = smoothValue(numTotalInactive, numTotalInactiveT, statsSmoothSpeed);
  numCriticalActive = smoothValue(numCriticalActive, numCriticalActiveT, statsSmoothSpeed);
  numCriticalInactive = smoothValue(numCriticalInactive, numCriticalInactiveT, statsSmoothSpeed);
  numStayHomes = smoothValue(numStayHomes, numStayHomesT, numStayHomesT);
}


//------------------------------------------------------------------------------
// draw all node connections
function drawConnections() {
  noFill();
  for (let ni = 0; ni < nodes.length; ni++) { // iterate all nodes
    let node = nodes[ni]; // current node we're drawing
    if (node.parent) { // if node has a parent
      // set line thickness based on how deep in the heirarchy node is 
      strokeWeight(map(node.level, 0, preset.maxLevels, preset.strokeWidthStart, preset.strokeWidthEnd))
      stroke(0, node.alpha * 255); // set stroke color to black with alpha
      line(node.pos.x, node.pos.y, node.parent.pos.x, node.parent.pos.y); // draw line
    }
  }
}


//------------------------------------------------------------------------------
// draw all nodes
function drawNodes() {
  for (let ni = 0; ni < nodes.length; ni++) { // iterate all node
    let node = nodes[ni]; // current node we're drawing

    // calculate radius sfor node based on how deep in heirarchy node is
    let r = map(node.level, 0, preset.maxLevels, preset.nodeRadiusStart, preset.nodeRadiusEnd);
    
    noStroke();
    if (node.critical) {
      criticalColor.setAlpha(node.alpha * 255);
      fill(criticalColor);
      let rt = r * preset.criticalRadiusMult; // make slightly bigger so critical is more visible
      square(node.pos.x - rt / 2, node.pos.y - rt / 2, rt); // draw square
    } else {
      nonCriticalColor.setAlpha(node.alpha * 255);
      fill(nonCriticalColor);
      circle(node.pos.x, node.pos.y, r); // draw circle
    }

    if(node.stayHome) {
      noFill();
      strokeWeight(3);
      stroke(stayHomeColor);
      r *= preset.criticalRadiusMult; // make slightly bigger so staying home is more visible
      circle(node.pos.x, node.pos.y, r); // draw circle
    }
  }
  // restore alpha to full 
  criticalColor.setAlpha(255); 
  nonCriticalColor.setAlpha(255); 
}


//------------------------------------------------------------------------------
function draw() {
  background(255);

  // timer to keep track of growing tree
  let time = millis() - startTimestamp;
  
  // grow tree is not enough levels and time has come to create new level
  let newLevel = int(floor(time / levelSpeed))
  if (newLevel <= preset.maxLevels && newLevel > curLevel) {
    curLevel = newLevel;
    console.log("new level:", curLevel);
    createNewLevel();
  }

  // update all nods and calculate stats
  updateNodes();

  // DRAW 
  push();
  translate(width / 2, height / 2); //  make (0, 0) at center of screen
  drawConnections(); // draw all node connections
  drawNodes(); // draw all nodes
  pop();


  // update stats text
  let msg = ''
  msg += 'branch factor (r0) : ' + str(preset.r0) + ' (keys 1-6 to change)\n';
  msg += 'total infected     : ' + str(round(numTotalActive)) + ', (' + str(round(numTotalInactive)) + ' prevented) \n';
  msg += 'hospitalized       : ' + str(round(numCriticalActive)) + ', (' + str(round(numCriticalInactive)) + ' prevented) \n';
  msg += 'non-critical       : ' + str(round(numTotalActive - numCriticalActive)) + ', (' + str(round(numTotalInactive - numCriticalInactive)) + ' prevented) \n';
  msg += 'stayed home        : ' + str(numStayHomes) + '\n';

  // draw text
  noStroke();
  fill(0);
  strokeWeight(0.5);
  textFont('monospace', 14);
  textAlign(LEFT);
  text(msg, 10, 30);

  // draw mouse tooltip
  if(dist(mouseX, mouseY, width/2, height/2) <= preset.maxLevels * levelRadius) {
    fill(255)
    noStroke();
    rect(mouseX + 10, mouseY-10, 80, 12); // draw white background rect
    noStroke();
    fill(stayHomeColor)
    textAlign(LEFT);
    text('STAY HOME!', mouseX + 10, mouseY); // draw text
  }

  // draw legend
  noStroke();
  fill(nonCriticalColor);
  circle(posInfectedTotalLegend[0], posInfectedTotalLegend[1], preset.nodeRadiusStart);
  
  fill(criticalColor);
  square(posInfectedCriticalLegend[0]-preset.nodeRadiusStart/2, posInfectedCriticalLegend[1]-preset.nodeRadiusStart/2, preset.nodeRadiusStart);

  noFill();
  stroke(stayHomeColor)
  strokeWeight(3);
  circle(posStayHomesLegend[0], posStayHomesLegend[1], preset.nodeRadiusStart);

  // draw anim circles
  statsAnimCircle.draw();
  mouseAnimCircle.draw();

  // draw logo
  image(imgLogo, width-imgLogo.width, 0);
  push();
  noStroke();
  fill(0);
  textFont('monospace', 18);
  textAlign(CENTER);
  text('memo.tv', width-imgLogo.width/2, imgLogo.height + 10)
  pop();
}


//------------------------------------------------------------------------------
// check for keypress
function keyPressed() {
  switch(key) {
    case 'r': reset(); break;
    case '1': preset = preset1; reset(); break;
    case '2': preset = preset2; reset(); break;
    case '3': preset = preset3; reset(); break;
    case '4': preset = preset4; reset(); break;
    case '5': preset = preset5; reset(); break;
    case '6': preset = preset6; reset(); break;  
    default:
  }
}


//------------------------------------------------------------------------------
// turn nodes on or off
var stayHomeMode; // whether we are making nodes stay home, or come out of staying home

function toggleNodes(clicked) {
  console.log(mouseX, mouseY);
  let mouseVec = createVector(mouseX - width / 2, mouseY - height / 2);

    // find which Node was clicked on by iterating through them all
  for (let ni = 0; ni < nodes.length; ni++) {
    let node = nodes[ni];
    let vec = p5.Vector.sub(mouseVec, node.pos); // vector from mouse to node
    let norm2 = p5.Vector.dot(vec, vec); // dot vector with itself to get norm squared
    if (norm2 < preset.nodeRadiusStart * preset.nodeRadiusStart) { // if dist squared is less than square of radius, i.e. collision
      if(clicked) stayHomeMode = !node.active; // if mouse click, set mode to toggle
      node.stayHome = !stayHomeMode;
      node.setActive(stayHomeMode);
      statsAnimCircle.start(posStayHomes[0], posStayHomes[1]);
      return; // don't bother going through rest of nodes is collision is found
    }
  }
}


//------------------------------------------------------------------------------
// check mouse press
function mousePressed() {
  if(mouseX > width - imgLogo.width && mouseY < imgLogo.height) {
    window.open("http://www.memo.tv");
    return;
  }
  toggleNodes(true);
  mouseAnimCircle.start(mouseX, mouseY);
}


//------------------------------------------------------------------------------
// check mouse drag
function mouseDragged() {
  toggleNodes(false);
}
