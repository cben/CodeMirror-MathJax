"use strict";

CodeMirror.renderMath = function(editor, MathJax, jQuery) {
  var doc = editor.getDoc();

  /* Return negative / 0 / positive. */
  function posCmp(a, b) {
    return (b.line - a.line) || (b.ch - a.ch);
  }

  /* If cursor is inside a formula, we don't render it until the
     cursor leaves it.  To cleanly detect when that happens we
     still markText() it but without replacedWith and store the
     marker here. */
  var unrenderedMath = null;

  function processMath(from, to) {
    var text = editor.getRange(from, to);
    var elem = jQuery("<span>").text(text)[0];
    var cursor = doc.getCursor();
    console.log("processMath", text, elem,
                posCmp(from, cursor), posCmp(cursor, to));
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
    MathJax.Hub.Queue(function() {
      /* TODO: behavior during selection? */
      var cursor = doc.getCursor();
      if(posCmp(from, cursor) > 0 && posCmp(cursor, to) > 0) {
        /* TODO: what if unrenderedMath is already set? */
        unrenderedMath = doc.markText(from, to);
      } else {
        var range = doc.markText(from, to, {replacedWith: elem,
                                            clearOnEnter: false});
        CodeMirror.on(range, "beforeCursorEnter", function() {
          var fromTo = range.find();
          console.log("beforeCursorEnter", fromTo, range);
          range.clear();
          unrenderedMath = doc.markText(fromTo.from, fromTo.to);
        });
      }
    });
  }

  /* TODO: multi line $...$. Needs an approach similar to overlay modes. */
  function processLine(lineHandle) {
    var text = lineHandle.text;
    var line = doc.getLineNumber(lineHandle);
    console.log("processLine", line, text);

    var formula = /\$.+?\${1,2}/g; /* TODO: tighten, \(..\) & \[..\] */
    var match;
    while((match = formula.exec(text)) != null) {
      var fromCh = match.index;
      var toCh = fromCh + match[0].length;
      processMath({line: line, ch: fromCh}, {line: line, ch: toCh});
    }
  }

  /* Documents don't batch "change" events, so should never have .next. */
  CodeMirror.on(doc, "change", function processChange(doc, changeObj) {
    console.log("change", changeObj);
    window.ccc = changeObj;
    /* changeObj.{from,to} are pre-change coordinates; adding text.length
       (number of inserted lines) is a conservative(?) fix. */
    doc.eachLine(changeObj.from.line,
                 changeObj.to.line + changeObj.text.length + 1,
                 processLine);
    if("next" in changeObj) {
      alert("next");
      processChange(changeObj.next);
    }
  });

  editor.on("cursorActivity", function(doc) {
    /* TODO: selection behavior? */
    var cursor = doc.getCursor();
    if (unrenderedMath == null) {
      return;
    }
    var range = unrenderedMath.find();
    console.log("cursorActivity", cursor, range.from, range.to);
    if(posCmp(range.from, cursor) > 0 && posCmp(cursor, range.to) > 0) {
      return;
    }
    processMath(range.from, range.to);
    unrenderedMath = null;
  });

  doc.eachLine(processLine);
}
