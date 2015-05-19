# wagner-core

Dependency injector and di-based async framework.

  [![Build Status](https://travis-ci.org/vkarpov15/wagner-core.svg?branch=master)](https://travis-ci.org/vkarpov15/wagner-core)

Wagner is primarily geared to be a more elegant and modern take on [orchestrator](https://www.npmjs.org/package/orchestrator), hence the name. If you've used orchestrator for web apps and found it cumbersome, Wagner is for you.

<img src="http://upload.wikimedia.org/wikipedia/commons/f/f3/Richard_Wagner_2.jpg" width="140">

# API

## `wagner.invokeAsync()`

`invokeAsync()` is the primary function you will use to execute
async code with Wagner. It takes as arguments a function that
takes an error and a list of parameters, and a map of *locals*.

#### It allows you to execute async tasks based on parameter names

Wagner's most basic functionality is to register an async
task by name, and then utilize the value computed by the
async task in subsequent tasks.

```javascript
    
    wagner.task('eggs', function(callback) {
      setTimeout(function() {
        callback(null, 'done cooking!');
      }, 5);
    });

    wagner.invokeAsync(function(error, eggs) {
      assert.ok(!error);
      assert.equal(eggs, 'done cooking!');
      done();
    }, {});
  
```

#### It allows you to use locals

locals* are values specific to a particular execution of
`invokeAsync()`. They may be utilized by any task in the
task graph.

```javascript
    
    wagner.task('eggs', function(number, callback) {
      setTimeout(function() {
        callback(null, 'finished making ' + number + ' eggs');
      }, 5);
    });

    // First execute the task with number = 4...
    wagner.invokeAsync(function(error, eggs) {
      assert.ok(!error);
      assert.equal(eggs, 'finished making 4 eggs');

      // Then the same task with number = 6
      wagner.invokeAsync(function(error, eggs) {
        assert.ok(!error);
        assert.equal(eggs, 'finished making 6 eggs');
        done();
      }, { number: 6 });

    }, { number: 4 });
  
```

#### It executes tasks with maximum parallelization

Tasks can rely on each other, and each task is executed as soon
as all its dependencies are met.

```javascript
    
    var executed = {};

    wagner.task('pan', function(callback) {
      setTimeout(function() {
        executed['pan'] = true;
        callback(null, 'finished heating pan');
      }, 5);
    });

    wagner.task('eggs', function(counts, pan, callback) {
      assert.ok(!executed['bacon']);
      setTimeout(function() {
        executed['eggs'] = true;
        callback(null, 'finished making ' + counts.eggs + ' eggs');
      }, 5);
    });

    wagner.task('bacon', function(counts, pan, callback) {
      assert.ok(!executed['eggs']);
      setTimeout(function() {
        executed['bacon'] = true;
        callback(null, 'finished making ' + counts.bacon + ' bacon strips');
      }, 5);
    });

    wagner.invokeAsync(
      function(error, eggs, bacon) {
        assert.ok(!error);
        assert.ok(executed['pan']);
        assert.equal(eggs, 'finished making 4 eggs');
        assert.equal(bacon, 'finished making 3 bacon strips');
        done();
      },
      { counts: { eggs: 4, bacon: 3 } });
  
```

#### It bubbles up the first error

If any task in the execution tree returns an error, execution
is stopped immediately and the function is called with the error
as the first parameter.

```javascript
    
    wagner.task('eggs', function(callback) {
      setTimeout(function() {
        callback('no eggs left!');
      }, 5);
    });

    wagner.task('bacon', function(callback) {
      setTimeout(function() {
        callback('no bacon left!');
      }, 25);
    });

    wagner.invokeAsync(
      function(error, eggs, bacon) {
        assert.equal(error, 'no eggs left!');
        assert.ok(!eggs);
        assert.ok(!bacon);
        done();
      },
      {});
  
```

## `wagner.invoke()`

`invoke()` is the synchronous version of `invokeAsync()`. It will
*only* execute sync tasks (tasks that don't take a parameter named
'callback' or 'cb') and throw an error if there are any async tasks.

#### It executes sync tasks and returns the return value of the provided function

```javascript
    
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
  
```

## `wagner.parallel()`

For convenience, Wagner includes its own `.parallel()` function for
executing a collection of async functions in parallel. The syntax
is marginally different from
[async](https://www.npmjs.org/package/async) in order to minimize
the need to construct arrays of closures: the callback to
`parallel()` takes as parameters the `key` and `value`.

#### It takes a map and executes a function for all key/value pairs

```javascript
    
    wagner.parallel(
      { first: 'eggs', second: 'bacon' },
      function(value, key, callback) {
        callback(null, value.toUpperCase());
      },
      function(error, results) {
        assert.ok(!error);
        assert.equal(results.first, 'EGGS');
        assert.equal(results.second, 'BACON');
        done();
      });
  
```

## `wagner.series()`

Similar to `parallel()`, Wagner includes its own implementation
of `series()` that attempts to minimize need to construct arrays
of closures.

#### It takes an array and executes a function on the values in order

```javascript
    
    var breakfastFoods = ['eggs', 'bacon'];
    var orderOfExecution = [];
    wagner.series(
      breakfastFoods,
      function(food, index, callback) {
        orderOfExecution.push(food);
        callback(null, food.toUpperCase());
      },
      function(error, results) {
        assert.ok(!error);
        assert.equal(results[0], 'EGGS');
        assert.equal(results[1], 'BACON');
        assert.deepEqual(orderOfExecution, breakfastFoods);
        done();
      });
  
```

