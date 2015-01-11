'use strict';

var getParameterNames = require('get-parameter-names');

exports.dfs = function(tasks, taskNames) {
  var alreadyVisited = {};
  var toExecute = {};

  var execDfs = function(taskName) {
    var task = tasks[taskName];
    alreadyVisited[taskName] = true;
    if (!task) {
      throw 'No such dependency: ' + taskName;
    }

    var isSync = true;
    for (var i = 0; i < task.dep.length; ++i) {
      var dependency = tasks[task.dep[i]];

      if (alreadyVisited[task.dep[i]]) {
        throw 'Cycle detected, task: ' + task.name;
      }

      execDfs(task.dep[i]);

      // A task is async if it depends on an async task
      isSync = isSync && (dependency.value ||
        dependency.isSync);
    }

    if (task.task) {
      var params = getParameterNames(task.task);
      // A task is not synchronous if it takes a callback
      task.isSync = isSync &&
        params.indexOf('callback') === -1 &&
        params.indexOf('cb') === -1;
    } else {
      task.isSync = true;
    }
  }

  for (var i = 0; i < taskNames.length; ++i) {
    alreadyVisited = {};

    execDfs(taskNames[i]);

    for (var key in alreadyVisited) {
      toExecute[key] = true;
    }
  }

  return Object.keys(toExecute);
};

exports.topoSort = function(tasks, taskNames) {
  var sorted = [];
  var upcoming = [];
  var alreadyVisited = {};

  for (var i = 0; i < taskNames.length; ++i) {
    var task = tasks[taskNames[i]];
    for (var j = 0; j < task.dep.length; ++j) {
      tasks[task.dep[j]].dependents = tasks[task.dep[j]].dependents || [];
      tasks[task.dep[j]].dependents.push(task.name);
    }
  }

  for (var i = 0; i < taskNames.length; ++i) {
    var dependencies = tasks[taskNames[i]].dep;
    if (dependencies.length === 0) {
      upcoming.push(taskNames[i]);
    }
  }

  while (upcoming.length) {
    var taskName = upcoming.shift();
    var task = tasks[taskName];
    alreadyVisited[taskName] = true;
    sorted.push(taskName);

    for (var i = 0; i < (task.dependents || []).length; ++i) {
      var dependent = tasks[task.dependents[i]];
      var ready = true;
      for (var j = 0; j < dependent.dep.length; ++j) {
        ready = ready && alreadyVisited[dependent.dep[j]];
        if (!ready) {
          break;
        }
      }

      if (ready) {
        upcoming.push(task.dependents[i]);
      }
    }
  }

  return sorted;
};
