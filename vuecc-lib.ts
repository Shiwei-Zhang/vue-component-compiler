/*
	Vue component compiler.
	Unoffical "compiler" for Vue.js components written in a class-based style.

	Copyright 2015 Sam Saint-Pettersen.

	Released under the MIT License.
*/

/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/line-reader/line-reader.d.ts" />
/// <reference path="typings/chalk/chalk.d.ts" />

import fs = require('fs');
import lr = require('line-reader');
import cp = require('child_process');
import chalk = require('chalk');

class VueComponentCompiler {

	private version: string;
	private colors: boolean;
	private input: string;
	private output: string;
	private type: string;

	/**
	 * Print an error message.
	 * @param message Error message to print.
	*/
	private printError(message: string): void {
		if (this.colors) {
			console.log(chalk.bold.red(message));
		}
		else console.log(message);
	}

	/**
	 * Print an information message.
	 * @param message Informatiom message to print.
	*/
	private printInfo(message: string): void {
		if (this.colors) {
			console.log(chalk.gray(message));
		}
		else console.log(message);
	}

	/**
	 * Highlight some text.
	 * @param text Text to highlight.
	 * @returns Hilighted text.
	*/
	private hilight(text: string): any {
		if (this.colors) {
			return chalk.yellow(text);
		}
		return text;
	}

	/**
 	 * Some text to embolden.
 	 * @param text Text to embolden.
 	 * @returns Bold text.
	*/
    private embolden(text: string): any {
        if (this.colors) {
            return chalk.bold.white(text);
        }
        return text;
    }
	
	/**
	 * Display help information and exit.
	*/
	private displayHelp(): void {
		this.printInfo('Utility to compile class-based Vue components.');
		this.printInfo(`Copyright 2015 Sam Saint-Pettersen ${this.hilight('[MIT License].')}`)
		console.log(`\nUsage: ${this.embolden('vuecc')} input --> output [-ts|-js][-h|--help|-v|--version]`);
		console.log('\n input          : Class-based component as input (e.g. component.vue.ts)');
		console.log(' output         : new Vue() formatted component as output (e.g. component.ts)');
		console.log(' -h | --help    : Display this usage information and exit.');
        console.log(' -v | --version : Display application version and exit.');
	}

	/**
	 * Display version and exit.
    */
    private displayVersion(): void {
        this.printInfo('vuecc v. ' + this.version);
        process.exit(0);
    }


    private compile(): void {

		var in_method: boolean = false;
		var in_data: boolean = false;
		var c_method: string = null;
		var className: string = null
		var el: string = null;
		var data = new Array<string>();
		var methods = new Array<string>();
		var signatures = new Array<string>();
		var methodsImpl = new Array<string>();
		var signatures = new Array<string>();
		var lines = new Array<string>();

    	lr.eachLine(this.input, function(line: string, last: boolean) {

			if (!in_method && !in_data) {
				var m = line.match(/class\s(.*)\sextends\sVueComponent/);
				if (m != null) className = m[1];
				m = line.match(/el\:\s(.*)\,/);
				if (m != null) el = m[1];
				m = line.match(/(?:public|private|protected)\s(.*)\((.*)\)/);
				if (m != null) {
					methods.push(m[1]);
					if (m[2] != null) signatures.push(m[2]);
					else this.signatures.push('');
					c_method = m[1];
					in_method = true;
				}
				m = line.match(/data\:\s\{/);
				if (m != null) in_data = true;
			}
			else if(in_method) {
				m = line.match(/(\}\/{2})/);
				if (m != null) in_method = false;
				m = line.match(/(.*)/);
				if (m != null) {
					methodsImpl.push(c_method + '-->' + m[1]);
				}
			}
			else if(in_data) {
				m = line.match(/(\}\/{2})/);
				if (m != null) in_data = false;
				m = line.match(/(.*)/);
				if (m != null) {
					data.push(m[1]);
				}
			}

			if(last) {
				lines.push('// ********************************************************************');
				lines.push('// ' + className);
				lines.push('// Generated at ' + new Date().toISOString() + ' by VueComponent compiler.');
				lines.push('// DO NOT EDIT THIS FILE.')
				lines.push(lines[0]);
				lines.push('/// <reference path="typings/vue/vue.d.ts" />\n');
				lines.push('window.onload = function() {')
				lines.push('\tnew Vue({');
				lines.push('\t\tel: ' + el + ',');
				lines.push('\t\tdata: {');
				data.map(function(datum) {
					datum = datum.replace('}//', '\t//');
					lines.push(datum);
				})
				lines.push('\t\t},');
				lines.push('\t\tready: function() {');
				methodsImpl.map(function(impl) {
					if (impl.indexOf(methods[0] + '-->') != -1) {
						impl = impl.replace('}//', '\t//');
						var fl = impl.split('-->');
						if (fl[1].length > 0) lines.push('\t' + fl[1]);
					}
				});
				lines.push('\t\t},');
				lines.push('\t\tmethods: {');
				methods.splice(0, 1);
				signatures.splice(0, 1);
				for (var i = 0; i < methods.length; i++) {
					lines.push('\t\t\t' + methods[i] + ': function(' + signatures[i] + ') {');
					methodsImpl.map(function(impl) {
						if (impl.indexOf(methods[i] + '-->') != -1) {
							impl = impl.replace('}//', '\t//');
							var fl = impl.split('-->');
							if (fl[1].length > 0) lines.push('\t\t' + fl[1]);
						}
					});
					if (i < methods.length - 1) lines.push('\t\t\t},')
					else lines.push('\t\t\t}');
				}
				lines.push('\t\t}');
				lines.push('\t});\n};\n')
				fs.writeFileSync(process.argv[3], lines.join('\n'));
				return false;
			}
    	});
    }

    /**
     * VueComponentCompiler implements functionality of vuecc program.
     * @constructor
     * @param input Class-based component to compile.
     * @param output new Vue() formatted component.
    */
	constructor(input: string, output: string, type: string) {

		this.version = '0.1';
		this.colors = true;
		this.input = input;
		this.output = output;
		this.type = type;

		if(input == '-h' || input == '--help') {
			this.displayHelp();
			process.exit(0);
		}
		else if(input == '-v' || input == '--version') {
			this.displayVersion();
		}
		if(input == null || input.charAt(0) == '-') {
			this.printError('Please specify a valid input file.\n');
			this.displayHelp();
			process.exit(1);
		}
		else if(output == null || output.charAt(0) == '-') {
			this.printError('Please specify a valid output file.\n');
			this.displayHelp();
			process.exit(1);
		}
		this.printInfo(`Compiling VueComponent: ${this.embolden(output)}`);
		this.compile();
	}
}
export = VueComponentCompiler;
