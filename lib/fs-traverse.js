var fs = require('fs'),
    NOOP = function() {};

/**
 * Call fileHandler with the file name and file Stat for each file found inside
 * of the provided directory.
 *
 * Call the optionally provided completeHandler with an array of files (mingled
 * with directories) and an array of Stat objects (one for each of the found
 * files.
 *
 * Following is an example of a simple usage:
 *
 *   eachFileOrDirectory('test/', function(err, file, stat) {
 *     if (err) throw err;
 *     if (!stat.isDirectory()) {
 *       console.log('>> Found file: ' + file);
 *     }
 *   });
 *
 * Following is an example that waits for all files and directories to be
 * scanned and then uses the entire result to do somthing:
 *
 *   eachFileOrDirectory('test/', null, function(files, stats) {
 *     if (err) throw err;
 *     var len = files.length;
 *     for (var i = 0; i < len; i++) {
 *       if (!stats[i].isDirectory()) {
 *         console.log('>> Found file: ' + files[i]);
 *       }
 *     }
 *   });
 */
var eachFileOrDirectory = function(directory, fileHandler, completeHandler) {
  var filesToCheck = 0,
      checkedFiles = [],
      checkedStats = [];
  completeHandler = completeHandler || NOOP;

  directory = (directory) ? directory : './';

  var fullFilePath = function fullFilePath_(dir, file) {
    return dir.replace(/\/$/, '') + '/' + file;
  };

  var checkComplete = function checkComplete_() {
    if (filesToCheck === 0) {
      return completeHandler(null, checkedFiles, checkedStats);
    }
  };

  var onFileOrDirectory = function onFileOrDirectory_(fileOrDirectory) {
    filesToCheck++;
    fs.stat(fileOrDirectory, function(err, stat) {
      filesToCheck--;
      if (err) {
        return fileHandler(err);
      }

      checkedFiles.push(fileOrDirectory);
      checkedStats.push(stat);
      fileHandler(null, fileOrDirectory, stat);

      if (stat.isDirectory()) {
        return onDirectory(fileOrDirectory);
      }

      return checkComplete();
    });
  };

  var onDirectory = function onDirectory_(dir) {
    filesToCheck++;
    fs.readdir(dir, function(err, files) {
      filesToCheck--;
      if (err) {
        return fileHandler(err);
      }

      files.forEach(function(file, index) {
        file = fullFilePath(dir, file);
        return onFileOrDirectory(file);
      });

      return checkComplete();
    });
  };

  return onFileOrDirectory(directory);
};

var eachFileOrDirectorySync = function(directory, fileHandler) {
  var checkedFiles = [],
      checkedStats = [];

  directory = (directory) ? directory : './';

  var fullFilePath = function fullFilePath_(dir, file) {
    return dir.replace(/\/$/, '') + '/' + file;
  };

  var onFileOrDirectory = function onFileOrDirectory_(fileOrDirectory) {
    var stat = fs.statSync(fileOrDirectory);
    checkedFiles.push(fileOrDirectory);
    checkedStats.push(stat);
    fileHandler(null, fileOrDirectory, stat);

    if (stat.isDirectory()) {
      return onDirectory(fileOrDirectory);
    }
  };

  var onDirectory = function onDirectory_(dir) {
    var files = fs.readdirSync(dir);
    files.forEach(function(file, index) {
      file = fullFilePath(dir, file);

      return onFileOrDirectory(file);
    });
  };

  return onFileOrDirectory(directory);
};

/**
 * Recursivly, asynchronously traverse the file system calling the provided
 * callback for each file (non-directory) found.
 *
 * Traversal will begin on the provided path.
 */
var eachFile = function(path, callback, completeHandler) {
  var files = [],
      stats = [];

  completeHandler = completeHandler || NOOP;

  return eachFileOrDirectory(path, function(err, file, stat) {
    if (err) {
      return callback(err);
    }

    if (!stat.isDirectory()) {
      files.push(file);
      stats.push(stat);

      if (callback) {
        return callback(null, file, stat);
      }
    }
  }, function(err) {
    if (err) {
      return completeHandler(err);
    }

    return completeHandler(null, files, stats);
  });
};

var eachFileSync = function(path, callback) {
  var files = [],
      stats = [];

  return eachFileOrDirectorySync(path, function(err, file, stat) {
    if (err) {
      return callback(err);
    }

    if (!stat.isDirectory()) {
      files.push(file);
      stats.push(stat);

      if (callback) {
        return callback(null, file, stat);
      }
    }
  });
};

/**
 * Works just like eachFile, but it only includes files that match a provided
 * regular expression.
 *
 *   eachFileMatching(/_test.js/, 'test', function(err, file, stat) {
 *     if (err) throw err;
 *     console.log('>> Found file: ' + file);
 *   });
 *
 */
var eachFileMatching = function(expression, path, callback, completeHandler) {
  var files = [],
      stats = [];

  completeHandler = completeHandler || NOOP;

  return eachFile(path, function(err, file, stat) {
    if (err) {
      return callback(err);
    }

    if (expression.test(file)) {
      files.push(file);
      stats.push(stat);

      if (callback) {
        return callback(null, file, stat);
      }
    }
  }, function(err) {
    if (err) {
      return completeHandler(err);
    }

    return completeHandler(null, files, stats);
  });
};

var eachFileMatchingSync = function(expression, path, callback) {
  var files = [];
  var stats = [];

  return eachFileSync(path, function(err, file, stat) {
    if (err) {
      return callback(err);
    }

    if (expression.test(file)) {
      files.push(file);
      stats.push(stat);
      if (callback) {
        return callback(null, file, stat);
      }
    }
  });
};

/**
 * Read each file with a file name that matches the provided expression
 * and was found in the provided path.
 *
 * Calls the optionally provided callback for each file found.
 *
 * Calls the optionally provided completeHandler when the search is
 * complete.
 *
 *   readEachFileMatching(/_test.js/, 'test', function(err, file, stat, content) {
 *     if (err) throw err;
 *     console.log('>> Found file: ' + file + ' with: ' + content.length + ' chars');
 *   });
 */
var readEachFileMatching = function(expression, path, callback, completeHandler) {
  completeHandler = completeHandler || NOOP;
  var files = [],
      contents = [],
      stats = [];

  return eachFileMatching(expression, path, function(err, file, stat) {
    return fs.readFile(file, function(err, content) {
      if (err) return callback(err);
      files.push(file);
      contents.push(content);
      stats.push(stat);

      if (callback) {
        return callback(null, file, stat, content);
      }
    });
  }, function(err) {
    if (err) {
      return completeHandler(err);
    }

    return completeHandler(err, files, stats, contents);
  });
};

var readEachFileMatchingSync = function(expression, path, callback) {
  var files = [],
      contents = [],
      stats = [];

  return eachFileMatchingSync(expression, path, function(err, file, stat) {
    var content = fs.readFileSync(file);
    files.push(file);
    contents.push(content);
    stats.push(stat);

    if (callback) {
      return callback(null, file, stat, content);
    }
  });
};

/**
 * Expose each function
 */
module.exports.eachFile = exports.eachFile = eachFile;
module.exports.eachFileSync = exports.eachFileSync = eachFileSync;
module.exports.eachFileMatching = exports.eachFileMatching = eachFileMatching;
module.exports.eachFileMatchingSync = exports.eachFileMatchingSync = eachFileMatchingSync;
module.exports.eachFileOrDirectory = exports.eachFileOrDirectory = eachFileOrDirectory;
module.exports.eachFileOrDirectorySync = exports.eachFileOrDirectorySync = eachFileOrDirectorySync;
module.exports.readEachFileMatching = exports.readEachFileMatching = readEachFileMatching;
module.exports.readEachFileMatchingSync = exports.readEachFileMatchingSync = readEachFileMatchingSync;
