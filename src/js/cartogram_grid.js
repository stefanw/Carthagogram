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
 * The cartogram grid class represents the grid which is overlaid on
 * all the layers and which is used for the deformation computation.
 * The grid has nodes and cells. Each node has x/y-coordinates, and each
 * cell has a density value.
 * @author Christian.Kaiser@91nord.com
 * @version v1.0.0, 2007-11-30
 */
var CartogramGrid = (function(){
    return function(gridSizeX, gridSizeY, env){
        var that = {};

     	that.mGridSizeX = gridSizeX;
     	that.mGridSizeY = gridSizeY;

     	that.mEnvelope = env;

	
	
	
    	/**
    	 * The arrays for storing the nodes and the cells.
    	 */
    	that.mNodeX = undefined;
    	that.mNodeY = undefined;
    	that.mCellOriginalDensity = undefined;
    	that.mCellCurrentDensity = undefined;
    	that.mCellConstrainedDeformation = undefined;
	
    	/**
    	 * The mean density is the optimal density for a cell.
    	 */
    	that.mMeanDensity = -1.0;
	
	
    	/**
    	 * The size of one cell in x and y direction. This is used for
    	 * internal purpose only. Do not modify these values directly.
    	 */
    	that.mCellSizeX = null;
    	that.mCellSizeY = null;
	
	
    	/**
    	 * The constructor for the cartogram grid.
    	 */
    	// Store the attributes.

    	// Allocate memory for the grid arrays.
    	that.mNodeX = _buildArray(gridSizeX,gridSizeY);
    	that.mNodeY = _buildArray(gridSizeX,gridSizeY);
    	that.mCellOriginalDensity = _buildArray(gridSizeX-1,gridSizeY-1);
    	that.mCellCurrentDensity = _buildArray(gridSizeX-1,gridSizeY-1);
    	that.mCellConstrainedDeformation = _buildArray(gridSizeX-1,gridSizeY-1);

    	// Compute the node coordinates.
	
	
	
    	/**
    	 * Returns the grid's bounding box.
    	 * @return an Envelope representing the bounding box.
    	 */
    	that.envelope = function(){
    		return that.mEnvelope;
    	};	// CartogramGrid.envelope

	
    	/**
    	 * Returns the x coordinates array.
    	 */
    	that.getXCoordinates = function(){
    		return that.mNodeX;
    	};
	
    	/**
    	 * Returns the y coordinates array.
    	 */
    	that.getYCoordinates = function(){
    		return that.mNodeY;
    	};
	
	

    	/**
    	 * Computes the node coordinates and fills them into the
    	 * nodeX and nodeY arrays.
    	 */
    	that.computeNodeCoordinates = function(){
				
    		// Verify the grid size.
    		if (that.mGridSizeX <= 0 || that.mGridSizeY <= 0){
    			return;
            }
    		// Compute the size of a cell in x and y.
    		that.mCellSizeX = that.mEnvelope.getWidth() / (that.mGridSizeX - 1);
    		that.mCellSizeY = that.mEnvelope.getHeight() / (that.mGridSizeY - 1);
		
    		var x = that.mEnvelope.getMinX();
    		var y = that.mEnvelope.getMinY();
		

    		// Create all nodes.
    		var i, j;
    		for (j = 0; j < that.mGridSizeY; j++) {
    			for (i = 0; i < that.mGridSizeX; i++){
    				that.mNodeX[i][j] = x;
    				that.mNodeY[i][j] = y;
    				x += that.mCellSizeX;
    			}
				
    			x = that.mEnvelope.getMinX();
    			y += that.mCellSizeY;
		
    		}
    	};	// CartogramGrid.computeNodeCoordinates





    	/**
    	 * Computes the density value given a layer and an attribute name.
    	 * @param layer the master layer
    	 * @param attrName the name of the master attribute
    	 * @param attrIsDensityValue is true if the master attribute is a density
    	 *		  value, and false if it is a population value.
    	 */
    	that.computeOriginalDensityValuesWithLayer = function(layer, attrName, attrIsDensityValue){
	
    		// If the attribute is not a density value, we create a new
    		// attribute for the computed density value.
    		var densityAttrName = attrName;
    		if (!attrIsDensityValue){
    			densityAttrName = attrName + "Density";
			
    			CartogramLayer.addDensityAttribute(layer, attrName, densityAttrName);
    		}
		
    		// Compute the mean density.
    		that.mMeanDensity = CartogramLayer.meanDensityWithAttribute(layer, densityAttrName);
		
		
    		// For each Feature in the layer, we find all grid cells which
    		// are at least in part inside the Feature. We add the density
    		// weighted by the Feature's proportion of coverage of the cell.
    		// For this, we set to 0 all optimal density values. At the same time
    		// we set the current density value to the mean density value and 
    		// the value for constrained deformation to 0.
		
    		var i, j;
    		for (j = 0; j < (that.mGridSizeY-1); j++){
    			for (i = 0; i < (that.mGridSizeX-1); i++){
    				that.mCellCurrentDensity[i][j] = that.mMeanDensity;
    				that.mCellOriginalDensity[i][j] = that.mMeanDensity;
    				that.mCellConstrainedDeformation[i][j] = -1;
    			}
    		}
		
    		var nFeat = layer.getFeatures().length;
    		var featCnt = 0;
		
            var features = layer.getFeatures();
            for(var i=0;i<features.length;i++) {
                var feat = features[i];
    			var progress = 100 + (featCnt * 100 / nFeat);
			

			
    			console_log(progress, "Computing the density for the cartogram grid...", "Treating feature " + (featCnt+1) + " of " + nFeat);
				
			
    			that.fillDensityValueWithFeature(feat, densityAttrName);
			
    			featCnt++;
    		}
		
	
    	};	// CartogramGrid.computeDensityValueWithLayer




    	/**
    	 * Prepares the original grid for a constrained deformation process.
    	 * After this preparation, the grid can be deformed using a cartogram
    	 * algorithm. After this deformation, the grid can be corrected using
    	 * the constrained deformation information by a call to the CartogramGrid
    	 * method conformToConstrainedDeformation.
    	 * @param layers a Vector containing the constrained layer names.
    	 */
    	that.prepareGridForConstrainedDeformation = function(layers){
	
    		if (layers == null){
    			return;
    	    }
    		// For all cells containing a constrained feature and no deformation
    		// feature, we set the constrained cell value to 1.
    		// The cell values of 0 are for deformation cells, and -1 for
    		// empty cells.
	
    		for ( var i=0;i<layers.length;i++){
		    
    			var lyr = layers[i];
    			var featIter = lyr.getFeatureCollectionWrapper();
    			for (var featKey in featIter){
    			    var feat = featIter[featKey];
    				that.prepareGridForConstrainedDeformationWithFeature(feat);
    			}
			
    		}
		
	
    	};	// CartogramGrid.prepareGridForConstrainedDeformation
	




    	/**
    	 * Prepares the grid for constrained deformation using the provided
    	 * feature.
    	 */
    	that.prepareGridForConstrainedDeformationWithFeature = function(feat){
	
    		// Extract the minimum and maximum coordinates from the Feature.
    		var geom = feat.getGeometry();
    		var featEnv = geom.getEnvelopeInternal();
		
    		// Find the minimum and maximum cell indexes for this Feature.
    		var minI = that.originalCellIndexForCoordinateX(featEnv.getMinX());
    		var minJ = that.originalCellIndexForCoordinateY(featEnv.getMinY());
    		var maxI = that.originalCellIndexForCoordinateX(featEnv.getMaxX());
    		var maxJ = that.originalCellIndexForCoordinateY(featEnv.getMaxY());
		
		
    		// Create a new Geometry Factory.
    		// We need to create a new geometry with the cell in order to know
    		// whether the cell intersects with the feature.
    		var gf = GeometryFactory();
		
		
    		var i, j;
    		for (j = minJ; j <= maxJ; j++) {
    			for (i = minI; i <= maxI; i++) {
			
    				// We treat this cell only if it does not intersect with
    				// a deformation feature or if it is already a constrained
    				// deformation cell.
    				if (that.mCellConstrainedDeformation[i][j] == -1){
    					var minX = that.coordinateXForOriginalCellIndex(i);
    					var maxX = minX + that.mCellSizeX;
    					var minY = that.coordinateYForOriginalCellIndex(j);
    					var maxY = minY + that.mCellSizeY;
				
    					var cellEnv = Envelope(minX, maxX, minY, maxY);
    					var cellEnvGeom = gf.toGeometry(cellEnv);
    					if (geom.contains(cellEnvGeom) || geom.intersects(cellEnvGeom)) {
    						that.mCellConstrainedDeformation[i][j] = 1;
    					}
    				}
				
    			}
    		}
	
    	};	// CartogramGrid.prepareGridForConstrainedDeformationWithFeature





    	/**
    	 * Updates the optimal density value for the grid cells inside
    	 * the provided Feature.
    	 * @param feat the CartoramFeature which serves as update source.
    	 * @param densityAttribute the name of the attribute containing the
    	 *        density value for the Feature.
    	 */
    	that.fillDensityValueWithFeature = function(feat, densityAttribute) {
		
    		// Extract the minimum and maximum coordinates from the Feature.
    		var geom = feat.getGeometry();
    		var featEnv = feat.getGeometry().getEnvelopeInternal();
		
    		// Get the density attribute value.
    		var densityValue = CartogramFeature.getAttributeAsDouble(feat, densityAttribute);
		
		
    		// Find the minimum and maximum cell indexes for this Feature.
    		var minI = that.originalCellIndexForCoordinateX(featEnv.getMinX());
    		var minJ = that.originalCellIndexForCoordinateY(featEnv.getMinY());
    		var maxI = that.originalCellIndexForCoordinateX(featEnv.getMaxX());
    		var maxJ = that.originalCellIndexForCoordinateY(featEnv.getMaxY());
		
		
    		// Create a new Geometry Factory.
    		var gf = GeometryFactory();
		
    		var i, j;
    		for (j = minJ; j <= maxJ; j++) {
    			for (i = minI; i <= maxI; i++) {
    				var minX = that.coordinateXForOriginalCellIndex(i);
    				var maxX = minX + that.mCellSizeX;
    				var minY = that.coordinateYForOriginalCellIndex(j);
    				var maxY = minY + that.mCellSizeY;
				
    				var cellEnv = Envelope(minX, maxX, minY, maxY);
    				var cellEnvGeom = gf.toGeometry(cellEnv);
    				if (geom.contains(cellEnvGeom)) {
    					that.mCellOriginalDensity[i][j] = densityValue;
    					that.mCellCurrentDensity[i][j] = densityValue;
    					that.mCellConstrainedDeformation[i][j] = 0;
    				} else if (geom.intersects(cellEnvGeom)) {
    					// The cell is not completely inside the geometry.
    					
/*    					TODO: implement intersection
                        var intersection = geom.intersection(cellEnvGeom);
    					var densityProportion = intersection.getArea() / cellEnvGeom.getArea();
					*/
					    var densityProportion = 0.5;
    					// Add the weighted density value for this feature.
    					that.mCellOriginalDensity[i][j] += densityProportion * densityValue;
					
    					// Substract the weighted mean density value which
    					// was already in the cell.
    					that.mCellOriginalDensity[i][j] -= densityProportion * that.mMeanDensity;
					
    					// Copy the value to the current density array.
    					that.mCellCurrentDensity[i][j] = that.mCellOriginalDensity[i][j];
					
    					// Before the density computation, the value for
    					// the constrained deformation is -1. If this cell
    					// is concerned by one of the features, its value
    					// becomes 0.
    					that.mCellConstrainedDeformation[i][j] = 0;
						
    				}
				
    			}
    		}
	
    	};	// CartogramGrid.fillDensityValueWithFeature
	
	
	
	
	
    	/**
    	 * Corrects the grid for corresponding the constrained deformation
    	 * information computed by the prepareGridForConstrainedDeformation 
    	 * method.
    	 */
    	that.conformToConstrainedDeformation = function()
    	{
	
	
    		// Algorithm outline:
    		// 1. Identify constrained cells.
    		// 2. Is there a node which can move?
    		// 3. If yes, where should this node go?
    		// 4. Is this movement partially or completely feasible?
    		//    (no topologic problem)
    		// 5. If yes, move point.
		
	
    		var i, j;
    		for (j = 0; j < (that.mGridSizeY-1); j++) {
    			for (i = 0; i < (that.mGridSizeX-1); i++){
				
    				if (that.mCellConstrainedDeformation[i][j] == 1) {
					
    					// Can we move a node ?
    					var canMove = false;
					
    					// If there is a corner, we can move.
    					if ((i == 0 && j == 0) || 
    						(i == 0 && j == (that.mGridSizeY-2)) ||
    						(i == (that.mGridSizeX-2) && j == 0) ||
    						(i == (that.mGridSizeX-2) && j == (that.mGridSizeY-1))) {
    						canMove = true;
    					}
					
					
    					// If the cell is on the border but not a corner,
    					// we can move depending on the neighbours.
					
    					else if (i == 0 || i == (that.mGridSizeX-2)) {
    						// Left or right border
    						if (that.mCellConstrainedDeformation[i][j+1] != 0 ||
    							that.mCellConstrainedDeformation[i][j-1] != 0)
    						{
    							canMove = true;
    						}
    					}
					
    					else if (j == 0 || j == (that.mGridSizeY-2)) {
    						// Lower or upper border
    						if (that.mCellConstrainedDeformation[i-1][j] != 0 ||
    							that.mCellConstrainedDeformation[i+1][j] != 0)
    						{
    							canMove = true;
    						}
    					}
					
					
    					// If there is an empty cell or a constrained cell
    					// in the neighbourhood, we can propably move (it
    					// depends on the exact configuration). We have to test
    					// for each node of the cell whether it can move or not.
					
    					if (i > 0 && j > 0 && 
    						i < (that.mGridSizeX-2) && j < (that.mGridSizeY-2))
    					{

    						// Test upper left node.
    						if (that.mCellConstrainedDeformation[i-1][j] != 0 &&
    							that.mCellConstrainedDeformation[i-1][j+1] != 0 &&
    							that.mCellConstrainedDeformation[i][j+1] != 0)
    						{
    							canMove = true;
    						}
					
    						// Test upper right node.
    						if (that.mCellConstrainedDeformation[i][j+1] != 0 &&
    							that.mCellConstrainedDeformation[i+1][j+1] != 0 &&
    							that.mCellConstrainedDeformation[i+1][j] != 0)
    						{
    							canMove = true;
    						}
					
    						// Test lower left node.
    						if (that.mCellConstrainedDeformation[i-1][j] != 0 &&
    							that.mCellConstrainedDeformation[i-1][j-1] != 0 &&
    							that.mCellConstrainedDeformation[i][j-1] != 0)
    						{
    							canMove = true;
    						}
					
    						// Test lower right node.
    						if (that.mCellConstrainedDeformation[i][j-1] != 0 &&
    							that.mCellConstrainedDeformation[i+1][j-1] != 0 &&
    							that.mCellConstrainedDeformation[i+1][j] != 0)
    						{
    							canMove = true;
    						}
    					}
					
					
    					// Try to apply the constrained deformation to the node.
    					if (canMove){
    						that.applyConstrainedDeformationToCell(i, j);
    					}
    				}
				
    			}
    		}
	
    	};	// CartogramGrid.conformToConstrainedDeformation
	
	
	
	
	
	
    	/**
    	 * Tries to give the original form to the provided cell.
    	 */
    	that.applyConstrainedDeformationToCell = function(i, j) {
		
    		// Compute the location where each of the 4 nodes should go.
		
    		// Get the position of each of the 4 nodes.
    		var ulx = that.mNodeX[i][j+1];
    		var uly = that.mNodeY[i][j+1];
    		var urx = that.mNodeX[i+1][j+1];
    		var ury = that.mNodeX[i+1][j+1];
    		var lrx = that.mNodeX[i+1][j];
    		var lry = that.mNodeY[i+1][j];
    		var llx = that.mNodeX[i][j];
    		var lly = that.mNodeY[i][j];
		
		
    		// Compute the ideal x/y values for the cell.
		
    		var minX = (ulx + llx) / 2;
    		var maxX = (urx + lrx) / 2;
    		var minY = (lly + lry) / 2;
    		var maxY = (uly + ury) / 2;
		
    		var edgeLength = Math.sqrt((maxX - minX) * (maxY - minY));
		
    		var diffX = edgeLength - (maxX - minX);
    		var diffY = edgeLength - (maxY - minY);
		
    		minX -= (diffX / 2);
    		maxX += (diffX / 2);
    		minY -= (diffY / 2);
    		maxY += (diffY / 2);
		
		
		
		
    		// Try to move each of the 4 nodes to the new position.
		
    		// Upper left node
    		if ((i == 0 && j == (that.mGridSizeY-2)) ||
    			(i == 0 && that.mCellConstrainedDeformation[i][j+1] != 0) ||
    			(j == (that.mGridSizeY-2) && that.mCellConstrainedDeformation[i-1][j] != 0) ||
    			(that.mCellConstrainedDeformation[i-1][j] != 0 &&
    			 that.mCellConstrainedDeformation[i-1][j+1] != 0 &&
    			 that.mCellConstrainedDeformation[i][j+1] != 0))
    		{
    			that.tryToMoveNode(i, (j+1), minX, maxY);
    		}
		
    		// Upper right node
    		if ((i == (that.mGridSizeX-2) && j == (that.mGridSizeY-2)) ||
    			(i == (that.mGridSizeX-2) && that.mCellConstrainedDeformation[i][j+1] != 0) ||
    			(j == (that.mGridSizeY-2) && that.mCellConstrainedDeformation[i+1][j] != 0) ||
    			(that.mCellConstrainedDeformation[i+1][j] != 0 &&
    			 that.mCellConstrainedDeformation[i+1][j+1] != 0 &&
    			 that.mCellConstrainedDeformation[i][j+1] != 0))
    		{
    			that.tryToMoveNode((i+1), (j+1), maxX, maxY);
    		}
		
    		// Lower right node
    		if ((i == (that.mGridSizeX-2) && j == 0) ||
    			(i == (that.mGridSizeX-2) && that.mCellConstrainedDeformation[i][j-1] != 0) ||
    			(j == 0 && that.mCellConstrainedDeformation[i+1][j] != 0) ||
    			(that.mCellConstrainedDeformation[i+1][j] != 0 &&
    			 that.mCellConstrainedDeformation[i+1][j-1] != 0 &&
    			 that.mCellConstrainedDeformation[i][j-1] != 0))
    		{
    			that.tryToMoveNode((i+1), j, maxX, minY);
    		}
		
    		// Lower left node
    		if ((i == 0 && j == 0) ||
    			(i == 0 && that.mCellConstrainedDeformation[i][j-1] != 0) ||
    			(j == 0 && that.mCellConstrainedDeformation[i-1][j] != 0) ||
    			(that.mCellConstrainedDeformation[i][j-1] != 0 &&
    			 that.mCellConstrainedDeformation[i-1][j-1] != 0 &&
    			 that.mCellConstrainedDeformation[i-1][j] != 0))
    		{
    			that.tryToMoveNode(i, j, minX, minY);
    		}

	
    	};	// CartogramGrid.applyConstrainedDeformationToNode
	
	
	
	
	
	
    	/**
    	 * Tries to move the provided node to the provided location.
    	 * The decision to move or not depends on the neighbourhood structure.
    	 * The topology must be respected in all cases.
    	 */
    	that.tryToMoveNode = function(i, j, x, y){
		
    		// Create a polygon with the neighboring nodes.
    		// If the new location is inside this polygon, we can potentially
    		// move the node. However, we will insure that the point does not
    		// move too far. There is a maximum distance which is 1/10 of the
    		// original cell size.
		
    		var moveDistance = 
    			Math.sqrt(((that.mNodeX[i][j] - x) * (that.mNodeX[i][j] - x)) +
    					  ((that.mNodeY[i][j] - y) * (that.mNodeY[i][j] - y)));
		
		
    		// If the distance to move is too big, we compute a new, closer
    		// location.
    		if (moveDistance > (that.mCellSizeX / 10.0))
    		{
    			var newMoveDistance = that.mCellSizeX / 10.0;
			
    			var moveVectorX = x - that.mNodeX[i][j];
    			var moveVectorY = y - that.mNodeY[i][j];
			
    			var correctionFactor = newMoveDistance / moveDistance;
			
    			x = that.mNodeX[i][j] + (correctionFactor * moveVectorX);
    			y = that.mNodeY[i][j] + (correctionFactor * moveVectorY);
    			moveDistance = newMoveDistance;
    		}
		
		
    		var canMove = true;
		
    		if (i > 0) {
    			if (j < (that.mGridSizeY-2) && that.mNodeX[i-1][j+1] >= x)
    				canMove = false;
			
    			if (that.mNodeX[i-1][j] >= x) canMove = false;
			
    			if (j > 0 && that.mNodeX[i-1][j-1] >= x)
    				canMove = false;
    		}
		
    		if (i < (that.mGridSizeX-2))
    		{
    			if (j < (that.mGridSizeY-2) && that.mNodeX[i+1][j+1] <= x)
    				canMove = false;
			
    			if (that.mNodeX[i+1][j] <= x) canMove = false;
			
    			if (j > 0 && that.mNodeX[i+1][j-1] <= x)
    				canMove = false;
    		}
		
    		if (j > 0)
    		{
    			if (i > 0 && that.mNodeY[i-1][j-1] >= y)
    				canMove = false;
			
    			if (that.mNodeY[i][j-1] >= y) canMove = false;
			
    			if (i < (that.mGridSizeX-2) && that.mNodeY[i+1][j-1] >= y)
    				canMove = false;
    		}
		
    		if (j < (that.mGridSizeY-2))
    		{
    			if (i > 0 && that.mNodeY[i-1][j+1] <= y)
    				canMove = false;
			
    			if (that.mNodeY[i][j+1] <= y) canMove = false;
			
    			if (i < (that.mGridSizeX-2) && that.mNodeY[i+1][j+1] <= y)
    				canMove = false;
    		}
		
		
		
    		if (canMove)
    		{
    			that.mNodeX[i][j] = x;
    			that.mNodeY[i][j] = y;
    		}
		
	
    	};	// CartogramGrid.tryToMoveNode
	
	
	
	
	
	
    	/**
    	 * Scales the density values given the minimum and maximum value.
    	 * @param minValue the new minimum value for the densities.
    	 * @param maxValue the new maximum value for the densities.
    	 */
    	that.scaleDensityValues = function(minValue, maxValue) {
	
    		// We need to find the minimum and maximum density value in order
    		// to find the scaling parameters.
    		var minDensity = that.mCellCurrentDensity[0][0];
    		var maxDensity = that.mCellCurrentDensity[0][0];
		
    		var i, j;
    		for (j = 0; j < (that.mGridSizeY-1); j++)
    		{
    			for (i = 0; i < (that.mGridSizeX-1); i++)
    			{
    				if (that.mCellCurrentDensity[i][j] < minDensity)
    					minDensity = that.mCellCurrentDensity[i][j];
				
    				if (that.mCellCurrentDensity[i][j] > maxDensity)
    					maxDensity = that.mCellCurrentDensity[i][j];
				
    				if (that.mCellOriginalDensity[i][j] < minDensity)
    					minDensity = that.mCellOriginalDensity[i][j];
					
    				if (that.mCellOriginalDensity[i][j] > maxDensity)
    					maxDensity = that.mCellOriginalDensity[i][j];
    			}
    		}
		
		
    		var deltaOldDensity = maxDensity - minDensity;
    		var deltaNewDensity = maxValue - minValue;
    		var conversionFactor = deltaNewDensity / deltaOldDensity;
		
    		for (j = 0; j < (that.mGridSizeY-1); j++)
    		{
    			for (i = 0; i < (that.mGridSizeX-1); i++)
    			{
    				that.mCellCurrentDensity[i][j] = 
    					((that.mCellCurrentDensity[i][j] - minDensity) * 
    					conversionFactor) + minValue;
				
    				that.mCellOriginalDensity[i][j] = 
    					((that.mCellOriginalDensity[i][j] - minDensity) *
    					conversionFactor) + minValue;
    			}
    		}
		
	
    	};	// CartogramGrid.scaleDensityValues
	
	
	
	
	
	
	
	
    	/**
    	 * Converts the provided x coordinate into the grid's cell index.
    	 * @param x the real world x coordinate.
    	 * @return the cell index in x direction.
    	 */
    	that.originalCellIndexForCoordinateX = function(x) {
		
    		if (that.mEnvelope == null)
    			return -1;
		
    		if (x == that.mEnvelope.getMinX())
    			return 0;

    		var dblCellX = (x - that.mEnvelope.getMinX()) / that.mCellSizeX;
    		var cellX = Math.round(Math.ceil(dblCellX) - 1);
    		var intCellX = parseInt(cellX);
    		return intCellX;

    	};	// CartogramGrid.cellIndexForCoordinateX
	
	
	
	
    	/**
    	 * Converts the provided y coordinate into the grid's cell index.
    	 * @param y the real world y coordinate.
    	 * @return the cell index in y direction.
    	 */
    	that.originalCellIndexForCoordinateY = function(y){
	
    		if (that.mEnvelope == null)
    			return -1;
		
    		if (y == that.mEnvelope.getMinY())
    			return 0;

    		var dblCellY = (y - that.mEnvelope.getMinY()) / that.mCellSizeY;
    		var cellY = Math.round(Math.ceil(dblCellY) - 1);
    		var intCellY = parseInt(cellY);
    		return intCellY;
	
    	};	// CartogramGrid.cellIndexForCoordinateY





    	/**
    	 * Converts a grid cell index in x direction into real world
    	 * x coordinate. The coordinate of the cell's lower left corner
    	 * is returned.
    	 * @param i the cell index in x direction.
    	 * @return the x coordinate of the cell's lower left corner.
    	 */
    	that.coordinateXForOriginalCellIndex = function(i){
	
    		if (that.mEnvelope == null)
    			return 0.0;
		
    		var x = that.mEnvelope.getMinX() + (i * that.mCellSizeX);
    		return x;
	
    	};	// CartogramGrid.coordinateXForOriginalCellIndex
	
	
	
	
	
    	/**
    	 * Converts a grid cell index in y direction into real world
    	 * y coordinate. The coordinate of the cell's lower left corner
    	 * is returned.
    	 * @param i the cell index in y direction.
    	 * @return the y coordinate of the cell's lower left corner.
    	 */
    	that.coordinateYForOriginalCellIndex = function(j){
    		if (that.mEnvelope == null)
    			return 0.0;
		
    		var y = that.mEnvelope.getMinY() + (j * that.mCellSizeY);
    		return y;
		
    	};	// CartogramGrid.coordinateYForOriginalCellIndex




    	/**
    	 * Writes the grid into the specified shape file.
    	 * @param shapefile the path to the shape file.
    	 */
    	that.writeToShapefile = function(shapefile){
	
    		// Create a new Feature Schema for our shape file.
    		var fs = FeatureSchema();
		
    		// We add the following attributes to the Feature Schema:
    		// cellId : a serial number starting at 1
    		// geom : the geometry (polygon)
    		// i : the index of the cell in x direction
    		// j : the index of the cell in y direction
    		// origDens : the orignal density of the cell
    		// currDens : the current density of the cell
    		// constr : the constrained deformation value of the cell
    		fs.addAttribute("cellId", AttributeType.INTEGER);
    		fs.addAttribute("geom", AttributeType.GEOMETRY);
    		fs.addAttribute("i", AttributeType.INTEGER);
    		fs.addAttribute("j", AttributeType.INTEGER);
    		fs.addAttribute("origDens", AttributeType.DOUBLE);
    		fs.addAttribute("currDens", AttributeType.DOUBLE);
    		fs.addAttribute("constr", AttributeType.INTEGER);
		
    		// Create a new Geometry Factory for creating our geometries.
    		var gf = GeometryFactory();
		
    		// Create a new Feature Dataset in order to store our new Features.
    		var fd = FeatureDataset(fs);
		
		
    		// Create one Feature for each cell.
    		var i, j;
    		var cellId = 0;
    		for (j = 0; j < (that.mGridSizeY - 1); j++)
    		{
    			for (i = 0; i < (that.mGridSizeX - 1); i++)
    			{
    				cellId++;
				
    				// Extract the coordinates for the cell polygon.
    				var coords = _buildArray(5);
    				coords[0] = Coordinate(that.mNodeX[i][j], that.mNodeY[i][j]);
    				coords[1] = Coordinate(that.mNodeX[i][j+1], that.mNodeY[i][j+1]);
    				coords[2] = Coordinate(that.mNodeX[i+1][j+1], that.mNodeY[i+1][j+1]);
    				coords[3] = Coordinate(that.mNodeX[i+1][j], that.mNodeY[i+1][j]);
    				coords[4] = coords[0];
				
    				// Create the polygon.
    				var poly = gf.createPolygon(coords, []);
				
    				// Create a new Feature.
    				var feat = BasicFeature(fs);
				
    				// Setting the Feature's attributes.
    				feat.setAttribute("cellId", cellId);
    				feat.setAttribute("geom", poly);
    				feat.setAttribute("i", i);
    				feat.setAttribute("j", j);
    				feat.setAttribute("origDens", that.mCellOriginalDensity[i][j]);
    				feat.setAttribute("currDens", that.mCellCurrentDensity[i][j]);
    				feat.setAttribute("constr", that.mCellConstrainedDeformation[i][j]);
				
    				// Add the Feature to the Feature Dataset.
    				fd.add(feat);
				
    			}
    		}
		
		
    		// Write the Feature Dataset to the Shape file.
    		// TODO: IOManager.writeShapefile(fd, shapefile);
	
			
    	};	// CartogramGrid.writeToShapefile
	
	
	
	
	
    	/**
    	 * Returns the mean density error. The density error is the squared
    	 * difference between the current and the desired (optimal) density.
    	 * @return the mean density error
    	 */
    	that.meanDensityError = function() {
	
    		var error = 0.0;
		
    		var i, j;
    		for (j = 0; j < (that.mGridSizeY - 1); j++)
    		{
    			for (i = 0; i < (that.mGridSizeX - 1); i++)
    			{
    				var densityDifference = that.mCellCurrentDensity[i][j] - that.mCellOriginalDensity[i][j];
				
    				error += densityDifference * densityDifference;
    			}
    		}
		
    		error = error / ((that.mGridSizeX - 1) * (that.mGridSizeY - 1));
	
    		return error;
		
    	};
	
	
	
    	/**
    	 * Updates the current density values.
    	 */
    	that.updateDensityValues = function() {
	
    		// The original cell area is computed using the cell size.
    		var originalCellArea = that.mCellSizeX * that.mCellSizeY;
		
    		var i, j;
    		for (j = 0; j < (that.mGridSizeY - 1); j++)
    		{
    			for (i = 0; i < (that.mGridSizeX - 1); i++)
    			{
			
    				// Compute the current area of the cell.
    				var currentArea = 
    					HelperGeometry.areaOfQuadrangle( that.mNodeX[i][j], that.mNodeY[i][j],
    						that.mNodeX[i+1][j], that.mNodeY[i+1][j],
    						that.mNodeX[i+1][j+1], that.mNodeY[i+1][j+1],
    						that.mNodeX[i][j+1], that.mNodeY[i][j+1]);
				
    				that.mCellCurrentDensity[i][j] = 
    					that.mCellOriginalDensity[i][j] * originalCellArea / currentArea;
				
    			}
    		}
	
    	};	// CartogramGrid.updateDensityValues
	




    	/**
    	 * Fills a regular grid with the mean density.
    	 * If there is no information, the mean density for the whole grid
    	 * is assumed to be the desired value.
    	 */
    	that.fillRegularDensityGrid = function(densityGrid, minX, maxX, minY, maxY) {
	
    		var i,j;
		
    		// Compute the grid size.
    		var gridSizeX = densityGrid.length;
    		var gridSizeY = densityGrid[0].length;		
		
		
    		// Compute the width, height and cell size of the density grid.
    		var gridWidth = maxX - minX;
    		var gridHeight = maxY - minY;
    		var cellSizeX = gridWidth / gridSizeX;
    		var cellSizeY = gridHeight / gridSizeY;
		
	
    		// For each node at the lower left corner of a cell, 
    		// we compute the regular grid cells concerned by the 
    		// cartogram grid cell.
		
		
    		// Initialize the counting grid and the density grid.
    		var cntgrid = _buildArray(gridSizeX,gridSizeY);
    		for (i = 0; i < gridSizeX; i++)
    		{
    			for (j = 0; j < gridSizeY; j++)
    			{
    				densityGrid[i][j] = 0;
    				cntgrid[i][j] = 0;
    			}
    		}
		
		
    		for (i = 0; i < (that.mGridSizeX - 1); i++)
    		{
    			for (j = 0; j < (that.mGridSizeY - 1); j++)
    			{
				
    				// Compute the cell index in which the node is located.
				
    				var llx = Math.round(Math.floor(
    					((that.mNodeX[i][j] - minX) / cellSizeX)));
    				var lly = Math.round(Math.floor(
    					((that.mNodeY[i][j] - minY) / cellSizeY)));
				
    				var lrx = Math.round(Math.floor(
    					((that.mNodeX[i+1][j] - minX) / cellSizeX)));
    				var lry = Math.round(Math.floor(
    					((that.mNodeY[i+1][j] - minY) / cellSizeY)));
				
    				var urx = Math.round(Math.floor(
    					((that.mNodeX[i+1][j+1] - minX) / cellSizeX)));
    				var ury = Math.round(Math.floor(
    					((that.mNodeY[i+1][j+1] - minY) / cellSizeY)));
				
    				var ulx = Math.round(Math.floor(
    					((that.mNodeX[i][j+1] - minX) / cellSizeX)));
    				var uly = Math.round(Math.floor(
    					((that.mNodeY[i][j+1] - minY) / cellSizeY)));
				
				
    				var x, y;
    				var minx = Math.max(Math.min(llx, ulx), 0);
    				var maxx = Math.min(Math.max(lrx, urx), (gridSizeX - 1));
    				var miny = Math.max(Math.min(lly, lry), 0);
    				var maxy = Math.min(Math.max(uly, ury), (gridSizeY - 1));
    				for (x = minx; x <= maxx; x++)
    				{
    					for (y = miny; y <= maxy; y++)
    					{
    						densityGrid[x][y] += that.mCellCurrentDensity[i][j];
    						cntgrid[x][y]++;
    					}
    				}
				
				
    			}
    		}
		
		
    		for (i = 0; i < gridSizeX; i++)
    		{
    			for (j = 0; j < gridSizeY; j++)
    			{
			
    				if (cntgrid[i][j] == 0)
    					densityGrid[i][j] = that.mMeanDensity;
    				else
    					densityGrid[i][j] /= cntgrid[i][j];
					
    			}
    		}
		    return densityGrid;
	    
    	};	// CartogramGrid.fillRegularDensityGrid
	
	
	
	
	
    	/**
    	 * Projects one point using this grid.
    	 * @param x the x coordinate of the point to project.
    	 * @param y the y coordinate of the point to project.
    	 * @return a double array with the coordinates of the projected point.
    	 */
    	that.projectPoint = function(x, y)
    	{
    		var p1x = 
    			(x - that.mEnvelope.getMinX()) * that.mGridSizeX / that.mEnvelope.getWidth();
			
    		var p1y = 
    			(y - that.mEnvelope.getMinY()) * that.mGridSizeY / that.mEnvelope.getHeight();
			
    		var i = parseInt(Math.round(Math.floor(p1x)));
    		var j = parseInt(Math.round(Math.floor(p1y)));

    		if (i < 0 || i >= (that.mGridSizeX-1) || j < 0 || j >= (that.mGridSizeY-1))
    		{
    			console_log("[CartogramGrid projectPoint] Coordinate outside bounds.");
    			return null;
    		}
		
    		var ti = p1x - i;
    		var tj = p1y - j;


    		var ax = that.mNodeX[i][j];
    		var ay = that.mNodeY[i][j];
    		var bx = that.mNodeX[i+1][j];
    		var by = that.mNodeY[i+1][j];
    		var cx = that.mNodeX[i+1][j+1];
    		var cy = that.mNodeY[i+1][j+1];
    		var dx = that.mNodeX[i][j+1];
    		var dy = that.mNodeY[i][j+1];
		
    		var ex = ax + ti * (bx - ax);
    		var ey = ay + ti * (by - ay);
    		var fx = bx + tj * (cx - bx);
    		var fy = by + tj * (cy - by);
    		var gx = dx + ti * (cx - dx);
    		var gy = dy + ti * (cy - dy);
    		var hx = ax + tj * (dx - ax);
    		var hy = ay + tj * (dy - ay);
		
    		var s = HelperGeometry.intersectionOfSegments(ex, ey, gx, gy, fx, fy, hx, hy);
		
    		return s;

    	};	// CartogramGrid.projectPoint






    	/**
    	 * Projects one point using this grid.
    	 * @param x the x coordinate of the point to project.
    	 * @param y the y coordinate of the point to project.
    	 * @return a Coordinate with the projected point.
    	 */
    	that.projectPointAsCoordinate = function(x, y) {
	
    		var coord = that.projectPoint(x, y);
    		var c = Coordinate(coord[0], coord[1]);
    		return c;

    	};	// CartogramGrid.projectPoint
	
	
	


    	/**
    	 * Projects a line segment. Returns two or more coordinates.
    	 */
    	that.projectLineSegment = function(c1, c2) {
		
    		// Compute the index of the grid cells for each coordinate.
    		var d1x = (c1.x - that.mEnvelope.getMinX()) / that.mCellSizeX;
    		var d1y = (c1.y - that.mEnvelope.getMinY()) / that.mCellSizeY;
    		var d2x = (c2.x - that.mEnvelope.getMinX()) / that.mCellSizeX;
    		var d2y = (c2.y - that.mEnvelope.getMinY()) / that.mCellSizeY;
		
    		var i1x = parseInt(Math.round(Math.floor(d1x)));
    		var i1y = parseInt(Math.round(Math.floor(d1y)));
    		var i2x = parseInt(Math.round(Math.floor(d2x)));
    		var i2y = parseInt(Math.round(Math.floor(d2y)));
    		if ((d1x - i1x) > 0.99) i1x++;
    		if ((d1y - i1y) > 0.99) i2y++;
    		if ((d2x - i2x) > 0.99) i2x++;
    		if ((d2y - i2y) > 0.99) i2y++;
		
    		// Get the minimum and maximum index for x and y.
    		var iminx = Math.min(i1x, i2x);
    		var imaxx = Math.max(i1x, i2x);
    		var iminy = Math.min(i1y, i2y);
    		var imaxy = Math.max(i1y, i2y);
		
		
    		// Compute the parameters a and b of the equation :
    		//  y = a*x + b
    		var d = d2x - d1x;
    		var a = 0, b = 0;
    		var aIsInfinite = false;
    		if (d > 0.0001 || d < -0.0001)
    		{
    			a = (d2y - d1y) / (d2x - d1x);
    			b = d2y - ( d2x * (d2y - d1y) / (d2x - d1x) );
    		}
    		else{
    			aIsInfinite = true;
		    }
		
    		// Compute the number of intersections and allocate the t value array.
    		var nIntersections = (imaxx - iminx) + (imaxy - iminy);
    		var tValues = _buildArray(nIntersections);
		
    		// For each intersection, compute the t value (between 0 and 1).
    		var tcnt = 0;
    		var i;
    		for (i = (iminx+1); i <= imaxx; i++)
    		{
    			if (!aIsInfinite)
    			{
    				// Compute the y coordinate for each intersection with 
    				// a vertical grid line.
    				var sy = a*i + b;
			
    				// Compute the t value for the intersection point S(i,sy).
    				tValues[tcnt] = Math.sqrt( (i-d1x)*(i-d1x) + (sy-d1y)*(sy-d1y) ) / Math.sqrt( (d2x-d1x)*(d2x-d1x) + (d2y-d1y)*(d2y-d1y) );
			
    				tcnt += 1;
    			}
    			else
    			{
    				System.out.println("a is infinite");
    			}
			
    		}
		
    		for (i = (iminy+1); i <= imaxy; i++)
    		{
    			// Compute the x coordinate for each intersection with 
    			// a horizontal grid line.
    			var sx;
    			if (!aIsInfinite){
    				sx = (i - b) / a;
    			}else{
    				sx = (d1x + d2x) / 2;
			    }
    			// Compute the t value for the intersection point S(i,sy).
    			tValues[tcnt] = 
    				Math.sqrt( (sx-d1x)*(sx-d1x) + (i-d1y)*(i-d1y) ) / 
    				Math.sqrt( (d2x-d1x)*(d2x-d1x) + (d2y-d1y)*(d2y-d1y) );
			
    			tcnt += 1;
    		}
		
		
    		// Sort the array of t values.
    		tValues.sort();
		
		
		
    		// Project all coordinate points.
		
    		var coords = _buildArray(2 + nIntersections);
    		coords[0] = that.projectPointAsCoordinate(c1.x, c1.y);
		
    		tcnt = 1;
    		for (i = 0; i < nIntersections; i++)
    		{
    			// Compute the coordinates of the given intersection using
    			// the associated t value.
    			// Compute only if the t value is between 0 and 1.
    			if (tValues[i] > 0 && tValues[i] < 1)
    			{
    				var sx = c1.x + tValues[i]*(c2.x - c1.x);
    				var sy = c1.y + tValues[i]*(c2.y - c1.y);
    				coords[tcnt] = that.projectPointAsCoordinate(sx, sy);
    				tcnt++;
    			}
    		}
		
    		coords[tcnt] = that.projectPointAsCoordinate(c2.x, c2.y);
		
    		return coords;
		
    	};	// CartogramGrid.projectLineSegment
	
	
	

	
	
    	/**
    	 * Projects a coordinate sequence using this grid.
    	 */
    	that.projectCoordinates = function(coords) {
    		var ncoords = coords.length;
    		var projCoords = [];
		
    		// Project each line segment in the coordinate sequence.
    		var i, j, nProjCoords = 0;
    		var cs = null;
    		for (i = 0; i < (ncoords-1); i++)
    		{
    			cs = that.projectLineSegment(coords[i], coords[i+1]);
			
    			// Copy the coordinates into a Vector.
    			// Don't copy the last coordinate, otherwise it will be twice
    			// in the vector. Instead, we add the last coordinate at the end
    			// of the process.
    			nProjCoords = cs.length;
    			for (j = 0; j < nProjCoords; j++)
    			{
    				if (cs[j] != null){
    					projCoords.push(cs[j]);
    				}
    			}
    			if (i < (ncoords-2)){
    				projCoords = projCoords.slice(0,projCoords.length-1);
			    }
    		}
		
    		// Add the last coordinate.
    		//projCoords.add(cs[(nProjCoords - 1)]);
		
    		// Transform the Vector into an array.
    		nProjCoords = projCoords.length;
    		cs = _buildArray(nProjCoords);
    		for (i = 0; i < nProjCoords; i++)
    		{
    			cs[i] = projCoords[i];
    		}
		
		
    		return cs;
		
    	};	// CartogramGrid.projectCoordinates
	
	
	
	
	
    	/**
    	 * Returns the current minimum density value of the grid.
    	 * @return the minimum density value.
    	 */
    	that.getMinimumDensity = function() {
		
    		var minDensity = that.mCellCurrentDensity[0][0];
	
    		for (var j = 0; j < (that.mGridSizeY-1); j++)
    		{
    			for (var i = 0; i < (that.mGridSizeX-1); i++)
    			{
    				if (minDensity > that.mCellCurrentDensity[i][j]){
    					minDensity = that.mCellCurrentDensity[i][j];
					}
    			}
    		}
		
    		return minDensity;
		
    	};	// CartogramGrid.getMinimumDensity
	
	
	
    	/**
    	 * Returns the current maximum density value of the grid.
    	 * @return the maximum density value.
    	 */
    	that.getMaximumDensity = function() {
    		var maxDensity = that.mCellCurrentDensity[0][0];
	
    		for (var j = 0; j < (that.mGridSizeY-1); j++)
    		{
    			for (var i = 0; i < (that.mGridSizeX-1); i++)
    			{
    				if (maxDensity < that.mCellCurrentDensity[i][j]){
    				    maxDensity = that.mCellCurrentDensity[i][j];
    				}
    			}
    		}
		
    		return maxDensity;
		
    	};	// CartogramGrid.getMaximumDensity
	
	
	
	
	
    	that.computeNodeCoordinates();
    	return that;
	};
}());	// CartogramGrid