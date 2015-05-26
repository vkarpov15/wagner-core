'use strict';

var EventEmitter = require('events').EventEmitter;
var getParameterNames = require('get-parameter-names');
var _ = require('underscore');
var Safe = require('./safe');
var topologicalSort = require('./topologicalSort');

var modules = {};

var wagner = function(name, dependencies) {
  return wagner.module(name, dependencies);
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

var toParallelError = function(errors) {
  if (!errors) {
    return;
  }

  var msg = 'Errors in .parallel(): ';
  _.each(errors, function(err) {
    msg += err + ',';
  });
  var err = new Error(msg.substr(0, msg.length - 1));
  err.errors = errors;

  return err;
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
  var serviceCache = {};

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
        service: true,
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
      serviceCache = {};
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
                results[key] = undefined;
                errors = errors || {};
                errors[key] = error;
              } else {
                results[key] = result;
              }
              if (Object.keys(results).length === Object.keys(map).length) {
                return callback(toParallelError(errors), results);
              }
            });
        } catch (error) {
          results[key] = undefined;
          errors = errors || {};
          errors[key] = error;

          if (Object.keys(results).length === Object.keys(map).length) {
            return callback(toParallelError(errors), results);
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
        } catch (error) {
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

      var orderedTasks = topologicalSort(newTasks, paramNames);
      orderedTasks = _.map(orderedTasks, function(taskName) {
        return newTasks[taskName];
      });

      var alreadyExecuted = {};
      _.each(locals, function(value, key) {
        alreadyExecuted[key] = { value: value, done: true };
      });

      _.each(serviceCache, function(value, key) {
        alreadyExecuted[key] = value;
      });

      for (var i = 0; i < orderedTasks.length; ++i) {
        if (!orderedTasks[i].isSync) {
          throw 'Called invoke() with async dependency ' + orderedTasks[i].name;
        }
      }

      var sorted = topologicalSort(newTasks, _.pluck(orderedTasks, 'name'));

      for (var i = 0; i < sorted.length; ++i) {
        var task = newTasks[sorted[i]];
        if (task.value) {
          alreadyExecuted[task.name] = { value: task.value, done: true };
        } else if (alreadyExecuted[task.name]) {
          continue;
        } else {
          var params = getParameterNames(task.task);
          var args = [];
          for (var j = 0; j < params.length; ++j) {
            args.push(alreadyExecuted[params[j]].value);
          }
          alreadyExecuted[task.name] = {
            value: task.task.apply(null, args),
            done: true
          };
          if (task.service) {
            serviceCache[task.name] = alreadyExecuted[task.name];
          }
        }
      }

      var args = [];
      if (hasErrorParameter) {
        args.push(null);
      }
      for (var i = 0; i < paramNames.length; ++i) {
        args.push(alreadyExecuted[paramNames[i]].value);
      }
      return func.apply(null, args);
    },
    invokeAsync: function(func, locals) {
      var emitter = new EventEmitter();
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

      var orderedTasks = topologicalSort(newTasks, paramNames);
      orderedTasks = _.map(orderedTasks, function(taskName) {
        return newTasks[taskName];
      });

      var alreadyExecuted = {};
      _.each(locals, function(value, key) {
        alreadyExecuted[key] = { value: value, done: true };
      });

      _.each(serviceCache, function(value, key) {
        alreadyExecuted[key] = value;
      });

      step(emitter, {}, serviceCache, alreadyExecuted, orderedTasks, function(error) {
        if (error) {
          if (hasErrorParameter) {
            var args = [error];
            for (var i = 0; i < paramNames.length; ++i) {
              var v = alreadyExecuted[paramNames[i]] ?
                alreadyExecuted[paramNames[i]].value :
                undefined;
              args.push(v);
            }
            return func.apply(null, args);
          } else {
            return emitter.emit('error', error);
          }
        }

        var args = [];
        if (hasErrorParameter) {
          args.push(null);
        }
        for (var i = 0; i < paramNames.length; ++i) {
          args.push(alreadyExecuted[paramNames[i]].value);
        }

        func.apply(null, args);
      });

      return emitter;
    },
    safe: function() {
      return new Safe();
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

function step(emitter, state, serviceCache, alreadyExecuted, tasks, callback) {
  if (state.done || _stepCheckDone(alreadyExecuted, tasks, callback)) {
    state.done = true;
    return;
  }

  _.each(tasks, function(task) {
    if (alreadyExecuted[task.name]) {
      return;
    }

    var paramNames = popCallback(getParameterNames(task.task));
    var ready = true;
    var args = [];
    for (var i = 0; i < paramNames.length; ++i) {
      if (!alreadyExecuted[paramNames[i]] ||
          !alreadyExecuted[paramNames[i]].done) {
        ready = false;
        break;
      }
      args.push(alreadyExecuted[paramNames[i]].value);
    }

    if (ready) {
      alreadyExecuted[task.name] = { executing: true };

      if (paramNames.hasCallback) {
        args.push(function(error, value) {
          emitter.emit(task.name + ':end');
          if (state.done) {
            return;
          }

          if (error) {
            state.done = true;
            return process.nextTick(function() {
              callback(error);
            });
          }
          alreadyExecuted[task.name] = { value: value, done: true };
          if (task.service) {
            serviceCache[task.name] = alreadyExecuted[task.name];
          }

          step(emitter, state, serviceCache, alreadyExecuted, tasks, callback);
        });

        try {
          emitter.emit(task.name + ':start');
          task.task.apply(null, args);
        } catch (error) {
          state.done = true;
          return callback(error);
        }
      } else {
        try {
          emitter.emit(task.name + ':start');
          alreadyExecuted[task.name] = {
            value: task.task.apply(null, args),
            done: true
          };
          emitter.emit(task.name + ':end');
          if (task.service) {
            serviceCache[task.name] = alreadyExecuted[task.name];
          }
        } catch (error) {
          // Can't be in state.done here because in same iteration of event
          // loop as a call to _stepCheckDone()
          state.done = true;
          process.nextTick(function() {
            return callback(error);
          });
          return;
        }

        process.nextTick(function() {
          step(emitter, state, serviceCache, alreadyExecuted, tasks, callback);
        });
      }
    }
  });
};

function _stepCheckDone(alreadyExecuted, tasks, callback) {
  var numDone = 0;
  for (var key in alreadyExecuted) {
    if (alreadyExecuted[key].done) {
      ++numDone;
    }
  }

  if (numDone === Object.keys(tasks).length) {
    process.nextTick(function() {
      return callback(null);
    });
    return true;
  }

  return false;
}
