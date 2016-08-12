function createStartFn(tc) {
  return function(config) {
    // export from 'parser.js'
    var parser = tapParser; // eslint-disable-line no-undef
    var numResults = 0;
    var closed = false;
    var res = [];
    var suite = '';
    var startTime = new Date().getTime();
    var parseStream = parser();
    var SKIP = /^# SKIP\s/;

    parseStream.on('comment', function(comment) {
      // handle skipped test
      if (SKIP.test(comment)) {
        res.push({
          description: comment.replace(SKIP, ''),
          skipped: true
        });
        return;
      }

      // TODO: validate if comment is a test 'name'
      suite = comment;
    });

    parseStream.on('assert', function(assertion) {
      numResults++;
      res.push({
        description: assertion.name,
        success: assertion.ok,
        log: [JSON.stringify(assertion.diag || assertion, null, 2)],
        suite: [suite],
        time: new Date().getTime() - startTime
      });
    });

    parseStream.on('complete', function(results) {
      tc.info({ total: numResults });
      for (var i = 0, len = res.length; i < len; i++) {
        tc.result(res[i]);
      }
      tc.complete({
        coverage: window.__coverage__
      });
    });

    var originalLog = console.log;
    console.log = function () {
      var msg = arguments[0];

      // do not write in a closed WriteStream
      if (!closed) {
        parseStream.write(msg + '\n');
        if (/^# fail\s*\d+$/.test(msg) || /^# ok/.test(msg)) {
          parseStream.end();
          closed = true;
        }
      }

      if (typeof originalLog === 'function') {
        return originalLog.apply(this, arguments);
      }
    }
  }
};

window.__karma__.start = createStartFn(window.__karma__);
