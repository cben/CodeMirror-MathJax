"use strict";

CodeMirror.renderMath = function(editor, MathJax) {
  // Prevent errors on IE.  Might not actually log.
  function log() {
    try { console.log.apply(console, arguments); } catch (err) {}
  }

  var doc = editor.getDoc();

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

  // If cursor is inside a formula, we don't render it until the
  // cursor leaves it.  To cleanly detect when that happens we
  // still markText() it but without replacedWith and store the
  // marker here.
  var unrenderedMath = null;

  function processMath(from, to) {
    var text = editor.getRange(from, to);
    var elem = document.createElement("span");
    elem.appendChild(document.createTextNode(text));

    var cursor = doc.getCursor();
    log("processMath", text, elem,
        posCmp(from, cursor), posCmp(cursor, to));
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
    MathJax.Hub.Queue(function() {
      /* TODO: behavior during selection? */
      var cursor = doc.getCursor();
      if(posInsideRange(cursor, {from: from, to: to})) {
        /* TODO: what if unrenderedMath is already set? */
        unrenderedMath = doc.markText(from, to);
      } else {
        var range = doc.markText(from, to, {replacedWith: elem,
                                            clearOnEnter: false});
        CodeMirror.on(range, "beforeCursorEnter", function() {
          var fromTo = range.find();
          log("beforeCursorEnter", fromTo, range);
          range.clear();
          unrenderedMath = doc.markText(fromTo.from, fromTo.to);
        });
      }
    });
  }

  // TODO: multi line $...$. Needs an approach similar to overlay modes.
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
    window.ccc = changeObj;
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
      alert("next");
      processChange(changeObj.next);
    }
  });

  editor.on("cursorActivity", function(doc) {
    // TODO: selection behavior?
    var cursor = doc.getCursor();
    if (unrenderedMath == null) {
      return;
    }
    var range = unrenderedMath.find();
    log("cursorActivity", cursor, range.from, range.to);
    if(posInsideRange(cursor, range)) {
      return;
    }
    processMath(range.from, range.to);
    unrenderedMath = null;
  });

  doc.eachLine(processLine);
}
