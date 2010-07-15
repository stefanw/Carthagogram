var Envelope = (function(){
    var func = function(x1, x2, y1, y2){
        var that = {};
        that.setToNull = function() {
            that.minx = 0;
            that.maxx = -1;
            that.miny = 0;
            that.maxy = -1;
        };
        if(typeof(x1) === "undefined"){
            that.setToNull();
        } else{
            if (x1 < x2) {
                that.minx = x1;
                that.maxx = x2;
            } else {
                that.minx = x2;
                that.maxx = x1;
            }
            if (y1 < y2) {
                that.miny = y1;
                that.maxy = y2;
            } else {
                that.miny = y2;
                that.maxy = y1;
            }
        }
        that.toString = function(){return "Envelope ("+that.minx+","+that.miny+","+that.maxx+","+that.maxy+")";};
        that.getWidth = function(){return Math.abs(that.maxx - that.minx);};
        that.getHeight = function(){return Math.abs(that.maxy - that.miny);};
        that.getMinX = function(){return that.minx;};
        that.getMinY = function(){return that.miny;};
        that.getMaxX = function(){return that.maxx;};
        that.getMaxY = function(){return that.maxy;};
        
        that.isNull = function() {
            return that.maxx < that.minx;
        };
        
        that.expandToInclude = function(x,y){
            if (typeof(y) === "undefined"){
                if (typeof(x) === "array"){
                    that.expandToIncludePoints(x);
                    return;
                }
                that.expandToIncludeEnvelope(x);
                return;
            }
            if (that.isNull()) {
                that.minx = x;
                that.maxx = x;
                that.miny = y;
                that.maxy = y;
            } else {
                if (x < that.minx) {
                    that.minx = x;
                }
                if (x > that.maxx) {
                    that.maxx = x;
                }
                if (y < that.miny) {
                    that.miny = y;
                }
                if (y > that.maxy) {
                    that.maxy = y;
                }
            }
        };
        
        that.expandToIncludePoints = function(points){
            for(var i=0;i<points.length;i++){
                that.expandToInclude(points[i].x, points[i].y);
            }
        };
        
        that.expandToIncludeEnvelope = function(other) {
           if (other.isNull()) {
               return;
           }
           if (that.isNull()) {
               that.minx = other.getMinX();
               that.maxx = other.getMaxX();
               that.miny = other.getMinY();
               that.maxy = other.getMaxY();
           } else {
               if (other.minx < that.minx) {
                   that.minx = other.minx;
               }
               if (other.maxx > that.maxx) {
                   that.maxx = other.maxx;
               }
               if (other.miny < that.miny) {
                   that.miny = other.miny;
               }
               if (other.maxy > that.maxy) {
                   that.maxy = other.maxy;
               }
           }
        };
        that.expandBy = function(deltaX,deltaY){
            if (that.isNull()){
                return;
            }
            that.minx -= deltaX;
            that.maxx += deltaX;
            that.miny -= deltaY;
            that.maxy += deltaY;

            // check for envelope disappearing
            if (that.minx > that.maxx || that.miny > that.maxy){
                that.setToNull();
            }
        };
        that.contains = function(x,y) {
            if (typeof(y) === "undefined"){
                if (typeof(x.x) === "undefined"){
                    return that.containsEnvelope(x);
                }
                return that.containsPoint(x);
            }
            return x >= that.minx && x <= that.maxx && y >= that.miny && y <= that.maxy;
        };
        that.containsPoint = function(p){
            return that.contains(p.x, p.y);
        };
        that.containsEnvelope = function(other) {
            if (that.isNull() || other.isNull()) {
                return false;
            }
            return other.getMinX() >= that.minx && other.getMaxX() <= that.maxx && other.getMinY() >= that.miny && other.getMaxY() <= that.maxy;
        };
        return that;
    };
    
    func.computeFromPoints = function(points){
        var minx = Infinity;
        var maxx = -Infinity;
        var miny = Infinity;
        var maxy = -Infinity;
        for(var i=0;i<points.length;i++){
            var p = points[i];
            if(p.x < minx){
                minx = p.x;
            }
            if(p.x > maxx){
                maxx = p.x;
            }
            if(p.y < miny){
                miny = p.y;
            }
            if(p.y > maxy){
                maxy = p.y;
            }
        }
        return func(minx, maxx, miny, maxy);
    };
    
    return func;
}());


var HelperGeometry = (function(){
    var that = {};
    that.areaOfTriangle = function(ax, ay, bx, by, cx, cy) {

        var ux = ax - cx;
        var uy = ay - cy;
        var vx = bx - cx;
        var vy = by - cy;

        var A = 0.5 * (ux * vy - uy * vx);

        return Math.abs(A);
    };
    
    that.areaOfQuadrangle = function(ax, ay, bx, by, cx, cy, dx, dy) {
        var A1 = HelperGeometry.areaOfTriangle(ax, ay, bx, by, cx, cy);
        var A2 = HelperGeometry.areaOfTriangle(ax, ay, cx, cy, dx, dy);
        return (A1 + A2);
    };
    
    that.intersectionOfSegments = function(ax, ay, bx, by, cx, cy, dx, dy) {
		// This function has been adapted from the JUMP project,
		// the function GeoUtils.intersectSegments.

		var vx = bx - ax;
		var vy = by - ay;
        var wx = dx - cx;
		var wy = dy - cy;

		var n1 = wy * (cx - ax) - wx * (cy - ay);
		var n2 = vy * (cx - ax) - vx * (cy - ay);
		var d = wy * vx - wx * vy;

        if (d != 0.0)
        {
            var t1 = n1 / d;
            var t2 = n2 / d;
			var ex = ax + vx * t1;
			var ey = ay + vy * t1;
            var epsilon = 0.001;
            var lowbound = 0.0 - epsilon;
            var hibound = 1.0 + epsilon;
            var onP1P2 = (t1 >= lowbound) && (t1 <= hibound);
    		var onP3P4 = (t2 >= lowbound) && (t2 <= hibound);
    		if (onP1P2 && onP3P4) {
				var e = [ex,ey];
				return e;
			}
    		else{
				// The intersection point does not lie on one or both segments
    			return null;
			}
        }
        else {
			// The lines are parallel; no intersection
            return null;
        }
	};
	
    return that;
}());


var Coordinate = (function(){
    return function(x,y){
        var that = {"x": x, "y": y};
        that.toString = function(){
            return "Coordinate("+x+","+y+")";
        };
        return that;
    };
}());

var CGAlgorithms = (function(){
    var that = {};
    that.signedArea = function(ring) {
        if (ring.length < 3){
            return 0.0;
        }
        var sum = 0.0;
        for (var i = 0; i < ring.length; i++) {
            var bx = ring[i].x;
            var by = ring[i].y;
            if(i+1 < ring.length){
                var cx = ring[i + 1].x;
                var cy = ring[i + 1].y;
            } else {
                var cx = ring[0].x;
                var cy = ring[0].y;
            }
            sum += (bx*cy) - (cx*by);
        }
        return Math.abs(sum)*0.5;;
    };
    return that;
}());

var Polygon = (function(){
    var func = function(listOfPoints, factory){
        if(typeof(factory) === "undefined"){
            throw "no factory given";
        }
        var that = {"points": listOfPoints, "holes": [], "factory": factory};
        that.toString = function(){
            return "Polygon ("+that.points.length+")";
        };
        that.getFactory = function(){
            return that.factory;
        };
        that.getNumGeometries = function(){
            return 1 + that.holes.length;
        };
        that.getGeometryN = function(n){
            if(n==0){
                return that.points;
            } else {
                return that.holes[n-1];
            }
        };
        that.toSVGPath = function(env, scaleFactor, minX, maxX, minY, maxY){
          	var path = "M ";

			if (that.points.length == 0 && that.holes.length == 0) {return "";}
			
			for (var i=0; i < that.points.length; i++) {
				var x = (that.points[i].x - env.getMinX()) * scaleFactor + minX;
				var y = (that.points[i].y - env.getMinY()) * scaleFactor + minY;
/*				var y = ((that.points[i].y - env.getMinY()) / env.getHeight());
				y = 1.0 - y;
				y = (y * env.getHeight() * scaleFactor) + minY; */
				
				path = path + x +","+ y +" ";
				
				if (i < (that.points.length - 1)){
					path = path + "L ";
                }
			}
		    path = path + "Z ";
			
			for (var h=0; h < that.holes.length; h++) {
			    path = path + "M ";
			    for(var i=0;i<that.holes[h].length;i++){
    				var x = (that.holes[h][i].x - env.getMinX()) * scaleFactor + minX;
    				var y = (that.holes[h][i].y - env.getMinY()) * scaleFactor + minY;
/*    				var y = ((that.holes[h][i].y - env.getMinY()) / env.getHeight());
    				y = 1.0 - y;
    				y = (y * env.getHeight() * scaleFactor) + minY;*/
				
    				path = path + x +","+ y +" ";
				
    				if (i < (that.holes[h].length - 1)){
    					path = path + "L ";
    				}
				}
			    path = path + "Z ";
			}
			return path;
        };
        that.getGeometryType = function(){
            return "Polygon";
        };
        that.addHole = function(poly){
            that.holes.push(poly);
        };
        that.setHoles = function(polys){
            that.holes = polys;
        };
        that.getNumInteriorRing = function(){
            return that.holes.length;
        };
        that.getInteriorRingN = function(n){
            return that.holes[n];
        };
        that.getPoints = function(){
            return that.points;
        };
        that.getExteriorRing = that.getPoints;
        that.getEnvelope = function(){
            if(typeof(that.envelope) === "undefined"){
                that.envelope = Envelope();
                for(var i=0;i<that.points.length;i++){
                    that.envelope.expandToIncludePoints(that.points);
                }
            }
            return that.envelope;
        };
        that.getEnvelopeInternal = that.getEnvelope;
        that.contains = function(poly){
            if (!that.getEnvelope().contains(poly.getEnvelope())){
                return false;
            }
            var ppoints = poly.getPoints();
            for(var i=0;i<ppoints.length;i++){
                var point = ppoints[i];

                if(!that.getEnvelope().contains(point)) {
                    return false;
                }
                
                var inPoly = false;
                var j = that.points.length - 1;

                for(var i=0; i < that.points.length; i++) { 
                    var vertex1 = that.points[i];
                    var vertex2 = that.points[j];

                    if (vertex1.x < point.x && vertex2.x >= point.x || vertex2.x < point.x && vertex1.x >= point.x)  {
                        if (vertex1.y + (point.x - vertex1.x) / (vertex2.x - vertex1.x) * (vertex2.y - vertex1.y) < point.y) {
                            inPoly = !inPoly;
                        }
                    }

                    j = i;
                }
                if(!inPoly){
                    return false;
                }
            }
            return true;
        };
        
        that.intersects = function(poly){
            var ppoints = poly.getPoints();
            for(var i=0;i<ppoints.length;i++){
                var point = ppoints[i];

                var inPoly = false;
                var j = that.points.length - 1;

                for(var i=0; i < that.points.length; i++) { 
                    var vertex1 = that.points[i];
                    var vertex2 = that.points[j];

                    if (vertex1.x < point.x && vertex2.x >= point.x || vertex2.x < point.x && vertex1.x >= point.x)  {
                        if (vertex1.y + (point.x - vertex1.x) / (vertex2.x - vertex1.x) * (vertex2.y - vertex1.y) < point.y) {
                            inPoly = !inPoly;
                        }
                    }

                    j = i;
                }
                if(inPoly){
                    return true;
                }
            }
            return false;
        };
        
        that.getArea = function() {
            if(typeof(that.area) === "undefined"){
                that.area = 0.0;
                that.area += Math.abs(CGAlgorithms.signedArea(that.points));
                for (var i = 0; i < that.holes.length; i++) {
                    that.area -= Math.abs(CGAlgorithms.signedArea(that.holes[i]));
                }
            }
            return that.area;
        };
        return that;
    };
    return func;
}());

var MultiPolygon = (function(){
    var func = function(listOfPolygons, factory){
        var that = {"polygons": listOfPolygons, "factory": factory};
        that.toString = function(){
            return "MultiPolygon ("+that.polygons.length+")";
        };
        that.getEnvelope = function(){
            if(typeof(that.envelope) === "undefined"){
                that.envelope = that.polygons[0].getEnvelope();
                for(var i=1;i<that.polygons.length;i++){
                    that.envelope.expandToIncludeEnvelope(that.polygons[i].getEnvelope());
                }
            }
            return that.envelope;
        };
        that.getEnvelopeInternal = that.getEnvelope;
        that.getPolygons = function(){
            return that.polygons;
        };
        that.getFactory = function(){
            return that.factory;
        };
        that.getGeometryType = function(){
            return "MultiPolygon";
        };
        that.getNumGeometries = function(){
            var n = 0;
            for(var i=0;i<polygons.length;i++){
                n += polygons[i].getNumGeometries();
            }
            return n;
        };
        that.toSVGPath = function(env, scaleFactor, minX, maxX, minY, maxY){
			var path = "";
			for (var i=0; i < that.polygons.length; i++) {
			    path += that.polygons[i].toSVGPath(env, scaleFactor, minX, maxX, minY, maxY);
			}
			return path;
		};
        that.getArea = function() {
            var area = 0.0;
            for (var i = 0; i < that.polygons.length; i++) {
                area += that.polygons[i].getArea();
            }
            return area;
        };
        that.contains = function(geom){
            for (var i = 0; i < that.polygons.length; i++) {
                var contained = that.polygons[i].contains(geom);
                if (contained) {return true;}
            }
            return false;
        };
        that.intersects = function(geom){
            for (var i = 0; i < that.polygons.length; i++) {
                var intersects = that.polygons[i].intersects(geom);
                if (intersects) {return true;}
            }
            return false;
        };
        return that;
    };
    return func;
}());

var GeometryFactory = (function(){
    var func = function(){
        var that = {};
        that.polygonsFromPoints = function(listOfPoints){
            var polys = [];
            for (var i=0;i<listOfPoints.length;i++){
                polys.push(Polygon(listOfPoints[i], that));
            }
            for (var i=0;i<polys.length;i++){
                for (var j=0;j<polys.length;j++){
                    if(i == j || polys[j] == null || polys[i] == null){continue;}
                    if (polys[i].contains(polys[j])){
                        polys[i].addHole(polys[j]);
                        polys[j] = null;
                    }
                }
            }
            var listOfPolygons = [];
            for (var i=0;i<polys.length;i++){
                if(polys[i] !== null){
                    listOfPolygons.push(polys[i]);
                }
            }
            return listOfPolygons;
        };
        that.toGeometry = function(env){
            return Polygon([Coordinate(env.maxx, env.maxy), Coordinate(env.minx, env.maxy), Coordinate(env.minx, env.miny), Coordinate(env.maxx, env.miny)], that);
        };
        that.createLineString = function(coords){
            return Polygon(coords, that);
        };
        that.createLinearRing = function(coords){
            return Polygon(coords, that);
        };
        that.createPolygon = function(ring, holes){
            var p = Polygon(ring, that);
            p.setHoles(holes);
            return p;
        };
        that.createMultiPolygon = function(polys){
            return MultiPolygon(polys, that);
        };
        return that;
    };

    return func;
}());