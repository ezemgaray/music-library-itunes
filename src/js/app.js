let favs = JSON.parse(localStorage.getItem("favs")) || []

$(function () {

   /*--| LISTENERS |--*/

   $(document).keyup(function (e) {
      if ($("#checksearch:checked").length == 1) {
         if (e.keyCode == 13) {
            requests.search()
            $("#checksearch").click()
         }
      }
   })

   $("#checksearch, #checkfav").change(function () {
      if ($("#checksearch").is(":checked")) {
         $("#input-search").focus()

         if ($("#checkfav").is(":checked")) {
            $("#checkfav").click()
         }
      }
      if ($("#checkfav").is(":checked")) {
         favourites.showFav()
      }
   })

   $(".search").on("focusout", function (e) {
      if ($("#checksearch").is(":checked") && e.relatedTarget === null && !$("#active-search").is(":active")) {
         $("#checksearch").click()
      }
   })

   $("#input-search").on("input", delay(function () {
      requests.search()
   }, 500))

   $("#select-type, #input-country, #select-explicit, #select-limit").on("change", function () {
      requests.search()
   })

   $("#results").click(function (e) {
      if ($(e.target).attr("class") === "play") {
         playerMusic.playPause(e.target)
      }
   })

   /*--| FUNCTIONS |--*/

   /**
    * Request functions:
    *  * search: Build the url for the request and make it
    *  * getParams: Retrieves the parameters defined in the search form
    */
   const requests = {
      search: function () {
         let params = this.getParams()
         if (!params) return
         $.ajax({
               url: "https://itunes.apple.com/search?term=" + params.term.trim().split(' ').join('+') +
                  "&media=music" +
                  "&entity=" + params.entity +
                  "&attribute=" + params.attribute +
                  "&explicit=" + params.explicit +
                  "&country=" + params.country +
                  "&limit=" + params.limit,
               dataTtype: "jsonp",
               beforeSend: function () {
                  $("#results").html('<div class="loader__container"><h2>Searching <span class="loader"><span class="cssload-loader"></span></span></h2></div>')
               },
            })
            .done(function (data) {
               data = JSON.parse(data)

               $("#results").html("")

               if (data.resultCount === 0) {
                  $("#results").html("<h2>Nothing to show...</h2>")
                  return
               } else {
                  $.each(data.results, function (key, result) {
                     cards.createCard(result)
                  })
               }
            })
            .fail(function () {
               $("#results").html("<h2>Nothing to show...</h2>")
            })
      },
      getParams: function () {
         let attribute = {
            'song': 'songTerm',
            'musicArtist': 'artistTerm',
            'album': 'albumTerm',
            'musicVideo': 'songTerm'
         }
         if ($.trim($("#input-search").val()) === "") {
            $("#input-search").focus()
            return
         }
         if ($("#checkbox__country").is(":checked") && ($.trim($("#input-country").val()).length > 2 || $.trim($("#input-country").val()).length < 2)) {
            if ($("#input-country").next().is("p")) {
               $("#input-country").next().remove()
            }
            $("#input-country").parent().append("<p>Select one of the list</p>")
            return
         }
         if ($("#input-country").next().is("p")) {
            $("#input-country").next().remove()
         }

         let params = {
            entity: $("#select-type").val(),
            term: $("#input-search").val(),
            attribute: attribute[$("#select-type").val()],
            country: $("#input-country").val(),
            explicit: $("#select-explicit").val(),
            limit: $("#select-limit").val(),
         }
         return params
      }
   }

   /**
    * functions in charge of creating the cards according to the type 
    * of search (songs, album, video, artist)
    */
   const cards = {
      /**
       * Depending on the type of result, redirect to the corresponding function to create the card
       * @param {*Object} result 
       */
      createCard: function (result) {
         switch (result.wrapperType) {
            case 'track':
               result.kind === 'song' ? this.song(result) : this.video(result)
               break
            case 'artist':
               this.artist(result)
               break
            case 'collection':
               this.album(result)
               break
         }
      },
      /**
       * Create song card
       * @param {*Object} song 
       */
      song: function (song) {
         let isFav = favourites.isFav(favs, song)

         let coverImg = $("<img>", {
            class: "card__img",
            src: song.artworkUrl100.replace("100x100bb", "500x500bb"),
            alt: song.trackName
         })
         let layer = $("<div>", {
               class: "card__cover__layer"
            })
            .append('<div class="card__genre"><p>' + song.primaryGenreName + '</p></div>')
            .append('<div class="card__length"> <p>' + this.getSongLength(song.trackTimeMillis) + '</p></div>')
            .append('<div class="play"></div>')
            .append('<audio data-id="music" src="' + song.previewUrl + '" type="audio/m4a" preload="none">Your browser does not support the audio element.</audio>')
            .append("<progress data-id='progress' min='0' max='100' value='0'> played</progress>")
         let header = $("<div>", {
               class: "card__header"
            })
            .append(coverImg)
            .append(layer)
         let body = $("<div>", {
               class: "card__body"
            })
            .append($('<div class="favourite" fav="' + isFav + '"><img src="src/img/' +
                  ((isFav >= 0) ? "delfav" : "fav") + '.png" alt="fav"></div>')
               .click(function (e) {
                  favourites.addFav(song, e.target)
               })
            )
            .append('<h2 class="card__title line-clamp" title="' + song.trackName + '">' + song.trackName + '</h2>')
            .append('<p class="card__name line-clamp" title="' + song.artistName + '">' + song.artistName + '</p>')
            .append('<p class="card__album"><span class="album__name line-clamp" title="' + song.collectionName + '">' + song.collectionName +
               ' </span><span class="album__year">' +
               new Date(song.releaseDate).getFullYear() + '</span></p>')
            .append('<div class="btn__container"><p class="price">' + (song.trackPrice < 0 ? "0.00" : !song.trackPrice ? "(Not available)" : song.trackPrice) + ' ' +
               song.currency + '</p><a href="' + song.trackViewUrl +
               '" target="_blank" class="btn">Go iTunes</a></div>')
         let card = $("<div>", {
            class: "card"
         }).append(header).append(body)

         $("#results").append(card)
      },
      /**
       * Create video card
       * @param {*Object} video 
       */
      video: function (video) {
         let isFav = favourites.isFav(favs, video)
         if(!video.previewUrl) return
         let layer = $("<div>", {
               class: "card__cover__layer"
            })
            .append('<div class="card__genre"><p>' + video.primaryGenreName + '</p></div>')
            .append('<div class="card__length"> <p>' + this.getSongLength(video.trackTimeMillis) + '</p></div>')
            .append('<video controls src="' + video.previewUrl + '" poster="' +
               video.artworkUrl100.replace("100x100bb", "500x500bb") +
               '">Your browser does not support the audio element.</video>')
         let header = $("<div>", {
               class: "card__header"
            })
            .append(layer)
         let body = $("<div>", {
               class: "card__body"
            }) 
            .append($('<div class="favourite" fav="' + isFav + '"><img src="src/img/' +
                  ((isFav >= 0) ? "delfav" : "fav") + '.png" alt="fav"></div>')
               .click(function (e) {
                  favourites.addFav(video, e.target)
               })
            )
            .append('<h2 class="card__title line-clamp" title="' + video.trackName + '">' + video.trackName + '</h2>')
            .append('<p class="card__name line-clamp" title="' + video.artistName + '">' + video.artistName + '</p>')
            .append('<p class="card__album"><span class="album__name line-clamp" title="' + video.collectionName + '">' + video.collectionName +
               ' - </span><span class="album__year">' +
               new Date(video.releaseDate).getFullYear() + '</span></p>')
            .append('<div class="btn__container"><p class="price">' + (video.trackPrice < 0 ? "0.00" : !video.trackPrice ? "(Not available)" : video.trackPrice) + ' ' +
               video.currency + '</p><a href="' + video.trackViewUrl +
               '" target="_blank" class="btn">Go iTunes</a></div>')
         let card = $("<div>", {
            class: "card"
         }).append(header).append(body)

         $("#results").append(card)
      },
      /**
       * Create album card
       * @param {*Object} album 
       */
      album: function (album) {
         let isFav = favourites.isFav(favs, album)
         let coverImg = $("<img>", {
            class: "card__img",
            src: album.artworkUrl100.replace("100x100bb", "500x500bb"),
            alt: album.collectionName
         })
         let header = $("<div>", {
               class: "card__header"
            })
            .append(coverImg)
            .append('<div class="card__genre"><p>' + album.primaryGenreName + '</p></div>')
            .append('<div class="card__length"> <p>' + album.trackCount + ' songs</p></div>')
         let body = $("<div>", {
               class: "card__body"
            })
            .append($('<div class="favourite" fav="' + isFav + '"><img src="src/img/' +
                  ((isFav >= 0) ? "delfav" : "fav") + '.png" alt="fav"></div>')
               .click(function (e) {
                  favourites.addFav(album, e.target)
               })
            )
            .append('<h2 class="card__title line-clamp" title="' + album.collectionName + '">' + album.collectionName + '</h2>')
            .append('<p class="card__name line-clamp" title="' + album.artistName + '">' + album.artistName + '</p>')
            .append('<p class="card__album"></span><span class="album__year">' +
               new Date(album.releaseDate).getFullYear() + '</span></p>')
            .append('<div class="btn__container"><p class="price">' + (album.collectionPrice < 0 ? "0.00" : !album.collectionPrice ? "(Not available)" : album.collectionPrice) + ' ' +
               album.currency + '</p><a href="' + album.collectionViewUrl +
               '" target="_blank" class="btn">Go iTunes</a></div>')
         let card = $("<div>", {
            class: "card"
         }).append(header).append(body)

         $("#results").append(card)

      },
      /**
       * Create artist card
       * @param {*Object} artist 
       */
      artist: function (artist) {

         let header = $("<div>", {
               class: "card__header"
            })
            .append('<img class="card__img" src="/src/img/artist.png" alt="' + artist.artistName + '">')
         let body = $("<div>", {
               class: "card__body artist"
            })
            .append('<h2 class="card__title">' + artist.artistName + '</h2>')
            .append('<p class="card__genreart">' + artist.primaryGenreName + '</p>')
            .append('<div class="btn__container"><a href="' + artist.artistLinkUrl +
               '" target="_blank" class="btn">Go iTunes</a></div>')
         let card = $("<div>", {
            class: "card"
         }).append(header).append(body)

         $("#results").append(card)

      },
      /**
       * Defines the format of the song duration
       * @param {*Number} lengthms -> Song duration in milliseconds
       */
      getSongLength: function (lengthms) {
         function timePart(part) {
            return (part < 10) ? '0' + part : part
         }
         let date = new Date(lengthms)
         return timePart(date.getMinutes()) + ':' + timePart(date.getSeconds())
      }
   }

   /**
    * Music player functions
    */
   const playerMusic = {
      playing: null,
      playPause: function (elem) {
         let player = elem.nextElementSibling
         if (this.playing && this.playing.src !== player.src) {
            this.playing.pause()
            this.playing.currentTime = 0
            $(this.playing).prev().css("background", "url('./src/img/play.png') no-repeat 50% 50%")
         }
         if (player.paused || player.ended) {
            this.play(player, elem)
         } else {
            this.pause(player, elem)
         }
      },
      play: function (player, elem) {
         player.play()
         this.playing = player
         $(elem).css("background", "url('./src/img/pause.png') no-repeat 50% 50%")
         $(player).on('timeupdate', function () {
            playerMusic.updateProgress(player)
         });
      },
      pause: function (player, elem) {
         player.pause()
         $(elem).css("background", "url('./src/img/play.png') no-repeat 50% 50%")
      },
      updateProgress: function (player) {
         let progressBar = player.nextElementSibling
         var percentage = Math.floor((100 / player.duration) * player.currentTime);
         progressBar.value = percentage;
         $(player).on("ended", this.onEnded)
      },
      onEnded: function () {
         playerMusic.playing.pause()
         playerMusic.playing.currentTime = 0
         $(playerMusic.playing).prev().css("background", "url('./src/img/play.png') no-repeat 50% 50%")
      }
   }

   /**
    * Search with a delay of 500 milliseconds. 
    * Only the search is executed after this time from the last entered 
    * character to avoid multiple queries and always get the result of the last entered text
    * @param {*Function} callback -> function that executes the search
    * @param {*Number} ms -> Delay time in milliseconds
    */
   function delay(callback, ms) {
      var timer = 0;
      return function () {
         var context = this,
            args = arguments;
         clearTimeout(timer);
         timer = setTimeout(function () {
            callback.apply(context, args);
         }, ms || 0);
      };
   }

   /**
    * Get the list of countries from the API and insert the items in the country field of the form.
    */
   function getCountries() {
      $.ajax("https://www.liferay.com/api/jsonws/country/get-countries/")
         .done(function (data) {
            $(data).each(function (index, country) {
               $('#countries').append('<option value="' + country.a2 + '"> ' + country.nameCurrentValue + '</option>')
            })
         })
   }

   /**
    * functions to check, add or remove from favorites
    */
   let favourites = {
      /**
       * Check if the result is stored in favourites
       * @param {*Array} favs -> LocalStorage data
       * @param {*Object} currentFav -> search result
       */
      isFav: function (favs, currentFav) {
         let result
         $(favs).each(function (index, fav) {
            // Compare objects
            if (JSON.stringify(fav) === JSON.stringify(currentFav)) {
               result = index
            }
         })
         return result
      },
      addFav: function (currentFav, heart) {
         let index = this.isFav(favs, currentFav)
         if (index != undefined) {
            this.removeFav(index)
            heart.src = "./src/img/fav.png"
            return
         }
         favs.push(currentFav)
         heart.src = "./src/img/delfav.png"
         this.saveFavs()
      },
      showFav: function () {
         $('#results').empty()
         if (favs.length == 0) {
            $('#results').append("<h2>You have nothing in favorites. Find what you want</h2>")
            $("#checksearch").click()
            return
         }
         $(favs).each(function (index, result) {
            cards.createCard(result)
         })
      },
      removeFav: function (index) {
         favs.splice(parseInt(index), 1)
         this.saveFavs()
         if ($("#checkfav").is(":checked")) this.showFav()
      },
      saveFavs: function () {
         localStorage.setItem('favs', JSON.stringify(favs))
      }
   }

   /*--| INIT APP |--*/
   favourites.showFav()
   getCountries()

})