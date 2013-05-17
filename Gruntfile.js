module.exports = function(grunt) {
  grunt.initConfig({
    meta: {
      package: grunt.file.readJSON('package.json'),
      src: {
        bower_dir: 'third_party'
      }
    },
    bower: {
      install: {
        options: {
          cleanup: true,
          layout: 'byComponent',
          targetDir: '<%= meta.src.bower_dir %>'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-task');

  grunt.registerTask('init', ['bower:install']);
};