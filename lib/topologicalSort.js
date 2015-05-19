'use strict';

var getParameterNames = require('get-parameter-names');
var _ = require('underscore');

module.exports = function(tasks, taskNames) {
  var sync = {};
  var async = {};

  _.each(taskNames, function(taskName) {
    var result = dfs(tasks, taskName, {});

    for (var i = 0; i < result.length; ++i) {
      if (tasks[result[i]].isSync) {
        sync[result[i]] = 1;
      } else {
        async[result[i]] = 1;
      }
    }
  });

  return Object.keys(sync).concat(Object.keys(async));
};

function dfs(tasks, taskName, alreadyVisited) {
  var task = tasks[taskName];
  var result = [];
  alreadyVisited[taskName] = true;
  if (!task) {
    throw 'No such dependency: ' + taskName;
  }

  if (task.task) {
    var params = getParameterNames(task.task);
    // A task is not synchronous if it takes a callback
    task.isSync = params.indexOf('callback') === -1 &&
      params.indexOf('cb') === -1;
  } else {
    task.isSync = true;
  }

  for (var i = 0; i < task.dep.length; ++i) {
    var dependency = tasks[task.dep[i]];

    if (alreadyVisited[task.dep[i]]) {
      throw 'Cycle detected, task: ' + task.name;
    }

    result = result.concat(dfs(tasks, task.dep[i], alreadyVisited));

    // A task is async if it depends on an async task
    if (task.isSync && !dependency.isSync) {
      throw 'Sync dependency ' + taskName +
        ' depends on async dependency ' + task.dep[i];
    }
  }

  // Treat alreadyVisited as a stack
  delete alreadyVisited[taskName];
  result.push(taskName);
  return result;
}
