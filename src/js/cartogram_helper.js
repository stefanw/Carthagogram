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