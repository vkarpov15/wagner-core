'use strict';

exports.dfs = function(tasks, taskNames) {
  var alreadyVisited = {};
  var toExecute = {};

  var execDfs = function(taskName) {
    var task = tasks[taskName];
    alreadyVisited[taskName] = true;
    if (!task) {
      throw 'No such dependency: ' + task.dep[i];
    }

    var isSync = true;
    for (var i = 0; i < task.dep.length; ++i) {
      var dependency = tasks[task.dep[i]];

      if (alreadyVisited[task.dep[i]]) {
        throw 'Cycle detected, task: ' + task.name;
      }

      execDfs(task.dep[i]);

      isSync = isSync && (dependency.value || dependency.isSync);
    }

    task.isSync = isSync;
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