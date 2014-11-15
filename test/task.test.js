var assert = require('assert');

var taskUtil = require('../lib/task');

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