module.exports = function(grunt) {
	const excludes = ["Gruntfile.js"];

	let pkg = grunt.file.readJSON('package.json');
	let manifest = grunt.file.readJSON('manifest.json');

	var fileList = [];
	fileList.push("manifest.json");
	fileList.push("*.js");
	for (var i in manifest.icons) {
		fileList.push(manifest.icons[i]);
	}
	fileList.push(manifest.options_page);
	fileList = fileList.concat(manifest.background.scripts);
	manifest.content_scripts.forEach(content_script => fileList = fileList.concat(content_script.js));
	fileList = fileList.concat(manifest.web_accessible_resources);

	function includeModule(name) {
		fileList.push(`node_modules/${name}/*`);
		let pkg = grunt.file.readJSON(`node_modules/${name}/package.json`);
		if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(m => includeModule(m));
	}

	if (pkg.dependencies) Object.keys(pkg.dependencies).forEach(m => includeModule(m));

	fileList = fileList.filter(file => !(file in excludes));

	grunt.initConfig({
		zip: {
			dest: {
				router: function(filepath) {
					if (excludes.indexOf(filepath) != -1) {
						return null;
					}
					return filepath;
				},
				src: fileList,
				dest: "Plurk-Mute_v2.zip"
			}
		}
	});

	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('default', ['zip']);

};