#!/usr/bin/env node

const fs = require('fs');
const path = require('path'); 
const version = "1.0.0";
const font = require('chalk');

let yargs = require('yargs')
	.strict()

	.usage('RexReplace '+version+': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n> rexreplace searchFor replaceWith filename')

	.example("> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md", "'foobar' in myfile.md will become 'barfoo'")
		.example('')
		.example("> rexreplace -I 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will remain 'foobar'")
		
	.version('v', 'Echo rexreplace version', version)
		.alias('v', 'version')

	.boolean('I')
		.describe('I', 'Void case insensitive search pattern.')
		.alias('I', 'void-ignore-case')

	.boolean('M')
		.describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
		.alias('M', 'void-multiline')

	.boolean('u')
		.describe('u', 'Treat pattern as a sequence of unicode code points.')
		.alias('u', 'unicode')

	.describe('e', 'Encoding of files.')
		.alias('e', 'encoding')
		.default('e', 'utf8')

	.boolean('o')
		.describe('o', 'Output the result instead of saving to file. Will also output content even if no replacement have taken place.')
		.alias('o', 'output')
		//.conflicts('o', 'd')

	.boolean('q')
		.describe('q', "Only display erros (no other info)")
		.alias('q', 'quiet')

	.boolean('Q')
		.describe('Q', "Never display erros or info")
		.alias('Q', 'quiet-total')

	.boolean('H')
		.describe('H', "Halt on first error")
		.alias('H', 'halt')
		.default('H', false)

	.boolean('d')
		.describe('d', "Print debug info")
		.alias('d', 'debug')

	.boolean('€')
		.describe('€', "Replace all '€' with '$' in pattern and replace string. Usefull when your commandline (bash/zsh/...) seeks to do interesting things with '$'")
		.alias('€', 'eurodollar')

	/* // Ideas

	.boolean('n')
		.describe('n', "Do replacement on file names instead of file content (rename the files)")
		.alias('n', 'name')


	.boolean('€')
		.describe('€', "Stop replacing '€' with '$' in pattern and replacement")
		.alias('€', 'void-euro')

	.boolean('d')
		.describe('d', 'Dump matches as json output')
		.alias('d', 'dump')


	.boolean('v')
		.describe('v', "More chatty output")
		.alias('v', 'verbose')


	.boolean('n')
		.describe('n', "Do replacement on file names instead of file content (rename the files)")
		.alias('n', 'name')
	*/

	.help('h')
		.alias('h', 'help')

	.epilog('What "sed" should have been...')
	
;

const args = yargs.argv;

debug(args);	

if(args._.length<3){
	die('Need more than 2 arguments',args._.length+' was found',true);
}

if(args['€']){
	args._[0] = args._[0].replace('€','$');
	args._[1] = args._[1].replace('€','$');
}

let flags = 'g';
if(!args['void-ignore-case']){
	flags += 'i';
}
if(!args['void-multiline']){
	flags += 'm';
}
if(args.unicode){
	flags += 'u';
}

debug(flags);

// Get regex pattern
let regex = args._.shift();
try{
	regex = new RegExp(regex,flags);
} catch (err){
	die('Wrong formatted regexp', regex);
}

// Get replacement
const replace = args._.shift();

// The rest are files
const files = args._;

files
	// Correct filepath
	.map(filepath=>path.normalize(process.cwd()+'/'+filepath))
	
	// Find out if any filepaths are invalid
	.filter(filepath=>fs.existsSync(filepath)?true:error('File not found:',filepath))

	// Do the replacement 
	.forEach(filepath=>replaceInFile(filepath,regex,replace,args.encoding))
;


function replaceInFile(file,regex,replace,encoding){
	fs.readFile(file, encoding, function (err,data) {
		if (err) {
			return error(err);
		}
		debug('About to replace in: '+file);
		const result = data.replace(regex, replace);

		if(args.output){
			debug('Outputting result from: '+file);
			return process.stdout.write(result);
		}

		// Nothing replaced = no need for writing file again 
		if(result === data){
			debug('Nothing changed in: '+file);
			return;
		}

		debug('About to write to: '+file);
		fs.writeFile(file, result, encoding, function (err) {
			if (err){
				return error(err);
			}
			info(file);
		});
	});
}

function info(msg, data=''){
	if(args.quiet || args['quiet-total']){
		return;
	}
	console.log(font.green(msg), data);	
}

function die(msg, data='', displayHelp=false){
	if(displayHelp){
		yargs.showHelp();
	}
	error(msg, data);
	kill();
}

function error(msg, data=''){
	if(!args.quiet && !args['quiet-total']){
		console.error(font.red(msg), data);
	}
	if(args.halt){
		kill();
	}
	return false;
}

function debug(data){
	if(args.debug){
		console.log(font.gray(JSON.stringify(data, null,4)));
	}
}

function kill(error=1){
	setTimeout(()=>process.exit(error),10); // give stdout a bit of time to finish	
}


