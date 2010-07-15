var CARTOGRAM = (function(){
    var options = {"DEBUG": true};
    var console_log = function(){
        if (options.DEBUG){
            options.callback({"method": "log", "payload": Array.prototype.slice.apply(arguments,[])});
        }
    };
    
    //= require "cartogram_cartogram"
    //= require "cartogram_feature"
    //= require "cartogram_gastner"
    //= require "cartogram_geometry"
    //= require "cartogram_grid"
    //= require "cartogram_helper"
    //= require "cartogram_layer"
    
        var layerToSVGPaths = function(layer){

        	var extent = layer.getEnvelope();

        	// Find the dimensions of the output SVG file. We suppose a A4 document
        	// with 595 x 842 pixels. The orientation depends on the extent.
        	var svgWidth = 595;
        	var svgHeight = 842;
        	if (extent.getWidth() > extent.getHeight())
        	{
        		svgWidth = 842;
        		svgHeight = 595;
        	}

        	// Define the margins.
        	var svgMarginLeft = 30;
        	var svgMarginRight = 30;
        	var svgMarginTop = 30;
        	var svgMarginBottom = 30;



        	// Compute the scaling factor for the coordinate conversion.

        	var scaleFactorX = (svgWidth - svgMarginLeft - svgMarginRight) / extent.getWidth();

        	var scaleFactorY = (svgHeight - svgMarginTop - svgMarginBottom) / extent.getHeight();

        	var sclfact = Math.min(scaleFactorX, scaleFactorY);


        	var features = layer.getFeatures();
        	paths = []; 
            for(var i=0;i<features.length;i++) {
                var feat = features[i];
        		var geom = feat.getGeometry();
        		var path = geom.toSVGPath(extent, sclfact, svgMarginLeft, (svgWidth - svgMarginRight), svgMarginTop, (svgHeight - svgMarginBottom));
        		paths.push(path);
            };
            return paths;
        };

        var func = function(opts, callback){
            options.callback = callback;
            for(var key in options){
                if(typeof(opts[key]) !== "undefined"){
                    options[key] = opts[key];
                }
            }
            var that = {};
            that.run = function(shapes){
                var cg = Cartogram();
                var lm = LayerManager();
                var features = [];
                for(var i=0;i<shapes.length;i++){
                    var f = Feature(shapes[i].id);
                    var gf = GeometryFactory();
                    var polys = gf.polygonsFromPoints(shapes[i].coordinateLists);
                    f.setAttribute("geom", gf.createMultiPolygon(polys));
                    f.setAttribute("masterAttribute", shapes[i].value);
                    features.push(f);
                }
                lm.addLayer("default", Layer("master", "#fff", features, lm));
                cg.setLayerManager(lm);
                cg.setMasterLayer("master");
                cg.setMasterAttribute("masterAttribute");
                cg.setMasterAttributeIsDensityValue(false); // must be weighted by polygon area
                cg.setSlaveLayers([]);
                cg.setConstrainedDeformationLayers(null);
                var layers = cg.construct();
                var layer = layers[0];
                var paths = layerToSVGPaths(layer);
            	var xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="591.50403" height="800.50403" viewBox="0 0 591.504 800.504" xml:space="preserve" style="overflow:visible">'+
                    '<g id="g2886" style="display:inline">';
                for(var i=0;i<paths.length;i++){
                    xml += '<path d="'+paths[i]+'" style="fill:#000080;stroke:#800080;stroke-width:0.5" />';
                }
                xml += '</g></svg>';

                callback({"method": "result", "payload": xml});
            };
        return that;
    };
    return func;
}());


onmessage = function(event) {  
    var options = event.data.options;
    var shapes = event.data.shapes;
    var cb = function(o){
        postMessage(o);
    };
    var cart = CARTOGRAM(options, cb);
    cart.run(shapes);
};