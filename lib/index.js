var getParameterNames = require('get-parameter-names');
var _ = require('underscore');
var taskUtils = require('./task');
var Promise = require('bluebird');

// Swallow bluebird's annoying error messages
Promise.onPossiblyUnhandledRejection(function() {});

var modules = {};

var wagner = function(name) {
  if (modules[name]) {
    return modules[name];
  }
  modules[name] = wagnerFactory(name);
  return modules[name];
};

wagner.module = function(name, dependencies) {
  modules[name] = wagnerFactory(name);
  if (dependencies && dependencies.length) {
    for (var i = 0; i < dependencies.length; ++i) {
      var module = modules[dependencies[i]];
      modules[name]._addTasks(module._getTasks());
    }
  }

  return modules[name];
};

function popCallback(arr) {
  if (arr.length && arr[arr.length - 1] === 'callback') {
    arr.hasCallback = true;
    arr.pop();
  }

  return arr;
}

var wagnerFactory = function(name) {
  var tasks = {};

  var step = function(alreadyExecuted, tasks, callback) {
    var done = false;

    _.each(tasks, function(task) {
      if (alreadyExecuted[task.name] || task.executing) {
        return;
      }

      var paramNames = popCallback(getParameterNames(task.task));
      var ready = true;
      var args = [];
      for (var i = 0; i < paramNames.length; ++i) {
        if (!alreadyExecuted[paramNames[i]]) {
          ready = false;
          break;
        }
        args.push(alreadyExecuted[paramNames[i]].value);
      }

      if (ready) {
        task.executing = true;

        if (paramNames.hasCallback) {
          args.push(function(error, value) {
            if (done) {
              return;
            }

            if (error) {
              done = true;
              return callback(error);
            }
            alreadyExecuted[task.name] = { value: value };
            
            if (Object.keys(alreadyExecuted).length === Object.keys(tasks).length) {
              done = true;
              return callback(null);
            }

            step(alreadyExecuted, tasks, callback);
          });

          try {
            task.task.apply(null, args);
          } catch(error) {
            done = true;
            return callback(error);
          }
        } else {
          try {
            alreadyExecuted[task.name] = { value: task.task.apply(null, args) };
          } catch(error) {
            done = true;
            process.nextTick(function() {
              return callback(error);
            });
            return;
          }

          if (Object.keys(alreadyExecuted).length === Object.keys(tasks).length) {
            done = true;
            process.nextTick(function() {
              return callback(null);
            });
            return;
          }

          process.nextTick(function() {
            step(alreadyExecuted, tasks, callback);
          });
        }
      }
    });
  };

  var wagner = {
    name: name,
    task: function(name, func) {
      var paramNames = getParameterNames(func);
      if (paramNames.length &&
          paramNames[paramNames.length - 1] === 'callback') {
        paramNames.pop();
      }

      tasks[name] = {
        task: func,
        name: name,
        dep: paramNames
      };

      return wagner;
    },
    factory: function(name, func) {
      tasks[name] = {
        task: func,
        name: name,
        dep: getParameterNames(func)
      };

      return wagner;
    },
    _getTasks: function() {
      return tasks;
    },
    _addTasks: function(newTasks) {
      for (var key in newTasks) {
        tasks[key] = newTasks[key];
      }
    },
    clear: function() {
      tasks = {};
    },
    parallel: function(map, func, callback) {
      var results = {};
      var errors;
      _.each(map, function(value, key) {
        try {
          func(
            value,
            key,
            function(error, result) {
              if (error) {
                results[key] = { error: error };
                errors = errors || [];
                errors.push(error);
              } else {
                results[key] = { result: result };
              }
              if (Object.keys(results).length === Object.keys(map).length) {
                return callback(errors, results);
              }
            });
        } catch(error) {
          results[key] = { error: error };
          errors = errors || [];
          errors.push(error);

          if (Object.keys(results).length === Object.keys(map).length) {
            return callback(errors, results);
          }
        }
      });
    },
    series: function(arr, func, callback) {
      var results = [];

      var next = function(index) {
        if (index >= arr.length) {
          return callback(null, results);
        }

        try {
          func(arr[index], index, function(error, result) {
            if (error) {
              return callback({ index: index, error: error });
            }

            results.push(result);
            next(index + 1);
          });
        } catch(error) {
          return callback({ index: index, error: error });
        }
      };

      next(0);
    },
    invoke: function(func, locals) {
      var paramNames = getParameterNames(func);

      // Remove error param
      var hasErrorParameter = paramNames.length &&
        ['error', 'err'].indexOf(paramNames[0]) != -1;
      if (hasErrorParameter) {
        paramNames.shift();
      }

      var newTasks = _.clone(tasks);
      _.each(locals, function(value, key) {
        newTasks[key] = {
          name: key,
          dep: [],
          value: value
        };
      });

      var orderedTasks = taskUtils.dfs(newTasks, paramNames);
      orderedTasks = _.map(orderedTasks, function(taskName) {
        return newTasks[taskName];
      });

      var alreadyExecuted = {};
      _.each(locals, function(value, key) {
        alreadyExecuted[key] = { value: value };
      });

      var allSync = true;
      for (var i = 0; i < orderedTasks.length; ++i) {
        if (!orderedTasks[i].isSync) {
          allSync = false;
          throw 'Called invoke() with async dependency ' + orderedTasks[i].name;
        }
      }

      var sorted = taskUtils.topoSort(newTasks, _.pluck(orderedTasks, 'name'));

      for (var i = 0; i < sorted.length; ++i) {
        var task = newTasks[sorted[i]];
        if (task.value) {
          alreadyExecuted[task.name] = { value: task.value };
        } else {
          params = getParameterNames(task.task);
          var args = [];
          for (var j = 0; j < params.length; ++j) {
            args.push(alreadyExecuted[params[j]].value);
          }
          alreadyExecuted[task.name] = { value: task.task.apply(null, args) }
        }
      }

      var args = [];
      if (hasErrorParameter) {
        args.push(undefined);
      }
      for (var i = 0; i < paramNames.length; ++i) {
        args.push(alreadyExecuted[paramNames[i]].value);
      }

      return func.apply(null, args);
    },
    invokeAsync: function(func, locals) {
      var promiseFulfill;
      var promiseReject;

      var promise = new Promise(function(resolve, reject) {
        promiseFulfill = resolve;
        promiseReject = reject;
      });

      promise.fulfill = function() {
        promiseFulfill.apply(null, arguments);
      };

      promise.reject = function() {
        promiseReject.apply(null, arguments);
      };

      var paramNames = getParameterNames(func);

      // Remove error param
      var hasErrorParameter = paramNames.length &&
        ['error', 'err'].indexOf(paramNames[0]) != -1;
      if (hasErrorParameter) {
        paramNames.shift();
      }

      var newTasks = _.clone(tasks);
      _.each(locals, function(value, key) {
        newTasks[key] = {
          name: key,
          dep: [],
          value: value
        };
      });

      var orderedTasks = taskUtils.dfs(newTasks, paramNames);
      orderedTasks = _.map(orderedTasks, function(taskName) {
        return newTasks[taskName];
      });

      var alreadyExecuted = {};
      _.each(locals, function(value, key) {
        alreadyExecuted[key] = { value: value };
      });

      step(alreadyExecuted, orderedTasks, function(error) {
        if (error) {
          promise.reject(error);
          if (hasErrorParameter) {
            return func(error);
          } else {
            throw error;
          }
        }

        var args = [];
        if (hasErrorParameter) {
          args.push(undefined);
        }
        for (var i = 0; i < paramNames.length; ++i) {
          args.push(alreadyExecuted[paramNames[i]].value);
        }

        promise.fulfill(func.apply(null, args));
      });

      return promise;
    }
  };

  return wagner;
};

var instance = wagnerFactory('global');
_.each(instance, function(value, key) {
  if (typeof value === 'function') {
    wagner[key] = function() {
      return instance[key].apply(instance, arguments);
    };
  }
});

module.exports = wagner;