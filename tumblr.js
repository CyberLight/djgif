( function ( window ) {
  var $ = function ( selector, context ) {
    return ( context || document ).querySelector( selector );
  },

  Tumblr = {
    // toolmantim/gifcity Tumblr app
    apiKey: 'DjfvFbmCVQB3yHER0TMUB2ndguw5wqeNDv7ywyMipM9ZQpEtYn',
    changeImageDelay: 10000,
    requestDelay: 5000,
    offsetIncrement: 20,
    imageHolder: $( '#image-holder' ),
    requestCallbacks: {},

    url: function ( blog ) {
      return 'http://api.tumblr.com/v2' +
             '/blog/' + blog.name + '.tumblr.com/posts?' +
             'api_key=' + Tumblr.apiKey +
             '&offset=' + blog.offset +
             ( blog.tag.length ? '&tag=' + blog.tag : '' ) +
             '&callback=Tumblr.response';
    },

    init: function ( names ) {
      Tumblr.blogs = Tumblr.initBlogs( names );

      Tumblr.changeImage();
      Tumblr.initKeyboard();
      Tumblr.refreshBlogs();
    },

    initKeyboard: function () {
      key( 'x', function () {
        Tumblr.purgeCurrentImage();
        Tumblr.changeImage();
      } );

      key( 'n', function () {
        Tumblr.changeImage();
      } );

      key( 'f', function() {
        Tumblr.toggleFullscreen();
      });
    },

    initBlogs: function ( names ) {
      return names.map ( function ( name ) {
        var blog = Tumblr.storage.get( name );
        var segments = name.split( '#' );

        return blog || {
          name:   segments[0],
          tag:    segments[1] || '',
          offset: 0,
          gifs:   []
        };
      } );
    },

    refreshBlogs: function () {
      async.forEach( Tumblr.blogs, Tumblr.request, function ( error ) {
        setTimeout( Tumblr.refreshBlogs, Tumblr.requestDelay );
      } );
    },

    request: function ( blog, callback ) {
      Tumblr.requestCallbacks[blog.name] = [];
      Tumblr.requestCallbacks[blog.name].push( callback );

      var element = document.createElement( 'script' );
      element.setAttribute( 'src', Tumblr.url( blog ) );

      Tumblr.requestCallbacks[blog.name].push( function () {
        element.parentNode.removeChild( element );
      });

      document.documentElement.appendChild( element );
    },

    response: function ( json ) {
      if (!json.response.blog) return;

      var blog = Tumblr.blogs.find( function ( blog ) {
        return ( blog.name == json.response.blog.name );
      } );

      Tumblr.handleResponse( blog, json );

      var callbacks = Tumblr.requestCallbacks[blog.name];

      callbacks.forEach( function ( callback ) {
        callback( null, blog );
      });
    },

    handleResponse: function ( blog, json ) {
      if ( json.response.posts.length > 0 ) {
        var gifs = Tumblr.getGifs( json.response.posts );

        if ( gifs.length > 0 ) {
          blog.gifs = blog.gifs.concat( gifs );

          if ( Tumblr.gifCountChangedCallback ) {
            Tumblr.gifCountChangedCallback( blog );
          }
        }

        blog.offset += Tumblr.offsetIncrement;
        Tumblr.storage.set( blog );

        if ( !Tumblr.current ) { Tumblr.changeImage(); }
      }
    },

    getGifs: function ( posts ) {
      return posts.reduce( function( photos, post ) {
        switch ( post.type ) {
          case "photo":
            return photos.concat( Tumblr.extractGifsFromPostPhotos( post.photos ) );
          case "text":
            return photos.concat( Tumblr.extractGifsFromHtml( post.body ) );
          default:
            return photos;
        }
      }, [] );
    },

    extractGifsFromPostPhotos: function ( photos ) {
      var photoUrls = photos.map( function( photo ) {
        return photo.original_size.url;
      } );
      return photoUrls.filter( function( url ) {
        return url.match( /\.gif$/ );
      } );
    },

    extractGifsFromHtml: function ( html ) {
      return html.match( /http[^"]*?\.gif/g );
    },

    changeImage: function () {
      clearTimeout ( Tumblr.changeImageTimeoutId );

      var pairs = Tumblr.blogs.reduce( function ( memo, blog ) {
        return memo.concat( blog.gifs.map( function ( gif ) {
          return {blog: blog, gif: gif};
        } ) );
      }, [] );

      Tumblr.current = pairs[161]//.rand();

      if ( Tumblr.current ) {
        console.log(Tumblr.current.gif)
        Tumblr.current.gif = Tumblr.current.gif.replace(/^.*\.media\.tumblr\.com/, '');
        console.log(Tumblr.current.gif)
        var preload = new XMLHttpRequest();
        preload.open('GET', Tumblr.current.gif, true);
        preload.responseType = 'arraybuffer';

        preload.onload = function () {
          window.ajax  = this;
          var frames = 0, frameIndices = [];

          window.StreamReader = (function(arrayBuffer) {
            return {
              data: new Uint8Array(arrayBuffer),
              index: 0,
              readByte: function() {
                return this.data[this.index++];
              },
              peekByte: function () {
                return this.data[this.index];
              },
              skipBytes: function(n) {
                this.index += n;
              },
              peekBit: function(i) {
                return !!(this.peekByte() & (1 << 8-i));
              },
              readAscii: function(n) {
                var s = '';
                for (var i = 0; i < n; i++) {
                  s += String.fromCharCode(this.readByte());
                }
                return s;
              },
              isNext: function(array) {
                for (var i = 0; i < array.length; i++) {
                  if (array[i] !== this.data[this.index + i]) return false;
                }
                return true;
              },
              log: function(str) {
                console.log(this.index + ": " + str);
              },
              error: function (str) {
                console.error(this.index + ": " + str);
              }
            }
          })(this.response);

          StreamReader.log(StreamReader.readAscii(6));
          StreamReader.skipBytes(4); // Height & Width
          if (StreamReader.peekBit(1)) {
            StreamReader.log("GLOBAL COLOR TABLE")
            var colorTableSize = StreamReader.readByte() & 0x07;
            StreamReader.skipBytes(2);
            StreamReader.skipBytes(3 * Math.pow(2, colorTableSize + 1));
          } else {
            StreamReader.log("NO GLOBAL COLOR TABLE")
          }
          // WE HAVE ENOUGH FOR THE GIF HEADER!
          var gifHeader = this.response.slice(0, StreamReader.index);

          var spinning = true, expectingImage = false;
          while (spinning) {

            if (StreamReader.isNext([0x21, 0xFF])) {
              StreamReader.log("APPLICATION EXTENSION")
              StreamReader.skipBytes(2);
              var blockSize = StreamReader.readByte();
              StreamReader.log(StreamReader.readAscii(blockSize));

              if (StreamReader.isNext([0x03, 0x01])) {
                // we cool
                StreamReader.skipBytes(5)
              } else {
                StreamReader.log("A weird application extension. Skip until we have 2 NULL bytes");
                while (!(StreamReader.readByte() === 0 && StreamReader.peekByte() === 0));
                StreamReader.log("OK moving on")
                StreamReader.skipBytes(1);
              }
            } else if (StreamReader.isNext([0x21, 0xFE])) {
              StreamReader.log("COMMENT EXTENSION")
              StreamReader.skipBytes(2);

              while (!StreamReader.isNext([0x00])) {
                var blockSize = StreamReader.readByte();
                StreamReader.log(StreamReader.readAscii(blockSize));
              }
              StreamReader.skipBytes(1); //NULL terminator

            } else if (StreamReader.isNext([0x2c])) {
              StreamReader.log("IMAGE DESCRIPTOR!");
              if (!expectingImage) {
                // This is a bare image, not prefaced with a Graphics Control Extension
                // so we should treat it as a frame.
                frameIndices.push(StreamReader.index);
              }
              expectingImage = false;

              StreamReader.skipBytes(9);
              if (StreamReader.peekBit(1)) {
                StreamReader.error("LOCAL COLOR TABLE FFFUUUUU");
              } else {
                StreamReader.log("NO LOCAL TABLE PHEW");
                StreamReader.skipBytes(1);
              }

              StreamReader.log("MIN CODE SIZE " + StreamReader.readByte());
              StreamReader.log("DATA START");

              while (!StreamReader.isNext([0x00])) {
                var blockSize = StreamReader.readByte();
                StreamReader.skipBytes(blockSize);
              }
              StreamReader.log("DATA END");
              StreamReader.skipBytes(1); //NULL terminator
            } else if (StreamReader.isNext([0x21, 0xF9, 0x04])) {
              StreamReader.log("GRAPHICS CONTROL EXTENSION!");
              // We _definitely_ have a frame. Now we're expecting an image
              frameIndices.push(StreamReader.index);
              expectingImage = true;

              StreamReader.skipBytes(4);
              var delay = StreamReader.readByte() + StreamReader.readByte() * 256;
              StreamReader.log("FRAME DELAY " + delay);
              StreamReader.skipBytes(2);
            } else {
              spinning = false;
            }
          }
          frameIndices.push(StreamReader.index);
          console.log(frameIndices)

          var gifFooter = this.response.slice(-1), //last bit is all we need
            blobs = [];
          for (var i = 1; i < frameIndices.length; i++) {
            blobs.push(new Blob([ gifHeader, this.response.slice(frameIndices[i-1], frameIndices[i]), gifFooter ], {type : 'image/gif'}));
          }
          Tumblr.imageHolder.innerHTML = blobs.map(function (blob) {
            return "<img src='" + URL.createObjectURL(blob) + "' class='image-slide'>"
          }).join("\n") +
            "<img src='" + URL.createObjectURL(new Blob([this.response], {type : 'image/gif'})) + "' class='image'>";

          var slides = Tumblr.imageHolder.querySelectorAll('.image-slide');
//          Tumblr.imageHolder.innerHTML = "<img src='" + URL.createObjectURL(new Blob([this.response])) + "'>";

          window.slide = 0;
          window.changeSlide = function() {
            setTimeout(changeSlide, 100)

            var next = (slide + 1) % slides.length;
            slides[slide].className = "image-slide";
            slides[next].className = "image-slide is-visible";
            slide = next;
          }
          requestAnimationFrame(changeSlide);

//          Tumblr.imageHolder.innerHTML = "" +
//            "<img src='" + Tumblr.current.gif + "' class='left-image'>" +
//            "<img src='" + Tumblr.current.gif + "' class='image'>" +
//            "<img src='" + Tumblr.current.gif + "' class='right-image'>";
//          Tumblr.changeImageTimeoutId = setTimeout( Tumblr.changeImage, Tumblr.changeImageDelay );
        };

        preload.onerror = function () {
//          Tumblr.changeImageTimeoutId = setTimeout( Tumblr.changeImage, 0 );
        };

        preload.send();
      }
    },

    toggleFullscreen: function() {
      if (document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullscreenElement ||
          document.msFullscreenElement) {
        if (document.cancelFullScreen) document.cancelFullScreen();
        if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
        if (document.msCancelFullScreen) document.msCancelFullScreen();
      } else {
        var requestFullscreen =
          Tumblr.imageHolder.requestFullScreen ||
          Tumblr.imageHolder.mozRequestFullScreen ||
          Tumblr.imageHolder.webkitRequestFullScreen ||
          Tumblr.imageHolder.msRequestFullScreen;
        if (!requestFullscreen)
          alert("Your browser doesn't support fullscreen");
        else
          requestFullscreen.call(Tumblr.imageHolder, Tumblr.imageHolder.ALLOW_KEYBOARD_INPUT);
      }
    },

    purgeCurrentImage: function () {
      if ( Tumblr.current ) {
        var gifs = Tumblr.current.blog.gifs.filter( function ( gif ) {
          return gif != Tumblr.current.gif;
        } );

        Tumblr.current.blog.gifs = gifs;
        Tumblr.storage.set( Tumblr.current.blog );
      }
    },

    storageKey: function ( blog ) {
      if ( blog.tag.length > 0 )
        return blog.name + "#" + blog.tag;
      else
        return blog.name;
    },

    listBlogs: function () {
      return Tumblr.blogs.map( function ( blog ) { return blog.name } );
    },

    addBlog: function ( name ) {
      var blogs = Tumblr.listBlogs();
      blogs.push( name );

      window.location.search = '?t=' + blogs;
    },

    removeBlog: function ( name ) {
      var blogs = Tumblr.listBlogs(),
          index = blogs.indexOf( name );
      blogs.splice( index, 1 );

      window.location.search = '?t=' + blogs;
    },

    storage: {
      get: function ( storageKey ) {
        var json = localStorage.getItem( storageKey );
        if ( json )
          return JSON.parse( json );
        else
          return null;
      },

      set: function ( blog ) {
        localStorage.setItem( Tumblr.storageKey( blog ), JSON.stringify( blog ) );
      }
    }
  },

  // General utils
  Util = {
    // Thanks http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
    getParameterByName: function ( name ) {
      var match = RegExp( '[?&]' + name + '=([^&]*)' ).exec( window.location.search );
      return match && decodeURIComponent( match[1] );
    }
  };

  Array.prototype.rand = function () {
    if ( this.length > 0 ) {
      var index = Math.floor( this.length * Math.random() );
      console.log("RAND " + index);
      return this[index];
    }
  };

  Array.prototype.find = function ( predicate ) {
    return this.filter( predicate )[0];
  };

  var t = Util.getParameterByName( 't' ) || 'classics',
      viewingListEl = $( '.viewing-list' ),
      blogTemplate = $( '#blog[type="text/template"]' ).innerHTML;

  window.Tumblr = Tumblr;
  Tumblr.init( t.split( ',' ) );

  Tumblr.gifCountChangedCallback = function ( blog ) {
    $( '.blog[data-name="' + blog.name + '"] .count' ).innerHTML = blog.gifs.length;
  }

  $( 'form' ).addEventListener( 'submit', function ( event ) {
    var newBlog = newBlog = $( 'input', event.target ).value;
    Tumblr.addBlog( newBlog )
    event.preventDefault();
  });

  // Update page elements
  Tumblr.blogs.forEach( function ( blog ) {
    var view = blogTemplate.replace( /\{\{ name \}\}/g, blog.name ).
               replace( /\{\{ count \}\}/g, blog.gifs.length );

    viewingListEl.innerHTML += view;
  });

  // Remove buttons
  $( 'html' ).addEventListener( 'click', function ( event ) {
    if ( [].forEach.call( document.querySelectorAll( '.remove' ), function ( button ) {
      if ( button === event.target ) {
        var parent = button.parentNode;
        var blogName = parent.dataset.name;
        parent.parentNode.removeChild( parent );

        Tumblr.removeBlog( blogName );
      }
    } ) );
  } );

}( window ) );
