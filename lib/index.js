var getParameterNames = require('get-parameter-names');
var async = require('async');
var _ = require('underscore');
var taskUtils = require('./task');

var wagner = function() {
  return wagnerFactory();
};

function popCallback(arr) {
  if (arr.length && arr[arr.length - 1] === 'callback') {
    arr.hasCallback = true;
    arr.pop();
  }

  return arr;
}

var wagnerFactory = function() {
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

          task.task.apply(null, args);
        } else {
          alreadyExecuted[task.name] = { value: task.task.apply(null, args) };
          
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
    clear: function() {
      tasks = {};
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

        func.apply(null, args);
      });
    }
  };

  return wagner;
};

var instance = wagnerFactory();
_.each(instance, function(value, key) {
  if (typeof value === 'function') {
    wagner[key] = function() {
      return instance[key].apply(instance, arguments);
    };
  }
});

module.exports = wagner;