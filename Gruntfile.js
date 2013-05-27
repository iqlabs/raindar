module.exports = function(grunt) {
  grunt.initConfig({
    meta: {
      package: grunt.file.readJSON('package.json'),
      src: {
        bower_dir: 'third_party',
        build_dir: 'build'
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
    },
    requirejs: {
      compile: {
        options: {
          mainConfigFile: 'raindar.js',
          dir: '<%= meta.src.build_dir %>',
          fileExclusionRegExp: /^\.|node_modules|Gruntfile\.js|bower\.json|package\.json|sublime/,
          paths: {
            OpenLayers: 'empty:',
            requireLib: 'third_party/requirejs/require'
          },
          removeCombined: true,
          optimizeCss: "standard",
          modules: [
            {
              name: 'raindar',
              include: 'requireLib'
            }
          ]
        }
      }
    },
    preprocess: {
      options: {
        inline: true,
        context: {
          NODE_ENV: 'production'
        }
      },
      html: {
        src: '<%= meta.src.build_dir %>/index.html'
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-preprocess');

  grunt.registerTask('remove_from_build', function() {
    var build_dir = grunt.config('meta.src.build_dir');
    grunt.file.delete(build_dir + '/third_party');
    grunt.file.delete(build_dir + '/build.txt');
    grunt.file.delete(build_dir + '/raindar.css');
    grunt.file.delete(build_dir + '/raindar.js');
  });

  grunt.registerTask('init', ['bower:install']);
  grunt.registerTask('build', ['requirejs:compile', 'preprocess', 'remove_from_build']);
};