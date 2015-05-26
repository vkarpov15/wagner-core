var EventEmitter = require('events').EventEmitter;

module.exports = Safe;

function Safe() {
  this._emitter = new EventEmitter();
}

Safe.prototype.try = function(fn) {
  var _this = this;
  return function(error) {
    if (error) {
      return _this._emitter.emit('error', error);
    }

    try {
      fn.apply(_this, arguments);
    } catch(err) {
      _this._emitter.emit('error', err);
    }
  };
};

Safe.prototype.on = function() {
  this._emitter.on.apply(this._emitter, arguments);
};
