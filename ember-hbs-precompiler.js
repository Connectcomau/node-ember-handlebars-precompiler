// ported from https://github.com/Connectcomau/node-handlebars-precompiler

var fs = require('fs');
var file = require('file');
var handlebars = require('handlebars');
var basename = require('path').basename;
var uglify = require('uglify-js');

function check_files(opts) {
	(function(opts) {
		if ( ! opts.templates.length) {
			throw 'Must define at least one template or directory.';
		}

		opts.templates.forEach(function(template) {
			try {
				fs.statSync(template);
			} 
			catch (err) {
				throw 'Unable to open template file "' + template + '"';
			}
		});
	}(opts));	
}

function do_precompile(opts) {
	//check all files first
	check_files(opts);

	var template = opts.templates[0];
	var output = [];
	output.push('(function() {\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n');

	function processTemplate(template, root) {
		var stat = fs.statSync(template);

		// make the filename regex user-overridable
		var fileRegex = /\.handlebars$/;
		if (opts.fileRegex) fileRegex = opts.fileRegex;
		
		if (stat.isDirectory()) {
			fs.readdirSync(template).map(function(file) {
				var path = template + '/' + file;

				if (fileRegex.test(path) || fs.statSync(path).isDirectory()) {
					processTemplate(path, root || template);
				}
			});
		} else {
			var data = fs.readFileSync(template, 'utf8');

			// Clean the template name
			if ( ! root) {
				template = basename(template);
			} 
			else if (template.indexOf(root) === 0) {
				template = template.substring(root.length+1);
			}

			template = template.replace(fileRegex, '');
			output.push('templates[\'' + template + '\'] = template(' + handlebars.precompile(data) + ');\n');
		}
	}

	opts.templates.forEach(function(template) {
		processTemplate(template, opts.root);
	});

	// Output the content
	output.push('})();');
	output = output.join('');

	if (opts.min) {
		var ast = uglify.parser.parse(output);
		ast = uglify.uglify.ast_mangle(ast);
		ast = uglify.uglify.ast_squeeze(ast);
		output = uglify.uglify.gen_code(ast);
	}

	if (opts.output) fs.writeFileSync(opts.output, output, 'utf8');

	console.log('[compiled] ' + opts.output);

	return output;
}

function compile(opts) {
	var regex = /\.handlebars$/;
	if (opts.extensions) regex = new RegExp('\.' + opts.extensions.join('$|\.') + '$');

	return do_precompile({
		templates: [opts.src],
		output: opts.dest,
		fileRegex: regex,
		min: opts.minify
	});
}

function watch_dir(opts) {
	var regex = /\.handlebars$/;
	if (opts.extensions) regex = new RegExp('\.' + opts.extensions.join('$|\.') + '$');
	
	function compile_on_change(event, filename) {
		console.log('[' + event + '] detected in ' + (filename ? filename : '[filename not supported]'));
		compile(opts);
	}

	if (opts.compile_first) compile(opts);

	console.log('[watching] ' + opts.src);

	file.walk(opts.src, function(_, dirPath, dirs, files) {
		if ( ! files) throw 'No files to watch...'

		for(var i = 0; i < files.length; i++) {
			if (regex.test(files[i])) {
				fs.watch(files[i], compile_on_change);
			}
		}
	});
}

exports.compile = compile
exports.watch_dir = watch_dir