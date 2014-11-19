var bddDox = require('bdd-dox');
var beautify = require('js-beautify');

var content = require('fs').readFileSync('./test/examples.test.js').toString();
var blocks = bddDox.parse(content);

var trimEachLine = function(str) {
  var lines = str.split('\n');
  var result = '';
  for (var i = 0; i < lines.length; ++i) {
    var toAdd = lines[i].trim();
    if (toAdd.indexOf('* ') === 0) {
      toAdd = toAdd.substr('* '.length);
    }
    result += (i > 0 ? '\n' : '') + toAdd;
  }

  return result;
};

var mdOutput =
  '# wagner-core\n\n' +
  'Dependency-injection-inspired async framework that doubles as an ' +
  'isomorphic AngularJS-compatible dependency injector.\n\n' +
  '<img src="http://upload.wikimedia.org/wikipedia/commons/f/f3/Richard_Wagner_2.jpg" width="80">\n\n'
  '## API\n\n';

for (var i = 0; i < blocks.length; ++i) {
  var describe = blocks[i];
  mdOutput += '### ' + describe.contents + '\n\n';
  mdOutput += describe.comments[0] ?
    trimEachLine(describe.comments[0]) + '\n\n' :
    '';

  for (var j = 0; j < describe.blocks.length; ++j) {
    var it = describe.blocks[j];
    mdOutput += '##### It ' + it.contents + '\n\n';
    mdOutput += it.comments[0] ? trimEachLine(it.comments[0]) + '\n\n' : '';
    mdOutput += '```\n';
    mdOutput += beautify(it.code, { indent_size: 2 }) + '\n';
    mdOutput += '```\n\n';
  }
}

require('fs').writeFileSync('README.md', mdOutput);
