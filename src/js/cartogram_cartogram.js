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
 * The cartogram class is the main computation class.
 * It is a subclass of the SwingWorker class.
 * It has methods for setting all the parameters and for
 * launching the computation.
 * @author Christian.Kaiser@91nord.com
 * @version v1.0.0, 2007-11-30
 */
 
var Cartogram = (function(){
    return function(){
        var that = {};
	
    	/**
    	 * The layer manager used for cartogram computation.
    	 */
    	that.mLayerManager = null;
	
	
    	/**
    	 * The category name for our cartogram layers.
    	 */
    	that.mCategoryName = null;
	
	
    	/**
    	 * The name of the master layer.
    	 */
    	that.mMasterLayer = null;

    	/**
    	 * The name of the master attribute.
    	 */
    	that.mMasterAttribute = null;
	
    	/**
    	 * Is the master attribute already a density value, or must
    	 * the value be weighted by the polygon area (only available
    	 * for polygons).
    	 */
    	that.mMasterAttributeIsDensityValue = true;
	
	
    	that.mMissingValue = "";
	
	
	
    	/**
    	 * The projected master layer. We store this in order to make the
    	 * computation report after the projection.
    	 */
    	that.mProjectedMasterLayer = null;
	
	
	
    	/**
    	 * The layers to deform simultaneously.
    	 */
    	that.mSlaveLayers = []; // Vector
	
    	/**
    	 * The layers used for the constrained deformation.
    	 */
    	that.mConstrainedDeformationLayers = null; // Vector
	
    	/**
    	 * The initial envelope for all layers.
    	 */
    	that.mEnvelope = null;
	
    	/**
    	 * The size of the cartogram grid.
    	 */
    	that.mGridSizeX = 4;
    	that.mGridSizeY = 4;
	
    	/**
    	 * All the deformation is done on this cartogram grid.
    	 */
    	that.mGrid = null;
	
    	/**
    	 * The amount of deformation is a simple stopping criterion.
    	 * It is an integer value between 0 (low deformation, early stopping)
    	 * and 100 (high deformation, late stopping).
    	 */
    	that.mAmountOfDeformation = 50;
	
	
    	/**
    	 * Are the advanced options enabled or should the parameters be estimated
    	 * automatically by the program?
    	 */
    	that.mAdvancedOptionsEnabled = false;
	
    	/**
    	 * If the advanced options are enabled, this is the grid size for the
    	 * diffusion algorithm.
    	 */
    	that.mDiffusionGridSize = 128;
	
    	/**
    	 * If the advanced options are enabled, this is the number of iterations
    	 * the diffusion algorithm is run on the cartogram grid.
    	 */
    	that.mDiffusionIterations = 3;
	
	
    	/**
    	 * The maximum running time in seconds. After this amount of time,
    	 * the cartogram computation is finalized. This is to avoid that the
    	 * computation lasts for a very very long time.
    	 * The default value is 3 hours.
    	 */
    	that.mMaximumRunningTime = 10800;
	
    	/**
    	 * The maximum length of one line segment. In the projection process,
    	 * a straight line might be deformed to a curve. If a line segment is
    	 * too long, it might result in a self intersection, especially for
    	 * polygons. This parameter can be controlled manually or estimated
    	 * using the maximumSegmentLength heuristic.
    	 */
    	that.mMaximumSegmentLength = 500;
	
	


    	/**
    	 * Should we create a grid layer ?
    	 */
    	that.mCreateGridLayer = true;
	
    	/**
    	 * The size of the grid which can be added as a deformation grid.
    	 */
    	that.mGridLayerSize = 100;
	
    	/**
    	 * The layer containing the deformation grid.
    	 */
    	that.mDeformationGrid = null;
	

    	/**
    	 * Should we create a legend layer ?
    	 */
    	that.mCreateLegendLayer = false;
	
    	/**
    	 * An array containing the legend values which should be represented
    	 * in the legend layer.
    	 */
    	that.mLegendValues = null;
	
    	/**
    	 * The layer containing the cartogram legend.
    	 */
    	that.mLegendLayer = null;
	
	
	
    	/**
    	 * The computation report.
    	 */
    //	var mComputationReport = "";
	
	
    	/**
    	 * Used for storing the start time of computation. The computation
    	 * duration is computed based on this value which is set before starting
    	 * the compuation.
    	 */
    	that.mComputationStartTime = 0;
	
	
	
    	/**
    	 * The construct method is an overriden method from
    	 * SwingWorker which does initiate the computation process.
    	 */
    	that.construct = function() {
//    		try {
	
    			// that.mComputationStartTime = System.nanoTime();
			
	
    			// Estimating the grid size and number of loops based on
    			// the amount of deformation value.
    			// The amount of deformation is a value between 0 and 100.
    			//  that.mGridSizeX and that.mGridSizeY are the cartogram grid size values,
    			//  gastnerGridSize is the size of the diffusion grid (power of 2),
    			//  gastnerLoops is the number of loops for the diffusion algorihtm.
    			// The cartogram grid size varies between 100 and 1100.
    			// The gastner grid size varies between 128 (2^7) and 512 (2^9).
    			// The number of gastner loops varies between 1 and 4.
			
    			var gastnerGridSize = 128;
    			var gastnerLoops = 1;
			
    			if (that.mAdvancedOptionsEnabled) {
			
    				gastnerGridSize = that.mDiffusionGridSize;
    				gastnerLoops = that.mDiffusionIterations;
			
    			} else {
    				// Automatic estimation of the parameters using the
    				// amount of deformation slider.
    				that.mGridSizeX = (that.mAmountOfDeformation * 10) + 100;
    				that.mGridSizeY = that.mGridSizeX;
			
    				var gastnerGridPower = 8;
    				if (that.mAmountOfDeformation < 34) {gastnerGridPower = 7;}
    				if (that.mAmountOfDeformation > 66) {gastnerGridPower = 9;}
    				var gastnerGridSizeDbl = Math.pow(2, gastnerGridPower);
    				gastnerGridSize = parseInt(gastnerGridSizeDbl);
			
    				var gastnerLoopsDbl = that.mAmountOfDeformation / 25.0;
    				gastnerLoopsDbl = Math.floor(gastnerLoopsDbl);
    				gastnerLoops = parseInt(gastnerLoopsDbl) + 1;
    				if (gastnerLoops < 1) {gastnerLoops = 1;}
    				if (gastnerLoops > 4) {gastnerLoops = 4;}
				
    				that.mDiffusionGridSize = gastnerGridSize;
    				that.mDiffusionIterations = gastnerLoops;
			
    			}
			
	
    			// User information.
    			/* mCartogramWizard.updateRunningStatus(0, 
    				"Preparing the cartogram computation...", 
    				"Computing the cartogram bounding box");
    			*/
			
    			// Compute the envelope given the initial layers.
    			// The envelope will be somewhat larger than just the layers.
    			that.updateEnvelope();
			
			
    			// Adjust the cartogram grid size in order to be proportional
    			// to the envelope.
    			that.adjustGridSizeToEnvelope();
    			// if (AppContext.DEBUG) 
    				console_log("Adjusted grid size: " + that.mGridSizeX + "x" + that.mGridSizeY);
			
			
    			/*mCartogramWizard.updateRunningStatus(20, 
    				"Preparing the cartogram computation...", 
    				"Creating the cartogram grid");
    			*/	
			
    			// Create the cartogram grid.
    			that.mGrid = CartogramGrid(that.mGridSizeX, that.mGridSizeY, that.mEnvelope);
				
			
    			/*if (Thread.interrupted())
    			{
    				// Raise an InterruptedException.
    				throw new InterruptedException(
    					"Computation has been interrupted by the user.");
    			}*/
				
			
			
    			// Check the master attribute for invalid values.
			
    			console_log(50,"Check the cartogram attribute values...");
			
    			var masterLayer = that.mLayerManager.getLayer(that.mMasterLayer);
    			CartogramLayer.cleanAttributeValues(masterLayer, that.mMasterAttribute);
			
			
			
    			// Replace the missing values with the layer mean value.
    			if (that.mMissingValue != "" && that.mMissingValue != null)
    			{
    				var mean = CartogramLayer.meanValueForAttribute(masterLayer, that.mMasterAttribute);
				
    				var missVal = that.mMissingValue;
				
    				CartogramLayer.replaceAttributeValue(masterLayer, that.mMasterAttribute, missVal, mean);
    			}
			
			
			
			
    			// Compute the density values for the cartogram grid using
    			// the master layer and the master attribute.
			
    			console_log(100,"Computing the density for the cartogram grid...");
			
    			that.mGrid.computeOriginalDensityValuesWithLayer(masterLayer, that.mMasterAttribute, that.mMasterAttributeIsDensityValue);
			
			
			
			
    			// *** PREPARE THE GRID FOR THE CONSTRAINED DEFORMATION ***
			
    			if (that.mConstrainedDeformationLayers != null)
    			{
    				console_log(300, "Prepare constrained deformation...");
				
    				that.mGrid.prepareGridForConstrainedDeformation(that.mConstrainedDeformationLayers);
    			}


    			// *** RUN THE DIFFUSION ALGORITHM ***

    			for (var i = 0; i < gastnerLoops; i++)
    			{
    				var adv0 = parseInt((300 + (i / gastnerLoops) * 400));
    				var adv1 = parseInt((300 + ((i+1) / gastnerLoops) * 400));
    				var text1 = "Computing diffusion iteration " + (i+1) +" of " + gastnerLoops;
    				console_log(adv0, text1, "");
			
    				var cgast = CartogramGastner(that.mGrid);
//    				cgast.mProgressStart = adv0;
//    				cgast.mProgressEnd = adv1;
//    				cgast.mProgressText = text1;
//    				cgast.mCartogramWizard = mCartogramWizard;
                    console_log(adv0, adv1, text1);
				
    				cgast.compute(gastnerGridSize);
				
    				if (i < (gastnerLoops - 1)){
    					that.mGrid.updateDensityValues();
    				}
				
				
    			}
			
			
    			// *** CONSTRAINED DEFORMATION ***
    			if (that.mConstrainedDeformationLayers != null)
    			{
    				console_log(700, "Applying the constrained deformation layers");
    				that.mGrid.conformToConstrainedDeformation();
    			}
			
			
			
    			// *** PROJECTION OF ALL LAYERS ***
			
    			console_log(750, "Projecting the layers...");

    			var projLayers = that.projectLayers();
			
			
			
			
    			// *** CREATE THE DEFORMATION GRID LAYER ***
    			if (that.mCreateGridLayer){
    				that.createGridLayer();
    			}
			
			
			
    			// *** CREATE THE LEGEND LAYER ***
    /*			if (that.mCreateLegendLayer)
    				this.createLegendLayer();
    */			
			
			
			
    			console_log(950,"Producing the comutation report...");
				
				
			
			
    			return projLayers;
			
			
		
//    		}
//    		catch (e)
//    		{
//    		    console_log("ERROR");
//    		    console_log(e);
//    			return null;
//    		}
		
		
    	};	// Cartogram.construct
	
	
	
	
	
	
    	/**
    	 * This method is called once the construct method has finished.
    	 * It terminates the computation, adds all layers and produces the
    	 * computation report.
    	 */
    	that.finished = function(){
	
	
    		// *** GET THE PROJECTED LAYERS ***
    		/*
    		var lyr = that.get();

    		*/
    		// *** HIDE ALL LAYERS ALREADY PRESENT ***
    		/*List layerList = that.mLayerManager.getLayers();
    		Iterator layerIter = layerList.iterator();
    		while (layerIter.hasNext())
    		{
    			Layer l = (Layer)layerIter.next();
    			l.setVisible(false);
    		}
		
    		*/
		
    		// *** ADD ALL THE LAYERS ***
    		/*
    		String catName = this.getCategoryName();
		
    		if (that.mLayerManager.getCategory(catName) == null)
    			that.mLayerManager.addCategory(catName);
			
			
    		int nlyrs = lyr.length;
    		for (int lyrcnt = 0; lyrcnt < nlyrs; lyrcnt++)
    		{
    			that.mLayerManager.addLayer(catName, lyr[lyrcnt]);
    		}
		
    		if (that.mDeformationGrid != null)
    			that.mLayerManager.addLayer(catName, that.mDeformationGrid);
    		*/
    /*		if (that.mLegendLayer != null)
    			that.mLayerManager.addLayer(catName, that.mLegendLayer);
    */			
			
			
		
    		// *** PRODUCE THE COMPUTATION REPORT ***
    //		this.produceComputationReport(that.mProjectedMasterLayer);
		
		
    		// *** CREATE A THEMATIC MAP USING THE SIZE ERROR ATTRIBUTE ***
		
    		// Create a color table for the size error attribute.
    		/*
    		BasicStyle bs = 
    			(BasicStyle)that.mProjectedMasterLayer.getStyle(BasicStyle.class);
    		bs.setFillColor(Color.WHITE);
		
    		SizeErrorStyle errorStyle = new SizeErrorStyle();
		
    		errorStyle.setAttributeName("SizeError");
		
    		errorStyle.addColor(new BasicStyle(new Color(91, 80, 153)));
    		errorStyle.addColor(new BasicStyle(new Color(133, 122, 179)));
    		errorStyle.addColor(new BasicStyle(new Color(177, 170, 208)));
    		errorStyle.addColor(new BasicStyle(new Color(222, 218, 236)));
    		errorStyle.addColor(new BasicStyle(new Color(250, 207, 187)));
    		errorStyle.addColor(new BasicStyle(new Color(242, 153, 121)));
    		errorStyle.addColor(new BasicStyle(new Color(233, 95, 64)));
		
    		errorStyle.addLimit(new Double(70));
    		errorStyle.addLimit(new Double(80));
    		errorStyle.addLimit(new Double(90));
    		errorStyle.addLimit(new Double(100));
    		errorStyle.addLimit(new Double(110));
    		errorStyle.addLimit(new Double(120));
		


    		lyr[0].addStyle(errorStyle);
    		errorStyle.setEnabled(true);
    		lyr[0].getStyle(BasicStyle.class).setEnabled(false);
		
		
    //		AppContext.sizeErrorLegend.setVisible(true);
		
    		try
    		{
    			AppContext.layerViewPanel.getViewport().zoomToFullExtent();
    		} catch (Exception exc) {}
		
		
    		// *** SHOW THE FINISHED PANEL
		
    		mCartogramWizard.goToFinishedPanel();
		
    		*/
		
    	};
	
	
	
	
    	/**
    	 * Sets the layer manager.
    	 */
    	that.setLayerManager = function (lm){
    		that.mLayerManager = lm;
    	};
	
	
	
    	/**
    	 * Sets the name of the cartogram master layer.
    	 */
    	that.setMasterLayer = function(layerName){
    		that.mMasterLayer = layerName;
    	};
	
	
	
    	/**
    	 * Sets the name of the cartogram master attribute.
    	 */
    	that.setMasterAttribute = function(attributeName)
    	{
    		that.mMasterAttribute = attributeName;
    	};
	
	
	
	
    	/**
    	 * Lets define us whether the master attribute is a density value
    	 * or a population value.
    	 */
    	that.setMasterAttributeIsDensityValue = function(isDensityValue)
    	{
    		that.mMasterAttributeIsDensityValue = isDensityValue;
    	};
	
	
	
    	/**
    	 * Defines the layers to deform during the
    	 * cartogram process.
    	 */
    	that.setSlaveLayers = function(slaveLayers)
    	{
    		that.mSlaveLayers = slaveLayers;
    	};

	
	
    	/**
    	 * Defines the layers which should not be deformed.
    	 */
    	that.setConstrainedDeformationLayers = function(layers)
    	{
    		that.mConstrainedDeformationLayers = layers;
    	};
	
	
	
    	/**
    	 * Defines the grid size in x and y dimensions.
    	 */
    	that.setGridSize = function(x, y)
    	{
    		that.mGridSizeX = x;
    		that.mGridSizeY = y;
    	};
	
	
    	/**
    	 * Defines the amount of deformation. This is an integer value between
    	 * 0 and 100. The default value is 50.
    	 */
    	that.setAmountOfDeformation = function(deformation)
    	{
    		that.mAmountOfDeformation = deformation;
    	};
	
	
    	/**
    	 * Defines the maximum running time in seconds. The default value is
    	 * 259200 seconds (3 days).
    	 */
    	that.setMaximumRunningTime = function(seconds)
    	{
    		that.mMaximumRunningTime = seconds;
    	};




    	/**
    	 * Computes the cartogram envelope using the provided layers.
    	 * The envelope will be larger than the layers in order to allow
    	 * the cartogram deformation inside this envelope.
    	 */
    	that.updateEnvelope = function(){
		
    		// Setting the initial envelope using the master layer.
    		var lyr = that.mLayerManager.getLayer(that.mMasterLayer);
    		var masterEnvelope = lyr.getEnvelope();
			
    		that.mEnvelope = Envelope(masterEnvelope.getMinX(),
    			masterEnvelope.getMaxX(),
    			masterEnvelope.getMinY(),
    			masterEnvelope.getMaxY());
		
		
    		// Expanding the initial envelope using the slave and
    		// constrained deformation layers.
    		if (that.mSlaveLayers != null)
    		{
    		    for(var i=0;i<that.mSlaveLayers.length;i++)
    			{
    				lyr = that.mSlaveLayers[i];
    				that.mEnvelope.expandToInclude(lyr.getEnvelope());
    			}
    		}
		
    		if (that.mConstrainedDeformationLayers != null)
    		{
    		    for(var i=0;i<that.mConstrainedDeformationLayers.length;i++)
    			{
    				lyr = that.mConstrainedDeformationLayers[i];
    				that.mEnvelope.expandToInclude(lyr.getEnvelope());
    			}
    		}
		
		
    		// Enlarge the envelope by 5%.
    		that.mEnvelope.expandBy(that.mEnvelope.getWidth() * 0.05, 
    			that.mEnvelope.getHeight() * 0.05);
		
		
    	};	// Cartogram.updateEnvelope
	
	
	
	
    	/**
    	 * Adjusts the grid size in order to be proportional to the
    	 * envelope. It will not increase the grid size, but it will
    	 * decrease the grid size on the shorter side.
    	 */
    	that.adjustGridSizeToEnvelope = function(){
	
    		if (that.mEnvelope == null){
    			return;
    		}	
			
    		var width = that.mEnvelope.getWidth();
    		var height = that.mEnvelope.getHeight();
		
    		if (width < height)
    		{
    			// Adjust the x grid size.
    			that.mGridSizeX = parseInt(Math.round(that.mGridSizeY * (width / height)));
    		}
    		else if (width > height)
    		{
    			// Adjust the y grid size.
    			that.mGridSizeY = parseInt(Math.round(that.mGridSizeX * (height / width)));
    		}
		
    	};	// Cartogram.adjustGridSizeToEnvelope





    	/**
    	 * Projects all layers. Creates a new layer for each projected layer.
    	 */
    	that.projectLayers = function(){
		
    		// Get the number of layers to project
    		// (one master layer and all slave layers).
    		var nlyrs = 1;
    		if (that.mSlaveLayers != null){
    			nlyrs = nlyrs + that.mSlaveLayers.length;
    		}
		
    		// We store the projected layers in an array.
    		var layers = [];
		
		
    		// Compute the maximum segment length for the layers.
    		that.mMaximumSegmentLength = that.estimateMaximumSegmentLength();
		
		
    		// Project the master layer.
		
    		console_log(750,"Projecting the layers...","Layer 1 of "+ nlyrs);
				
		
    		var masterLayer = that.mLayerManager.getLayer(that.mMasterLayer);
    		CartogramLayer.regularizeLayer(masterLayer, that.mMaximumSegmentLength);
    		that.mProjectedMasterLayer = CartogramLayer.projectLayerWithGrid(masterLayer, that.mGrid);
		
    		layers.push(that.mProjectedMasterLayer);
		
		
		
			
    		// Project the slave layers.
    		for (var lyrcnt = 0; lyrcnt < (nlyrs - 1); lyrcnt++)
    		{
    			console_log(800 + ((lyrcnt+1)/(nlyrs-1)*150),"Projecting the layers...","Layer "+ (lyrcnt+2) +" of "+ nlyrs);
		
    			var slaveLayer = that.mSlaveLayers[lyrcnt];
    			CartogramLayer.regularizeLayer(slaveLayer, that.mMaximumSegmentLength);
    			layers[lyrcnt+1] = CartogramLayer.projectLayerWithGrid(slaveLayer, that.mGrid);
    		}
		
		
    		return layers;
	
    	};	// Cartogram.projectLayers
	
	
	
	
	
	
    	/**
    	 * Says whether we should create a grid layer or not.
    	 */
    	that.getCreateGridLayer = function()
    	{
    		return that.mCreateGridLayer;
    	};
	
	
	
    	/**
    	 * Sets the flag for creating or not a grid layer.
    	 */
    	that.setCreateGridLayer = function(createGridLayer)
    	{
    		that.mCreateGridLayer = createGridLayer;
    	};
	
	
	
    	/**
    	 * Returns the grid layer size. This is the grid which is produced
    	 * for visual effect only.
    	 */
    	that.getGridLayerSize = function()
    	{
    		return that.mGridLayerSize;
    	};
	
	
	
    	/**
    	 * Changes the size of the grid layer to produce.
    	 */
    	that.setGridLayerSize = function(gridLayerSize)
    	{
    		that.mGridLayerSize = gridLayerSize;
    	};
	
	
	
    	/**
    	 * Says whether we should create a legend layer or not.
    	 */
    /*	public boolean getCreateLegendLayer ()
    	{
    		return that.mCreateLegendLayer;
    	}
	
    */	
    	/**
    	 * Sets the flag which says whether to create a legend layer or not.
    	 */
    /*	public void setCreateLegendLayer (boolean createLegendLayer)
    	{
    		that.mCreateLegendLayer = createLegendLayer;
    	}
	
    */	
    /*	
    	public double[] getLegendValues ()
    	{
    		return that.mLegendValues;
    	}
	
	
	
    	public void setLegendValues (double[] legendValues)
    	{
    		that.mLegendValues = legendValues;
    	}*/



    	that.getAdvancedOptionsEnabled = function()
    	{
    		return that.mAdvancedOptionsEnabled;
    	};
	
	
    	that.setAdvancedOptionsEnabled = function(enabled)
    	{
    		that.mAdvancedOptionsEnabled = enabled;
    	};
	
	
	
    	that.getDiffusionGridSize = function()
    	{
    		return that.mDiffusionGridSize;
    	};
	
	
    	that.setDiffusionGridSize = function(size)
    	{
    		that.mDiffusionGridSize = size;
    	};
	
	
    	that.getDiffusionIterations = function()
    	{
    		return that.mDiffusionIterations;
    	};
	
	
    	that.setDiffusionIterations = function(iterations)
    	{
    		that.mDiffusionIterations = iterations;
    	};
	
	

    	/**
    	 * Returns the category name for our cartogram layers.
    	 */
    	that.getCategoryName = function()
    	{
	
    		if (that.mCategoryName == null)
    		{
	
    			// Create a new category in the layer manager in order to 
    			// properly separate the cartogram layers. We call the new category
    			// «Cartogram x», where x is a serial number.
		
    			var catNumber = 1;
    			var categoryName = "Cartogram " + catNumber;
    			while (that.mLayerManager.getCategory(categoryName) != null)
    			{
    				catNumber++;
    				categoryName = "Cartogram " + catNumber;
    			}
		
    			that.mCategoryName = categoryName;
			
    		}
		
    		return that.mCategoryName;
    	};
	


    	/**
    	 * Creates a layer with the deformation grid.
    	 */
    	that.createGridLayer = function()
    	{
		
    		var env = that.mEnvelope;
		
    		// Compute the deformation grid size in x and y direction.
		
    		var resolution = 
    			Math.max((env.getWidth() / (that.mGridLayerSize + 1)), 
    					 (env.getHeight() / (that.mGridLayerSize + 1)));
					 
    		var sizeX = 
    			Math.round(Math.floor(env.getWidth() / resolution)) - 1;
			
    		var sizeY = 
    			Math.round(Math.floor(env.getHeight() / resolution)) - 1;
		
		
		
    		// CREATE THE NEW LAYER
		
    		// Create a new Feature Schema for the new layer.
    		var fs = FeatureSchema();
    		fs.addAttribute("GEOMETRY", AttributeType.GEOMETRY);
    		fs.addAttribute("ID", AttributeType.INTEGER);
		
    		// Create a new empty Feature Dataset.
    		var fd = FeatureDataset(fs);
		
    		// Create a Geometry Factory for creating the points.
    		var gf = GeometryFactory();
		
		
		
    		// CREATE ALL FEATURES AND LINES
    		var j, k;
    		var i = 0;
		
    		// Horizontal lines
    		for (k = 0; k < sizeY; k++)
    		{
    			// Create an empty Feature.
    			var feat = BasicFeature(fs);
			
    			// Create the line string and add it to the Feature.
    			var coords = _buildArray(sizeX);
    			for (j = 0; j < sizeX; j++)
    			{
    				var x = env.getMinX() + (j * resolution);
    				var y = env.getMinY() + (k * resolution);
    				coords[j] = that.mGrid.projectPointAsCoordinate(x, y);
    			}
			
    			var ls = null;
    			if (coords != null)
    				ls = gf.createLineString(coords);
				
    			if (ls != null)
    			{
    				feat.setGeometry(ls);
			
    				// Add the other attributes.
    				feat.setAttribute("ID", i);
    				i++;
			
    				// Add Feature to the Feature Dataset.
    				fd.add(feat);
    			}
			
    		}


    		// Vertical lines
    		for (j = 0; j < sizeX; j++)
    		{
    			// Create an empty Feature.
    			var feat = BasicFeature(fs);
			
    			// Create the line string and add it to the Feature.
    			var coords = _buildArray(sizeY);
    			for (k = 0; k < sizeY; k++)
    			{
    				var x = env.getMinX() + (j * resolution);
    				var y = env.getMinY() + (k * resolution);
    				coords[k] = that.mGrid.projectPointAsCoordinate(x, y);
    			}
			
    			var ls = null;
    			if (coords != null)
    				ls = gf.createLineString(coords);
				
    			if (ls != null)
    			{
    				feat.setGeometry(ls);
			
    				// Add the other attributes.
    				feat.setAttribute("ID", i);
    				i++;
			
    				// Add Feature to the Feature Dataset.
    				fd.add(feat);
    			}
			
    		}

		
		
		
		
    		// Create the layer.
    		that.mDeformationGrid = Layer("Deformation grid", "#666", fd, that.mLayerManager);

		
    	};	// Cartogram.createGridLayer





    	/**
    	 * Creates an optional legend layer.
    	 */
    /*	private void createLegendLayer()
    	{
		
    		// The master layer.
    		Layer masterLayer = that.mLayerManager.getLayer(that.mMasterLayer);
		
		
		
    		double distanceBetweenSymbols = 
    			(masterLayer.getFeatureCollectionWrapper().getEnvelope().
    				getWidth() / 10);
		
		
    		// Estimate legend values if there are none.

    		double attrMax = CartogramLayer.maxValueForAttribute(
    				masterLayer, that.mMasterAttribute);

    		if (that.mLegendValues == null)
    		{
			
    			double attrMin = CartogramLayer.minValueForAttribute(
    				masterLayer, that.mMasterAttribute);
			
    			double attrMean = CartogramLayer.meanValueForAttribute(
    				masterLayer, that.mMasterAttribute);
			
			
    			int nvalues = 3;
			
    			double maxLog = Math.floor(Math.log10(attrMax));
    			double maxValue = Math.pow(10, maxLog);
    			double secondValue = Math.pow(10, (maxLog-1));
						
    			that.mLegendValues = new double[nvalues];
    			that.mLegendValues[0] = secondValue;
    			that.mLegendValues[1] = maxValue;
    			that.mLegendValues[2] = attrMax;
    		}
		
		
		
		
    		// CREATE THE NEW LAYER
		
    		// Create a new Feature Schema for the new layer.
    		FeatureSchema fs = new FeatureSchema();
    		fs.addAttribute("GEOMETRY", AttributeType.GEOMETRY);
    		fs.addAttribute("ID", AttributeType.INTEGER);
    		fs.addAttribute("VALUE", AttributeType.DOUBLE);
    		fs.addAttribute("AREA", AttributeType.DOUBLE);
    		fs.addAttribute("COMMENT", AttributeType.STRING);
		
    		// Create a new empty Feature Dataset.
    		FeatureDataset fd = new FeatureDataset(fs);
		
    		// Create a Geometry Factory for creating the points.
    		GeometryFactory gf = new GeometryFactory();



		
    		// CREATE THE FEATURES FOR THE LEGEND LAYER.
		
    		int nvals = that.mLegendValues.length;
		
    		double totalArea = CartogramLayer.totalArea(masterLayer);
    		double valuesSum = CartogramLayer.sumForAttribute(
    			masterLayer, that.mMasterAttribute);
		
    		double x = that.mEnvelope.getMinX();
    		double y = that.mEnvelope.getMinY();
		
    		int id = 1;
		
    		int valcnt;
    		for (valcnt = 0; valcnt < nvals; valcnt++)
    		{
    			double valsize = totalArea / valuesSum * that.mLegendValues[valcnt];
    			double rectsize = Math.sqrt(valsize);
			
    			// Create the coordinate points.
    			Coordinate[] coords = new Coordinate[5];
    			coords[0] = new Coordinate(x, y);
    			coords[1] = new Coordinate((x+rectsize), y);
    			coords[2] = new Coordinate((x+rectsize), (y-rectsize));
    			coords[3] = new Coordinate(x, (y-rectsize));
    			coords[4] = new Coordinate(x, y);
			
    			// Create geometry.
    			LinearRing lr = gf.createLinearRing(coords);
    			Polygon poly = gf.createPolygon(lr, null);
			
    			// Create the Feature.
    			BasicFeature feat = new BasicFeature(fs);
    			feat.setAttribute("GEOMETRY", poly);
    			feat.setAttribute("ID", id);
    			feat.setAttribute("VALUE", that.mLegendValues[valcnt]);
    			feat.setAttribute("AREA", valsize);
			
    			if (valcnt == 0)
    				feat.setAttribute("COMMENT", "Mean value");
    			else if (valcnt == 1)
    				feat.setAttribute("COMMENT", 
    					"Rounded value of maximum (" + attrMax + ")");
					
    			// Add the Feature to the Dataset.
    			fd.add(feat);
			
			
    			// Change the coordinates.
    			x += rectsize + distanceBetweenSymbols;
			
    			id++;
			
    		}
		
		
    		// Create the layer.
    		that.mLayerManager.setFiringEvents(false);
    		that.mLegendLayer = 
    			new Layer("Legend", Color.GREEN, fd, that.mLayerManager);
    		LabelStyle legendLabels = that.mLegendLayer.getLabelStyle();
    		legendLabels.setAttribute("VALUE");
    		legendLabels.setEnabled(true);
    		legendLabels.setFont(new Font(null, Font.PLAIN, 10));
    		that.mLayerManager.setFiringEvents(true);
			
    	}	// Cartogram.createLegendLayer
	
    */	
	
	
	
    	/**
    	 * Creates the computation report and stores it in the object attribute.
    	 */
    /*	public void produceComputationReport (Layer projectedMasterLayer)
    	{
		
    		StringBuffer rep = new StringBuffer();
		
    		rep.append("CARTOGRAM COMPUTATION REPORT\n\n");
		
    		rep.append("CARTOGRAM PARAMETERS:\n");
    		rep.append("Cartogram layer: " + that.mMasterLayer + "\n");
    		rep.append("Cartogram attribute: " + that.mMasterAttribute + "\n");
		
    		String attrType = "Population value";
    		if (that.mMasterAttributeIsDensityValue) attrType = "Density value";
    		rep.append("Attribute type: " + attrType + "\n");
		
    		String transformationQuality = "";
    		if (that.mAdvancedOptionsEnabled)
    			transformationQuality = "disabled";
    		else
    			transformationQuality = "" + that.mAmountOfDeformation + " of 100";
    		rep.append("Transformation quality: " + transformationQuality + "\n");
		
    		rep.append("Cartogram grid size: "+ that.mGridSizeX +" x "+ that.mGridSizeY +"\n");
    		rep.append("Diffusion grid size: "+ that.mDiffusionGridSize +"\n");
    		rep.append("Diffusion iterations: "+ that.mDiffusionIterations +"\n\n");
		
		
		
    		rep.append("CARTOGRAM LAYER & ATTRIBUTE STATISTICS:\n");
    		Layer masterLayer = that.mLayerManager.getLayer(that.mMasterLayer);
    		int nfeat = masterLayer.getFeatureCollectionWrapper().getFeatures().size();
    		rep.append("Number of features: "+ nfeat +"\n");
		
    		double mean = CartogramLayer.meanValueForAttribute(
    			masterLayer, that.mMasterAttribute);
    		rep.append("Attribute mean value: " + mean + "\n");
		
    		double min = CartogramLayer.minValueForAttribute(
    			masterLayer, that.mMasterAttribute);
    		rep.append("Attribute minimum value: " + min + "\n");
		
    		double max = CartogramLayer.maxValueForAttribute(
    			masterLayer, that.mMasterAttribute);
    		rep.append("Attribute maximum value: " + max + "\n\n");
	
	
	
    		rep.append("SIMULTANEOUSLY TRANSFORMED LAYERS:\n");
    		Vector simLayers = mCartogramWizard.getSimultaneousLayers();
    		if (simLayers == null || simLayers.size() == 0)
    		{
    			rep.append("None\n\n");
    		}
    		else
    		{
    			Iterator simLayerIter = simLayers.iterator();
    			while (simLayerIter.hasNext())
    			{
    				Layer lyr = (Layer)simLayerIter.next();
    				rep.append(lyr.getName() +"\n");
    			}
    			rep.append("\n");
    		}
		
	
    		rep.append("CONSTRAINED DEFORMATION LAYERS:\n");
    		Vector constLayers = mCartogramWizard.getConstrainedDeformationLayers();
    		if (constLayers == null || constLayers.size() == 0)
    		{
    			rep.append("None\n\n");
    		}
    		else
    		{
    			Iterator constLayerIter = constLayers.iterator();
    			while (constLayerIter.hasNext())
    			{
    				Layer lyr = (Layer)constLayerIter.next();
    				rep.append(lyr.getName() +"\n");
    			}
    			rep.append("\n");
    		}
		


    		// Compute the cartogram error.
    		double meanError = CartogramLayer.computeCartogramSizeError(
    			projectedMasterLayer, that.mMasterAttribute, masterLayer, "SizeError");
		
    		rep.append("CARTOGRAM ERROR\n");
    		rep.append("The cartogram error is a measure for the quality of the result.\n");
    		rep.append("Mean cartogram error: "+ meanError +"\n");
		
    		double stdDev = CartogramLayer.standardDeviationForAttribute(
    			projectedMasterLayer, "SizeError");
    		rep.append("Standard deviation: "+ stdDev +"\n");
		
    		double pctl25 = CartogramLayer.percentileForAttribute(
    			projectedMasterLayer, "SizeError", 25);
    		rep.append("25th percentile: "+ pctl25 +"\n");
		
    		double pctl50 = CartogramLayer.percentileForAttribute(
    			projectedMasterLayer, "SizeError", 50);
    		rep.append("50th percentile: "+ pctl50 +"\n");
		
    		double pctl75 = CartogramLayer.percentileForAttribute(
    			projectedMasterLayer, "SizeError", 75);
    		rep.append("75th percentile: "+ pctl75 +"\n");
	
	
	
		
    		// Compute the number of features between the 25th and 75th
    		// percentile and the percentage.
		
    		FeatureCollectionWrapper fcw = 
    			projectedMasterLayer.getFeatureCollectionWrapper();
		
    		Iterator featIter = fcw.iterator();
    		int nFeaturesInStdDev = 0;
    		int nFeatures = fcw.size();
    		while (featIter.hasNext())
    		{
    			Feature feat = (Feature)featIter.next();
			
    			double value = 
    				CartogramFeature.getAttributeAsDouble(feat, "SizeError");
				
    			if (value >= (meanError - stdDev) && value <= (meanError + stdDev))
    				nFeaturesInStdDev++;
    		}
	
		
    		double percFeaturesInStdDev = 
    			(double)nFeaturesInStdDev / (double)nFeatures * (double)100;
		
    		int pfint = (int)Math.round(percFeaturesInStdDev);
			
    		rep.append("Features with mean error +/- 1 standard deviation: "+ 
    			nFeaturesInStdDev +" of "+ nFeatures +" ("+ 
    			pfint +"%)\n\n");
	
	
	
		
    		long estimatedTime = System.nanoTime() - that.mComputationStartTime;
    		estimatedTime /= 1000000000;
    		rep.append("Computation time: "+ estimatedTime +" seconds\n");

		
    		mComputationReport = rep.toString();
		
    	}
	
	
	
	
    	public String getComputationReport ()
    	{
    		return mComputationReport;
    	}
	
    	*/
	
	
	
	
    	/**
    	 * Tries to estimate the maximum segment length allowed for a
    	 * geometry. The length is estimated using the envelope of the
    	 * master layer and the number of features present in the master layer.
    	 * The area of the envelope is considered as a square. The length of
    	 * the square's edge is divided by the square root of the number of
    	 * features. This gives us an estimate of the number of features along
    	 * the square's edge. It is further considered that there should be
    	 * about 10 vertices for one feature along the square's edge.
    	 */
    	that.estimateMaximumSegmentLength = function(){
		
    		// Check the input variables. Otherwise, return a default value.
    		var defaultValue = 500.0;
    		if (that.mEnvelope == null) {return defaultValue;}
    		if (that.mMasterLayer == null) {return defaultValue;}
		
		
		
    		// Compute the edge length of the square having the same area as
    		// the cartogram envelope.
		
    		var envArea = that.mEnvelope.getWidth() * that.mEnvelope.getHeight();
    		if (envArea <= 0.0) {return defaultValue;}
		
    		var edgeLength = Math.sqrt(envArea);
		
		
		
    		// Get the number of features and the features per edge.
		
    		var layer = that.mLayerManager.getLayer(that.mMasterLayer);
    		if (layer == null) {return defaultValue;}
		
    		var nfeat = layer.getFeatures().length;
    		var featuresPerEdge = Math.sqrt(nfeat);
		
		
		
    		// Compute the length per feature.
    		// 1/10 of the length per feature is our estimate for the
    		// maximum segment length.
		
    		var lengthPerFeature = edgeLength / featuresPerEdge;
		
    		return (lengthPerFeature / 10);
		
    	};	// estimateMaximumSegmentLength
	
	
	
	
	
    	that.setMissingValue = function(value)
    	{
    		that.mMissingValue = value;
    	};
	
	
        return that;
    };
}());	// Cartogram
