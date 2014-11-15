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

    wagner.invoke(function(error, tristan) {
      assert.ok(!error);
      assert.equal(tristan, 'tristan');
      done();
    }, {});
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

    wagner.invoke(function(error, tristan, isolde) {
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

    wagner.invoke(function(error, tristan, isolde) {
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

    wagner.invoke(function(tristan, isolde) {
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

    wagner.invoke(function(error, sigfried) {
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

    wagner.invoke(function(error, sigfried) {
      assert.ok(!error);
      assert.equal(sigfried.sword.from, 'barnstokkr');
      assert.ok(!sigmund);
      done();
    });
  });
});