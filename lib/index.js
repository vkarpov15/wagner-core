var sequencify = require('sequencify');
var getParameterNames = require('get-parameter-names');
var async = require('async');
var _ = require('underscore');

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
    _.each(tasks, function(task) {
      if (alreadyExecuted[task.name]) {
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
        if (paramNames.hasCallback) {
          args.push(function(error, value) {
            if (error) {
              return callback(error);
            }
            alreadyExecuted[task.name] = { value: value };
            if (Object.keys(alreadyExecuted).length === Object.keys(tasks).length) {
              return callback(null);
            }

            step(alreadyExecuted, tasks, callback);
          });

          task.task.apply(null, args);
        } else {
          alreadyExecuted[task.name] = { value: task.task.apply(null, args) };
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
    invoke: function(func, locals) {
      var paramNames = getParameterNames(func);

      // Remove error param
      paramNames.shift();

      var newTasks = _.clone(tasks);
      _.each(locals, function(value, key) {
        newTasks[key] = {
          name: key,
          dep: [],
          value: value
        };
      });

      var alreadyExecuted = {};
      _.each(locals, function(value, key) {
        alreadyExecuted[key] = { value: value };
      });

      step(alreadyExecuted, newTasks, function(error) {
        if (error) {
          return func(error);
        }

        var args = [undefined];
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
      instance[key].apply(instance, arguments);
    };
  }
});

module.exports = wagner;