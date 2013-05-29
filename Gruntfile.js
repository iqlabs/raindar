module.exports = function(grunt) {
  grunt.initConfig({
    meta: {
      package: grunt.file.readJSON('package.json'),
      src: {
        bower_dir: 'third_party',
        css_dir: 'css',
        javascript_dir: 'js',
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
          baseUrl: '<%= meta.src.javascript_dir %>',
          mainConfigFile: '<%= meta.src.javascript_dir %>/raindar.js',
          dir: '<%= meta.src.build_dir %>',
          fileExclusionRegExp: /^\.|node_modules|Gruntfile\.js|bower\.json|package\.json|sublime/,
          paths: {
            OpenLayers: 'empty:',
            requireLib: '../<%= meta.src.bower_dir %>/requirejs/require'
          },
          removeCombined: true,
          modules: [
            {
              name: 'raindar',
              include: 'requireLib'
            }
          ]
        }
      }
    },
    less: {
      development: {
        options: {
          paths: ['css/'],
          dumpLineNumbers: 'all'
        },
        files: {
          'raindar.css': '<%= meta.src.css_dir %>/**/*'
        }
      },
      production: {
        options: {
          yuicompress: true
        },
        files: {
          '<%= meta.src.build_dir %>/raindar.css': '<%= meta.src.css_dir %>/**/*'
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
    },
    watch: {
      files: 'css/*',
      tasks: ['less:development']
    }
  });

  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-preprocess');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');


  grunt.registerTask('copy_to_build', function() {
    var build_dir = grunt.config('meta.src.build_dir');
    grunt.file.expand(['assets/**/*']).forEach(function(src) {
      if (grunt.file.isDir(src)) {
        grunt.file.mkdir(build_dir + '/' + src);
      }
      else {
        grunt.file.copy(src, build_dir + '/' + src);
      }
    });
    grunt.file.copy('index.html', build_dir + '/index.html');
  });

  grunt.registerTask('remove_from_build', function() {
    var build_dir = grunt.config('meta.src.build_dir');
    grunt.file.delete(build_dir + '/build.txt');
    grunt.file.delete(build_dir + '/raindar.css');
    grunt.file.delete(build_dir + '/raindar.js');
  });

  grunt.registerTask('init', ['bower:install']);
  grunt.registerTask('build', ['requirejs:compile', 'less:production', 'copy_to_build', 'preprocess', 'remove_from_build']);
};