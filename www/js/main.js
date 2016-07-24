
$(document).ready(function () {

    $('#stroke').on('input', function () {
	paper.setStroke(Number($(this)[0].value));
    });
    
    $('#scale').on('input', function () {
	paper.rescale(Number($(this)[0].value));
    });

    $('#rotation').on('input', function () {
	paper.rotationBy(Number($(this)[0].value));
    });

    $('#freehand-toggle').on('click', function () {
	paper.toggleFreehand();
    });


    $('#undo-btn').on('click', function () {undo();});
    $('#redo-btn').on('click', function () {redo();});

    var undoStack = [];
    var redoStack = [];
    
    var undo = function () {
	if (undoStack.length > 1) {
	    redoStack.unshift(undoStack.shift());
	    var conf = decodeConfig( presentEncoding );
	    conf.prototile.ep = decodeConfig( undoStack[0] );
	    presentEncoding = encodeConfig( conf );
	    loadFromConfig( conf );
	}
    };

    var redo = function () {
	if (redoStack.length > 0) {
	    var conf = decodeConfig( presentEncoding );
	    conf.prototile.ep = decodeConfig( redoStack[0] );
	    presentEncoding = encodeConfig( conf );
	    undoStack.unshift(redoStack.shift());
	    loadFromConfig( conf );
	}
    };

    var presentEncoding;
    var presentConfig;

    var encodeConfig = function (config) {
	return LZString.compressToBase64(JSON.stringify(config));
    };

    var undoableConfig = function (config) {
	return config.prototile.ep;
    };

    var addUndoable = function (config) {
	var encoded = encodeConfig( undoableConfig( config ));
	if (encoded !== undoStack[0]) {
	    undoStack.unshift( encoded );
	    redoStack = [];
	}
    };

    var createLink = function () {
	var config = {
	    prototile: prototile.settings(),
	    tool: makeToolConfiguration()
	};
	var encoded = encodeConfig( config );

	if (presentEncoding !== encoded) {
	    presentEncoding = encoded;
	    presentConfig = config;

	    addUndoable(config);

	    var link = $('<a> here is a link to your tiling -- SHARE IT!</a>' );
	    link.attr({
		href: window.location.origin + window.location.pathname + "#" + encoded
	    });
	    $('#tiling-link').empty();
	    $('#tiling-link').append(link);
	}
    };

    var makeToolConfiguration = function () {
	return  {
	    stroke: Number($('#stroke')[0].value),
	    rotation: Number($('#rotation')[0].value),
	};
    };

    var decodeConfig = function (encoded) {
	return JSON.parse(LZString.decompressFromBase64(encoded));
    };

    var loadConfigUrl = function () {
	loadFromConfig( decodeConfig( window.location.hash.substring(1) ));
    };

    var loadFromConfig = function (config) {
	presentEncoding = encodeConfig( config);
	$('#stroke')[0].value = config.tool.stroke;
	$('#rotation')[0].value = config.tool.rotation;
	$('#tiling-class')[0].value = config.prototile.t;
	$('#scale')[0].value = config.prototile.s;
	prototile = Ashlar.Isohedral.Prototile.fromSettings(config.prototile);
	paper.setPrototile(prototile)
	refreshEdgeSelectors();
	refreshVertexParameters(prototile.parameters);
	paper.setStroke(config.tool.stroke);
	paper.rotationBy(config.tool.rotation);
	paper.rescale(config.prototile.s);
    };
    
    var MIME_TYPE = 'image/svg+xml';

    var exportData = function () {
	var filename = $('#filename')[0].value + '.svg';

	var svgString = paper.tilecanvas.exportSVG({   //paper.projects[1].exportSVG({
	    asString: true
	});
	var blob = new Blob([svgString], {type: MIME_TYPE});
	var a = document.createElement('a');
	a.download = filename;
	a.href = window.URL.createObjectURL(blob);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
    };


    var exportTile = function () {
	var filename = $('#tile-filename')[0].value + '.svg';
	var svgString = paper.modeltile.exportSVG({asString:true});
	var blob = new Blob([svgString], {type: MIME_TYPE});
	var a = document.createElement('a');
	a.download = filename;
	a.href = window.URL.createObjectURL(blob);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);	
    }
    
    $('#download-button').on('click', function () {
	exportData();
    });

    $('#download-tile-button').on('click', function () {
	exportTile();
    });

    $('#refresh-editor').on('click', function () {
	paper.resetEditor();
    });

    $('#edge-selector').on('change', function (e) {
	paper.setCurrentPathLabel(e.currentTarget.value);
    });

    var prototile;
    
    // fucking what the fucking hell? calling setPrototile doesn't
    // work in response to $(window).on('load', ...)  This makes no
    // sense at all.
    var initial = setInterval(function () {
	if (paper && paper.setPrototile) {
	    paper.createLink = createLink;
	    if (window.location.hash && window.location.hash.length > 1) {
		loadConfigUrl();
	    } else {
		setPrototile(Ashlar.Isohedral.available()[0]);
	    }
	    clearInterval(initial);
	}
    }, 100);

    var setPrototile = function (name) {
	undoStack = [];
	redoStack = [];
	prototile = Ashlar.Isohedral.Prototile(name);
	paper.setPrototile(prototile);
	paper.rescale(Number($('#scale')[0].value));
	refreshEdgeSelectors();
	refreshVertexParameters();
//	window.PROTOTILE = prototile;
    };

    var refreshVertexParameters = function (params) {
	$('#vertex-parameters').empty();
	var count = prototile.parameterCount || 0;
	if (count > 0) {
	    $('#vertex-parameters').append( $('<li><h4>parameters</h4></li>'));
	    for (var i = 0; i < count; i += 1) {
		var initval = params ? params[i] : 1.0;
		var slider = $('<input type="range" min="-2" max="2" step="0.1" value="' + initval + '"/>');
		(function () {
		    var param = i;
		    slider.on('input', function (e) {
			prototile.parameters[param] = Number(e.currentTarget.value);
			paper.parameterChange();
		    });
		})();
		var li = $('<li>');
		li.append(slider);
		$('#vertex-parameters').append(li);
	    }
	}
    };

    var refreshEdgeSelectors = function () {
	$('#edge-selector').empty();
	var free = prototile.getFreeEdges();
	for (var i = 0; i < free.length; i += 1) {
	    $('#edge-selector').append( $('<option> ' + free[i].name + '</option>'));
	}
    };

    (function () {
	var avail = Ashlar.Isohedral.available();
	for (var i = 0; i < avail.length; i += 1) {
	    $('#tiling-class').append($('<option>'+avail[i]+'</option>'));
	}

	$('#tiling-class').on('change', function (e) {
	    setPrototile( e.currentTarget.value);
	});
    })();


});


