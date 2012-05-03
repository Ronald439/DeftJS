/**
Copyright (c) 2012 [DeftJS Framework Contributors](http://deftjs.org)
Open source under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).
*/
Ext.define('Deft.util.Function', {
  alternateClassName: ['Deft.Function'],
  statics: {
    /**
    		Creates a new wrapper function that spreads the passed Array over the target function arguments.
    */
    spread: function(fn, scope) {
      return function(array) {
        if (!Ext.isArray(array)) {
          Ext.Error.raise({
            msg: "Error spreading passed Array over target function arguments: passed a non-Array."
          });
        }
        return fn.apply(scope, array);
      };
    },
    /**
    		Returns a new function that wraps the specified function and caches the results for previously processed inputs.
    */
    memoize: function(fn, scope, hashFn) {
      var memo;
      memo = {};
      return function(value) {
        var key;
        key = Ext.isFunction(hashFn) ? hashFn.apply(scope, arguments) : value;
        if (!(key in memo)) memo[key] = fn.apply(scope, arguments);
        return memo[key];
      };
    }
  }
});