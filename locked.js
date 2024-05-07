//<nowiki>

/**
 * Largely based on https://en.wikipedia.org/wiki/MediaWiki:Gadget-markblocked.js
 * Refer to that page's history for attribution
 */

$.when(
  $.ready
).then(function () {
  let userLinks = {}

  // Callback: receive data and mark links
  function markLinks( user, locked ) {
    if (!locked) {
      return
    }

    let links = userLinks[user];
    for (let k = 0; links && k < links.length; k++ ) {
      $( links[k] ).addClass( 'user-blocked-indef user-locked' );
    }
  }

  function markBlocked( container ) {
    const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/
    const ipv6Regex = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;

    // Collect all the links in the page's content
    const contentLinks = $(container).find('a');

    // Get all aliases for user: & user_talk:
    let userNS = [];
    for (const ns in mw.config.get( 'wgNamespaceIds' ) ) {
      if ( mw.config.get( 'wgNamespaceIds' )[ns] == 2 || mw.config.get( 'wgNamespaceIds' )[ns] == 3 ) {
        userNS.push( mw.util.escapeRegExp(ns.replace( /_/g, ' ' )) + ':' );
      }
    }

    // Let wikis that are importing this gadget specify the local alias of Special:Contributions
    if ( window.markblocked_contributions === undefined ) {
      window.markblocked_contributions = 'Special:Contributions';
    }

    // RegExp for all titles that are  User:| User_talk: | Special:Contributions/ (for userscripts)
    const userTitleRX = new RegExp('^(' + userNS.join('|') + '|' + window.markblocked_contributions + '\\/)+([^\\/#]+)$', 'i');

    // RegExp for links
    // articleRX also matches external links in order to support the noping template
    const articleRX = new RegExp(mw.config.get('wgArticlePath').replace('$1', '') + '([^#]+)');
    const scriptRX = new RegExp('^' + mw.config.get('wgScript') + '\\?title=([^#&]+)');

    let user, url, ma, pgTitle;

    // Find all "user" links and save them in userLinks : { 'users': [<link1>, <link2>, ...], 'user2': [<link3>, <link3>, ...], ... }
    contentLinks.each( function( i, lnk ) {

      if ( $( lnk ).hasClass("mw-changeslist-date")
        || $( lnk ).parent("span").hasClass("mw-history-undo")
        || $( lnk ).parent("span").hasClass("mw-rollback-link")
      ) {
        return;
      }

      url = $( lnk ).attr( 'href' );

      if ( !url ) {
        return;
      }

      if ( ma = articleRX.exec( url ) ) {
        pgTitle = ma[1];
      } else if ( ma = scriptRX.exec( url ) ) {
        pgTitle = ma[1];
      } else {
        return;
      }

      pgTitle = decodeURIComponent( pgTitle ).replace( /_/g, ' ' );
      user = userTitleRX.exec( pgTitle );

      if ( !user ) {
        return;
      }

      user = user[2];

      if ( ipv6Regex.test(user) || ipRegex.test(user) ) {
        return;
      }

      $( lnk ).addClass( 'userlink' );

      if ( ! userLinks[user] ) {
        userLinks[user] = [];
      }

      userLinks[user].push( lnk );
    } );

    // Convert users into array
    let users = [];
    for (const u in userLinks ) {
      users.push( u );
    }

    // API request

    while ( users.length > 0 ) {

      let user = users.pop()
      let storageKey = `ds-locked-user ${user}`
      let item = localStorage.getItem(storageKey)

      if (item) {
        let itemJSON = JSON.parse(item)

        // Valid
        if (itemJSON.expiry > Date.now()) {
          markLinks(user, itemJSON.locked)

          continue
        }
      }

      $.get(
        mw.util.wikiScript( 'api' ),
        {
          format: 'json',
          formatversion: 2,
          action: 'query',
          meta: 'globaluserinfo',
          guiuser: user
        },
        (response) => {
          let locked = 'locked' in response.query.globaluserinfo

          // localStorage.setItem(storageKey, JSON.stringify({
          //   locked,
          //   expiry: Date.now() + ((locked ? 3 : 1) * 24 * 60 * 60 * 1000) // 3 days for locked, 1 day for non-locked
          // }))

          markLinks(user, locked)
        }
      );
    }
  }// -- end of main function

  // Start on some pages
  switch ( mw.config.get( 'wgAction' ) ) {
    case 'edit':
    case 'submit':
      return
  }

  $.when( mw.loader.using( 'mediawiki.util' ) ).then( function () {
    mw.util.addCSS('a.external.user-locked:after, a.mw-userlink.user-locked:after {content: ""; display: inline-block; background: url("//upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Symbol_oppose_vote.svg/16px-Symbol_oppose_vote.svg.png") no-repeat right; width: 16px; height: 16px;}');

    mw.hook( 'wikipage.content' ).add( function ( container ) {
      // On the first call after initial page load, container is mw.util.$content

      // Used to limit mainspace activity to just the diff definitions
      if ( mw.config.get( 'wgAction' ) === 'view' && mw.config.get( 'wgNamespaceNumber' ) === 0 ) {
        container = container.find( '.diff-title' );
      }

      markBlocked( container );
    } );
  } );
})

//</nowiki>
