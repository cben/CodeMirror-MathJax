# UPDATE: See the more mature https://github.com/SamyPesse/codemirror-widgets

codemirror-widgets powers [GitBook's new desktop editor](https://www.gitbook.com/blog/releases/editor-5-beta),
is abstracted to supports rendering in-place various things (math, links, images),
and seems generally well structured.

I haven't carefully reviewed codemirror-widgets yet, but I'll probably abandon this project in favor of improving codemirror-widgets, and switch [mathdown](https://github.com/cben/mathdown) to it too.

# Attempt at CodeMirror + in-place MathJax

Experimenting to replace $math$ (and related LaTeX syntaxes) with formulas in CodeMirror.
Buggy and work-in-progress...

Mostly tested with CodeMirror 4.x, 5.x versions but probably works with 3.x too.

Performance is currently OK with MathJax 2.4, horribly slow with 2.5 or 2.6.  Working on it...

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

TODO: learn about bower or other ways to manage local vs online deps.
