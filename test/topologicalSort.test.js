var assert = require('assert');

var taskUtil = require('../lib/topologicalSort');

describe('taskUtil', function() {
  it('sync', function() {
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

    var result = taskUtil(tasks, ['eggs']);
    assert.equal(4, result.length);
    assert.ok(result.indexOf('eggs') !== -1);
    assert.ok(result.indexOf('bacon') !== -1);
    assert.ok(result.indexOf('sausage') !== -1);
    assert.ok(result.indexOf('pan') !== -1);
  });

  it('orders async last', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon', 'sausage'],
        task: function(callback) {}
      },
      bacon: {
        name: 'bacon',
        dep: [],
        task: function(callback) {}
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

    var result = taskUtil(tasks, ['eggs', 'bacon', 'sausage', 'pan']);

    assert.equal(4, result.length);
    assert.deepEqual(['pan', 'sausage', 'bacon', 'eggs'], result);
  });
});
