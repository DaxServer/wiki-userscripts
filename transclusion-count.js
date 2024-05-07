//<nowiki>

$.when(
  $.ready,
  mw.loader.using( 'mediawiki.util' )
).then(function () {
  if (mw.config.get('wgAction') !== 'view') {
    return
  }

  if (mw.config.get('wgNamespaceNumber') === 10) {
    $.get(
      mw.util.wikiScript('api'),
      {
        format: 'json',
        formatversion: 2,
        action: 'query',
        prop: 'transcludedin',
        titles: mw.config.get('wgPageName'),
        tilimit: 500,
      }
    ).then((response) => {
      const more = 'continue' in response
      const total = 'transcludedin' in response.query.pages[0] ? response.query.pages[0].transcludedin.length : 0
      $('#siteSub').append(`<span style="float:right;">${total}${more ? '+' : ''} transclusions</span>`).css('display', 'inherit')
    })
  }

  if (mw.config.get('wgNamespaceNumber') === 14) {
    mw.hook('wikipage.content').add((container) => {
      const contentLinks = $(container).find('.mw-category a');
      const articleRX = new RegExp(mw.config.get('wgArticlePath').replace('$1', '(.*)'));
      let templatesSet = new Set(), templatesLinks = []

      let templateLabels = []
      for (let key in mw.config.values.wgNamespaceIds) {
        if (mw.config.values.wgNamespaceIds[key] === 10) {
          templateLabels.push(key)
        }
      }

      for (const node of contentLinks) {
        const match = articleRX.exec(node)

        if (!match) {
          continue
        }

        templateLabels.forEach(label => {
          if (match[1].toLowerCase().startsWith(`${label}:`)) {
            const template = decodeURIComponent(match[1])

            if ( ! templatesLinks[template] ) {
              templatesLinks[template] = [];
            }

            templatesLinks[template].push( node );
            templatesSet.add(template)
          }
        })
      }

      let templatesArray = Array.from(templatesSet)

      while (templatesArray.length > 0) {
        $.get(
          mw.util.wikiScript('api'),
          {
            format: 'json',
            formatversion: 2,
            action: 'query',
            prop: 'transcludedin',
            titles: templatesArray.pop(),
            tilimit: 500,
          }
        ).then((response) => {
          for (const page of response.query.pages) {
            let encodedFrom = response.query.normalized === undefined
              ? page.title
              : response.query.normalized.find(each => each.to === page.title).from

            const more = 'continue' in response
            const total = 'transcludedin' in page ? page.transcludedin.length : 0

            for (const node of templatesLinks[encodedFrom]) {
              $(node).after(` (${total}${more ? '+' : ''} ti)`)
            }
          }
        })
      }
    })
  }
})

//</nowiki>
