# wagner-core

[![Build Status](https://travis-ci.org/vkarpov15/wagner-core.svg?branch=master)](https://travis-ci.org/vkarpov15/wagner-core)
[![Coverage Status](https://coveralls.io/repos/vkarpov15/wagner-core/badge.svg)](https://coveralls.io/r/vkarpov15/wagner-core)

Wagner is primarily designed to be a more elegant take on
[orchestrator](https://www.npmjs.org/package/orchestrator), hence the name.
If you've used orchestrator for web apps and found it cumbersome, Wagner is
for you.

<img src="http://upload.wikimedia.org/wikipedia/commons/f/f3/Richard_Wagner_2.jpg" width="140" style="width: 140px">

# API

## As a dependency injector

Wagner includes a basic dependency injector that provides an API similar to
[AngularJS 1.x's dependency injector](https://docs.angularjs.org/guide/di).


#### It allows you to execute async tasks based on parameter names

You register 'services' with Wagner using the `factory()` function.
Services have a unique name - any function you pass through `factory()`
or `invoke()` can list services in its parameter list.

```javascript
    
    wagner.factory('bacon', function() {
      return 'bacon';
    });

    wagner.factory('breakfast', function(bacon) {
      return bacon + ' and eggs';
    });

    var result = wagner.invoke(function(breakfast) {
      assert.equal(breakfast, 'bacon and eggs');
      return breakfast;
    });

    assert.equal(result, 'bacon and eggs');
  
```

#### It allows you to use locals

A *local* is a value specific to a particular execution of
`invoke()`. You can use locals like any other service.

```javascript
    
    wagner.factory('eggs', function(number) {
      return 'finished making ' + number + ' eggs';
    });

    wagner.invoke(function(eggs) {
      assert.equal(eggs, 'finished making 4 eggs');
    }, { number: 4 });
  
```

#### It only executes the factory function once

Service functions are only executed once, the value is cached for
all future calls to `invoke()`.

```javascript
    
    var count = 0;
    wagner.factory('eggs', function() {
      ++count;
      return 5;
    });

    assert.equal(count, 0);

    wagner.invoke(function(eggs) {
      assert.equal(eggs, 5);
      assert.equal(count, 1);
    });

    wagner.invoke(function(eggs) {
      assert.equal(count, 1);
    });

    assert.equal(count, 1);
  
```

#### It allows you to `.get()` a dependency

You can also use `.get()` to explicitly get a dependency.

```javascript
    
    wagner.constant('eggs', 6);

    wagner.task('bacon', function(eggs) {
      return Math.floor(eggs / 2);
    });

    assert.equal(wagner.get('bacon'), 3);
  
```

#### It has a `.constant()` function

`.constant(a, b)` is a convenient shorthand for
`.factory(a, function() { return b; }`

```javascript
    
    wagner.constant('eggs', 5);

    wagner.invoke(function(eggs) {
      assert.equal(eggs, 5);
    });
  
```

## As a way to reduce error-handling boilerplate

If you're a NodeJS developer, you've probably gotten sick of writing the
following code:

```javascript
function(error, res) { if (error) { return handleError(error); } }
```

The `wagner.safe()` function helps you make that cleaner.

#### It wraps callbacks to bubble up errors

`wagner.safe()` returns an event emitter that has a `try()` function.
Just wrap your callbacks in a `try()` and all async errors get deferred
to your event emitter. Like domains, but with less suck.


```javascript
    
    var safe = wagner.safe();

    var asyncOpThatErrors = function(callback) {
      setTimeout(function() {
        callback('This is an error!');
      });
    };

    asyncOpThatErrors(safe.try(function(error) {
      // Never gets called: safe catches the error
      assert.ok(false);
    }));

    safe.on('error', function(error) {
      assert.equal(error, 'This is an error!');
      done();
    });
  
```

#### It catches exceptions too

The `try()` function also wraps your callbacks in a try/catch and emits.
any exceptions. Never again will a
`TypeError: Cannot read property 'value' of undefined`
in your callback crash your server.


```javascript
    
    var safe = wagner.safe();

    var asyncOpThatSucceeds = function(callback) {
      setTimeout(function() {
        callback();
      });
    };

    asyncOpThatSucceeds(safe.try(function() {
      throw 'Oops I messed up';
    }));

    safe.on('error', function(error) {
      assert.equal(error.toString(), 'Oops I messed up');
      done();
    });
  
```

## As an async framework

Wagner also includes the ability to execute async tasks in a
dependency-injection-like way. Wagner has 2 functions, `invokeAsync()`
and `task()`, that enable you to write neat modular async code.

#### It can execute async tasks using `invokeAsync()`

The `task()` and `invokeAsync()` are roughly analogous to `factory`
and `invoke()`. There are 3 differences:

1. The function you pass to `task()` takes a callback, which it uses to
pass a value to dependent tasks.
1. The function you pass to `invokeAsync()` takes an error, which
contains the first error that happened when executing the specified tasks.
1. Tasks are re-executed every time you call `invokeAsync()`, whereas
services are cached forever.

```javascript
    
    wagner.task('task1', function(callback) {
      setTimeout(function() {
        callback(null, 'test');
      }, 50);
    });

    wagner.invokeAsync(function(error, task1) {
      assert.ok(!error);
      assert.equal(task1, 'test');
      done();
    });
  
```

#### It re-executes tasks on subsequent calls to `invokeAsync()`

```javascript
    
    var called = 0;
    wagner.task('task1', function(callback) {
      ++called;
      setTimeout(function() {
        callback(null, 'test');
      }, 0);
    });

    wagner.invokeAsync(function(error, task1) {
      assert.ok(!error);
      assert.equal(task1, 'test');
      assert.equal(called, 1);

      wagner.invokeAsync(function(error, task1) {
        assert.ok(!error);
        assert.equal(task1, 'test');
        assert.equal(called, 2);
        done();
      });
    });
  
```

#### It executes tasks with maximum parallelization

Tasks are executed at most once per call to `invokeAsync()`, and tasks
are executed with maximum parallelization. That is, as soon as all a
tasks dependencies are ready, the task executes.

```javascript
    
    var executed = {};
    wagner.task('readFile1', function(callback) {
      assert.equal(Object.keys(executed).length, 0);
      executed.readFile1 = true;
      callback(null, 'test');
    });

    wagner.task('processFile1', function(readFile1, callback) {
      assert.equal(Object.keys(executed).length, 1);
      assert.ok(executed.readFile1);
      setTimeout(function() {
        callback(null, 'test');
      }, 5);
    });

    wagner.task('logFile1', function(readFile1, callback) {
      assert.equal(Object.keys(executed).length, 1);
      assert.ok(executed.readFile1);
      setTimeout(function() {
        callback(null, 'test');
      }, 5);
    });

    wagner.invokeAsync(function(error, processFile1, logFile1) {
      assert.ifError(error);
      done();
    });
  
```

