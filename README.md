# Attempt at CodeMirror + in-place MathJax

Experimenting to replace $math$ (and related LaTeX syntaxes) with formulas in CodeMirror.
Buggy and work-in-progress...

Mostly tested with recend CodeMirror 4.x versions but probably works with any 3.x too (open a bug if not). 

## Demo

http://cben.github.io/CodeMirror-MathJax/demo.html

If you just want to use this for writing, check out [mathdown.net](http://mathdown.net) powered by https://github.com/cben/mathdown.

## Git trivia

After checking out, run this to materialize CodeMirror subdir:

    git submodule update --init

I'm directly working in `gh-pages` branch without a `master` branch,
as that's the simplest thing that could possibly work;
http://oli.jp/2011/github-pages-workflow/ lists several alternatives.

TODO: learn about bower or other ways to manage local vs online deps.
