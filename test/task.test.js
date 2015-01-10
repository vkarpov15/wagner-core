var assert = require('assert');

var taskUtil = require('../lib/task');

describe('dfs', function() {
  it('works', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon', 'sausage']
      },
      bacon: {
        name: 'bacon',
        dep: []
      },
      sausage: {
        name: 'sausage',
        dep: ['pan']
      },
      pan: {
        name: 'pan',
        dep: []
      }
    };

    var result = taskUtil.dfs(tasks, ['eggs']);
    assert.equal(4, result.length);
    assert.ok(result.indexOf('eggs') !== -1);
    assert.ok(result.indexOf('bacon') !== -1);
    assert.ok(result.indexOf('sausage') !== -1);
    assert.ok(result.indexOf('pan') !== -1);
  });
});

describe('topological sort', function() {
  it('works', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon', 'sausage']
      },
      bacon: {
        name: 'bacon',
        dep: []
      },
      sausage: {
        name: 'sausage',
        dep: ['pan']
      },
      pan: {
        name: 'pan',
        dep: []
      }
    };

    var result = taskUtil.topoSort(tasks, ['eggs', 'bacon', 'sausage', 'pan']);

    assert.equal(4, result.length);
    assert.deepEqual(['bacon', 'pan', 'sausage', 'eggs'], result);
  });
});