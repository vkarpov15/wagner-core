# wagner-core

Dependency-injection-inspired async framework that doubles as an isomorphic AngularJS-compatible dependency injector.

## API

### `wagner.invokeAsync()`

`invokeAsync()` is the primary function you will use to execute
async code with Wagner

#### It allows you to execute async tasks based on parameter names

```
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

