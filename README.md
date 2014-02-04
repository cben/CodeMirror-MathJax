# Attempt at CodeMirror + in-place MathJax

Experimenting to replace $math$ with formulas in CodeMirror.
Buggy and work-in-progress...

## Demo

- CodeMirror v3: http://cben.github.io/CodeMirror-MathJax/demo.html
- CodeMirror v4: http://cben.github.io/CodeMirror-MathJax/demo-v4.html

If you just want to use this for writing, check out [mathdown.net](http://mathdown.net).

## Git trivia

After checking out, run this to materialize CodeMirror subdir:

    git submodule update --init

I'm directly working in `gh-pages` branch without a `master` branch,
as that's the simplest thing that could possibly work;
http://oli.jp/2011/github-pages-workflow/ lists several alternatives.

TODO: learn about bower or other ways to manage local vs online deps.

TODO: jquery as submodule won't work because it contains no directly usable .js 
file and having to build it would interfere with running from github pages 
directly (http://stackoverflow.com/q/13520870).
