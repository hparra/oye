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

/** @type {String[]} - subdirectory paths within HOME_OYE_PATH */
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
    return [];
  }
})(HOME_OYE_PATH);

/** @type {String[]} List to all candidate OYE paths */
const OYE_PATHS = HOME_OYE_SUBPATHS
  ? Array.prototype.concat.call([DEFAULT_OYE_PATH, HOME_OYE_PATH], HOME_OYE_SUBPATHS)
  : DEFAULT_OYE_PATH;

/**
Merger of all OYE_JSON with computed absolute paths
$HOME OYE_JSON entries are merged with defaults in root namespace (*)
Duplicated entries in $HOME OYE_JSON overwrite defaults
OYE_JSON from subdirectories are namspaced with directory name
(*) only if it comes first in list!
@type {Oye} Merger of all OYE_JSON
*/
const oye = (function (oyePaths) {
  return oyePaths.reduce(function (oyeMap, oyePath) {
    try {
      const oyePojo = require(path.join(oyePath, OYE_JSON));
      const namespace = [DEFAULT_OYE_PATH, HOME_OYE_PATH].some(p => p === oyePath)
        ? '' : path.basename(oyePath, HOME_OYE_PATH)
      return Object
        .keys(oyePojo.filename_map)
        .reduce(function (map, key) {
          map.filename_map[path.join(namespace, key)] = path.join(oyePath, oyePojo.filename_map[key]);
          return map;
        }, oyeMap)
    }
    catch (err) {
      return oyeMap;
    }
  }, {
    filename_map: {}
  })
})(OYE_PATHS)

console.log(oye);

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <example>')
  .option('-o, --stdout', 'stream file to stdout instead')

// show available examples on help
program.on('--help', function () {
  console.log('  Available Examples:');
  console.log('');
  Object.keys(oye.filename_map).forEach(function (example) {
    console.log('    ' + example);
  })
  console.log('');
});

program.parse(process.argv);

// an example is required
if (program.args.length !== 1) {
  console.error('Please specify an example. For help run `oye -h`.');
  process.exit(1);
}

const example = program.args.pop();
const filepath = oye.filename_map[example];

if (typeof filepath === 'undefined') {
  console.error('Example was not found. For available examples run `oye -h`.');
  process.exit(1);
}

const filename = path.basename(filepath);
const write_absolute_path = path.join(process.cwd(), filename);
const file_already_exists = (function () {
  try {
    const stats = fs.statSync(write_absolute_path);
    return true;
  }
  catch (err) {
    return false;
  }
})();

// copy example file
try {
  var file = fs.readFileSync(filepath, 'utf8');
  if (program.stdout)
    console.log(file);
  else if (file_already_exists)
    throw new Error(filename + ' already exists');
  else
    fs.writeFileSync(write_absolute_path, file);
}
catch (err) {
  console.error(err.message);
  process.exit(1);
}
