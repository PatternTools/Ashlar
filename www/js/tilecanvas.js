
var ashlarToPaper = function (pt) {
    return new Point(pt.x, pt.y);
};

var ptile; //stores reference to shared prototile

var setPrototile = function (prototile) {
    ptile = prototile;
    ptile.scale = 50;
    setCurrentPathLabel(prototile.getFreeEdges()[0].name);    
    retile();
    updateModelTile();
    lineEdit();
};

this.setPrototile = setPrototile;

var rescale = function (val) {
    ptile.scale = val;
    retile();
};

this.rescale = rescale;

var lineWidth = 1;
var lineColor = 'black';

var setStroke = function (w, c) {
    lineColor = c || 'black';
    lineWidth = w;
    retile();
};

this.setStroke = setStroke;

var rotationValue = 0;
var rotationBy = function (v) {
    rotationValue = v;
    retile();
};

this.rotationBy = rotationBy;

var unit;

var copyArray = function (a) {
    return a.map(function (x) {return x;});
};

var tilecanvas = new Project("tilecanvas");

this.tilecanvas = tilecanvas;

var editor = new Project("editor");

var modeltile = new Project("modeltile");

var modeltilecenter = new Point(50,50);



var currentPoints = [new Point(10,90), new Point(170, 90)];
var interval = 1;

var updateInterval = function (pt) {
    if (pt.x <= currentPoints[1].x) {
	interval = 1;
    } else if (pt.x >= currentPoints[currentPoints.length - 2].x) {
	interval = currentPoints.length - 1;
    } else {
	var i = 0;
	while (i < (currentPoints.length - 2)) {
	    if (pt.x >= currentPoints[i].x && pt.x < currentPoints[i+1].x) {
		interval = (i + 1);
		i = currentPoints.length;
	    }
	    i += 1;
	}
    }
};

var insert = function (a,i,v) {
    var head = a.map(function (x) {return x;});
    var tail = head.splice(i);
    head.push(v);
    return head.concat(tail);
};

var freehandMode = false;

this.toggleFreehand = function () {
    freehandMode = !freehandMode;
    console.log("freehandMode = " + freehandMode);
};

function onMouseDown (event) {
    if (event.item && event.item.edgePoint) {
	currentPoints.splice(event.item.edgePoint.index, 1);
    } else if (event.event.target.id === 'editor') {
	updateInterval(event.point);
	lineEdit(event.point);
	updateModelTile(event.point.clone());
    }
}

function onMouseDrag (event) {
    if (event.event.target.id === 'editor') {
	if (freehandMode && Math.abs(event.delta.x) >= 2) {
	    updateCurrentPoints(event.point);
	} else {
	    updateInterval(event.point);
	    lineEdit(event.point);
	    updateModelTile(event.point.clone());
	}
    }
}

function onMouseUp (e) {
    if (e.event.target.id === 'editor') {
	updateInterval(e.point);
//	currentPoints = insert(currentPoints, interval, e.point.clone());
	updateCurrentPoints(e.point.clone());
	pathToEdgePath();
	updateModelTile();
	retile();
    }
}

var updateCurrentPoints = function (point) {
    var edgeType = ptile.getEdgeType(currentPathLabel);
    if (edgeType === 'J') {
	if (freehandMode) {
	    currentPoints.push(point);
	    currentPoints.sort(function (a,b) {return a.x - b.x;});
	} else {
	    currentPoints = insert(currentPoints, interval, point.clone());
	}
    } else if (edgeType === 'S') {
	var mid = new Point(90,90);
	currentPoints.push(mid);
	currentPoints.push(point);
	currentPoints.sort(function (a,b) {return a.x - b.x;});
	var midIndex = Math.floor(currentPoints.length / 2);
	var firstHalf = currentPoints.slice(0,midIndex);
	var secondHalf = firstHalf.reverse().map(function (pt) {
	    return new Point(180 - pt.x, 180 - pt.y);
	});
	firstHalf.push(mid);
	currentPoints = firstHalf.concat(secondHalf).sort(function (a,b) {
	    return a.x - b.x;
	});									  
    } else if (edgeType === 'U') {
	var mid = new Point(90,90);
	currentPoints.push(mid);
	currentPoints.push(point);
	currentPoints.sort(function (a,b) {return a.x - b.x;});
	var midIndex = Math.floor(currentPoints.length / 2);
	var firstHalf = currentPoints.slice(0, midIndex);
	var secondHalf = firstHalf.reverse().map(function (pt) {
	    return new Point(180 - pt.x, pt.y);
	});
	firstHalf.push(mid);
	currentPoints = firstHalf.concat(secondHalf).sort(function (a, b) {
	    return a.x - b.x;
	});
    }

};

var resetPrototileEdgePaths = function () {
    currentPoints = [new Point(10,90), new Point(170, 90)];
    pathToEdgePath();
    updateModelTile();
    lineEdit();
    retile();
};

this.resetEditor = resetPrototileEdgePaths;

var currentPathLabel = 'a';

var setCurrentPathLabel = function (v) {
    currentPathLabel = v;
    var trans = new Point(10,90);
    currentPoints = ptile.edgePaths[currentPathLabel].map(function (pt) {
	return (ashlarToPaper(pt) * 160) + trans;
    });
    updateModelTile();
    lineEdit();
    retile();
};

this.setCurrentPathLabel = setCurrentPathLabel;

var pathToEdgePath = function () {
    var first = currentPoints[0];
    var last = currentPoints[currentPoints.length - 1];
    var scale = last.x - first.x;
    ptile.edgePaths[currentPathLabel] =  currentPoints.map(function (pt) {
	return Ashlar.Point( (pt - first) / scale );
    });
};

var updateModelTile = function (point) {
    if (!ptile) return false;
    var edgeType = ptile.getEdgeType(currentPathLabel);

    var check = point && ((point.x < 90 && (edgeType === 'S' || edgeType === 'U')) || edgeType === 'J');
    
    modeltile.activate();
    modeltile.activeLayer.removeChildren(); 
    if (check)  {
	var currentEdgePath = copyArray(ptile.edgePaths[currentPathLabel]);
	var backupCurrentPoints = copyArray(currentPoints);
	currentPoints.push(point);
	if (edgeType === 'S' || edgeType === 'U') {
	    currentPoints.push(new Point(90,90));
	    currentPoints = currentPoints.sort(function (a,b) {return a.x - b.x;});
	    var midIndex = Math.floor(currentPoints.length / 2);
	    var firstHalf = currentPoints.slice(0,midIndex);
	    if (edgeType === 'S') {
		var secondHalf = firstHalf.reverse().map(function (pt) {
		    return new Point(180 - pt.x, 180 - pt.y);
		});
	    } else if (edgeType === 'U') {
		var secondHalf = firstHalf.reverse().map(function (pt) {
		    return new Point(180 - pt.x, pt.y);
		});
	    }
	    currentPoints = firstHalf.concat(secondHalf);
	    currentPoints.push(new Point(90,90));
	}
	currentPoints = currentPoints.sort(function (a,b) {return a.x - b.x;});
	pathToEdgePath();
    } 
    
    unit = ptile.translationalUnit();
   
    var points = unit.shapes[0].path.map(ashlarToPaper);

    var startStop = ptile.getPathLimitsForEdge(currentPathLabel);
    var p = new Group();
    for (var i = 1; i < points.length; i += 1) {
	var p0 = new Path(points[i-1], points[i]);
	if (i > startStop.start && i < startStop.stop) {
	    p0.strokeColor = 'red';
	    p0.strokeWidth = 3;
	} else {
	    p0.strokeColor = 'black';
	}
	p.addChild(p0);
    }
    p.position = new Point(90,90);
    p.scaling = new Point( 60 / ptile.scale, 60 / ptile.scale);
    if (check) {
	currentPoints = backupCurrentPoints;
	ptile.edgePaths[currentPathLabel] = currentEdgePath;
    }
    modeltile.view.update();
};

var sLineEdit = function (point) {
    
    var mid = new Point(90,90);
    var tempPoints = currentPoints.slice(0);
    tempPoints.push(mid);
    if (point) tempPoints.push(point);
    tempPoints = tempPoints.sort(function (a,b) {return a.x - b.x});
    
    var midIndex = Math.floor(tempPoints.length / 2);

    var firstHalf = tempPoints.slice(0,midIndex);
    var secondHalf = firstHalf.reverse().map(function (pt) {
	return new Point(180 - pt.x, 180 - pt.y);
    });
    firstHalf.push(mid);
    tempPoints = firstHalf.concat(secondHalf).sort(function (a,b) {return a.x - b.x;});

    
    for (var i = 1; i < tempPoints.length; i += 1) {
	var p = new Path(tempPoints[i-1],tempPoints[i]);
	if (tempPoints[i].x <= mid.x) {
	    p.strokeColor = 'red';
	    if (tempPoints[i].x < mid.x) {
		var circ = new Path.Circle(tempPoints[i],8);
		circ.edgePoint = tempPoints[i].clone();
		circ.edgePoint.index = i;
		circ.fillColor = 'red';
	    }
	} else {
	    p.strokeColor = 'black';
	}
    }
};

var uLineEdit = function (point) {
    var mid = new Point(90,90);
    var tempPoints = currentPoints.slice(0);
    tempPoints.push(mid);
    if (point) tempPoints.push(point);
    tempPoints = tempPoints.sort(function (a,b) {return a.x - b.x});
    var midIndex = Math.floor(tempPoints.length / 2);
    var firstHalf = tempPoints.slice(0,midIndex);
    var secondHalf = firstHalf.reverse().map(function (pt) {
	return new Point(180 - pt.x, pt.y);
    });
    firstHalf.push(mid);
    tempPoints = firstHalf.concat(secondHalf).sort(function (a,b) {return a.x - b.x;});
    
        for (var i = 1; i < tempPoints.length; i += 1) {
	var p = new Path(tempPoints[i-1],tempPoints[i]);
	if (tempPoints[i].x <= mid.x) {
	    p.strokeColor = 'red';
	    if (tempPoints[i].x < mid.x) {
		var circ = new Path.Circle(tempPoints[i],8);
		circ.edgePoint = tempPoints[i].clone();
		circ.edgePoint.index = i;
		circ.fillColor = 'red';
	    }
	} else {
	    p.strokeColor = 'black';
	}
    }

};

var jLineEdit = function (point) {
    
    if (point) {
	var tempPoints = insert(currentPoints, interval, point);
	var p = new Path(tempPoints);
    } else {
	var tempPoints = currentPoints;
	var p = new Path(currentPoints);
    }
    
    p.strokeColor = 'red';
    
    for (var i = 1; i < tempPoints.length - 1; i += 1) {
	var circ = new Path.Circle(tempPoints[i], 8);
	circ.fillColor = 'red';
	circ.edgePoint = tempPoints[i].clone();
	circ.edgePoint.index = i;
    }
};

var lineEdit = function (point) {
    if (!ptile) return false;
    editor.activate();
    editor.activeLayer.removeChildren();
    var edgeType = ptile.getEdgeType(currentPathLabel);
    if (edgeType === 'J') {
	jLineEdit(point);
    } else if (edgeType === 'S') {
	sLineEdit(point);
    } else if (edgeType === 'U') {
	uLineEdit(point);
    }

    editor.view.update();
};

var retile = function () {
    if (!ptile) return false;
    
    
    tilecanvas.activate();
    tilecanvas.activeLayer.removeChildren();
    unit = ptile.translationalUnit();
    
    var gxt = 250;
    var gyt = 250;
    
    var paths = new Group();
    for (var i = 0; i < unit.shapes.length ; i += 1) {	
	var path = new Path();
	path.strokeColor = lineColor;
	path.strokeWidth = lineWidth;
	for (var j = 0; j < unit.shapes[i].path.length; j += 1) {
	    path.add(new Point(unit.shapes[i].path[j].x + gxt,
			       unit.shapes[i].path[j].y + gyt));
	    
	}
	paths.addChild(path);
    }
    
    var unitSymbol = new Symbol(paths);
    
    var t1 = new Point(unit.t1.x, unit.t1.y);
    var t2 = new Point(unit.t2.x, unit.t2.y);
    
    var trange = Math.round(1.3 * Math.ceil(1.1 * tilecanvas.view.size.width / ptile.scale));
    
    for (var i = -1 *trange ; i < trange; i += 1) {
	for (var j = -1 * trange; j < trange; j += 1) {
	    unitSymbol.place( (t1 * i) + (t2 * j));
	}
    }

    tilecanvas.activeLayer.rotate(rotationValue, tilecanvas.view.center);
  
    tilecanvas.view.update();
    editor.activate();
    if (paper.createLink) paper.createLink();
};

this.retile = retile;

var parameterChange = function () {
    lineEdit();
    updateModelTile();
    retile();
};

this.parameterChange = parameterChange;

retile();
updateModelTile();
lineEdit();
