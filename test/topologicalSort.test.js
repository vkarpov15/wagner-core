var assert = require('assert');

var sort = require('../lib/topologicalSort');

describe('topologicalSort', function() {
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

    var result = sort(tasks, ['eggs']);
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

    var result = sort(tasks, ['eggs', 'bacon', 'sausage', 'pan']);

    assert.equal(4, result.length);
    assert.deepEqual(['pan', 'sausage', 'bacon', 'eggs'], result);
  });

  it('throws when no such dependency', function() {
    var tasks = {};

    assert.throws(function() {
      sort(tasks, ['eggs']);
    }, /No such dependency: eggs/i);
  });

  it('throws when dependency cycle', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon']
      },
      bacon: {
        name: 'bacon',
        dep: ['eggs'],
      }
    };

    assert.throws(function() {
      sort(tasks, ['eggs']);
    }, /Cycle detected: eggs <- bacon <- eggs/i);
  });

  it('throws when sync dep depends on async dep', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon']
      },
      bacon: {
        name: 'bacon',
        dep: [],
        task: function(callback) {}
      }
    };

    assert.throws(function() {
      sort(tasks, ['eggs']);
    }, /Sync dependency eggs depends on async dependency bacon/i);
  });

  it('only detects digraph cycles', function() {
    var tasks = {
      eggs: {
        name: 'eggs',
        dep: ['bacon', 'pan']
      },
      bacon: {
        name: 'bacon',
        dep: ['pan']
      },
      pan: {
        name: 'pan',
        dep: []
      }
    };

    assert.deepEqual(sort(tasks, ['eggs']), ['pan', 'bacon', 'eggs']);
  });
});
