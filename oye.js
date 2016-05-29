#!/usr/bin/env node
'use strict';

const OYE_DIR = '.oye';
const OYE_JSON = '.oye.json';

const fs = require('fs');
const os = require('os');
const path = require('path');
const program = require('commander');

const pkg = require('./package.json');

/** @type {String} - default oye path */
const DEFAULT_OYE_PATH = path.join(__dirname, OYE_DIR);

/** @type {String} - $HOME oye path, if it exists */
const HOME_OYE_PATH = (function(oyeDir) {
  const p = path.join(os.homedir(), oyeDir);
  try {
    return fs.statSync(p).isDirectory() ? p : null
  }
  catch (err) {
    return null;
  }
})(OYE_DIR);

/** @type {String[]} - non-hidden subdirectory paths within HOME_OYE_PATH */
const HOME_OYE_SUBPATHS = (function (homeOyePath) {
  if (!homeOyePath)
    return [];
  try {
    return fs
      .readdirSync(homeOyePath)
      .filter(function (file) {
        if (file[0] === '.') return false;
        return fs.statSync(path.join(homeOyePath, file)).isDirectory();
      })
      .map(function (dir) {
        return path.join(homeOyePath, dir);
      })
  }
  catch (err) {
    // TODO: what cases would reach here?
    return [];
  }
})(HOME_OYE_PATH);

/** @type {String[]} List to all candidate OYE paths */
const OYE_PATHS = HOME_OYE_SUBPATHS
  ? Array.prototype.concat.call([DEFAULT_OYE_PATH, HOME_OYE_PATH], HOME_OYE_SUBPATHS)
  : DEFAULT_OYE_PATH;

/**
Merger of all OYE_JSON with absolute source paths
String entries are converted to objects
$HOME OYE_JSON entries are merged with defaults in root namespace (*)
Duplicated entries in $HOME OYE_JSON overwrite defaults
OYE_JSON from subdirectories are namspaced with directory name
(*) only if it comes first in list!
TODO: may be faster if async
TODO: could use Object.assign for less code
@type {Oye} Merger of all OYE_JSON
*/
const oye = (function (oyePaths) {
  return oyePaths.reduce(function (computedOyePojo, oyePath) {
    try {
      const oyePojo = require(path.join(oyePath, OYE_JSON));
      const namespace = [DEFAULT_OYE_PATH, HOME_OYE_PATH].some(p => p === oyePath)
        ? '' : path.basename(oyePath, HOME_OYE_PATH)
      return Object
        .keys(oyePojo.examples)
        .reduce(function (pojo, key) {
          pojo.examples[path.join(namespace, key)] =
            (function (val) {
              if (typeof val === 'string') {
                return {
                  source: path.join(oyePath, val),
                  target: val
                }
              }
              else { // assume Oye example object
                return Object.assign({}, val, {
                  source: path.join(oyePath, val.source)
                });
              }
            })(oyePojo.examples[key]);
          return pojo;
        }, computedOyePojo)
    }
    catch (err) {
      console.error(err.message);
      return computedOyePojo;
    }
  }, {
    examples: {}
  })
})(OYE_PATHS)

//
// "CLI main"
//

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <example>')
  .option('-o, --stdout', 'stream file to stdout instead')
  .option('-D, --debug', 'stream computed oye.json to stderr')

// show available examples on help
program.on('--help', function () {
  console.log('  Available Examples:');
  console.log('');
  Object.keys(oye.examples).forEach(function (exampleName) {
    const example = oye.examples[exampleName];
    console.log(`    ${exampleName} - ${example.description || example.target}`);
  })
  console.log('');
});

program.parse(process.argv);

if (program.debug) {
  console.error(JSON.stringify(oye, null, '  '));
}

// an example is required
if (program.args.length !== 1) {
  console.error('Please specify an example. For help run `oye -h`.');
  process.exit(1);
}

const example = oye.examples[program.args.pop()];

if (typeof example === 'undefined') {
  console.error('Example was not found. For available examples run `oye -h`.');
  process.exit(1);
}

/** @type {String} path of file we will/may write */
const target = path.join(process.cwd(), example.target);

/** @type {Boolean} */
const targetFileAlreadyExists = (function (file) {
  try {
    const stats = fs.statSync(file);
    return true;
  }
  catch (err) {
    return false;
  }
})(target);

// copy example file
try {
  const file = fs.readFileSync(example.source, 'utf8');
  if (program.stdout)
    console.log(file);
  else if (targetFileAlreadyExists)
    throw new Error(path.basename(target) + ' already exists');
  else
    fs.writeFileSync(target, file);
}
catch (err) {
  console.error(err.message);
  process.exit(1);
}
