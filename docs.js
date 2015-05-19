var acquit = require('acquit');

var content = require('fs').readFileSync('./test/examples.test.js').toString();
var blocks = acquit.parse(content);

var mdOutput =
  '# wagner-core\n\n' +
  'Dependency injector and di-based async framework.\n\n' +
  '  [![Build Status](https://travis-ci.org/vkarpov15/wagner-core.svg?branch=master)](https://travis-ci.org/vkarpov15/wagner-core)\n\n' +
  'Wagner is primarily geared to be a more elegant and modern take on [orchestrator](https://www.npmjs.org/package/orchestrator), hence the name. If you\'ve used orchestrator for web apps and found it cumbersome, Wagner is for you.\n\n' +
  '<img src="http://upload.wikimedia.org/wikipedia/commons/f/f3/Richard_Wagner_2.jpg" width="140">\n\n' +
  '# API\n\n';

for (var i = 0; i < blocks.length; ++i) {
  var describe = blocks[i];
  mdOutput += '## ' + describe.contents + '\n\n';
  mdOutput += describe.comments[0] ?
    acquit.trimEachLine(describe.comments[0]) + '\n\n' :
    '';

  for (var j = 0; j < describe.blocks.length; ++j) {
    var it = describe.blocks[j];
    mdOutput += '#### It ' + it.contents + '\n\n';
    mdOutput += it.comments[0] ? acquit.trimEachLine(it.comments[0]) + '\n\n' : '';
    mdOutput += '```javascript\n';
    mdOutput += '    ' + it.code + '\n';
    mdOutput += '```\n\n';
  }
}

require('fs').writeFileSync('README.md', mdOutput);
