oye - common file example copier
================================

oye will create a documented example of a common repository or project file in the directory where it is run.

## Usage

The following installs oye and creates an example README.md in the current directory:

```shell
npm install -g oye
oye readme
```

## Purpose

oye espouses relative speed and documentation. It is not a file generator and does not use templates. It is not intended for multiple files with directory structures. It is intended to be a lightweight alternative to yeoman. Your examples should be well documented and assume that the individual using it may not be well-versed in this type of file. It is easier to delete what you don't need, or what you consider verbose, than searching through `man` or goggling what you do need.

## Customization

oye comes with some common examples, but also allows you to define your own in _~/.oye_. Remember to update _~/.oye/.oye.json_ with the names and filenames of your own examples. Any custom .oye.json will be merged with the default version, with the custom entries taking precedence.

Example _.oye.json_ file:

```json
{
  "merge_with_default": true,
  "filename_map": {
    "editorconfig": ".editorconfig",
    "gitignore": ".gitignore",
    "readme": "README.md"
  }
}
```
