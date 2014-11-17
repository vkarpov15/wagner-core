var assert = require('assert');

var wagner = require('../');

describe('core', function() {
  afterEach(function() {
    wagner.clear();
  });

  it('works', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    wagner.invokeAsync(function(error, tristan) {
      assert.ok(!error);
      assert.equal(tristan, 'tristan');
      done();
    }, {});
  });

  it('returns a promise', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    var promise = wagner.invokeAsync(function(error, tristan) {
      return tristan;
    }, {});

    promise.then(function(v) {
      assert.equal(v, 'tristan');
      done();
    });
  });

  it('error', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    wagner.task('isolde', function(callback) {
      setTimeout(function() {
        callback('I got an error');
      }, 25);
    });

    wagner.invokeAsync(function(error, tristan, isolde) {
      assert.equal(error, 'I got an error');
      assert.ok(!tristan);
      assert.ok(!isolde);
      done();
    });
  });

  it('sync', function(done) {
    wagner.task('tristan', function() {
      return 'tristan';
    });

    wagner.task('isolde', function() {
      return 'isolde';
    });

    var e;
    var t;
    var i;
    var returnValue = wagner.invoke(function(error, tristan, isolde) {
      e = error;
      t = tristan;
      i = isolde;

      return 'done';
    });

    assert.ok(!e);
    assert.equal(t, 'tristan');
    assert.equal(i, 'isolde');
    assert.equal(returnValue, 'done');
    process.nextTick(function() {
      done();
    });
  });

  it('sync errors', function(done) {
    wagner.task('tristan', function() {
      return 'tristan';
    });

    wagner.task('isolde', function() {
      throw 'Problem!';
    });

    assert.throws(function() {
      var returnValue = wagner.invoke(function(error, tristan, isolde) {
        return 'done';
      });
    }, 'Problem!');

    done();
  });

  it('recursive', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    wagner.task('isolde', function(tristan, callback) {
      setTimeout(function() {
        callback(null, tristan + ' & isolde');
      }, 25);
    });

    wagner.invokeAsync(function(error, tristan, isolde) {
      assert.ok(!error);
      assert.equal(tristan, 'tristan');
      assert.equal(isolde, 'tristan & isolde');
      done();
    });
  });

  it('without error', function(done) {
    wagner.task('tristan', function(callback) {
      setTimeout(function() {
        callback(null, 'tristan');
      }, 50);
    });

    wagner.task('isolde', function(tristan, callback) {
      setTimeout(function() {
        callback(null, tristan + ' & isolde');
      }, 25);
    });

    wagner.invokeAsync(function(tristan, isolde) {
      assert.equal(tristan, 'tristan');
      assert.equal(isolde, 'tristan & isolde');
      done();
    });
  });

  it('factory', function(done) {
    wagner.factory('nothung', function() {
      return { from: 'barnstokkr' };
    });

    wagner.task('sigfried', function(nothung, callback) {
      setTimeout(function() {
        callback(null, { sword: nothung });
      }, 25);
    });

    wagner.invokeAsync(function(error, sigfried) {
      assert.ok(!error);
      assert.equal(sigfried.sword.from, 'barnstokkr');
      done();
    });
  });

  it('only executes necessary tasks', function(done) {
    wagner.factory('nothung', function() {
      return { from: 'barnstokkr' };
    });

    wagner.task('sigfried', function(nothung, callback) {
      setTimeout(function() {
        callback(null, { sword: nothung });
      }, 25);
    });

    var sigmund = 0;
    wagner.task('sigmund', function(nothung, callback) {
      ++sigmund;
      setTimeout(function() {
        callback(null, { sword: nothung });
      }, 25);
    });

    wagner.invokeAsync(function(error, sigfried) {
      assert.ok(!error);
      assert.equal(sigfried.sword.from, 'barnstokkr');
      assert.ok(!sigmund);
      done();
    });
  });

  it('locals', function(done) {
    wagner.task('sigfried', function(nothung, callback) {
      setTimeout(function() {
        callback(null, { sword: nothung });
      }, 25);
    });

    wagner.invokeAsync(
      function(error, sigfried) {
        assert.ok(!error);
        assert.equal(sigfried.sword.from, 'barnstokkr');
        done();
      },
      { nothung: { from: 'barnstokkr' } });
  });

  it('async errors', function(done) {
    wagner.task('sigfried', function(callback) {
      throw 'Problem!';
    });

    wagner.invokeAsync(
      function(error, sigfried) {
        assert.ok(error);
        assert.ok(!sigfried);
        assert.equal(error, 'Problem!');
        done();
      });
  });
});

describe('parallel', function() {
  it('works', function(done) {
    wagner.parallel(
      { first: 'parsifal', second: 'gotterdammerung' },
      function(value, key, callback) {
        callback(null, value.toUpperCase());
      },
      function(error, results) {
        assert.ok(!error);
        assert.equal(results.first.result, 'PARSIFAL');
        assert.equal(results.second.result, 'GOTTERDAMMERUNG');
        done();
      });
  });

  it('returns errors', function(done) {
    wagner.parallel(
      { first: 'parsifal', second: 'gotterdammerung' },
      function(value, key, callback) {
        callback(key + ' invalid');
      },
      function(error, results) {
        assert.ok(!!error);
        assert.equal(2, error.length);
        assert.ok(error.indexOf('first invalid') !== -1);
        assert.ok(error.indexOf('second invalid') !== -1);
        assert.equal(results.first.error, 'first invalid');
        assert.equal(results.second.error, 'second invalid');
        done();
      });
  });

  it('catches errors', function(done) {
    wagner.parallel(
      { first: 'parsifal', second: 'gotterdammerung' },
      function(value, key, callback) {
        throw key + ' invalid';
      },
      function(error, results) {
        assert.ok(!!error);
        assert.equal(2, error.length);
        assert.ok(error.indexOf('first invalid') !== -1);
        assert.ok(error.indexOf('second invalid') !== -1);
        assert.equal(results.first.error, 'first invalid');
        assert.equal(results.second.error, 'second invalid');
        done();
      });
  });
});

describe('series', function() {
  it('works', function(done) {
    wagner.series(
      ['parsifal', 'gotterdammerung'],
      function(value, index, callback) {
        callback(null, value.toUpperCase());
      },
      function(error, results) {
        assert.ok(!error);
        assert.equal(results[0], 'PARSIFAL');
        assert.equal(results[1], 'GOTTERDAMMERUNG');
        done();
      });
  });

  it('catches errors', function(done) {
    wagner.series(
      ['parsifal', 'gotterdammerung'],
      function(value, index, callback) {
        if (index > 0) {
          throw value;
        } else {
          callback(null, value);

        }
      },
      function(error, results) {
        assert.ok(!!error);
        assert.ok(!results);
        assert.equal(error.error, 'gotterdammerung');
        assert.equal(error.index, 1);
        done();
      });
  });
});

describe('modules', function() {
  it('works', function(done) {
    var foods = wagner.module('foods');
    foods.factory('bacon', function() {
      return 'bacon';
    });
    foods.factory('eggs', function() {
      return 'eggs';
    });

    var breakfast = wagner.module('breakfast', ['foods']);
    breakfast.invoke(function(error, bacon, eggs) {
      assert.ok(!error);
      assert.equal(bacon, 'bacon');
      assert.equal(eggs, 'eggs');
      done();
    });
  });
});