# Precompile Ember.js Template directories

WARNING: This uses unstable Node.js features, it may not work for you, read this: http://nodejs.org/api/vm.html

This is how you might use it in an Express project.

```javascript
app.configure('development', function(){
  require('./lib/ember-precompiler').compile({
  	handlebars: __dirname + '/public/javascripts/handlebars-1.0.rc.1.js', //optional as it is no longer included with ember > 1.0
  	emberjs: __dirname + '/public/javascripts/ember-0.9.8.1.min.js',
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