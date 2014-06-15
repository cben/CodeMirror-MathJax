// dependencies:
//   defineMathMode(): addon/mode/multiplex.js, optionally addon/mode/stex/stex.js
//   hookMath(): MathJax

"use strict";

// Wrap mode to skip formulas (e.g. $x*y$ shouldn't start italics in markdown).
// TODO: doesn't handle escaping, e.g. \$.  Doesn't check spaces before/after $ like pandoc.
// TODO: this might not exactly match the same things as formulaRE in processLine().

// We can't just construct a mode object, because there would be no
// way to use; we have to register a constructor, with a name.
CodeMirror.defineMathMode = function(name, outerModeSpec) {
  CodeMirror.defineMode(name, function(cmConfig) {
    var outerMode = CodeMirror.getMode(cmConfig, outerModeSpec);
    var innerMode = CodeMirror.getMode(cmConfig, "text/x-stex");
    return CodeMirror.multiplexingMode(
      outerMode,
      // "keyword" is how stex styles math delimiters.
      // "delim" tells us not to pick up this style as math style.
      {open: "$$", close: "$$", mode: innerMode, delimStyle: "keyword delim"},
      {open:  "$", close: "$",  mode: innerMode, delimStyle: "keyword delim"},
      {open: "\\(", close: "\\)", mode: innerMode, delimStyle: "keyword delim"},
      {open: "\\[", close: "\\]", mode: innerMode, delimStyle: "keyword delim"});
  });
};

// Usage: first call CodeMirror.hookMath(editor, MathJax), then editor.renderAllMath() to process initial content.
// TODO: simplify usage when initial pass becomes cheap.
// TODO: use defineOption(), support clearing widgets and removing handlers.
CodeMirror.hookMath = function(editor, MathJax) {
  // Logging
  // -------
  var timestampMs = ((window.performance && window.performance.now) ?
                     function() { return window.performance.now(); } :
                     function() { return new Date().getTime(); });
  function formatDuration(ms) { return (ms / 1000).toFixed(3) + "s"; }

  var t0 = timestampMs();
  // Goal: Prevent errors on IE.  Might not actually log.
  function log() {
    try {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift(formatDuration(timestampMs() - t0));
      console.log.apply(console, args);
    } catch(err) {}
  }
  function error() {
    try {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift(formatDuration(timestampMs() - t0));
      console.error.apply(console, args);
    } catch(err) {}
  }

  // Log time if non-negligible.
  function logFuncTime(func) {
    return function() {
      var start = timestampMs();
      func.apply(this, arguments);
      var duration = timestampMs() - start;
      if(duration > 100) {
        log((func.name || "<???>") + "() took " + formatDuration(duration));
      }
    };
  }

  var doc = editor.getDoc();

  // Position arithmetic
  // -------------------

  var Pos = CodeMirror.Pos;

  // Return negative / 0 / positive.  a < b iff posCmp(a, b) < 0 etc.
  function posCmp(a, b) {
    return (a.line - b.line) || (a.ch - b.ch);
  }

  // True if inside, false if on edge.
  function posInsideRange(pos, fromTo) {
    return posCmp(fromTo.from, pos) < 0 && posCmp(pos, fromTo.to) < 0;
  }

  // True if there is at least one character in common, false if just touching.
  function rangesOverlap(fromTo1, fromTo2) {
    return (posCmp(fromTo1.from, fromTo2.to) < 0 &&
            posCmp(fromTo2.from, fromTo1.to) < 0);
  }

  // Track currently-edited formula
  // ------------------------------
  // TODO: refactor this to generic simulation of cursor leave events.

  // If cursor is inside a formula, we don't render it until the
  // cursor leaves it.  To cleanly detect when that happens we
  // still markText() it but without replacedWith and store the
  // marker here.
  var unrenderedMath = null;

  function unrenderRange(fromTo) {
    if(unrenderedMath) {
      var oldRange = unrenderedMath.find();
      if(oldRange) {
        var text = doc.getRange(oldRange.from, oldRange.to);
        error("overriding previous unrenderedMath:", text);
      } else {
        error("overriding unrenderedMath whose .find() == undefined", text);
      }
    }
    log("unrendering math", doc.getRange(fromTo.from, fromTo.to));
    unrenderedMath = doc.markText(fromTo.from, fromTo.to);
  }

  function unrenderMark(mark) {
    var range = mark.find();
    if(!range) {
      error(mark, "mark.find() == undefined");
    } else {
      unrenderRange(range);
    }
    mark.clear();
  }

  editor.on("cursorActivity", function(doc) {
    if(unrenderedMath) {
      // TODO: selection behavior?
      var cursor = doc.getCursor();
      var unrenderedRange = unrenderedMath.find();
      if(!unrenderedRange) {
        // This happens, not yet sure when and if it's fine.
        error(unrenderedMath, ".find() == undefined");
        return;
      }
      if(posInsideRange(cursor, unrenderedRange)) {
        log("cursorActivity", cursor, "in unrenderedRange", unrenderedRange);
      } else {
        log("cursorActivity", cursor, "left unrenderedRange.", unrenderedRange);
        unrenderedMath = null;
        processMath(unrenderedRange.from, unrenderedRange.to);
        flushMarkTextQueue();
      }
    }
  });

  // Rendering on changes
  // --------------------

  function createMathElement(from, to) {
    // TODO: would MathJax.HTML make this more portable?
    var text = doc.getRange(from, to);
    var elem = document.createElement("span");
    // Display math becomes a <div> (inside this <span>), which
    // confuses CM badly ("DOM node must be an inline element").
    elem.style.display = "inline-block";
    if(/\\(?:re)?newcommand/.test(text)) {
      // \newcommand{...} would render empty, which makes it hard to enter it for editing.
      text = text + " \\(" + text + "\\)";
    }
    elem.appendChild(document.createTextNode(text));
    elem.title = text;

    var isDisplay = /^\$\$|^\\\[|^\\begin/.test(text);  // TODO: probably imprecise.

    // TODO: style won't be stable given surrounding edits.
    // This appears to work somewhat well but only because we're
    // re-rendering too aggressively (e.g. one line below change)...

    // Sample style one char into the formula, because it's null at
    // start of line.
    var insideFormula = Pos(from.line, from.ch + 1);
    var tokenType = editor.getTokenAt(insideFormula, true).type;
    var className = isDisplay ? "display_math" : "inline_math";
    if(tokenType && !/delim/.test(tokenType)) {
      className += " cm-" + tokenType.replace(/ +/g, " cm-");
    }
    elem.className = className;
    return elem;
  }

  // MathJax returns rendered DOMs asynchroonously.
  // Batch inserting those into the editor to reduce layout & painting.
  var markTextQueue = [];
  var flushMarkTextQueue = logFuncTime(function flushMarkTextQueue() {
    editor.operation(function() {
      for(var i = 0; i < markTextQueue.length; i++) {
        markTextQueue[i]();
      }
      markTextQueue = [];
    });
  });

  function processMath(from, to) {
    var elem = createMathElement(from, to);
    var text = elem.innerHTML;
    log("typesetting", text, elem);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
    MathJax.Hub.Queue(function() {
      log("done typesetting", text);
      // TODO: what if doc changed while MathJax was typesetting?
      // TODO: behavior during selection?
      var cursor = doc.getCursor();

      if(posInsideRange(cursor, {from: from, to: to})) {
        // This doesn't normally happen during editing, more likely
        // during initial pass.
        error(cursor);
        unrenderRange({from: from, to: to});
      } else {
        markTextQueue.push(function() {
          var mark = doc.markText(from, to, {replacedWith: elem,
                                             clearOnEnter: false});
          CodeMirror.on(mark, "beforeCursorEnter", function() {
            unrenderMark(mark);
          });
        });
      }
    });
  }

  // TODO: multi line \[...\]. Needs an approach similar to overlay modes.
  function processLine(lineHandle) {
    var text = lineHandle.text;
    var line = doc.getLineNumber(lineHandle);
    //log("processLine", line, text);

    // TODO: doesn't handle escaping, e.g. \$.  Doesn't check spaces before/after $ like pandoc.
    // TODO: matches inner $..$ in $$..$ etc.
    // JS has lookahead but not lookbehind.
    // For \newcommand{...} can't match end reliably, just consume till last } on line.
    var formulaRE = /\$\$.*?[^$\\]\$\$|\$.*?[^$\\]\$|\\\(.*?[^$\\]\\\)|\\\[.*?[^$\\]\\\]|\\begin\{([*\w]+)\}.*?\\end{\1}|\\(?:re)?newcommand\{.*\}/g;
    var match;
    while((match = formulaRE.exec(text)) != null) {
      var fromCh = match.index;
      var toCh = fromCh + match[0].length;
      processMath(Pos(line, fromCh), Pos(line, toCh));
    }
  }

  function clearMarksInRange(from, to) {
    // doc.findMarks() added in CM 3.22.
    var oldMarks = doc.findMarks ? doc.findMarks(from, to) : doc.getAllMarks();
    for(var i = 0; i < oldMarks.length; i++) {
      // findMarks() returns marks that touch the range, we want at least one char overlap.
      if(rangesOverlap(oldMarks[i].find(), {from: from, to: to})) {
        oldMarks[i].clear();
      }
    }
  }

  // Documents don't batch "change" events, so should never have .next.
  CodeMirror.on(doc, "change", logFuncTime(function processChange(doc, changeObj) {
    log("change", changeObj);
    // changeObj.{from,to} are pre-change coordinates; adding text.length
    // (number of inserted lines) is a conservative(?) fix.
    // TODO: use cm.changeEnd()
    var endLine = changeObj.to.line + changeObj.text.length + 1;
    clearMarksInRange(Pos(changeObj.from.line, 0), Pos(endLine, 0));
    doc.eachLine(changeObj.from.line, endLine, processLine);
    if("next" in changeObj) {
      error("next");
      processChange(changeObj.next);
    }
    MathJax.Hub.Queue(flushMarkTextQueue);
  }));

  // First pass - process whole document.
  editor.renderAllMath = logFuncTime(function renderAllMath() {
    doc.eachLine(processLine);
    MathJax.Hub.Queue(flushMarkTextQueue);
    MathJax.Hub.Queue(function() { log("-- All math rendered. --"); });
  })

  // Make sure stuff doesn't somehow remain in markTextQueue.
  setInterval(function() {
    if(markTextQueue.length != 0) {
      error("Fallaback flushMarkTextQueue:", markTextQueue.length, "elements");
      flushMarkTextQueue();
    }
  }, 500);
}
