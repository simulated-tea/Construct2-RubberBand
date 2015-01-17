module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            deploy: {
                src: 'rubberband/*',
                dest: '/Program Files (x86)/Steam/SteamApps/common/Construct2/Construct2-Win64/exporters/html5/behaviors/'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['deploy']);
    grunt.registerTask('deploy', ['copy:deploy']);
};
