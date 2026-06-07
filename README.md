# CodeMirror 5.x + in-place MathJax 2.x

Experimenting to replace `$math$` (and related LaTeX syntaxes) with rendered formulas in CodeMirror 5.
See open issues, has known bugs!

> ⚠ Not _fully_ abandoned, but close to it, I barely touched this in a decade ⚠

## Demo

http://cben.github.io/CodeMirror-MathJax/demo.html

If you just want to use this for writing, check out [mathdown.net](http://mathdown.net) powered by https://github.com/cben/mathdown.

## UNSTABLE API

I'm currently changing the API at will.
If you want to use this for anything do contact me <beni.cherniavsky@gmail.com> — I'll be glad to help.

## Git trivia

After checking out, run this to materialize CodeMirror subdir:

    git submodule update --init

I'm directly working in `gh-pages` branch without a `master` branch,
as that's the simplest thing that could possibly work;
http://oli.jp/2011/github-pages-workflow/ lists several alternatives.

TODO: learn about ~~bower~~ publishing frontend code to npm

----

# Alternatives

## CodeMirror 5.x: the more mature https://github.com/SamyPesse/codemirror-widgets ?

codemirror-widgets powered [GitBook's 2016 desktop editor beta](https://web.archive.org/web/20160404071819/https://www.gitbook.com/blog/releases/editor-5-beta), dunno what happened later.

It's abstracted to supports rendering in-place various things (math, links, images), and seems generally well structured.  
IIRC it was more systematic in some ways (e.g. multi-line formula support).  But it's been dormant since 2016 too.

## CodeMirror 6: Look at how Overleaf does it

https://Overleaf.com renders to PDF by real LaTeX, but can also render math in the editor, and is very battle-tested!

They've long been on CodeMirror 6, and in June 2026 [upgraded to MathJax 4](https://github.com/overleaf/overleaf/commits/757735b07518ffc157ae3b2abe8307beb14198a2/services/web/frontend/js/features/mathjax/load-mathjax.ts).

- in "Code" mode they render current formula as tooltip preview: https://github.com/overleaf/overleaf/blob/757735b07518ffc157ae3b2abe8307beb14198a2/services/web/frontend/js/features/source-editor/extensions/math-preview.ts#L115-L137
- in "Visual" mode they do a lot of inline styling of markdown + render all formulas. I think mostly implemented here: https://github.com/overleaf/overleaf/blob/757735b07518ffc157ae3b2abe8307beb14198a2/services/web/frontend/js/features/source-editor/extensions/visual/atomic-decorations.ts  
  (CM 5 API had "widgets"; CM 6 has "decorations" that may `replace` text + ability to mark ranges as "atomic" for cursor movement)
