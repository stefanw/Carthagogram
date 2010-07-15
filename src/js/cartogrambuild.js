var CARTOGRAM = (function(){
    var options = {"DEBUG": true};
    var console_log = function(){
        if (options.DEBUG){
            options.callback({"method": "log", "payload": Array.prototype.slice.apply(arguments,[])});
        }
    };
    
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
			
			
			
    			console_log(950,"Producing the computation report...");
				
				
			
			
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
    return function(id){
        var that = {"id": id};
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



/**
 * This class implements Gastner's diffusion algorithm.
 * @author Christian.Kaiser@91nord.com
 * @version v1.0.0, 2007-11-30
 */
var CartogramGastner = (function(){
    return function(densityGrid){
        that = {};
        /**
         * The cartogram bounding box. It is slightly larger than the
         * grid bounding box for computational reasons.
         */
         
        that.mGrid = densityGrid;
        
        that.mExtent = undefined; //Envelope mExtent;
    
    
        /**
         * Length of map in x direction. This is our grid size (number of cells).
         * The number should always be a power of 2.
         */
        that.lx = undefined;
    
        /**
         * Length of map in y direction. This is our grid size (number of cells).
         * The number should always be a power of 2.
         */
        that.ly = undefined;
    
    
        /**
         * Array for the density at time t = 0.
         */
        that.rho_0 = undefined;

        /**
         * Array for the density at time t > 0.
         */
        that.rho = undefined;

    
        /**
         * Array for the velocity field in x direction at position (j,k).
         */
        that.gridvx = undefined;
    
        /**
         * Array for the velocity field in y direction at position (j,k).
         */
        that.gridvy = undefined;
    
    
        /**
         * Array for the x position at t > 0. x[j][k] is the x-coordinate for the
         * element that was at position (j,k) at time t = 0.
         */
        that.x = undefined;
    
        /**
         * Array for the y position at t > 0. y[j][k] is the y-coordinate for the
         * element that was at position (j,k) at time t = 0.
         */
        that.y;
    
    
        // Arrays for the velocity field at position (x[j][k], y[j][k]).
        that.vx = undefined;
        that.vy = undefined;
    
    
    
        // Definition of some other class wide variables.
        that.minpop = 0.0;
        that.nblurs = 0;
        that.xappr = undefined;
        that.yappr = undefined;
    
    
    
        /**
         * Some constants needed for the cartogram computation.
         */
    
        var CONVERGENCE = 1e-100;
        var INFTY = 1e100;
        var HINITIAL = 1e-4;
        var IMAX = 50;
        var MINH = 1e-5;
        var MAXINTSTEPS = 3000;
        var SIGMA = 0.1;
        var SIGMAFAC = 1.2;
        var TIMELIMIT = 1e8;
        var TOLF = 1e-3;
        var TOLINT = 1e-3;
        var TOLX = 1e-3;

    
    
    
    
    
    
        /**
         * Starts the cartogram computation using the given grid size.
         * @param gridSize the size of the grid used for computation. The
         *        grid size must be a power of 2.
         */
        that.compute = function(gridSize){
    
            // Store the grid size in the that.lx and that.ly attributes.
            that.lx = gridSize;
            that.ly = gridSize;
        
            that.initializeArrays();
            that.computeInitialDensity();
            that.rho_0 = FFT.coscosft(that.rho_0, 1, 1);
        
        
            var hasConverged = false;
            while (hasConverged == false)
            {
                hasConverged = that.integrateNonlinearVolterraEquation();
                // TODO remove hack
                hasConverged = true;
            }
        
            that.projectCartogramGrid();
        };    // CartogramGastner.compute




        /**
         * Initializes the arrays using the grid size.
         */
     
        that.initializeArrays = function(){
    
            that.rho_0 = _buildArray(that.lx+1, that.ly+1);
            that.rho  = _buildArray(that.lx+1, that.ly+1);
            that.gridvx = _buildArray(that.lx+1, that.ly+1);
            that.gridvy = _buildArray(that.lx+1, that.ly+1);
            that.x = _buildArray(that.lx+1, that.ly+1);
            that.y = _buildArray(that.lx+1, that.ly+1);
            that.vx = _buildArray(that.lx+1, that.ly+1);
            that.vy = _buildArray(that.lx+1, that.ly+1);
            that.xappr = _buildArray(that.lx+1, that.ly+1);
            that.yappr = _buildArray(that.lx+1, that.ly+1);
        };    // CartogramGastner.initializeArrays
    



        /**
         * Computes the initial density of the Gastner grid using the provided
         * cartogram grid.
         */
        that.computeInitialDensity = function()
        {
    
            // Compute the cartogram extent.
            that.mExtent = that.cartogramExtent(that.mGrid.envelope(), that.lx, that.ly);
        
            // Compute the cell size in x and y direction.
            var cellSizeX =that.mExtent.getWidth() / that.lx;
            var cellSizeY =that.mExtent.getHeight() / that.ly;
        
            // Store the extent's minimum and maximum coordinates.
            var extentMinX =that.mExtent.getMinX() - (cellSizeX / 2);
            var extentMinY =that.mExtent.getMinY() - (cellSizeY / 2);
            var extentMaxX =that.mExtent.getMaxX() + (cellSizeX / 2);
            var extentMaxY =that.mExtent.getMaxY() + (cellSizeY / 2);
        

            // Let the cartogram grid fill in the density.
            that.rho_0 = that.mGrid.fillRegularDensityGrid(that.rho_0, extentMinX, extentMaxX, 
                extentMinY, extentMaxY);
        
            // If there are 0 density values, introduce a small bias.
            var minimumDensity = that.rho_0[0][0];
            var maximumDensity = that.rho_0[0][0];
            for (var j = 0; j <= that.ly; j++)
            {
                for (var i = 0; i <= that.lx; i++)
                {
                    if (that.rho_0[i][j] < minimumDensity)
                        minimumDensity = that.rho_0[i][j];
                
                    if (that.rho_0[i][j] > maximumDensity)
                        maximumDensity = that.rho_0[i][j];
                }
            }
        
            if ((minimumDensity * 1000) < maximumDensity)
            {
                var bias = (maximumDensity / 1000) - minimumDensity;
            
                for (var j = 0; j <= that.ly; j++)
                    for (var i = 0; i <= that.lx; i++)
                        that.rho_0[i][j] += bias;
            }
        
            that.correctInitialDensityEdges();
    
        };    // CartogramGastner.computeInitialDensity





        /**
         * Fills the edges of the initial density grid correctly.
         */
        that.correctInitialDensityEdges = function(){
    
            var i, j;
            that.rho_0[0][0] += that.rho_0[0][that.ly] + that.rho_0[that.lx][0] + that.rho_0[that.lx][that.ly];
            for (i = 1; i < that.lx; i++) {that.rho_0[i][0] += that.rho_0[i][that.ly];}
            for (j = 1; j < that.ly; j++) {that.rho_0[0][j] += that.rho_0[that.lx][j];}
            for (i = 0; i < that.lx; i++) {that.rho_0[i][that.ly] = that.rho_0[i][0];}
            for (j = 0; j <= that.ly; j++) {that.rho_0[that.lx][j] = that.rho_0[0][j];}
        };    // CartogramGastner.correctInitialDensityEdges
    





        /**
         * Computes the cartogram extent bounding box using the layer extent
         * and the grid size.
         * @param env the bounding box of the layers (or the cartogram grid).
         * @param gridX the grid size in x
         * @param gridY the grid size in y
         * @return the cartogram extent as Envelope
         */
        that.cartogramExtent = function(env, gridX, gridY){
            var margin = 1.5;
            var minx, maxx, miny, maxy;
            if ( (env.getWidth() / gridX) > (env.getHeight() / gridY)) {
                maxx = 0.5 * ((1 + margin) * env.getMaxX() + (1 - margin) * env.getMinX());
                minx = 0.5 * ((1 - margin) * env.getMaxX() + (1 + margin) * env.getMinX());
                maxy = 0.5 * (env.getMaxY() + env.getMinY() + (maxx - minx) * gridY / gridX);
                miny = 0.5 * (env.getMaxY() + env.getMinY() - (maxx - minx) * gridY / gridX);
            }
            else
            {
                maxy = 0.5 * ((1 + margin) * env.getMaxY() + (1 - margin) * env.getMinY());
                miny = 0.5 * ((1 - margin) * env.getMaxY() + (1 + margin) * env.getMinY());
                maxx = 0.5 * (env.getMaxX() + env.getMinX() + (maxy - miny) * gridX / gridY);
                minx = 0.5 * (env.getMaxX() + env.getMinX() - (maxy - miny) * gridX / gridY);
            }
    
            // Creating the Envelope
            return Envelope(minx, maxx, miny, maxy);
        };    // CartogramGastner.cartogramExtent






        /**
         * Integrates the non-linear Volterra equation.
         * @return true if the displacement field has converged, false otherwise.
         */
        that.integrateNonlinearVolterraEquation = function(){
            var stepsize_ok;
            var h, maxchange = INFTY, t, vxplus, vyplus, xguess, yguess;
            var i, j, k;
        
            do
            {
                that.initcond();
                that.nblurs++;
                //if (this.minpop < 0.0)
                //    double sigmaVal = SIGMA * Math.pow(this.SIGMAFAC, this.nblurs);
            
            } while (that.minpop < 0.0);
        
            h = HINITIAL;
            t = 0;


            for (j = 0; j <= that.lx; j++)
            {
                for (k = 0; k <= that.ly; k++)
                {
                    that.x[j][k] = j;
                    that.y[j][k] = k;
                }
            }
        
            that.calculateVelocityField(0.0);

            for (j = 0; j <= that.lx; j++)
            {
                for (k = 0; k <= that.ly; k++)
                {
                    that.vx[j][k] = that.gridvx[j][k];
                    that.vy[j][k] = that.gridvy[j][k];
                }
            }

            i = 1;
        
            do
            {
                // Stop if the user has interrupted the process.
                stepsize_ok = true;
                that.calculateVelocityField(t+h);
            
                for (j = 0; j <= that.lx; j++)
                {
                    for (k = 0; k <= that.ly; k++)
                    {
                    
                        var xinterpol = that.x[j][k] + (h * that.vx[j][k]);
                        var yinterpol = that.y[j][k] + (h * that.vy[j][k]);
                        if (xinterpol < 0.0 || yinterpol < 0.0)
                        {
                            console_log("[ERROR] Cartogram out of bounds !");
                        }
                    
                        vxplus = that.interpolateBilinear(that.gridvx, xinterpol, yinterpol);
                        
                        vyplus = that.interpolateBilinear(that.gridvy, xinterpol, yinterpol);
      
                        xguess = that.x[j][k] + (0.5 * h * (that.vx[j][k] + vxplus));
                        
                        yguess = that.y[j][k] + (0.5 * h * (that.vy[j][k] + vyplus));

                        var ptappr = [0.0, 0.0];
                        ptappr[0] = that.xappr[j][k];
                        ptappr[1] = that.yappr[j][k];
                    
                        var tempres = that.newt2(h, ptappr, xguess, yguess, j, k);
                        var solving_ok = tempres[0];
                        ptappr = tempres[1];
                    
                        that.xappr[j][k] = ptappr[0];
                        that.yappr[j][k] = ptappr[1];
                        if (solving_ok == false){
                            console_log("solving ok is false");
                            return false;
                        }
          
                        if ( ((xguess - that.xappr[j][k]) * (xguess - that.xappr[j][k])) + ((yguess - that.yappr[j][k]) * (yguess - that.yappr[j][k])) > TOLINT) {
                            if (h < MINH)
                            {
                                //double sigmaVal = this.SIGMA * Math.pow(
                                //    this.SIGMAFAC, this.nblurs);
                                that.nblurs++;
                                console_log("h < MINH");
                                return false;
                            }
                            h = h / 10;
                            stepsize_ok = false;
                            console_log("break");
                            break;
                        }
            
                    }    // for (k = 0; k <= that.ly; k++)
                
                }    // for (j = 0; j <= that.lx; j++)
        
    
                if (!stepsize_ok)
                {
                    continue;
                }
                else
                {
                    t += h;
                    maxchange = 0.0;

                    for (j = 0; j <= that.lx; j++)
                    {
                        for (k = 0; k <= that.ly; k++)
                        {
                            if ( ((that.x[j][k] - that.xappr[j][k]) * (that.x[j][k] - that.xappr[j][k])) + ((that.y[j][k] - that.yappr[j][k]) * (that.y[j][k] - that.yappr[j][k])) > maxchange){
                                maxchange = ((that.x[j][k] - that.xappr[j][k]) * (that.x[j][k] - that.xappr[j][k])) + ((that.y[j][k] - that.yappr[j][k]) * (that.y[j][k] - that.yappr[j][k]));
                            }
                        
                            that.x[j][k] = that.xappr[j][k];
                            that.y[j][k] = that.yappr[j][k];
                            that.vx[j][k] = that.interpolateBilinear(that.gridvx, that.xappr[j][k], that.yappr[j][k]);
                            that.vy[j][k] = that.interpolateBilinear(that.gridvy, that.xappr[j][k], that.yappr[j][k]);
          
                        }    // for (k=0; k<=that.ly; k++)
        
                    }    // for (j = 0; j <= that.lx; j++)
        
                }

                h = 1.2 * h;
            
                console_log("Doing time step: ", i,h,t);
                console_log("Maxchange: ", maxchange);

                i++;
            
            } while (i < MAXINTSTEPS && 
                     t < TIMELIMIT && 
                     maxchange > CONVERGENCE);
            return true;
        };    // CartogramGastner.integrateNonlinearVolterraEquation






        that.initcond = function(){
            var maxpop;
            var i,j;

            that.rho_0 = FFT.coscosft(that.rho_0, -1, -1);
            for (i = 0; i < that.lx; i++)
            {
                for (j = 0; j < that.ly; j++)
                {
                    if (that.rho_0[i][j] < -1e10)
                    {
                        that.rho_0[i][j] = 0.0;
                    }
                }
            }
    
            that.gaussianBlur();

            that.minpop = that.rho_0[0][0];
            maxpop = that.rho_0[0][0];
            for (i = 0; i < that.lx; i++)
            {
                for (j = 0; j < that.ly; j++)
                {
                    if (that.rho_0[i][j] < that.minpop)
                    {
                        that.minpop = that.rho_0[i][j];
                    }
                }
            }
            for (i = 0; i < that.lx; i++)
            {
                for (j = 0; j < that.ly; j++)
                {
                    if (that.rho_0[i][j] > maxpop) 
                    {
                        maxpop = that.rho_0[i][j];
                    }
                }
            }

            that.rho_0 = FFT.coscosft(that.rho_0, 1, 1);

        };    // CartogramGastner.initcond



        /**
         * Performs au Gaussian blur on the density grid.
         */
        that.gaussianBlur = function(){
    
            var blur = _buildArray(1,that.lx,that.ly);
            var conv = _buildArray(1,that.lx,that.ly);
            var pop = _buildArray(1,that.lx,that.ly);
            var speqblur = _buildArray(1,2*that.lx);
            var speqconv = _buildArray(1,2*that.lx);
            var speqpop = _buildArray(1,2*that.lx);

            var i, j, p, q;
            for (i=1; i <= that.lx; i++)
            {
                for (j = 1; j <= that.ly; j++)
                {
                    if (i > (that.lx / 2))
                        p = i - 1 - that.lx;
                    else
                        p = i - 1;
                
                    if (j > (that.ly / 2))
                        q = j - 1 - that.ly;
                    else
                        q = j-1;
                
                    pop[0][i-1][j-1] = that.rho_0[i-1][j-1];
                
                    var erfDenominator = Math.sqrt(2.0) * 
                        (SIGMA * Math.pow(SIGMAFAC, that.nblurs));
                    
                    var erfParam1 = that.erf((p + 0.5) / erfDenominator);
                    var erfParam2 = that.erf((p - 0.5) / erfDenominator);
                    var erfParam3 = that.erf((q + 0.5) / erfDenominator);
                    var erfParam4 = that.erf((q - 0.5) / erfDenominator);
                
                    conv[0][i-1][j-1] = 0.5 * (erfParam1 - erfParam2) * 
                        (erfParam3 - erfParam4) / (that.lx * that.ly);

                }
            }
  
 
            var temp = FFT.rlft3(pop, speqpop, 1, that.lx, that.ly, 1);
            pop = temp[0];
            speqpop = temp[1];
        
            var temp = FFT.rlft3(conv, speqconv, 1, that.lx, that.ly, 1);
            conv = temp[0];
            speqconv = temp[1];
        
            for (i = 1; i <= that.lx; i++)
            {
                for (j = 1; j<= (that.ly / 2); j++)
                {
                    blur[0][i-1][(2*j)-2] = 
                        pop[0][i-1][(2*j)-2] * conv[0][i-1][(2*j)-2] -
                        pop[0][i-1][(2*j)-1] * conv[0][i-1][(2*j)-1];
                                      
                    blur[0][i-1][(2*j)-1] = 
                        pop[0][i-1][(2*j)-1] * conv[0][i-1][(2*j)-2] +
                        pop[0][i-1][(2*j)-2] * conv[0][i-1][(2*j)-1];
                }
            }
      
            for (i = 1; i <= that.lx; i++)
            {
                speqblur[0][(2*i)-2] = 
                    speqpop[0][(2*i)-2] * speqconv[0][(2*i)-2] -
                    speqpop[0][(2*i)-1] * speqconv[0][(2*i)-1];

                speqblur[0][(2*i)-1] = 
                    speqpop[0][(2*i)-1] * speqconv[0][(2*i)-2] +
                    speqpop[0][(2*i)-2] * speqconv[0][(2*i)-1];
            }

            var temp = FFT.rlft3(blur, speqblur, 1, that.lx, that.ly, -1);
            blur = temp[0];
            speqblur = temp[1];

            for (i = 1; i <= that.lx; i++)
            {
                for (j = 1; j <= that.ly; j++)
                {
                    that.rho_0[i-1][j-1] = blur[0][i-1][j-1];
                }
            }

        };    // CartogramGastner.gaussianBlur





        /**
         * Computes the velocity field at time t.
         * @param t the time.
         */
        that.calculateVelocityField = function(t) {
            var j, k;
            for (j = 0; j <= that.lx; j++) {
                for (k = 0; k <= that.ly; k++) {
                    that.rho[j][k] = Math.exp(-1 * ((Math.PI * j / that.lx) * 
                        (Math.PI * j / that.lx) + (Math.PI * k / that.ly) * 
                        (Math.PI * k / that.ly)) * t) * that.rho_0[j][k];
                }
            }

            for (j = 0; j <= that.lx; j++) {
                for (k = 0; k <= that.ly; k++) {
                    that.gridvx[j][k] = 
                        -1 * (Math.PI * j / that.lx) * that.rho[j][k];
                    
                    that.gridvy[j][k] = 
                        -1 * (Math.PI * k / that.ly) * that.rho[j][k];
                }
            }
  
            that.rho = FFT.coscosft(that.rho, -1, -1);
            that.gridvx = FFT.sincosft(that.gridvx, -1, -1);
            that.gridvy = FFT.cossinft(that.gridvy, -1, -1);

            for (j = 0; j <= that.lx; j++) {
                for (k = 0; k <= that.ly; k++) {
                    that.gridvx[j][k] = (-1 * that.gridvx[j][k]) / that.rho[j][k];
                    that.gridvy[j][k] = (-1 * that.gridvy[j][k]) / that.rho[j][k];
                }
            }
        
        };    // CartogramGastner.calculateVelocityField





        /**
         * Bilinear interpolation in 2D.
         */
        that.interpolateBilinear = function(arr, x, y){
    
            var gaussx,gaussy;
            var deltax,deltay;

            if (x < 0.0 || y < 0.0)
            {
                return 0.0;
            }
        
            var xlen = arr.length;
            var ylen = arr[0].length;
            if (x >= xlen || y >= ylen)
            {
                return 0.0;
            }

            gaussx = Math.floor(x);
            gaussy = Math.floor(y);
            deltax = x - gaussx;
            deltay = y - gaussy;

            if (gaussx == that.lx && gaussy == that.ly){
                return arr[gaussx][gaussy];
            }
        
            if (gaussx == that.lx){
                return ((1 - deltay) * arr[gaussx][gaussy]) + 
                        (deltay * arr[gaussx][gaussy+1]);
            }
            if (gaussy == that.ly){
                return ((1 - deltax) * arr[gaussx][gaussy]) + 
                        (deltax * arr[gaussx+1][gaussy]);
            }
        
            return  ((1 - deltax) * (1 - deltay) * arr[gaussx][gaussy]) +
                    ((1 - deltax) * deltay * arr[gaussx][gaussy+1]) +
                    (deltax * (1 - deltay) * arr[gaussx+1][gaussy]) +
                    (deltax * deltay * arr[gaussx+1][gaussy+1]);

        };    // CartogramGastner.interpolateBilinear




        that.newt2 = function(h, ptappr, xguess, yguess, j, k) {
        
            var deltax, deltay, dfxdx, dfxdy, dfydx, dfydy, fx, fy;
            var gaussx, gaussxplus, gaussy, gaussyplus, i;
            var temp;
            var tempobj = null;
  
            ptappr[0] = xguess;
            ptappr[1] = yguess;
  
            for (i = 1; i <= IMAX; i++) {
                temp = that.interpolateBilinear(that.gridvx, ptappr[0], ptappr[1]);
            
                fx = ptappr[0] - (0.5 * h * temp) - that.x[j][k] - (0.5 * h * that.vx[j][k]);
                
                temp = that.interpolateBilinear(that.gridvy, ptappr[0], ptappr[1]);
            
                fy = ptappr[1] - (0.5 * h * temp) - that.y[j][k] - (0.5 * h * that.vy[j][k]);
            
                gaussx = Math.floor(ptappr[0]);
                gaussy = Math.floor(ptappr[1]);
            
                if (gaussx == that.lx){
                    gaussxplus = 0;
                } else {
                    gaussxplus = gaussx + 1;
                }
                if (gaussy == that.ly){
                    gaussyplus = 0;
                }else{
                    gaussyplus = gaussy + 1;
                }
                deltax = that.x[j][k] - gaussx;
                deltay = that.y[j][k] - gaussy;
            
                dfxdx = 1 - 0.5 * h * ((1 - deltay) * (that.gridvx[gaussxplus][gaussy] - that.gridvx[gaussx][gaussy]) + deltay * (that.gridvx[gaussxplus][gaussyplus] - that.gridvx[gaussx][gaussyplus]));
     
                dfxdy = -0.5 * h * ((1 - deltax) * (that.gridvx[gaussx][gaussyplus] - that.gridvx[gaussx][gaussy]) + deltax * (that.gridvx[gaussxplus][gaussyplus] - that.gridvx[gaussxplus][gaussy]));

                dfydx = -0.5 * h * ((1 - deltay) * (that.gridvy[gaussxplus][gaussy] - that.gridvy[gaussx][gaussy]) + deltay * (that.gridvy[gaussxplus][gaussyplus] - that.gridvy[gaussx][gaussyplus]));

                dfydy = 1 - 0.5 * h * ((1 - deltax) * (that.gridvy[gaussx][gaussyplus] - that.gridvy[gaussx][gaussy]) + deltax * (that.gridvy[gaussxplus][gaussyplus] - that.gridvy[gaussxplus][gaussy]));
      
      
                if ((fx*fx + fy*fy) < TOLF){
                    return [true, ptappr];
                }
            
                deltax = (fy*dfxdy - fx*dfydy) / (dfxdx*dfydy - dfxdy*dfydx);
                deltay = (fx*dfydx - fy*dfxdx) / (dfxdx*dfydy - dfxdy*dfydx);
      
                if ((deltax*deltax + deltay*deltay) < TOLX){
                    return [true, ptappr];
                }
            
            
                ptappr[0] += deltax;
                ptappr[1] += deltay;

            }

            return [false, ptappr];
        };    // CartogramGastner.newt2


        var Erf_erf = function(val){
            var ret = Gamma.regularizedGammaP(0.5, x * x, 1.0e-15, 10000);
            if (x < 0) {
                ret = -ret;
            }
            return ret;
        };

        /**
         * Our wrapper function for the Jakarta Commons Math Erf.erf function.
         * For values <= -4 or >= 4, we return -1 or 1 directthat.ly, without
         * computation. Erf.erf raises too often an exception for failing
         * convergence.
         */
        that.erf = function(value){
            if (value <= -4.0){
                return -1.0;
            }
            if (value >= 4.0){
                return 1.0;
            }
            var erf = 0.0;
            try
            {
                erf = Erf_erf(value);
            }
            catch (e)
            {
                if (value < 0){
                    return -1.0;
                }
                else{
                    return 1.0;
                }
            }
        
            return erf;
        };    // CartogramGastner.erf





        /**
         * Applies the cartogram deformation to the cartogram grid.
         */
        that.projectCartogramGrid = function(){
        
            // Project each point in the cartogram grid.
            var x = that.mGrid.getXCoordinates();
            var y = that.mGrid.getYCoordinates();
        
            var gridSizeX = x.length;
            var gridSizeY = x[0].length;
        
            var i, j;
            for (i = 0; i < gridSizeX; i++)
            {
                for (j = 0; j < gridSizeY; j++)
                {
                    var projectedPoint = that.projectPoint(x[i][j], y[i][j]);
                    x[i][j] = projectedPoint[0];
                    y[i][j] = projectedPoint[1];
                }
            }
    
        };    // CartogramGastner.projectCartogramGrid







        /**
         * Projects one point using the deformed grid.
         * @param x the x coordinate of the point to project.
         * @param y the y coordinate of the point to project.
         * @return a double array with the coordinates of the projected point.
         */
        that.projectPoint = function(x, y)
        {
    
            var deltax, deltay, den, t, u, temp;
            var gaussx, gaussy;

            // Get the grid size and the cellsize.
            var cellSizeX =that.mExtent.getWidth() / that.lx;
            var cellSizeY =that.mExtent.getHeight() / that.ly;

            // Make a copy of the point coordinate.
            var px = x;
            var py = y;

            px = (px - that.mExtent.getMinX()) * that.lx / that.mExtent.getWidth();
            py = (py - that.mExtent.getMinY()) * that.ly / that.mExtent.getHeight();
            temp = Math.floor(px);
            gaussx = Math.round(temp);
            temp = Math.floor(py);
            gaussy = Math.round(temp);
            if (gaussx < 0 || gaussx > that.lx || gaussy < 0 || gaussy > that.ly)
            {
                console_log("[ERROR] Coordinate limits exceeded.");
                return null;
            }
            deltax = px - gaussx;
            deltay = py - gaussy;


            var ax = (1 - deltax) * that.x[parseInt(gaussx)][parseInt(gaussy)] + 
                deltax * that.x[parseInt(gaussx+1)][parseInt(gaussy)];
            var ay = (1 - deltax) * that.y[parseInt(gaussx)][parseInt(gaussy)] + 
                deltax * that.y[parseInt(gaussx+1)][parseInt(gaussy)];
            var bx = (1 - deltax) * that.x[parseInt(gaussx)][parseInt(gaussy+1)] + 
                deltax * that.x[parseInt(gaussx+1)][parseInt(gaussy+1)];
            var by = (1 - deltax) * that.y[parseInt(gaussx)][parseInt(gaussy+1)] + 
                deltax * that.y[parseInt(gaussx+1)][parseInt(gaussy+1)];
            var cx = (1 - deltay) * that.x[parseInt(gaussx)][parseInt(gaussy)] + 
                deltay * that.x[parseInt(gaussx)][parseInt(gaussy+1)];
            var cy = (1 - deltay) * that.y[parseInt(gaussx)][parseInt(gaussy)] + 
                deltay * that.y[parseInt(gaussx)][parseInt(gaussy+1)];
            var dx = (1 - deltay) * that.x[parseInt(gaussx+1)][parseInt(gaussy)] + 
                deltay * that.x[parseInt(gaussx+1)][parseInt(gaussy+1)];
            var dy = (1 - deltay) * that.y[parseInt(gaussx+1)][parseInt(gaussy)] + 
                deltay * that.y[parseInt(gaussx+1)][parseInt(gaussy+1)];

            den = (bx - ax)*(cy - dy) + (ay - by)*(cx - dx);
            if (Math.abs(den) < 1e-12)
            {
                var ix = (ax + bx + cx + dx) / 4;
                var iy = (ay + by + cy + dy) / 4;
                var meanpoint = [null, null];
                meanpoint[0] = (ix * (that.lx /that.mExtent.getWidth())) +that.mExtent.getMinX();
                meanpoint[1] = (iy * (that.ly /that.mExtent.getHeight())) +that.mExtent.getMinY();
                return meanpoint;
            
            }
            t = ((cx - ax)*(cy - dy) + (ay - cy)*(cx - dx)) / den;
            u = ((bx - ax)*(cy - ay) + (ay - by)*(cx - ax)) / den;
        
            px = (1 - (ax + t*(bx-ax)) / that.lx) *that.mExtent.getMinX() + 
                    ((ax + t*(bx - ax)) / that.lx) *that.mExtent.getMaxX();
            py = (1 - (ay + t*(by-ay)) / that.ly) *that.mExtent.getMinY() + 
                    ((ay + t*(by - ay)) / that.ly) *that.mExtent.getMaxY();
                
            var point = [null, null];
            point[0] = px;
            point[1] = py;
        
            return point;
        };    // CartogramGastner.projectPointWithGrid






        /**
         * Writes the grid into the specified shape file.
         * @param shapefile the path to the shape file.
         */
        that.writeToShapefile = function(shapefile)
        {
            /*
            // Create a new Feature Schema for our shape file.
            FeatureSchema fs = new FeatureSchema();
        
            // We add the following attributes to the Feature Schema:
            // cellId : a serial number starting at 1
            // geom : the geometry (pothat.lygon)
            // i : the index of the cell in x direction
            // j : the index of the cell in y direction
            fs.addAttribute("cellId", AttributeType.INTEGER);
            fs.addAttribute("geom", AttributeType.GEOMETRY);
            fs.addAttribute("i", AttributeType.INTEGER);
            fs.addAttribute("j", AttributeType.INTEGER);
            fs.addAttribute("rho_0", AttributeType.DOUBLE);
            fs.addAttribute("rho", AttributeType.DOUBLE);
        
        
            // Create a new Geometry Factory for creating our geometries.
            GeometryFactory gf = new GeometryFactory();
        
            // Create a new Feature Dataset in order to store our new Features.
            FeatureDataset fd = new FeatureDataset(fs);
        
        
            // Create one Feature for each cell.
            int i, j;
            int cellId = 0;
            for (j = 0; j < that.ly; j++)
            {
                for (i = 0; i < that.lx; i++)
                {
                    cellId++;
                
                    // Extract the coordinates for the cell pothat.lygon.
                    Coordinate[] coords = new Coordinate[5];
                    coords[0] = new Coordinate(x[i][j], y[i][j]);
                    coords[1] = new Coordinate(x[i][j+1], y[i][j+1]);
                    coords[2] = new Coordinate(x[i+1][j+1], y[i+1][j+1]);
                    coords[3] = new Coordinate(x[i+1][j], y[i+1][j]);
                    coords[4] = coords[0];
                
                    // Create the pothat.lygon.
                    LinearRing ring = gf.createLinearRing(coords);
                    Pothat.lygon pothat.ly = gf.createPothat.lygon(ring, null);
                
                    // Create a new Feature.
                    BasicFeature feat = new BasicFeature(fs);
                
                    // Setting the Feature's attributes.
                    feat.setAttribute("cellId", new Integer(cellId));
                    feat.setAttribute("geom", pothat.ly);
                    feat.setAttribute("i", new Integer(i));
                    feat.setAttribute("j", new Integer(j));
                    feat.setAttribute("rho_0", new Double(that.rho_0[i][j]));
                    feat.setAttribute("rho", new Double(that.rho[i][j]));
                
                    // Add the Feature to the Feature Dataset.
                    fd.add(feat);
                
                }
            }
        
        
            // Write the Feature Dataset to the Shape file.
            IOManager.writeShapefile(fd, shapefile);
    
            */
        };    // CartogramGrid.writeToShapefile
        return that;
    };
}());   // CartogramGastner




var FFT = (function(){
    var that = {};
    
    that.coscosft = function(y,isign1, isign2){
        var lx = y.length - 1;
        var ly = y[0].length - 1;
        var temp = _buildArray(lx+1);
        var i, j;
        for (i = 0; i <= lx; i++){
            y[i] = that.cosft(y[i], ly, isign2);
        }
        for (j = 0; j <= ly; j++){
            for (i = 0; i <= lx; i++){
                temp[i] = y[i][j];
            }
            temp = that.cosft(temp, lx, isign1);
            for (i = 0; i <= lx; i++){
                y[i][j] = temp[i];
            }
        }
        return y;
    };
    
    
    that.cosft = function(z, n, isign){
        var theta, wi=0.0, wpi, wpr, wr=1.0, wtemp;
        var a;
        var sum, y1, y2;
        var j, n2;
        
        a = _buildArray(n+2);
        for (j = 1; j <= (n+1); j++)
        {
            a[j] = z[j-1];
        }

        theta = Math.PI / n;
        wtemp = Math.sin(0.5 * theta);
        wpr = -2.0 * wtemp * wtemp;
        wpi = Math.sin(theta);
        sum = 0.5 * (a[1] - a[n+1]);
        a[1] = 0.5 * (a[1] + a[n+1]);
        n2 = n + 2;

        for (j = 2; j <= (n/2); j++)
        {
            wtemp = wr;
            wr = wr*wpr - wi*wpi + wr;
            wi = wi*wpr + wtemp*wpi + wi;
            y1 = 0.5 * (a[j] + a[n2-j]);
            y2 = a[j] - a[n2-j];
            a[j] = y1 - wi*y2;
            a[n2-j] = y1 + wi*y2;
            sum += wr * y2;
        }
        a = that.realft(a, n, 1);
        a[n+1] = a[2];
        a[2] = sum;
        for (j = 4; j <= n; j += 2)
        {
            sum += a[j];
            a[j] = sum;
        }

  
        if (isign == 1){
            for (j = 1; j <= (n+1); j++){
                z[j-1] = a[j];
            }
        }
        else if (isign == -1){
            for (j = 1; j <= (n+1); j++){
                z[j-1] = 2.0 * a[j] / n;
            }
        }
        return z;
    };    // FFT.cosft




    that.cossinft = function(y, isign1, isign2) {
        var lx = y.length - 1;
        var ly = y[0].length - 1;
        var temp = _buildArray(lx+1);
        var i, j;
        
        for (i = 0; i <= lx; i++){
            y[i] = that.sinft(y[i], ly, isign2);
        }
        for (j = 0; j <= ly; j++){
            for (i = 0; i <= lx; i++){
                temp[i] = y[i][j];
            }
            temp = that.cosft(temp, lx, isign1);
            for (i = 0; i <= lx; i++){
                y[i][j] = temp[i];
            }
        }
        return y;    
    };



    that.four1 = function(data, nn, isign){
        var theta, wi, wpi, wpr, wr, wtemp;
        var tempi, tempr;
        var i, istep, j, m, mmax, n;
        n = nn * 2;
        j = 1;
        for (i = 1; i < n; i += 2){
            if (j > i){
                tempr = data[j];
                data[j] = data[i];
                data[i] = tempr;
                tempr = data[j+1];
                data[j+1] = data[i+1];
                data[i+1] = tempr;
            }
      
            m = n / 2;
            while (m >= 2 && j > m)
            {
                j -= m;
                m = m / 2;
            }
            j += m;
        }
        
        mmax = 2;
        while (n > mmax){
            istep = mmax * 2;
            theta = isign * (2 * Math.PI / mmax);
            wtemp = Math.sin(0.5 * theta);
            wpr = -2.0 * wtemp * wtemp;
            wpi = Math.sin(theta);
            wr = 1.0;
            wi = 0.0;
            
            for (m = 1; m < mmax; m += 2){
                for (i = m; i <= n; i += istep){
                    j = i + mmax;
                    tempr = wr * data[j] - wi * data[j+1];
                    tempi = wr * data[j+1] + wi * data[j];
                    data[j] = data[i] - tempr;
                    data[j+1] = data[i+1] - tempi;
                    data[i] += tempr;
                    data[i+1] += tempi;
                }
                wtemp = wr;
                wr = wtemp*wpr - wi*wpi + wr;
                wi = wi*wpr + wtemp*wpi + wi;
            }
            
            mmax = istep;
        }
        return data;
    };
    



    that.fourn = function(data, nn, ndim, isign){
        var idim;
        var i1, i2, i3, i2rev, i3rev, ip1, ip2, ip3, ifp1, ifp2;
        var ibit, k1, k2, n, nprev, nrem, ntot;
        var tempi, tempr;
        var theta, wi, wpi, wpr, wr, wtemp;
        var swaptemp;

        ntot = 1;
        for (idim = 1; idim <= ndim; idim++) {
            ntot *= nn[idim];
        }
 
        nprev = 1;
        for (idim = ndim; idim >= 1; idim--){
            n = nn[idim];
            nrem = ntot / (n*nprev);
            ip1 = nprev * 2;
            ip2 = ip1 * n;
            ip3 = ip2 * nrem;
            i2rev = 1;
            
            for (i2 = 1; i2 <= ip2; i2 += ip1){
                if (i2 < i2rev){
                    for (i1 = i2; i1 <= (i2 + ip1 - 2); i1 += 2){
                        for (i3 = i1; i3 <= ip3; i3 += ip2){
                            i3rev = i2rev + i3 - i2;
                            
                            swaptemp = data[i3-1];
                            data[i3-1] = data[i3rev-1];
                            data[i3rev-1] = swaptemp;
                            
                            swaptemp = data[i3];
                            data[i3] = data[i3rev];
                            data[i3rev] = swaptemp;
                        }
                    }
                }
                
                ibit = ip2 / 2;
                while (ibit >= ip1 && i2rev > ibit)
                {
                    i2rev -= ibit;
                    ibit = ibit / 2;
                }
                i2rev += ibit;
            }
            
            ifp1 = ip1;

            while (ifp1 < ip2){
                ifp2 = ifp1 * 2;
                theta = 2 * isign * Math.PI / (ifp2 / ip1);
                wtemp = Math.sin(0.5*theta);
                wpr = -2.0 * wtemp * wtemp;
                wpi = Math.sin(theta);
                wr = 1.0;
                wi = 0.0;
                
                for (i3 = 1; i3 <= ifp1; i3 += ip1){
                    for (i1 = i3; i1 <= (i3 + ip1 - 2); i1 += 2){
                        for (i2 = i1; i2 <= ip3; i2 += ifp2){
                            k1 = i2;
                            k2 = k1 + ifp1;
                            tempr = (wr * data[k2-1]) - (wi * data[k2]);
                            tempi = (wr * data[k2]) + (wi * data[k2-1]);
                            data[k2-1] = data[k1-1] - tempr;
                            data[k2] = data[k1] - tempi;
                            data[k1-1] += tempr;
                            data[k1] += tempi;
                        }
                    }

                    wtemp = wr;
                    wr = wtemp*wpr - wi*wpi + wr;
                    wi = wi*wpr + wtemp*wpi + wi;
                }
                
                ifp1 = ifp2;
            }
            nprev *= n;
        
        }
        return [data, nn];
    };


    that.realft = function(data, n, isign)
    {
        var theta, wi, wpi, wpr, wr, wtemp;
        var c1=0.5, c2, h1i, h1r, h2i, h2r;
        var i, i1, i2, i3, i4, np3;
        
        theta = Math.PI / (n/2);
        if (isign == 1){
            c2 = -0.5;
            data = that.four1(data, (n/2), 1);
        } else {
            c2 = 0.5;
            theta = -1.0 * theta;
        }
        wtemp = Math.sin(0.5 * theta);
        wpr = -2.0 * wtemp * wtemp;
        wpi = Math.sin(theta);
        wr = 1.0 + wpr;
        wi = wpi;
        np3 = n + 3;
        for (i = 2; i <= (n/4); i++) {
            i1 = i + i - 1;
            i2 = 1 + i + i - 1;
            i3 = np3 - i2;
            i4 = 1 + i3;
            
            h1r = c1 * (data[i1] + data[i3]);
            h1i = c1 * (data[i2] - data[i4]);
            h2r = (-1.0 * c2) * (data[i2] + data[i4]);
            h2i = c2 * (data[i1] - data[i3]);

            data[i1] = h1r + wr*h2r - wi*h2i;
            data[i2] = h1i + wr*h2i + wi*h2r;
            data[i3] = h1r - wr*h2r + wi*h2i;
            data[i4] = (-1.0 * h1i) + wr*h2i + wi*h2r;
            wtemp = wr;
            wr = wr*wpr - wi*wpi + wr;
            wi = wi*wpr + wtemp*wpi + wi;
        }
        if (isign == 1) {
            h1r = data[1];
            data[1] = h1r + data[2];
            data[2] = h1r - data[2];
        } else {
            h1r = data[1];
            data[1] = c1 * (h1r + data[2]);
            data[2] = c1 * (h1r - data[2]);
            data = that.four1(data, (n/2), -1);
        }
        return data;
    };



    that.rlft3 = function(data, speq, nn1, nn2, nn3, isign) {
        var theta, wi, wpi, wpr, wr, wtemp;
        var c1, c2, h1r, h1i, h2r, h2i;
        var i1, i2, i3, j1, j2, j3, ii3;
        var nn = [null, null,null, null];
        
        c1 = 0.5;
        c2 = -0.5 * isign;
        theta = 2 * isign * (Math.PI / nn3);
        wtemp = Math.sin(0.5 * theta);
        wpr = -2.0 * wtemp * wtemp;
        wpi = Math.sin(theta);
        nn[1] = nn1;
        nn[2] = nn2;
        nn[3] = nn3 / 2;
  
        var datatemp = _buildArray(nn1*nn2*nn3);
        if (isign == 1){
            j1 = 0;
            for (i1 = 0; i1 < nn1; i1++){
                for (i2 = 0; i2 < nn2; i2++){
                    for (i3 = 0; i3 < nn3; i3++){
                        datatemp[j1] = data[i1][i2][i3];
                        j1++;
                    }
                }
            }
        
            var tempres = that.fourn(datatemp, nn, 3, isign);
            datatemp = tempres[0];
            nn = tempres[1];
            j1 = 0;
            for (i1 = 0; i1 < nn1; i1++){
                for (i2 = 0; i2 < nn2; i2++){
                    for (i3 = 0; i3 < nn3; i3++){
                        data[i1][i2][i3] = datatemp[j1];
                        j1++;
                    }
                }
            }
            
            
            for (i1 = 1; i1 <= nn1; i1++){
                for (i2 = 1, j2 = 0; i2 <= nn2; i2++){
                    speq[i1-1][j2] = data[i1-1][i2-1][0];
                    j2++;
                    speq[i1-1][j2] = data[i1-1][i2-1][1];
                    j2++;
                }
            }
            
        }
        
        
        for (i1 = 1; i1 <= nn1; i1++) {
            if (i1 != 1){
                j1 = nn1 - i1 + 2;
            } else {
                j1 = 1;
            }
            wr = 1.0;
            wi = 0.0;
            for (ii3 = 1, i3 = 1; i3 <= ((nn3/4) + 1); i3++, ii3 += 2) {
                for (i2 = 1; i2 <= nn2; i2++) {
                    if (i3 == 1) {
                        if (i2 != 1){
                            j2 = ((nn2 - i2) * 2) + 3;
                        }else{
                            j2 = 1;
                        }
                        h1r = c1 * (data[i1-1][i2-1][0] + speq[j1-1][j2-1]);
                        h1i = c1 * (data[i1-1][i2-1][1] - speq[j1-1][j2]);
                        h2i = c2 * (data[i1-1][i2-1][0] - speq[j1-1][j2-1]);
                        h2r = -1 * c2 * (data[i1-1][i2-1][1] + speq[j1-1][j2]);
                        data[i1-1][i2-1][0] = h1r + h2r;
                        data[i1-1][i2-1][1] = h1i + h2i;
                        speq[j1-1][j2-1] = h1r-h2r;
                        speq[j1-1][j2] = h2i-h1i;
                    }
                    else {
                        if (i2 != 1){
                            j2 = nn2 - i2 + 2;
                        }else{
                            j2 = 1;
                        }
                        j3 = nn3 + 3 - (i3 * 2);
                        h1r = c1 * (data[i1-1][i2-1][ii3-1] + data[j1-1][j2-1][j3-1]);
                        h1i = c1 * (data[i1-1][i2-1][ii3] - data[j1-1][j2-1][j3]);
                        h2i = c2 * (data[i1-1][i2-1][ii3-1] - data[j1-1][j2-1][j3-1]);
                        h2r = -1 * c2 * (data[i1-1][i2-1][ii3] + data[j1-1][j2-1][j3]);
                        data[i1-1][i2-1][ii3-1] = h1r + wr*h2r - wi*h2i;
                        data[i1-1][i2-1][ii3] = h1i + wr*h2i + wi*h2r;
                        data[j1-1][j2-1][j3-1] = h1r - wr*h2r + wi*h2i;
                        data[j1-1][j2-1][j3] = -1*h1i + wr*h2i + wi*h2r;
                    }
                }
                
                wtemp = wr;
                wr = wtemp*wpr - wi*wpi + wr;
                wi = wi*wpr + wtemp*wpi + wi;
            }
        
        }
        
        if (isign == -1) {
            j1 = 0;
            for (i1 = 0; i1 < nn1; i1++) {
                for (i2 = 0; i2 < nn2; i2++) {
                    for (i3 = 0; i3 < nn3; i3++) {
                        datatemp[j1] = data[i1][i2][i3];
                        j1++;
                    }
                }
            }
            
            var tempres = FFT.fourn(datatemp, nn, 3, isign);
            datatemp = tempres[0];
            nn = tempres[1];
            
            j1 = 0;
            for (i1 = 0; i1 < nn1; i1++) {
                for (i2 = 0; i2 < nn2; i2++) {
                    for (i3 = 0; i3 < nn3; i3++) {
                        data[i1][i2][i3] = datatemp[j1];
                        j1++;
                    }
                }
            }
            
        }
        return [data, speq];
    };



    that.sincosft = function(y, isign1, isign2) {
        var lx = y.length - 1;
        var ly = y[0].length - 1;
        var temp = _buildArray(lx+1);
        var i, j;

        for (i = 0; i <= lx; i++){
            y[i] = that.cosft(y[i], ly, isign2);
        }
        
        for (j = 0; j <= ly; j++){
            for (i = 0; i <= lx; i++){
                temp[i] = y[i][j];
            }
            temp = that.sinft(temp, lx, isign1);
            for (i = 0; i <= lx; i++){
                y[i][j] = temp[i];
            }
        }
        return y;
    };
    
    
    
    that.sinft = function(z, n, isign) {
        var theta, wi = 0.0, wpi, wpr, wr = 1.0, wtemp;
        var a;
        var sum, y1, y2;
        var j;
        var n2 = n + 2;
        a = _buildArray(n+1);
        for (j = 1; j <= n; j++){
            a[j] = z[j-1];
        }

        theta = Math.PI / n;
        wtemp = Math.sin(0.5 * theta);
        wpr = -2.0 * wtemp * wtemp;
        wpi = Math.sin(theta);
        a[1] = 0.0;
        for (j = 2; j <= ((n/2) + 1); j++) {
            wtemp = wr;
            wr = wtemp*wpr - wi*wpi + wr;
            wi = wi*wpr + wtemp*wpi + wi;
            y1 = wi * (a[j] + a[n2-j]);
            y2 = 0.5 * (a[j] - a[n2-j]);
            a[j] = y1 + y2;
            a[n2-j] = y1 - y2;
        }

        a = that.realft(a, n, 1);
        a[1] *= 0.5;
        sum = a[2] = 0.0;
        for (j = 1; j <= (n-1); j += 2) {
            sum += a[j];
            a[j] = a[j+1];
            a[j+1] = sum;
        }

        if (isign == 1){
            for (j = 1; j <= n; j++){
                z[j-1] = a[j];
            }
        }
        else if (isign == -1) {
            for (j=1; j<=n; j++) {
                z[j-1] = 2.0 * a[j] / n;
            }
        }
        z[n] = 0.0;
        return z;
    };
   return that;
}());

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
            if(typeof(other) === "undefined"){
                return;
            }
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
                if(that.polygons.length > 0){
                    that.envelope = that.polygons[0].getEnvelope();
                    for(var i=1;i<that.polygons.length;i++){
                        that.envelope.expandToIncludeEnvelope(that.polygons[i].getEnvelope());
                    }
                }else{
                    that.envelope = Envelope();
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
			

			
    			console_log(progress, "Computing the density for the cartogram grid...", "Treating feature " + (featCnt+1) + " of " + nFeat, feat.id);
				
			
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
		    console_log("minmaxij: ", minI, minJ, maxI, maxJ);
		
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
//    				} else {
//    				} else if (geom.intersects(cellEnvGeom)) {
    				} else if (false) {
    					// The cell is not completely inside the geometry.
    					
/*    					TODO: implement intersection
                        var intersection = geom.intersection(cellEnvGeom); 
                        var densityProportion = intersection.getArea() / cellEnvGeom.getArea(); */
    					var densityProportion = geom.getArea() / cellEnvGeom.getArea();
    					
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

AttributeType = {
    "INTEGER": 0,
    "DOUBLE": 1,
    "GEOMETRY": 2
};

var _buildArray = function(){
    var a = [];
    var args = [];
    for(var k=0;k<arguments.length;k++){
        args.push(arguments[k]);
    }
    if (args.length == 0){
        return 0.0;
    }
    for(var i=0;i<args[0];i++){
        a.push(_buildArray.apply(this, args.slice(1)));
    }
    return a;
};

var Gamma = (function(){
    var that = {};
    that.LANCZOS = [
        0.99999999999999709182,
        57.156235665862923517,
        -59.597960355475491248,
        14.136097974741747174,
        -0.49191381609762019978,
        .33994649984811888699e-4,
        .46523628927048575665e-4,
        -.98374475304879564677e-4,
        .15808870322491248884e-3,
        -.21026444172410488319e-3,
        .21743961811521264320e-3,
        -.16431810653676389022e-3,
        .84418223983852743293e-4,
        -.26190838401581408670e-4,
        .36899182659531622704e-5
    ];
    
    /** Avoid repeated computation of log of 2 PI in logGamma */
    var HALF_LOG_2_PI = 0.5 * Math.log(2.0 * Math.PI);
    
    // limits for switching algorithm in digamma
    /** C limit. */
    var C_LIMIT = 49;
    
    /** S limit. */
    var S_LIMIT = 1e-5;

    that.logGamma = function(x) {
        var ret;

        if (isNaN(x) || (x <= 0.0)) {
            ret = NaN;
        } else {
            var g = 607.0 / 128.0;

            var sum = 0.0;
            for (var i = that.LANCZOS.length - 1; i > 0; --i) {
                sum = sum + (that.LANCZOS[i] / (x + i));
            }
            sum = sum + that.LANCZOS[0];

            var tmp = x + g + .5;
            ret = ((x + .5) * Math.log(tmp)) - tmp +
                HALF_LOG_2_PI + Math.log(sum / x);
        }

        return ret;
    };

    that.regularizedGammaP = function(a, x, epsilon, maxIterations){
         var ret;

         if (isNaN(a) || isNaN(x) || (a <= 0.0) || (x < 0.0)) {
             ret = NaN;
         } else if (x == 0.0) {
             ret = 0.0;
         } /*else if (x >= a + 1) {
             // use regularizedGammaQ because it should converge faster in this
             // case. // Translation: Don't care
             ret = 1.0 - regularizedGammaQ(a, x, epsilon, maxIterations);
         }*/ else {
             // calculate series
             var n = 0.0; // current element index
             var an = 1.0 / a; // n-th element in the series
             var sum = an; // partial sum
             while (Math.abs(an/sum) > epsilon && n < maxIterations && sum < Infinity) {
                 // compute next element in the series
                 n = n + 1.0;
                 an = an * (x / (a + n));

                 // update partial sum
                 sum = sum + an;
             }
             if (n >= maxIterations) {
                 throw "Max Iterations!";
             } else if (sum == Infinity) {
                 ret = 1.0;
             } else {
                 ret = Math.exp(-x + (a * Math.log(x)) - that.logGamma(a)) * sum;
             }
         }

         return ret;
    };
    
    return that;
}());



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
    
        var layerToSVGPaths = function(layer){

        	var extent = layer.getEnvelope();
            console_log("Extent ", extent);
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
                console_log("before final print");
                var layer = layers[0];
//                console_log("Final Layer ", layer);
                var paths = layerToSVGPaths(layer);
                console_log("Final Paths ", paths);
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