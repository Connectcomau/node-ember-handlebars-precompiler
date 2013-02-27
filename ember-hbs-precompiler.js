// ported from https://github.com/Connectcomau/node-handlebars-precompiler
// incorporating this https://gist.github.com/2013669

var fs = require('fs');
var vm = require('vm');
var file = require('file');
var basename = require('path').basename;
var uglify = require('uglify-js');
var watcher = require('node-watch');

function check_files(opts) {
	try { fs.statSync(opts.src); } 
	catch (err) { throw 'Unable to open src: "' + opts.src + '"'; }
	try { fs.statSync(opts.emberjs); } 
	catch (err) { throw 'Unable to open emberjs: "' + opts.emberjs + '"'; }
}

function process_template(template, root, opts, output) {
	var stat = fs.statSync(template);

	if (stat.isDirectory()) {
		fs.readdirSync(template).map(function(file) {
			var path = template + '/' + file;

			if (opts.file_regex.test(path) || fs.statSync(path).isDirectory()) {
				process_template(path, root || template, opts, output);
			}
		});
	} else {
		var data = fs.readFileSync(template, 'utf8');

		// set the template name
		if ( ! root) template = basename(template);
		else if (template.indexOf(root) === 0) template = template.substring(root.length+1);

		template = template.replace(opts.file_regex, '');
		if (typeof(opts.template_name) === 'function') template = opts.template_name(template);

		// set up the vm context
		//dummy jQuery
		var jQuery = function() { return jQuery; };
		jQuery.ready = function() { return jQuery; };
		jQuery.inArray = function() { return jQuery; };
		jQuery.jquery = "1.9.1";
		jQuery.event = { fixHooks: {} };

		//dummy DOM element
		var element = {
			firstChild: function () { return element; },
			innerHTML: function () { return element; }
		};

		var sandbox = {
			// DOM
			document: {
				createRange: false,
				createElement: function() { return element; }
			},

			// Console
			console: console,

			// jQuery
			jQuery: jQuery,
			$: jQuery,

			// handlebars template to compile
			template: data,

			// compiled handlebars template
			templatejs: null
		};

		// window
		sandbox.window = sandbox;

		// create a context for the vm using the sandbox data
		var context = vm.createContext(sandbox);

		// load Ember into the sandbox
		if (opts.handlebars_data) vm.runInContext(opts.handlebars_data, context, 'handlebars.js');
		vm.runInContext(opts.emberjs_data, context, 'ember.js');

		//compile the handlebars template inside the vm context
		vm.runInContext('templatejs = Ember.Handlebars.precompile(template).toString();', context);

		output.push('\ntemplates[\'' + template + '\'] = template(' + context.templatejs + ');\n');
	}
}

function do_precompile(opts) {
	//check all files first
	check_files(opts);

	// cache a copy of the emberjs data
	if (opts.handlebars) opts.handlebars_data = fs.readFileSync(opts.handlebars, 'utf8');
	opts.emberjs_data = fs.readFileSync(opts.emberjs, 'utf8');
	var output = [];
	output.push('(function() {\n  var template = Ember.Handlebars.template, templates = Ember.TEMPLATES = Ember.TEMPLATES || {};\n');

	process_template(opts.src, null, opts, output);

	// Output the content
	output.push('})();');
	output = output.join('');

	if (opts.minify) {
		var ast = uglify.parser.parse(output);
		ast = uglify.uglify.ast_mangle(ast);
		ast = uglify.uglify.ast_squeeze(ast);
		output = uglify.uglify.gen_code(ast);
	}

	if (opts.dest) fs.writeFileSync(opts.dest, output, 'utf8');

	console.log('[compiled] ' + opts.dest);

	return output;
}

function compile(opts) {
	opts.file_regex = /\.handlebars$/;
	if (opts.extensions) opts.file_regex = new RegExp('\\.' + opts.extensions.join('$|\\.') + '$');

	var result = null;
	if ( ! opts.ignore_load) result = do_precompile(opts);

	function compile_on_change(filename) {
		console.log('change detected in ' + (filename ? filename : '[filename not supported]'));
		do_precompile(opts);
	}

	if (opts.watch) {
		console.log('[watching] ' + opts.src);
		watcher(opts.src, compile_on_change);
	}

	return result;
}

module.exports.compile = compile;

