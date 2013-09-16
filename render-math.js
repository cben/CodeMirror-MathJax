"use strict";

CodeMirror.renderMath = function(editor, MathJax) {
  // Prevent errors on IE.  Might not actually log.
  function log() {
    try { console.log.apply(console, arguments); } catch (err) {}
  }
  function error() {
    try { console.error.apply(console, arguments); } catch (err) {}
  }

  var doc = editor.getDoc();

  // Position arithmetic
  // -------------------

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

  // TODO: add similar function to CodeMirror (can be more efficient).
  // Conservative: return marks with at least 1 char overlap.
  function findMarksInRange(from, to) {
    var allMarks = doc.getAllMarks();
    var inRange = [];
    for(var i = 0; i < allMarks.length; i++) {
      var markRange = allMarks[i].find();
      if(rangesOverlap(markRange, {from: from, to: to})) {
        inRange.push(allMarks[i]);
        log("between", from, to, ":", editor.getRange(markRange.from, markRange.to));
      }
    }
    log("allMarks", allMarks.length, "inRange", inRange.length);
    return inRange;
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
      var range = unrenderedMath.find();
      var text = doc.getRange(range.from, range.to);
      error("overriding previous unrenderedMath:", text);
    }
    log("unrendering math", doc.getRange(fromTo.from, fromTo.to));
    unrenderedMath = doc.markText(fromTo.from, fromTo.to);
  }

  function unrenderMark(mark) {
    unrenderRange(mark.find());
    mark.clear();
  }

  editor.on("cursorActivity", function(doc) {
    if (unrenderedMath) {
      // TODO: selection behavior?
      var cursor = doc.getCursor();
      var unrenderedRange = unrenderedMath.find();
      if(posInsideRange(cursor, unrenderedRange)) {
        log("cursorActivity", cursor, "in unrenderedRange", unrenderedRange);
      } else {
        log("cursorActivity", cursor, "left unrenderedRange.", unrenderedRange);
        unrenderedMath = null;
        processMath(unrenderedRange.from, unrenderedRange.to);
      }
    }
  });

  // Rendering on changes
  // --------------------

  function processMath(from, to) {
    var text = doc.getRange(from, to);
    var elem = document.createElement("span");
    // TODO: is this stable given surrounding edits?
    var tokenType = editor.getTokenAt(from, true).type;
    if(tokenType) {
      elem.className = "cm-" + tokenType;
    }
    elem.appendChild(document.createTextNode(text));

    var cursor = doc.getCursor();
    log("typesetting", text, elem);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
    MathJax.Hub.Queue(function() {
      // TODO: what if doc changed while MathJax was typesetting?
      // TODO: behavior during selection?
      var cursor = doc.getCursor();

      if(posInsideRange(cursor, {from: from, to: to})) {
        // This doesn't normally happen during editing, more likely
        // during initial pass.
        error(cursor);
        unrenderRange({from: from, to: to});
      } else {
        var mark = doc.markText(from, to, {replacedWith: elem,
                                           clearOnEnter: false,
                                           // title is supported since CM 3.15
                                           title: text + " [click to edit]"});
        CodeMirror.on(mark, "beforeCursorEnter", function() {
          unrenderMark(mark);
        });
      }
    });
  }

  // TODO: multi line \[...\]. Needs an approach similar to overlay modes.
  function processLine(lineHandle) {
    var text = lineHandle.text;
    var line = doc.getLineNumber(lineHandle);
    log("processLine", line, text);

    // TODO: matches inner $..$ in $$..$ etc.
    // JS has lookahead but not lookbehind.
    var formula = /\$\$.*?[^$\\]\$\$|\$.*?[^$\\]\$|\\\(.*?[^$\\]\\\)|\\\[.*?[^$\\]\\\]/g;
    var match;
    while((match = formula.exec(text)) != null) {
      var fromCh = match.index;
      var toCh = fromCh + match[0].length;
      processMath({line: line, ch: fromCh}, {line: line, ch: toCh});
    }
  }

  // Documents don't batch "change" events, so should never have .next.
  CodeMirror.on(doc, "change", function processChange(doc, changeObj) {
    log("change", changeObj);
    // changeObj.{from,to} are pre-change coordinates; adding text.length
    // (number of inserted lines) is a conservative(?) fix.
    var oldMarks = findMarksInRange({line: changeObj.from.line, ch: 0},
                                    {line: changeObj.to.line + changeObj.text.length + 1, ch: 0});
    for(var i = 0; i < oldMarks.length; i++) {
      oldMarks[i].clear();
    }
    doc.eachLine(changeObj.from.line,
                 changeObj.to.line + changeObj.text.length + 1,
                 processLine);
    if("next" in changeObj) {
      error("next");
      processChange(changeObj.next);
    }
  });

  // First pass - process whole document.
  doc.eachLine(processLine);
}
