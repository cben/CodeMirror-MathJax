# Attempt at CodeMirror + in-place MathJax

Experimenting to replace $math$ with formulas in CodeMirror.
Buggy and work-in-progress...

**Demo**: http://cben.github.io/CodeMirror-MathJax/demo.html

## Git trivia

After checking out, run this to materialize CodeMirror subdir:

    git submodule init; git submodule update

I'm directly working in `gh-pages` branch without a `master` branch,
as that's the simplest thing that could possibly work;
http://oli.jp/2011/github-pages-workflow/ lists several alternatives.

TODO: learn about bower or other ways to manage local vs online deps.
