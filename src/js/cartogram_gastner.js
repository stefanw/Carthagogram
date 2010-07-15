
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
            console_log(arguments);
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