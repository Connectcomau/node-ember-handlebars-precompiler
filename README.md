## Precompile Ember.js Template directories

This is how you might use it in an Express project.

```javascript
app.configure('development', function(){
  require('./lib/ember-precompiler').compile({
  	handlebars: __dirname + '/public/javascripts/handlebars-1.0.0.rc.3.js', //required if you use ember > 1.0
  	emberjs: __dirname + '/public/javascripts/ember-1.0.0-rc.1.js.js',
    src: __dirname + '/views', 
    dest: __dirname + '/public/javascripts/templates.js',
    extensions: ['handlebars', 'hbs'],
    minify: true, //run result through uglify-js
    watch: true, //recompile on file changes
    template_name: function(t) { return t.replace(/\//, '-'); } //callback to modify the template names
  });
});
```

In this example, we watch for changes to `*.handlebars` and `*.hbs` files in our views directory.
When changes are made, precompilation is run on all Handlebars templates and exported to a single minified
Javascript file.

On the browser side, you will have to include ember.js before the templates file.

Client-side versions of the templates will be named and stored in the `Ember.TEMPLATES` object according to their file paths,
e.g. `Ember.TEMPLATES['users/show']` you can change the template name using the `template_name` option above


### NOTE

Current version of ember 1.0 rc1 has some code which breaks when run in a vm context. To have this work you need to look for this which is duplicated twice in the file and add in the check to see if childNodes exists otherwise it just throws.

```// IE 8 (and likely earlier) likes to move whitespace preceeding
// a script tag to appear after it. This means that we can
// accidentally remove whitespace when updating a morph.
movesWhitespace = (function() {
  var testEl = document.createElement('div');
  testEl.innerHTML = "Test: <script type='text/x-placeholder'></script>Value";
  if ( ! testEl.childNodes) return false;
  return testEl.childNodes[0].nodeValue === 'Test:' &&
          testEl.childNodes[2].nodeValue === ' Value';
})();
```


### WARNING 

This uses unstable Node.js features, it may not work for you, read this: http://nodejs.org/api/vm.html

