module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            deploy: {
                src: 'rubberband/*',
                dest: '/Program Files (x86)/Steam/SteamApps/common/Construct2/Construct2-Win64/exporters/html5/behaviors/'
            },
            build: {
                src: 'rubberband/*',
                dest: 'build/files/'
            },
            backup: {
                src: ['*', '.git/*'],
                dest: process.env.USERPROFILE+'/SkyDrive/Backup/Construct 2/Rubber Band/',
            }
        },
        zip: {
            'using-cwd': {
                cwd: 'build/',
                src: ['build/info.xml', 'build/files/**/*'],
                dest: 'RubberBand.c2addon'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('default', ['deploy']);

    grunt.registerTask('d', ['deploy']);
    grunt.registerTask('deploy', ['copy:deploy']);

    grunt.registerTask('clean', function() {
        grunt.file.delete('build');
        grunt.file.mkdir('build');
    });

    grunt.registerTask('prepareAddon', function() {
        var template = grunt.file.read('resources/info.templ');
        var text = grunt.template.process(template, {pkg: grunt.pkg});
        grunt.file.write('build/info.xml', text);
    });

    grunt.registerTask('b', ['build']);
    grunt.registerTask('build', ['buildAddon']);
    grunt.registerTask('buildAddon', ['clean', 'prepareAddon', 'copy:build', 'zip', 'clean']);

    grunt.registerTask('backup', ['copy:backup']);
};
