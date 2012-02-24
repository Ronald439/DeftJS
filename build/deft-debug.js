/*
DeftJS 0.1.1

Copyright (c) 2012 [DeftJS Framework Contributors](http://deftjs.org)
Open source under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).
*/

/**
@private

Used by {@link Deft.ioc.Injector}.
*/
Ext.define('Deft.ioc.DependencyProvider', {
  config: {
    identifier: null,
    /**
    		Class to be instantiated, by either full name, alias or alternate name, to resolve this dependency.
    */
    className: null,
    /**
    		Optional arguments to pass to the class' constructor when instantiating a class to resolve this dependency.
    */
    parameters: null,
    /**
    		Factory function to be executed to obtain the corresponding object instance or value to resolve this dependency.
    		
    		NOTE: For lazily instantiated dependencies, this function will be passed the object instance for which the dependency is being resolved.
    */
    fn: null,
    /**
    		Value to use to resolve this dependency.
    */
    value: null,
    /**
    		Indicates whether this dependency should be resolved as a singleton, or as a transient value for each resolution request.
    */
    singleton: true,
    /**
    		Indicates whether this dependency should be 'eagerly' instantiated when this provider is defined, rather than 'lazily' instantiated when later requested.
    		
    		NOTE: Only valid when either a factory function or class is specified as a singleton.
    */
    eager: false
  },
  constructor: function(config) {
    this.initConfig(config);
    if (this.getEager()) {
      if (this.getValue() != null) {
        Ext.Error.raise("Error while configuring '" + (this.getIdentifier()) + "': a 'value' cannot be created eagerly.");
      }
      if (!this.getSingleton()) {
        Ext.Error.raise("Error while configuring '" + (this.getIdentifier()) + "': only singletons can be created eagerly.");
      }
    }
    if (!this.getSingleton()) {
      if (this.getValue() != null) {
        Ext.Error.raise("Error while configuring '" + (this.getIdentifier()) + "': a 'value' can only be configured as a singleton.");
      }
    }
    return this;
  },
  /**
  	Resolve a target instance's dependency with an object instance or value generated by this dependency provider.
  */
  resolve: function(targetInstance) {
    var instance, parameters;
    Ext.log("Resolving '" + (this.getIdentifier()) + "'.");
    if (this.getValue() != null) return this.getValue();
    instance = null;
    if (this.getFn() != null) {
      Ext.log("Executing factory function.");
      instance = this.fn(targetInstance);
    } else if (this.getClassName() != null) {
      Ext.log("Creating instance of '" + (this.getClassName()) + "'.");
      parameters = this.getParameters() != null ? [this.getClassName()].concat(this.getParameters()) : [this.getClassName()];
      instance = Ext.create.apply(this, parameters);
    } else {
      Ext.Error.raise("Error while configuring rule for '" + (this.getIdentifier()) + "': no 'value', 'fn', or 'className' was specified.");
    }
    if (this.getSingleton()) this.setValue(instance);
    return instance;
  }
});

/*
Copyright (c) 2012 [DeftJS Framework Contributors](http://deftjs.org)
Open source under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).
*/
/**
A lightweight IoC container for dependency injection.

Used in conjunction with {@link Deft.mixin.Injectable}.
*/
Ext.define('Deft.ioc.Injector', {
  alternateClassName: ['Deft.Injector'],
  requires: ['Deft.ioc.DependencyProvider'],
  singleton: true,
  constructor: function() {
    this.providers = {};
    return this;
  },
  /**
  	Configure the Injector.
  */
  configure: function(configuration) {
    Ext.log('Configuring injector.');
    Ext.Object.each(configuration, function(identifier, config) {
      var provider;
      Ext.log("Configuring dependency provider for '" + identifier + "'.");
      if (Ext.isString(config)) {
        provider = Ext.create('Deft.ioc.DependencyProvider', {
          identifier: identifier,
          className: config
        });
      } else {
        provider = Ext.create('Deft.ioc.DependencyProvider', Ext.apply({
          identifier: identifier
        }, config));
      }
      this.providers[identifier] = provider;
    }, this);
    Ext.Object.each(this.providers, function(identifier, provider) {
      if (provider.getEager()) {
        Ext.log("Eagerly creating '" + (provider.getIdentifier()) + "'.");
        provider.resolve();
      }
    }, this);
  },
  /**
  	Indicates whether the Injector can resolve a dependency by the specified identifier with the corresponding object instance or value.
  */
  canResolve: function(identifier) {
    var provider;
    provider = this.providers[identifier];
    return provider != null;
  },
  /**
  	Resolve a dependency (by identifier) with the corresponding object instance or value.
  	
  	Optionally, the caller may specify the target instance (to be supplied to the dependency provider's factory function, if applicable).
  */
  resolve: function(identifier, targetInstance) {
    var provider;
    provider = this.providers[identifier];
    if (provider != null) {
      return provider.resolve(targetInstance);
    } else {
      return Ext.Error.raise("Error while resolving value to inject: no dependency provider found for '" + identifier + "'.");
    }
  },
  /**
  	Inject dependencies (by their identifiers) into the target object instance.
  */
  inject: function(identifiers, targetInstance) {
    var config, name, setterFunctionName, value;
    config = {};
    if (Ext.isString(identifiers)) identifiers = [identifiers];
    Ext.Object.each(identifiers, function(key, value) {
      var identifier, resolvedValue, targetProperty;
      targetProperty = Ext.isArray(identifiers) ? value : key;
      identifier = value;
      resolvedValue = this.resolve(identifier, targetInstance);
      if (targetInstance.config.hasOwnProperty(targetProperty)) {
        Ext.log("Injecting '" + identifier + "' into 'config." + targetProperty + "'.");
        config[targetProperty] = resolvedValue;
      } else {
        Ext.log("Injecting '" + identifier + "' into '" + targetProperty + "'.");
        targetInstance[targetProperty] = resolvedValue;
      }
    }, this);
    if (targetInstance.$configInited) {
      for (name in config) {
        value = config[name];
        setterFunctionName = 'set' + Ext.String.capitalize(name);
        targetInstance[setterFunctionName].call(targetInstance, value);
      }
    } else {
      targetInstance.config = Ext.Object.merge({}, targetInstance.config || {}, config);
    }
    return targetInstance;
  }
});

/*
Copyright (c) 2012 [DeftJS Framework Contributors](http://deftjs.org)
Open source under the [MIT License](http://en.wikipedia.org/wiki/MIT_License).
*/
/**
A mixin that marks a class as participating in dependency injection.

Used in conjunction with {@link Deft.ioc.Injector}.
*/
Ext.define('Deft.mixin.Injectable', {
  requires: ['Deft.ioc.Injector'],
  /**
  	@private
  */
  onClassMixedIn: function(targetClass) {
    targetClass.prototype.constructor = Ext.Function.createInterceptor(targetClass.prototype.constructor, function() {
      return Deft.Injector.inject(this.inject, this);
    });
  }
});
