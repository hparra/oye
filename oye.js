#!/usr/bin/env node
'use strict';

const OYE_DIR = '.oye';
const OYE_JSON = '.oye.json';

const fs = require('fs');
const os = require('os');
const path = require('path');
const program = require('commander');

const pkg = require('./package.json');
const oye = require(path.join(__dirname, OYE_DIR, OYE_JSON));

const custom_map_path = path.join(os.homedir(), OYE_DIR, OYE_JSON);

// custom .oye.json if it exists
const custom_oye = (function () {
  try {
    const stats = fs.statSync(custom_map_path);
    return (stats.isFile())
      ? require(custom_map_path)
      : undefined;
  }
  catch (err) {
    if (err && err.name === 'SyntaxError') {
      console.error(err.message)
    }
    return undefined;
  }
})();

// computed map of filepaths from optional merged custom oye.json
const filepath_map = (function () {

  // FIXME: we're calculating this before we're sure it needs to be used
  const oye_filepath_map =
    Object.keys(oye.filename_map).reduce(function (obj, key) {
      obj[key] = path.join(__dirname, OYE_DIR, oye.filename_map[key]);
      return obj;
    }, {});

  if (!custom_oye) {
    return oye_filepath_map;
  }
  else {
    const custom_oye_filepath_map =
      Object.keys(custom_oye.filename_map).reduce(function (obj, key) {
        obj[key] = path.join(os.homedir(), OYE_DIR, custom_oye.filename_map[key]);
        return obj;
      }, {});

    // NOTE: mutation merge only if key/value does not already exist
    if (custom_oye.merge_with_default) {
      for (var key in oye_filepath_map) {
        if (typeof custom_oye_filepath_map[key] === 'undefined')
          custom_oye_filepath_map[key] = oye_filepath_map[key];
      }
    }

    return custom_oye_filepath_map;
  }
})();

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <example>')
  .option('-o, --stdout', 'stream file to stdout instead')

// show available examples on help
program.on('--help', function () {
  console.log('  Available Examples:');
  console.log('');
  Object.keys(filepath_map).forEach(function (example) {
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
const filepath = filepath_map[example];

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
