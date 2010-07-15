

var LayerManager = (function(){
    return function(){
        var that = {};
        that.layerCollection = [];
        that.addLayer = function(categoryName, lyr){
            that.layerCollection.push({"category":categoryName, "layer": lyr});
            return lyr;
        };
        that.getLayer = function(name){
            for(var i=0;i<that.layerCollection.length;i++){
                if(that.layerCollection[i].layer.getName() == name){
                    return that.layerCollection[i].layer;
                }
            }
            return null;
        };
        return that;
    };
}());


var Layer = (function(){
    return function(name, fillColor, features, layerManager){
        var that = {"name": name, "features": features, "fillColor": fillColor, "layerManager": layerManager};
        that.getEnvelope = function(){
            if (typeof(that.envelope) === "undefined"){
                that.envelope = Envelope();
                for (var i=0;i< that.features.length;i++){
                    that.envelope.expandToIncludeEnvelope(that.features[i].getEnvelope());
                }
            }
            return that.envelope;
        };
        that.getLayerManager = function(){
            return that.layerManager;
        };
        that.getFillColor = function(){
            return that.fillColor;
        };
        that.getFeatures = function(){
            return that.features;
        };
        that.getName = function(){
            return that.name;
        };
        return that;
    };
}());



var CartogramLayer = (function(){
    var that = {};
    that.layer = null;
    that.cleanAttributeValues = function(layer, attrName){
        var features = layer.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
            var attrValue = feat.getAttribute(attrName);
            if (isNaN(attrValue) || attrValue == null) {
                feat.setAttribute(attrName, 0.0);
            }
        }
    };
    
    that.addAttribute = function(lyr, name, type){
        var features = lyr.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
            if(typeof(feat.getAttribute(name)) === "undefined"){
                feat.setAttribute(name,null);
            }
        }
    };
    
    that.addDensityAttribute = function(layer, populationAttr, densityAttr){
		CartogramLayer.addAttribute(layer, densityAttr, null);
		
        var features = layer.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
			var geom = feat.getGeometry();
			var geomArea = geom.getArea();
			var attrValue = CartogramFeature.getAttributeAsDouble(feat, populationAttr);
			
			var density = 0.0;
			if (geomArea > 0 && attrValue > 0){
				density = attrValue / geomArea;
            }
			feat.setAttribute(densityAttr, density);
			
		}
	
	};	// CartogramLayer.addDensityAttribute
	
	that.meanDensityWithAttribute = function(layer, attrName){
		var totalArea = CartogramLayer.totalArea(layer);
		var meanDensity = 0.0;
	
        var features = layer.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
			var geom = feat.getGeometry();
			var geomArea = geom.getArea();
			var attrValue = CartogramFeature.getAttributeAsDouble(feat, attrName);
			meanDensity += (geomArea / totalArea) * attrValue;
		}
		return meanDensity;
	};
	
	that.totalArea = function(layer){
		var totalArea = 0.0;
        var features = layer.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
			var geom = feat.getGeometry();
			totalArea += geom.getArea();
		}
		return totalArea;
	};	// CartogramLayer.totalArea
    
    that.meanValueForAttribute = function(masterLayer, mMasterAttribute){
        
    };
    
    that.replaceAttributeValue = function(masterLayer, mMasterAttribute, missVal, mean){
        
    };
    
    that.regularizeLayer = function(masterLayer, mMaximumSegmentLength){
        
    };
    
    that.projectLayerWithGrid = function(lyr, grid){
        // Create a new FeatureDataset for storing our projected features.
/*		FeatureSchema fs = lyr.getFeatureCollectionWrapper().getFeatureSchema();
		
		// Make a copy of the FeatureSchema.
		FeatureSchema fs2 = (FeatureSchema)fs.clone();
		FeatureDataset fd = new FeatureDataset(fs2);*/
		
	    var fd = [];
		// Project each Feature one by one.
        var features = lyr.getFeatures();
        for(var i=0;i<features.length;i++) {
            var feat = features[i];
			var projFeat = CartogramFeature.projectFeatureWithGrid(feat, grid);
			
			if (projFeat != null)
			{
//				projFeat.setSchema(fs2);
				fd.push(projFeat);
			}
		}
		var projectedLayer = Layer(lyr.getName(), lyr.getFillColor(), fd, lyr.getLayerManager());
		// Create a layer with the FeatureDataset.
		
		return projectedLayer;
    };
    
    that.importSVG = function(svgDom){
        
    };
    return that;
}());