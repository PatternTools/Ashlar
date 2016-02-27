/* 
   ////   ashlar.js   ////
   /                     /
   / A tilings library   /
   /                     /
   ///////////////////////

   author: asciiascetic@gmail.com
   license: MIT

   created: 7/8/2014   
   modified: 7/26/2014
   version: 0.0.10 (a.k.a. "Horrors Abound")

*/

var Ashlar;

Ashlar = Ashlar || {};

(function (Ashlar) {

    /// UTILITY FUNCTIONS ///

    // a cheap clone for small objects
    var clone = function (o) {
	if (typeof o === 'object') {
	    return JSON.parse( JSON.stringify( o ));
	} else {
	    return o;
	}
    };

    var inRanges = function (val, ranges) {
	var low,high;
	for (var i = 0; i < ranges.length; i += 2) {
	    low = Math.min(ranges[i],ranges[i+1]);
	    high = Math.max(ranges[i],ranges[i+1]);
	    if (val < low || val > high) return false;
	};
	return true;
    };

    var sign = function (x) {
	return ((x > 0) && 1) || ((x < 0) && -1) || 0;
    };

    var approx = function (a,b,e) {
	return Math.abs(a - b) < .001;
    };

    // computes the dot product of two vectors
    var dot = function (v1,v2) {
	var p = 0, l = v1.length;
	for (var i = 0; i < l; i += 1)
	    p += (v1[i] * v2[i]);
	return sane(p);
    };
    
    var sane = function (n) {
	return Math.round(n * 1000) / 1000;
    }

    // converts from degrees to radians
    var radians = function (deg) {
	return deg * Math.PI / 180;
    };

    // converts from radians to degrees
    var degrees = function (rad) {
	return rad * 180 / Math.PI;
    };

    /// Identity Function ///
    var Identity = function (x) {return x;};
        
    /// Point Class ///
    var Point = function (x, y) {

	if (!(this instanceof Point)) {
	    return new Point(x, y);
	}

	if ((typeof x.x === 'number') && (typeof x.y === 'number')) {
	    this.x = x.x;
	    this.y = x.y;
	} else {
	    this.x = x; 
	    this.y = y;
	}
	return this;	
    };

    Point.prototype.clone = function () {return Point(this)};
    Point.prototype.toString = function () {
	return '{x = ' + this.x + ' ,y = ' + this.y + '}';
    };
    Point.prototype.approx = function (pt) {
	return approx(pt.x, this.x) && approx(pt.y, this.y);
    };

    // computes the distance between two points
    Point.distance = function (p1, p2) {
	var dx = p2.x - p1.x, dy = p2.y - p1.y;
	return Math.sqrt( dx*dx + dy*dy);
    };

    Point.midpoint = function (p1, p2) {
	return Point( (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    };

    Ashlar.Point = Point;
    
    /// Transform Matrix Class ///
    var TransformMatrix = function () {
	if (! (this instanceof TransformMatrix)) {
	    return new TransformMatrix();
	}
	
	this.matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	return this;		       
    };

    TransformMatrix.prototype = {
	__: function (row, col, val) {
	    if ((typeof val) === 'number') {
		this.matrix[row-1][col-1] = val;
	    } else {
		return this.matrix[row-1][col-1];
	    }
	},

	row: function (i) {
	    return this.matrix[i-1];
	},

	col: function (j) {
	    return this.matrix.map(function (r) {
		return r[j-1];
	    });
	},
	
	_X_: function (m) {
	    var prod = TransformMatrix();
	    
	    for (var i = 1; i <= 3; i++) 
		for (var j = 1; j <= 3; j++) 
		    prod.__(i,j, dot(this.row(i), m.col(j)));

	    return prod;
	},

	_: function (v, isDestructive) {
	    var v0 = [v.x, v.y, 1],
	    v1 = [dot(this.row(1), v0),
		  dot(this.row(2), v0),
		  dot(this.row(3), v0)];

	    if (isDestructive) {
		v.x = v1[0];
		v.y = v1[1];
		return v;
	    } else {
		return Point(v1[0], v1[1]);
	    }
	}
	
    };

    /// Translation Transform Factory ///
    var TranslationTransform = function (dx, dy, isDestructive) {
	if ((dx instanceof Point) && (dy instanceof Point)) {
	    return TranslationTransform(dy.x - dx.x, dy.y - dx.y, isDestructive);
	}
	var m = TransformMatrix();
	m.__(1,3,dx);
	m.__(2,3,dy);
	var that = function (pt) {return m._(pt, isDestructive);};
	that.isDestructive = isDestructive;
	that.m = m;
	return that;
    };

    Ashlar.TranslationTransform = TranslationTransform;

    /// Rotation Transform Factory ///
    var RotationTransform = function (center, angle, isDestructive) {
	var angle = radians(angle);
	var toOrigin = TranslationTransform( -1 * center.x, -1 * center.y ).m;
	var toCenter = TranslationTransform( center.x, center.y ).m;
	var rotation = TransformMatrix();

	rotation.__( 1, 1, Math.cos( angle ));
	rotation.__( 1, 2, -1 * Math.sin( angle ));
	rotation.__( 2, 1, Math.sin( angle ));
	rotation.__( 2, 2, Math.cos( angle ));

	var m = toCenter._X_(rotation._X_(toOrigin));

	var that = function (pt) {return m._(pt, isDestructive);};
	that.isDestructive = isDestructive;
	that.m = m;
	return that;
    };

    Ashlar.RotationTransform = RotationTransform;

    /// Reflection Transform Factory ///
    
    var VERTICAL_REFLECT = (function () {
	var m = TransformMatrix();
	m.__(2,2,-1);
	return m;
    })();
    
    var ReflectionTransform = function (p1, p2, isDestructive) {
	var p1ToOrigin = TranslationTransform( -1 * p1.x, -1 * p1.y).m;
	var originToP1 = TranslationTransform( p1.x, p1.y).m;
	var angle = ((p2.x - p1.x) === 0 ? -90 : degrees(-1 * Math.atan((p2.y - p1.y) / (p2.x - p1.x))));

	var p2RotatedToHoriz = RotationTransform(Point(0,0), angle).m;
	var p2RotatedBack = RotationTransform(Point(0,0), -1 * angle).m;
	
	var m = originToP1._X_( p2RotatedBack._X_( VERTICAL_REFLECT._X_( p2RotatedToHoriz._X_( p1ToOrigin ) ) ) );
	var that = function (pt) {return m._(pt, isDestructive);};
	that.isDestructive = isDestructive;
	that.m = m;
	return that;
    };

    Ashlar.ReflectionTransform = ReflectionTransform;

    /// Segments ///

    // segments are directed lines between two points.

    var Segment = function (pt1, pt2) {
	if (!(this instanceof Segment)) return new Segment( pt1, pt2 );
	this.tail = Point( pt1 );
	this.head = Point( pt2 );
	this.vector = Point( this.head.x - this.tail.x, this.head.y - this.tail.y);
	return this;
    };

    Segment.prototype = {
	
	slope: function () {
	    return sane((this.head.y - this.tail.y) / (this.head.x - this.tail.x));
	},

	intersectAt: function (other) {
	    var s1 = this.slope(), s2 = other.slope();
	    
	    // same slope indicates either disjoint and parallel, or colinear
	    if ( approx( s1, s2 )) return false;

	    // check if any segment end points are coincident, and return if so.
	    if ( this.head.approx( other.head ) || this.head.approx( other.tail ) ) 
		return Point( this.head );
	    if ( this.tail.approx( other.head ) || this.tail.approx( other.tail ) )
		return Point( this.tail );

	    // otherwise "solve" for intersection
	    var i1 = this.head.y - s1 * this.head.x;
	    var i2 = other.head.y - s2 * other.head.x;
	    
	    var xint = (i2 - i1) / (s1 - s2);
	    
	    // and check that the solution appears in both x-ranges
	    if ( inRanges( xint, [this.head.x, this.tail.x,
				  other.head.x, other.tail.x]) ) {
		return Point(xint, s1 * xint + i1);
	    } else {
		return false;
	    }	    
	}
    };

    Ashlar.Segment = Segment;

    /// Polygon Class ///
    var Polygon = function (pts, path) {
	if (!(this instanceof Polygon)) {
	    return new Polygon( pts, path );
	}
	
	// accepts arbitrarily many arguments, interepreted as points
	// or as coordinates of points.

	// WARNING! the constructor makes no attempt to determine the
	// orientation of the points. For the purposes of this
	// application, polygons should be built with a ccw listing of
	// points.

	var vertices = [];

	for (var i = 0; i < pts.length; i += 1) {

	    if (pts[i] instanceof Point) {

		vertices.push(pts[i].clone());
		
	    } else if (typeof pts[i] === 'number') {

		vertices.push( Point( pts[i], pts[i+1] ) );
		i += 1;
		
	    } else if (typeof pts[i].x === 'number' && typeof pts[i].y === 'number') {
		
		vertices.push( Point(pts[i].x, pts[i].y) );

	    } else {
		
		throw "Error: bad argument in Polygon constructor";
	    }
	}

	this.vertices = vertices;
	// the path can have more points than are in the vertex
	// array. It is used for associating a mor einteresting shape
	// with the basic underlying form.

	if (path) {
	    this.path = path.map(function (pt) {return Point(pt);});
	} else {
	    this.path = this.vertices.map(function (pt) {return pt.clone();});
	    this.path.push(this.vertices[0].clone());
	}


	return this;
    };

    Polygon.prototype = {

	__dropCaches: function () {
	    this.__cachedSize = false;
	    this.__cachedCentroid = false;
	    this.__cachedArea = false;
	},
	
	clone: function () {
	    return Polygon(this.vertices, this.path);
	},

	size: function () {
	    if (!this.__cachedSize) {
		this.__cachedSize = this.vertices.length;
	    }
	    return this.__cachedSize;
	},
	
	// gets the nth edge, indexed from 1
	edge: function (n) {
	    if (1 <= n && n <= this.size()) {
		return [ this.vertex(n), this.vertex(n+1)];
	    } else {
		throw "Error: edge out of range."
	    }
	},

	vertex: function (n) {
	    return this.vertices[(n-1) % this.size()];
	},

	// preserves ordering of vertices and their mapped
	// counterparts.
	transform: function (t) {
	    if (t.isDestructive) {
		var s = this.size();
		for (var i = 0; i < s; i += 1) t(this.vertices[i]);
		this.__dropCaches();
		return this;
	    } else {
		return Polygon(this.vertices.map(t));
	    }
	},

	area: function () {
	    if (! this.__cachedArea && this.__cachedArea !== 0) {
		
		var a = 0, s = this.size(), v0,v1;
		for (var i = 0; i <= (s - 1); i += 1) {
		    v0 = this.vertices[i];
		    v1 = this.vertices[(i+1) % s];
		    a += ((v0.x * v1.y) - (v1.x * v0.y));
		}
		this.__cachedArea = a * 0.5;
	    }
	    return this.__cachedArea;
	},

	centroid: function () {
	    if (! this.__cachedCentroid) {
		
		var cx = 0, cy = 0, s = this.size(), a = this.area(), v0, v1;
		for (var i = 0; i <= (s - 1); i += 1) {
		    v0 = this.vertices[i];
		    v1 = this.vertices[(i+1) % s];
		    cx += ((v0.x + v1.x) * (v0.x * v1.y - v1.x * v0.y));
		    cy += ((v0.y + v1.y) * (v0.x * v1.y - v1.x * v0.y));
		}
		this.__cachedCentroid = Point( cx / (6 * a), cy / (6 * a) );
	    }
	    return this.__cachedCentroid;
	}
    };

    Ashlar.Polygon = Polygon;

    /// Ashlar.Isohedral Submodule ///
    var Isohedral = (function () {
	var module = {};

	// Vertex Parameterizations
	var TV = {
	    TV9 : [[0],[0],[1],[0],[1.5],[0.866],[1],[1.732],[0],[1.732],[-0.5],[0.866]],
	    TV10: [[0,0,0], [0,0,0], [1,0,0], [0,0,0], [1,1,0],
		   [0,0,0.5], [1,0,0], [0,0,1], [0,0,0], [0,0,1],
		   [0,-1,0], [0,0,0.5]],
	    TV24: [[0],[0],[-0.866],[-0.5], [0], [-1], [0.866],[-0.5]],
	    TV25: [[0],[0],[1],[0],[-0.5],[0.866]],
	    TV26: [[0,0,0], [0,0,0], [1,0,0], [0,1,0], [1,0,0], [0,1,1], [0,0,0], [0,0,1]],
	    TV30: [[0,0], [0,0], [1,0],[0,0], [1,0],[0,1], [0,0], [0,1]],
	    TV35: [[0],[0], [1],[0], [1],[1], [0],[1]],
	    TV40: [[0,0,0], [0,0,0], [0,0,1],  [0,0,0], [1,0,0], [0,1,0]],
	    TV41: [[0],[0], [1],[0], [0],[1]],
	    TV43: [[0],[0], [1],[0], [0.5],[0.866]]
	};

	// Isohedral Tiling Templates

	var IH = {

	    IH10: {
		topology: '3^6',
		incidence: 'a+b+a+b+a+b+;b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV9',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps: [{hop: ['rf'], edge: 1}]},
		    {start: 'A', steps: [{hop: ['rf'], edge: 6}]}
		],
		baseVertices: [0,0, 1,0, 1.5,0.866, 1,1.732, 0,1.732, -0.5,0.866]		
	    },

	    IH11: {
		topology: '3^6',
		incidence: 'a+a+a+a+a+a+;a+',
		edges: [
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'}
		],
		parameterization: 'TV9',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps:[{hop:['rm',180], edge: 1}]},
		    {start: 'A', steps:[{hop:['rm',180], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 1.5,0.866, 1,1.732, 0,1.732, -0.5,0.866]		
	    },

	    IH12: {
		topology: '3^6',
		incidence: 'ab+c+dc-b-;dc-b-a',
		edges: [
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 1, type: 'J'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'b', dir: -1}},
		    {name: 'd', dir: 0, type: 'U', adj: {name: 'a', dir: 0}},
		    {name: 'c', dir: -1, type: 'J', adj: {name: 'b', dir: -1}},
		    {name: 'b', dir: -1, type: 'J'}
		],
		parameterization: 'TV10',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps:[{hop: ['tbv',4,2], edge: 1}]},
		    {start: 'A', steps:[{hop: ['tbv',5,3], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 2,0.5, 1,1, 0,1, -1, 0.5]
	    },

	    IH17: {
		topology: '3^6',
		incidence: 'ab+b-ab+b-;ab+',
		edges: [
		    {name: 'a', dir: 0, type: 'U', adj:{name: 'a', dir: 0}},
		    {name: 'b', dir: 1, type: 'S',},
		    {name: 'b', dir: -1, type: 'S'},
		    {name: 'a', dir: 0, type: 'U', adj:{name: 'a', dir: 0}},
		    {name: 'b', dir: 1, type: 'S',},
		    {name: 'b', dir: -1, type: 'S'}
		],
		parameterization: 'TV10',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps:[{hop: ['tbv',2,4], edge:1}]},
		    {start: 'A', steps:[{hop: ['rm',180],edge:2}]}
		],
		baseVertices: [0,0, 1,0, 2,0.5, 1,1, 0,1, -1, 0.5]		
	    },

	    IH18: {
		topology: '3^6',
		incidence: 'ababab;ba',
		edges: [
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 0, type: 'U', adj: {name: 'a', dir: 0}},
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 0, type: 'U', adj: {name: 'a', dir: 0}},
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 0, type: 'U', adj: {name: 'a', dir: 0}}
		],
		parameterization: 'TV9',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 4,2], edge: 1}]},
		    {start: 'A', steps: [{hop: ['tbv', 5,3], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 1.5,0.866, 1,1.732, 0,1.732, -0.5,0.866]
	    },

	    IH33: {
		topology: '3.6.3.6',
		incidence: 'a+b+c+d+;d+c+b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'b', dir: 1}},
		    {name: 'd', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV24',
		aspects: ['A', 'B', 'C'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rv',1, -120], edge: 1}]},
		    'C': {start: 'B', steps: [{hop: ['rv',1, -120], edge: 1}]}   
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rf'], edge: 2}]},
		    {start: 'C', steps: [{hop: ['rf'], edge: 3}]}
		],
		baseVertices: [0,0, -0.866, -0.5, 0, -1, 0.866, -0.5]		
	    },

	    IH34: {
		topology: '3.6.3.6',
		incidence: 'a+b+a+b+;b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV24',
		aspects: ['A','B','C'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rv',1,-120], edge:1}]},
		    'C': {start: 'B', steps: [{hop: ['rv',1,-120], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rv',2, -60], edge: 2}]}, //diverged from source
		    {start: 'C', steps: [{hop: ['rv',4, 60], edge: 3}]}
		],
		baseVertices: [0,0, -0.866, -0.5, 0, -1, 0.866, -0.5]		
	    },


	    IH36: {
		topology: '3.6.3.6',
		incidence: 'a+a-b+b-;b-a-',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'a', dir: -1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: -1}},
		    {name: 'b', dir: -1, type: 'J', adj: {name: 'a', dir: -1}}
		],
		parameterization: 'TV24',
		aspects: ['A','B','C'],
		rules: {
		    'B': {start: 'A', steps:[{hop: ['rf'], edge:1}]},
		    'C': {start: 'A', steps:[{hop: ['rf'], edge:4}]}
		},
		translationRules: [
		    {start: 'B', steps:[{hop: ['rf'], edge: 3}]}, //Note, diverged from source material here
		    {start: 'C', steps:[{hop: ['rf'], edge: 2}]}
		],
		baseVertices: [0,0, -0.866, -0.5, 0, -1, 0.866, -0.5]
	    },

	    IH38: {
		topology: '3.12^2',
		incidence: 'a+b+c+;c+b-a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'U', adj: {name: 'b', dir: -1}},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV25',
		aspects: ['A','B','C','D','E','F'],
		rules: {
		    'B' : {start: 'A', steps: [{hop: ['rv', 1, -120], edge: 1}]},
		    'C' : {start: 'B', steps: [{hop: ['rv', 1, -120], edge: 1}]},
		    'D' : {start: 'B', steps: [{hop: ['rf'], edge: 2}]},
		    'E' : {start: 'D', steps: [{hop: ['rv', 1, 120], edge: 1}]},
		    'F' : {start: 'E', steps: [{hop: ['rv', 1, 120], edge: 1}]}
		},
		translationRules: [
		    {start: 'E', steps: [{hop: ['rf'], edge: 2}]},
		    {start: 'C', steps: [{hop: ['rf'], edge: 2},
					 {hop: ['rv', 1, -120], edge: 3},
					 {hop: ['rf'], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, -0.5,0.866]
	    },

	    IH39: {
		topology: '3.12^2',
		incidence: 'a+b+c+;c+b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV25',
		aspects: ['A','B','C','D','E','F'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rv', 1, -120], edge: 1}]},
		    'C': {start: 'B', steps: [{hop: ['rv', 1, -120], edge: 1}]},
		    'D': {start: 'B', steps: [{hop: ['rm', 180], edge: 2}]},
		    'E': {start: 'D', steps: [{hop: ['rv', 1, -120], edge: 1}]},
		    'F': {start: 'E', steps: [{hop: ['rv', 1, -120], edge: 1}]}
		},
		translationRules: [
		    {start: 'C', steps: [{hop:['rm',180], edge: 2},
					 {hop:['rv',1,-120], edge: 1},
					 {hop:['rm',180], edge:2}]},
		    {start:'F', steps: [{hop: ['rm',180], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, -0.5,0.866]		
	    },

	    IH41: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c+d+a+b+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'd', dir: 1, type: 'J', adj: {name: 'b', dir: 1}}
		],
		parameterization: 'TV26',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps:[{hop: ['tbv',2,1], edge:2}]},
		    {start: 'A', steps:[{hop: ['tbv',3,2], edge:1}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]		
	    },

	    IH42: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c+b-a+d-',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'U', adj: {name: 'b', dir: -1}},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'd', dir: 1, type: 'U', adj: {name: 'd', dir: -1}}
		],
		parameterization: 'TV26',
		aspects: ['A', 'B'],
		rules: {
		    'B' : {start: 'A', steps: [{hop: ['rf'], edge: 2}]}
		},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 4, 1], edge: 1}]},
		    {start: 'B', steps: [{hop: ['rf'], edge: 4}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]				
	    },

	    IH43: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c-d+a-b+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: -1}},
		    {name: 'd', dir: 1, type: 'J', adj: {name: 'b', dir: 1}}
		],
		parameterization: 'TV26',
		aspects: ['A','B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rf'], edge: 1},
					      {hop: ['rc', 180], edge: 1}]}
		},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 2,1], edge: 2}]},
		    {start: 'B', steps: [{hop: ['rf'], edge: 3}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]		
	    },

	    IH47: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c+b+a+d+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'd', dir: 1, type: 'S'}
		],
		parameterization: 'TV26',
		aspects: ['A','B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rm', 180], edge: 2}]}
		},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 4, 1], edge: 1}]},
		    {start: 'B', steps: [{hop: ['rm', 180], edge: 4}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]
	    },

	    IH50: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c+b-a+d+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'U', adj: {name: 'b', dir: -1}},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'd', dir: 1, type: 'S'}
		],
		parameterization: 'TV26',
		aspects: ['A','B','C','D'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rm', 180], edge: 4}]},
		    'C': {start: 'B', steps: [{hop: ['rm',180], edge: 2}]},
		    'D': {start: 'A', steps: [{hop: ['rm',180], edge: 2}]}
		},
		translationRules: [
		    {start: 'C', steps: [{hop: ['rm', 180], edge: 4},
					 {hop: ['rm', 180], edge: 2}]},
		    {start: 'A', steps: [{hop: ['tbv', 4, 1], edge: 1}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]
	    },

	    IH52: {
		topology: '4^4',
		incidence: 'a+b+c+d+;c-d-a-b-',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: -1}},
		    {name: 'd', dir: 1, type: 'J', adj: {name: 'b', dir: -1}}
		],
		parameterization: 'TV30',
		aspects: ['A','B','C','D'],
		rules: {
		    'B' : {start: 'A', steps:[{hop: ['rf'], edge: 1}]},
		    'C' : {start: 'B', steps:[{hop: ['rf'], edge: 4}]},
		    'D' : {start: 'C', steps:[{hop: ['rf'], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps:[{hop: ['rf'], edge: 3}]},
		    {start: 'D', steps:[{hop: ['rf'], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH55: {
		topology: '4^4',
		incidence: 'a+b+c+d+;b+a+d+c+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'c', dir: 1, type: 'J'},
		    {name: 'd', dir: 1, type: 'J', adj: {name: 'c', dir: 1}}
		],
		parameterization: 'TV35',
		aspects: ['A','B','C','D'],
		rules: {
		    'B' : {start: 'A', steps: [{hop: ['rc-tv',-90, 2], edge: 2}]},
		    'C' : {start: 'B', steps: [{hop: ['rc-tv',-90, 2], edge: 2}]},
		    'D' : {start: 'C', steps: [{hop: ['rc-tv',-90, 2], edge: 2}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rc-tv',-90, 3], edge:3}]},
		    {start: 'D', steps: [{hop: ['rc-tv', 90, 1], edge:4}]}
		],
		
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH57: {
		topology: '4^4',
		incidence: 'a+b+a+b+;a+b+',
		edges: [
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S', adj: {name: 'a', dir: 1}},
		    {name: 'b', dir: 1, type: 'S', adj: {name: 'b', dir: 1}}
		],
		parameterization: 'TV26',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps: [{hop: ['rm', 180], edge: 1}]},
		    {start: 'A', steps: [{hop: ['rm', 180], edge: 2}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]
	    },

	    IH58: {
		topology: '4^4',
		incidence: 'a+b+a+b+;a-b+',
		edges: [
		    {name: 'a', dir: 1, type: 'U', adj: {name: 'a', dir: -1}},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'U', adj: {name: 'a', dir: -1}},
		    {name: 'b', dir: 1, type: 'S', adj: {name: 'b', dir: 1}}
		],
		parameterization: 'TV26',
		aspects: ['A', 'B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rf'], edge: 1}]}
		},
		translationRules: [
		    {start: 'A', steps: [{hop: ['rm', 180], edge: 2}]},
		    {start: 'B', steps: [{hop: ['rf'], edge: 3}]}
		],
		baseVertices: [0,0, 1,1, 1,2, 0,1]
	    },
	    


	    IH61: {
		topology: '4^4',
		incidence: 'a+b+a+b+;b+a+',
		edges: [
		    {name: 'a', dir: 1, type:'J'},
		    {name: 'b', dir: 1, type:'J', adj: {name: 'a', dir: 1}},
		    {name: 'a', dir: 1, type:'J'},
		    {name: 'b', dir: 1, type:'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV35',
		aspects: ['A','B'],
		rules: {
		    'B' : {start: 'A', steps: [{hop: ['rc-tv', -90, 1], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rc-tv', -90, 1], edge: 1}]},
		    {start: 'B', steps: [{hop: ['rc-tv', -90, 3], edge: 3}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH62: {
		topology: '4^4',
		incidence: 'a+a+a+a+;a+',
		edges: [
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'}
		],
		parameterization: 'TV35',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 2, 3], edge: 1}]},
		    {start: 'A', steps: [{hop: ['tbv', 2, 1], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH64: {
		topology: '4^4',
		incidence: 'ab+cb-;cb-a',
		edges: [
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 1, type: 'U', adj: {name: 'b'}},// not sure about this...
		    {name: 'c', dir: 0, type: 'U', adj: {name: 'a'}},
		    {name: 'b', dir: -1, type: 'U', adj: {name: 'b'}}
		],
		parameterization: 'TV30',
		aspects: ['A'],
		rules: {},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 2, 3], edge: 1}]},
		    {start: 'A', steps: [{hop: ['tbv', 2, 1], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH66: {
		topology: '4^4',
		incidence: 'ab+cb-;cb+a',
		edges: [
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 0, type: 'U', adj: {name: 'a', dir: 0}},
		    {name: 'b', dir: -1, type: 'S'}//, adj: {name: 'b'}}
		],
		parameterization: 'TV30',
		aspects: ['A', 'B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rm',180], edge: 2}]}
		},
		translationRules: [
		    {start: 'A', steps: [{hop: ['tbv', 3, 2], edge: 1}]},
		    {start: 'B', steps: [{hop: ['rm', 180], edge: 4}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]		
	    },

	    IH71: {
		topology: '4^4',
		incidence: 'a+b+b-a-;b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'b', dir: -1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'a', dir: -1, type: 'J'}
		],
		parameterization: 'TV35',
		aspects: ['A','B','C','D'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rc-tv', 90, 2], edge: 1}]},
		    'C': {start: 'B', steps: [{hop: ['rc-tv', 90, 2], edge: 1}]},
		    'D': {start: 'C', steps: [{hop: ['rc-tv', 90, 2], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rc-tv', -90, 4], edge: 4}]},
		    {start: 'D', steps: [{hop: ['rc-tv', 90, 4], edge: 3}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH73: {
		topology: '4^4',
		incidence: 'abab;ba',
		edges: [
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 0, type: 'U', adj: {name: 'a', dir: 0}},
		    {name: 'a', dir: 0, type: 'U'},
		    {name: 'b', dir: 0, type: 'U', adj: {name: 'a', dir: 0}}
		],
		parameterization: 'TV35',
		aspects: ['A', 'B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rc-tv', 90, 2], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rc-tv', -90, 1], edge: 1}]},
		    {start: 'B', steps: [{hop: ['rc-tv', 90, 1], edge: 3}]}
		],
		baseVertices: [0,0, 1,0, 1,1, 0,1]
	    },

	    IH79: {
		topology: '4.8^2',
		incidence: 'a+b+c+;c+b+a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV41',
		aspects: ['A','B','C','D'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rv',1,-90], edge: 1}]},
		    'C': {start: 'B', steps: [{hop: ['rv',1,-90], edge: 1}]},
		    'D': {start: 'C', steps: [{hop: ['rv',1,-90], edge: 1}]}
		},
		translationRules: [
		    {start: 'C', steps: [{hop: ['rm', 180], edge: 2}]},
		    {start: 'B', steps: [{hop: ['rm', 180], edge: 2},
					 {hop: ['rv', 1, -90], edge: 1}]}
		],
		baseVertices: [0,0, 1,0, 0,1]
	    },

	    IH81: {
		topology: '4.8^2',
		incidence: 'a+b+c+;c+b-a+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'U', adj: {name: 'b', dir: -1}},
		    {name: 'c', dir: 1, type: 'J', adj: {name: 'a', dir: 1}}
		],
		parameterization: 'TV41',
		aspects: ['A','B','C','D','E','F','G','H'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rv',1,-90], edge: 1}]},
		    'C': {start: 'B', steps: [{hop: ['rv',1,-90], edge: 1}]},
		    'D': {start: 'C', steps: [{hop: ['rv',1,-90], edge: 1}]},
		    'E': {start: 'B', steps: [{hop: ['rf'], edge: 2}]},
		    'F': {start: 'E', steps: [{hop: ['rv',1, 90], edge: 1}]},
		    'G': {start: 'F', steps: [{hop: ['rv',1, 90], edge: 1}]},
		    'H': {start: 'G', steps: [{hop: ['rv',1, 90], edge: 1}]}
		},
		translationRules: [
		    {start: 'F', steps: [{hop: ['rf'], edge: 2}]},
		    {start: 'G', steps: [{hop: ['rf'], edge: 2},
					 {hop: ['rv',1, -90], edge: 1}]}
		],
		baseVertices: [0,0, 1,0, 0,1]		
	    },

	    IH84: {
		topology: '6^3',
		incidence: 'a+b+c+;a+b+c+',
		edges: [
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 1, type: 'S'}
		],
		parameterization: 'TV40',
		aspects: ['A', 'B'],
		rules: {
		    'B':{start: 'A', steps: [{hop:['rm', 180], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop:['rm', 180], edge: 2}]},
		    {start: 'B', steps: [{hop:['rm', 180], edge: 3}]}
		],
		baseVertices: [0,0, 1,0, 1,1]
	    },

	    IH85: {
		topology: '6^3',
		incidence: 'a+b+c+;a-b+c+',
		edges: [
		    {name: 'a', dir: 1, type: 'U', adj: {name: 'a', dir: -1}},
		    {name: 'b', dir: 1, type: 'S'},
		    {name: 'c', dir: 1, type: 'S'}		     
		],
		parameterization: 'TV40',
		aspects: ['A','B','C','D'],
		rules: {
		    'B' : {start: 'A', steps: [{hop: ['rm',180], edge: 2}]},
		    'C' : {start: 'B', steps: [{hop: ['rf'], edge: 1}]},
		    'D' : {start: 'C', steps: [{hop: ['rm',180], edge: 2}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rm', 180], edge:3}]},
		    {start: 'D', steps: [{hop: ['rf'], edge: 1}]}
		],
		baseVertices: [0,0, 1,0, 1,1]
	    },

	    IH88: {
		topology: '6^3',
		incidence: 'a+b+c+;b+a+c+',
		edges: [
		    {name: 'a', dir: 1, type: 'J'},
		    {name: 'b', dir: 1, type: 'J', adj: {name: 'a', dir: 1}},
		    {name: 'c', dir: 1, type: 'S'}
		],
		parameterization: 'TV43',
		aspects:['A','B','C','D','E','F'],
		rules: {
		    'B' : {start: 'A', steps:[{hop: ['rv',2,60], edge: 1}]},
		    'C' : {start: 'B', steps:[{hop: ['rv',2,60], edge: 1}]},
		    'D' : {start: 'C', steps:[{hop: ['rv',2,60], edge: 1}]},
		    'E' : {start: 'D', steps:[{hop: ['rv',2,60], edge: 1}]},
		    'F' : {start: 'E', steps:[{hop: ['rv',2,60], edge: 1}]}
		},
		translationRules: [
		    {start: 'D', steps:[{hop:['rm',180], edge: 3}]},
		    {start: 'E', steps:[{hop:['rm',180], edge: 3},
					{hop:['rv',2,-60], edge: 2}]}
		],
		baseVertices: [0,0, 1,0, 0.5,0.866]		
	    },

	    IH90: {
		topology: '6^3',
		incidence: 'a+a+a+;a+',
		edges: [
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'},
		    {name: 'a', dir: 1, type: 'S'}
		],
		parameterization: 'TV43',
		aspects: ['A','B'],
		rules: {
		    'B': {start: 'A', steps: [{hop: ['rm',180], edge: 1}]}
		},
		translationRules: [
		    {start: 'B', steps: [{hop: ['rm', 180], edge: 2}]},
		    {start: 'B', steps: [{hop: ['rm', 180], edge: 3}]}
		],
		baseVertices: [0,0, 1,0, 0.5,0.866]
	    }
	
	};

	/// Ashlar.Isohedral.Prototile Class ///
	var Prototile = function (template) {
	    if (!(this instanceof Prototile)) return new Prototile(template);
	    this.templateName = template;
	    this.template = IH[template];
	    this.parameterization = TV[ this.template.parameterization ];
	    this.polygon = Polygon( this.template.baseVertices );
	    this.scale = 1.0;
	    this.parameterCount = this.parameterization[0].length - 1;
	    this.parameters = [1.0];
	    this.edgePaths = {};
	    var tedges = this.template.edges;
	    for (var i = 0; i < tedges.length; i += 1) {
		this.edgePaths[tedges[i].name] = [Point(0,0), Point(1,0)]
	    }
	    for (var i = 0; i < this.parameterCount; i += 1) {
		this.parameters.unshift(1.0);
	    }
	    return this;
	};

	Prototile.fromJSON = function (json) {
	    var parsed = JSON.parse(json);
	    return Prototile.fromSettings(parsed);
	};

	Prototile.fromSettings = function (parsed) {
	    var prototile = Prototile( parsed.t);
	    prototile.polygon = Polygon( parsed.p.v, parsed.p.p);
	    
	    prototile.scale = parsed.s;
	    prototile.parameters = parsed.pa;
	    prototile.edgePaths = parsed.ep;
	    return prototile;
	};

	Prototile.prototype = {
	    
	    settings: function () {
		return {
		    t: this.templateName,
		    p: {v: this.polygon.vertices, p: this.polygon.path},
		    s: this.scale,
		    pa: this.parameters,
		    ep: this.edgePaths		    
		};
	    },

	    toJSON: function () {
		return JSON.stringify(this.settings());
	    },

	    // form a translational unit, as an array of polygons plus
	    // the translation transforms necessary to tile them
	    // across a plane.
	    translationalUnit: function () {
		var aspects = {}, shapes = [], name;
		aspects['A'] = this.applyVertexParameterization();
		shapes.push( aspects['A'] );
		for (var i = 1; i < this.template.aspects.length; i += 1) {
		    name = this.template.aspects[i];
		    aspects[name] = applyHops(aspects, this.template.rules[name]); 
		    shapes.push( aspects[name] );
		}
		
		var t1 = centroidTranslation(aspects['A'], applyHops(aspects, this.template.translationRules[0]));
		var t2 = centroidTranslation(aspects['A'], applyHops(aspects, this.template.translationRules[1]));
		var that = this;

		shapes = shapes.map(function (shape) {return shapeTile(shape,that);});

		return {
		    shapes: shapes,
		    t1: t1,
		    t2: t2
		};
	    },

	    getEdgePath: function (edgeNumber) {
		var e = this.template.edges[edgeNumber - 1];
		if (e.adj) {
		    var path = this.edgePaths[e.adj.name];
		    if (e.dir === -1 && e.adj.dir === -1) {
			return path.map(function (p) {
			    var pp = Point(p);//p.clone();
			    pp.y *= -1;
			    pp.x = 1 - p.x;
			    return pp;
			}).reverse();
		    }

		    if (e.dir === -1) {
			return path.map(function (p) {
			    var pp = Point(p);//p.clone();
			    pp.y *= -1;
			    return pp;
			});
		    } else {
			
			if (e.adj.dir === -1) {
			    return this.edgePaths[e.adj.name].map(function (p) {
				var pp = Point(p);//p.clone();
				pp.y *= -1;
				return pp;
			    });
			}

			return this.edgePaths[e.adj.name].map(function (p) {
			    var pp = Point(p);//p.clone();
			    pp.y *= -1;
			    pp.x = 1 - p.x;
			    return pp;
			}).reverse();
		    }
		}
		if (e.dir === -1) {
		    return this.edgePaths[e.name].map(function (p) {
			var pp = Point(p);//p.clone();
			pp.x = 1 - p.x;
			return pp;
		    }).reverse();
		}
		return this.edgePaths[e.name].map(function (p) {return Point(p);});//p.clone();});
	    },

	    getEdgePathLength: function (edgeNumber) {
		var e = this.template.edges[edgeNumber - 1];
		if (e.adj) return this.edgePaths[e.adj.name].length;
		return this.edgePaths[e.name].length;
	    },

	    // return an array of edges uncontrained by other edges
	    getFreeEdges: function () {
		var labels = [];
		return clone(this.template.edges.filter(function (e) {
		    if ((labels.indexOf(e.name) === -1) && !e.adj) {
			labels.push(e.name);
			return true;
		    } else {
			return false;
		    }
		}));
	    },
	    
	    getEdgeType: function (label) {
		for (var i = 0; i < this.template.edges.length; i += 1) {
		    if (this.template.edges[i].name === label) return this.template.edges[i].type;
		}
	    },
	    
	    getEdgeDescription: function (edgeNumber) {
		return clone(this.template.edges[edgeNumber - 1]);
	    },

	    applyVertexParameterization: function () {
		var l = this.polygon.vertices.length;
		var verts = [];
		for (var j = 0; j < l; j += 1 ) {
		    var rx = this.parameterization[2 * j];
		    var ry = this.parameterization[(2 * j) + 1];
		    verts.push( Point( dot(rx, this.parameters) * this.scale,  
				       dot(ry, this.parameters) * this.scale )); //here
		    
		}
		return Polygon(verts);
	    },

	    getPathLimitsForEdge: function (label) {
		var start = 0;
		var i = 1;
		while (i <= this.template.edges.length) {
		    var ed = this.getEdgeDescription(i);
		    if (ed.name === label) 
			return {start: start, stop: start + this.getEdgePathLength(i)};
		    start += this.getEdgePathLength(i) - 1;
		    i += 1;
		}
	    }
	};

	module.Prototile = Prototile;
	module.available = function () {
	    var a = [];
	    for (var c in IH) 
		if (IH.hasOwnProperty(c)) a.push(c);
	    return a;
	};
	/// Prototile Utilities ///

	var shapeTile =  function (tile, prototile) {
	    var points = [], edge, edgePath;
	    for (var i = 1; i <= tile.size(); i += 1) {
		edge = tile.edge(i);
		edgePath = adjustEdgePath(edge, prototile.getEdgePath(i));
		points = points.concat(edgePath);
		points.pop();
	    }
	    
//	    points.push(points[0].clone());
	    points.push(Point(points[0]));
	    tile.path = points;
	    return tile;
	};

	// takes a parameter adjusted edge and maps a primitive
	// edgePath to match the edge's proportions.
	var adjustEdgePath = function (edge, path) {

	    var head = edge[0], tail = edge[1],
	    hyp = Point.distance( head, tail );
	    var angle = sane(degrees(Math.acos((tail.x - head.x) / hyp)));
	    if (tail.y < head.y) angle = 360 - angle;

	    var rotation = RotationTransform(head, angle);

	    return path.map(function (pt) {
		// scale then translate (can simply mult b/c path is unit x)
		return rotation( Point( pt.x * hyp + head.x, pt.y * hyp + head.y));
	    });
	};

	var applyHops = function (aspects, rule) {
	    var poly = aspects[rule.start].clone();
	    for (var i = 0; i < rule.steps.length; i += 1) {
		poly = applyStep( poly, rule.steps[i] );
	    }
	    return poly;
	};

	var applyStep = function (orig, step) {
	    var poly = orig.clone();
	    if (step.hop[0] === 'rc-tv') {
		// rotate about the centroid of poly, then translate
		// by the difference in vertex positions indicated
		poly.transform( RotationTransform( poly.centroid(), step.hop[1], true ));
		poly.transform( TranslationTransform( poly.vertex( step.hop[2] ),
						      orig.vertex( step.hop[2] ), true ));
	    } else if (step.hop[0] === 'tbv') {
		//translate between vertices
		poly.transform( TranslationTransform( poly.vertex( step.hop[1] ),
						      poly.vertex( step.hop[2] ), true));
	    } else if (step.hop[0] === 'rm') {
		// rotate about the midpoint
		var edge = poly.edge( step.edge );
		poly.transform( RotationTransform( Point.midpoint(edge[0], edge[1]), step.hop[1], true));
	    } else if (step.hop[0] === 'rf') {
		var edge = poly.edge( step.edge );
		poly.transform( ReflectionTransform( edge[0], edge[1], true));
 	    } else if (step.hop[0] === 'rv') {
		poly.transform( RotationTransform( poly.vertex( step.hop[1] ), step.hop[2], true));
	    } 
	    return poly;
	};

	// given two polygons, returns a Point representing a "vector"
	// from the centroid of the first to that of the second.
	var centroidTranslation = function (p1, p2) {
	    //	    return TranslationTransform(p1.centroid(), p2.centroid(), false);
	    return Point(p2.centroid().x - p1.centroid().x, p2.centroid().y - p1.centroid().y);
	};


	return module;
    })();
    
    Ashlar.Isohedral = Isohedral;    

})(Ashlar);
