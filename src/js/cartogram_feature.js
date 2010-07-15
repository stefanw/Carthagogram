/*

	Copyright 2007-2008 91NORD

	This program is free software; you can redistribute it and/or
	modify it under the terms of the GNU General Public License as
	published by the Free Software Foundation; either version 2 of the
	License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but
	WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
	02110-1301, USA.
	
*/


/**
 * Represents a basic feature from the Jump package, but with a couple
 * of additional methods useful for the cartogram project.
 * @author Christian Kaiser <Christian.Kaiser@91nord.com>
 * @version v1.0.0, 2007-11-30
 */
 
var FeatureSchema = (function(){
 return function(){
     var that = {};
     that.attrs = {};
     that.addAttribute = function(name, value){
         that.attrs[name] = value;
     };
     that.getAttribute = function(name){
         return that.attrs[name];
     };
     return that;
 };
}());

var BasicFeature = (function(){
 return function(_id){
     var that = {"_id": _id};
     that.attrs = {};
     that.getEnvelope = function(){
         return that.getGeometry().getEnvelope();
     };
     that.setAttribute = function(name, value){
         that.attrs[name] = value;
     };
     that.getAttribute = function(name){
         return that.attrs[name];
     };
     that.getGeometry = function(){
         return that.attrs["geom"];
     };
     that.setGeometry = function(geom){
         that.attrs["geom"] = geom;
     };
     that.clone = function(withoutGeom){
         var c = {};
         for (var k in that){
             c[k] = that[k];
         }
         if (withoutGeom){
             c.geometry = undefined;
         }
         return c;
     };
     return that;
 };
}());

var Feature = BasicFeature;

var FeatureDataset = (function(){
 return function(){
     var that = {};
     that.features = [];
     that.add = function(f){
         that.features.push(f);
     };
     return that;
 };
}());


var CartogramFeature = (function(){
	var that = {};
	that.getAttributeAsDouble = function(feat, attrName){
		return feat.getAttribute(attrName);		
	};	// CartogramFeature.getAttributeAsDouble
	
	
	that.setDoubleAttributeValue = function(feat, attrName, value){
		feat.setAttribute(attrName, value);
	};	// CartogramFeature.setDoubleAttributeValue
	
	
	
	
	
	/**
	 * Projects the provided Feature using the provided cartogram grid.
	 */
	that.projectFeatureWithGrid = function(feat, grid){
		var geom = feat.getGeometry();
		var gf = geom.getFactory();
		var geomType = geom.getGeometryType();
		
		// Create a copy of the Feature, but without the geometry.
		var projFeat = feat.clone(true);
		
		/*
		if (geomType == "Point")
		{
			var pt = geom;
			var c = grid.projectPoint(pt.getX(), pt.getY());
			var pt2 = gf.createPoint(Coordinate(c[0], c[1]));
			projFeat.setGeometry(pt2);
			
		}
		else if (geomType == "LineString")
		{
			var l1 = geom;
			var cs = grid.projectCoordinates(l1.getCoordinates());
			var l2 = gf.createLineString(cs);
			projFeat.setGeometry(l2);
			
		}
		else if (geomType == "LinearRing")
		{
			LinearRing l1 = (LinearRing)geom;
			Coordinate[] cs = grid.projectCoordinates(l1.getCoordinates());
			LinearRing l2 = gf.createLinearRing(cs);
			projFeat.setGeometry(l2);
			
		}
		else if (geomType == "MultiLineString")
		{
			MultiLineString mls1 = (MultiLineString)geom;
			int ngeoms = mls1.getNumGeometries();
			LineString[] lineStrings = new LineString[ngeoms];
			for (int geomcnt = 0; geomcnt < ngeoms; geomcnt++)
			{
				LineString l1 = (LineString)mls1.getGeometryN(geomcnt);
				Coordinate[] cs = grid.projectCoordinates(l1.getCoordinates());
				lineStrings[geomcnt] = gf.createLineString(cs);
			}
			MultiLineString mls2 = gf.createMultiLineString(lineStrings);
			projFeat.setGeometry(mls2);
			
		}
		else if (geomType == "MultiPoint")
		{
			MultiPoint mp1 = (MultiPoint)geom;
			int npts = mp1.getNumPoints();
			Point[] points = new Point[npts];
			for (int ptcnt = 0; ptcnt < npts; ptcnt++)
			{
				Point pt = (Point)mp1.getGeometryN(ptcnt);
				Coordinate c = 
					grid.projectPointAsCoordinate(pt.getX(), pt.getY());
				points[ptcnt] = gf.createPoint(c);
			}
			MultiPoint mp2 = gf.createMultiPoint(points);
			projFeat.setGeometry(mp2);
			
		}*/
		if (geomType == "Polygon")
		{
			var p1 = geom;
            var exteriorRingCoords = grid.projectCoordinates(p1.getExteriorRing());
			var exteriorRing = gf.createLinearRing(exteriorRingCoords);
			var interiorRings = [];
			var nrings = p1.getNumInteriorRing();
			for (var ringcnt = 0; ringcnt < nrings; ringcnt++) {
				var interiorRingCoords = grid.projectCoordinates(p1.getInteriorRingN(ringcnt));
				interiorRings.push(interiorRingCoords);
			}
			var p2 = gf.createPolygon(exteriorRing.getPoints(), interiorRings);
			console_log("transformed polygon");
			console_log(p2);
			console_log(grid);
			projFeat.setGeometry(p2);
		}
		else if (geomType == "MultiPolygon") {
			var mp1 = geom;
			var polys = mp1.getPolygons();
			var npolys = polys.length;
			for(var polycnt = 0; polycnt < npolys; polycnt++) {
				var p1 = polys[polycnt];
				var exteriorRingCoords = grid.projectCoordinates(p1.getExteriorRing());
				var exteriorRing = gf.createLinearRing(exteriorRingCoords);
				var interiorRings = [];
				var nrings = p1.getNumInteriorRing();
				for (var ringcnt = 0; ringcnt < nrings; ringcnt++) {
					var interiorRingCoords = grid.projectCoordinates(p1.getInteriorRingN(ringcnt));
					interiorRings.push(interiorRingCoords);
				}
				polys[polycnt] = gf.createPolygon(exteriorRing.getPoints(), interiorRings);
			}
			
			var mp2 = gf.createMultiPolygon(polys);
			
			projFeat.setGeometry(mp2);
		}
		else
		{
			console_log("Unknown feature type: ", geomType);
		}
		return projFeat;
	
	};	// CartogramFeature.projectFeatureWithGrid
	
	
	
	
	
	/**
	 * Regularizes a geometry.
	 */
	that.regularizeGeometry = function(geom, maxlen){
    	    console.error("Unimplemented");
		/*
		GeometryFactory gf = geom.getFactory();
		String geomType = geom.getGeometryType();
		
		if (geomType == "Point" || geomType == "MultiPoint")
		{
			return geom;
		}
		
		if (geomType == "MultiLineString")
		{
			MultiLineString mls = (MultiLineString)geom;
			int ngeoms = mls.getNumGeometries();
			LineString[] lss = new LineString[ngeoms];
			for (int lscnt = 0; lscnt < ngeoms; lscnt++)
			{
				LineString ls = (LineString)mls.getGeometryN(lscnt);
				lss[lscnt] = (LineString)
					CartogramFeature.regularizeGeometry(ls, maxlen);
			}
			mls = gf.createMultiLineString(lss);
			return mls;
		}
		
		if (geomType == "MultiPolygon")
		{
			MultiPolygon mpoly = (MultiPolygon)geom;
			int ngeoms = mpoly.getNumGeometries();
			Polygon[] polys = new Polygon[ngeoms];
			for (int polycnt = 0; polycnt < ngeoms; polycnt++)
			{
				Polygon poly = (Polygon)mpoly.getGeometryN(polycnt);
				polys[polycnt] = (Polygon)
					CartogramFeature.regularizeGeometry(poly, maxlen);
			}
			mpoly = gf.createMultiPolygon(polys);
			return mpoly;
		}


		
		if (geomType == "LineString")
		{
			Coordinate[] cs1 = geom.getCoordinates();
			Coordinate[] cs2 = 
				CartogramFeature.regularizeCoordinates(cs1, maxlen);
				
			LineString ls = gf.createLineString(cs2);
			return ls;
		}
		
		
		if (geomType == "LinearRing")
		{
			Coordinate[] cs1 = geom.getCoordinates();
			Coordinate[] cs2 =
				CartogramFeature.regularizeCoordinates(cs1, maxlen);
			
			LinearRing lr = gf.createLinearRing(cs2);
			return lr;
		}
		
		
		if (geomType == "Polygon")
		{
			Polygon p = (Polygon)geom;
			LineString shell = p.getExteriorRing();
			Coordinate[] shellCoords = CartogramFeature.regularizeCoordinates(
				shell.getCoordinates(), maxlen);
			LinearRing regShell = gf.createLinearRing(shellCoords);
			
			int nholes = p.getNumInteriorRing();
			LinearRing[] holes = null;
			if (nholes > 0)
				holes = new LinearRing[nholes];
				
			for (int holecnt = 0; holecnt < nholes; holecnt++)
			{
				LineString hole = p.getInteriorRingN(holecnt);
				Coordinate[] holeCoords = 
					CartogramFeature.regularizeCoordinates(
					hole.getCoordinates(), maxlen);
					
				holes[holecnt] = gf.createLinearRing(holeCoords);
			}
			
			Polygon p2 = gf.createPolygon(regShell, holes);
			
			return p2;
		}
		*/
		return null;
	
	};	// CartogramFeature.regularizeGeometry






	/**
	 * Regularizes a coordinate sequence.
	 */
	that.regularizeCoordinates = function(coords, maxlen){
	    console.error("Unimplemented");
	/*
		int ncoords = coords.length;
		if (ncoords < 1)
			return coords;
		
		// The vector where we will temporarily store the regularized
		// coordinates.
		Vector newCoords = new Vector();
		newCoords.add(coords[0]);
		
		
		// Compute for each line segment the length. If the length is 
		// more than maxlen, we divide it in 2 until all the line segments
		// are shorter than maxlen.
		
		double sqMaxLen = maxlen * maxlen;
		
		for (int i = 0; i < (ncoords-1); i++)
		{
			
			double sqSegLen = 
				(coords[i].x - coords[i+1].x) * (coords[i].x - coords[i+1].x) +
				(coords[i].y - coords[i+1].y) * (coords[i].y - coords[i+1].y);
			
			if (sqSegLen > sqMaxLen)
			{
				double seglen = Math.sqrt(sqSegLen);
				
				// How much times we have to divide the line segment into 2?
				double dblndiv = Math.log(seglen/maxlen) / Math.log(2);
				dblndiv = Math.ceil(dblndiv);
				int ndiv = (int)Math.round(dblndiv);
				int nseg = (int)Math.round(Math.pow(2.0, dblndiv));
				
				// Compute the vector AB (from coord i to coord i+1).
				double abx = coords[i+1].x - coords[i].x;
				double aby = coords[i+1].y - coords[i].y;
				
				// Compute the new coordinates.
				for (int j = 1; j < nseg; j++)
				{
					double t = (double)j / (double)nseg;
					
					// Now we can compute the coordinate for the new point.
					double cx = coords[i].x + t * abx;
					double cy = coords[i].y + t * aby;
					Coordinate c = new Coordinate(cx, cy);
					newCoords.add(c);
				}
				
			}
			
			newCoords.add(coords[i+1]);
			
		}
	
	
		// Convert the vector holding all coordinates into an array.
		ncoords = newCoords.size();
		Coordinate[] newCoordsArray = new Coordinate[ncoords];
		for (int coordcnt = 0; coordcnt < ncoords; coordcnt++)
		{
			newCoordsArray[coordcnt] = (Coordinate)newCoords.get(coordcnt);
		}
	
		return newCoordsArray;
		*/
	};	// CartogramFeature.regularizeCoordinates

	return that;
}());	// CartogramFeature
