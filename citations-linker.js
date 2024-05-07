//<nowiki>

/**
 * –––––
 *       YOU ARE FULLY RESPONSIBLE FOR PUBLISHING EDITS USING THIS SCRIPT
 * –––––
 *
 * This script is not ready for use, unless of course, if you know what you are doing.
 * You must verify if the conversion is successful and modify if not.
 */

$.when(
  $.ready
).then(function () {

  const regexes = [
    ['www\.bollywoodhungama\.com', 'Bollywood Hungama'],
    ['www\.dailymirror\.lk', 'Daily Mirror', 'Daily Mirror (Sri Lanka)|Daily Mirror'],
    ['www\.dnaindia\.com', 'Daily News & Analysis'],
    ['www\.deccanchronicle\.com', 'Deccan Chronicle'],
    ['www\.deccanherald\.com', 'Deccan ?Herald(?:\.com)?', 'Deccan Herald'],
    ['www\.firstpost\.com', 'Firstpost'],
    ['www\.hindustantimes\.com', 'Hindustan Times'],
    ['www\.indiatoday\.in', 'India Today'],
    ['www\.ibtimes\.co\.in', 'International Business Times'],
    ['www\.livemint\.com', 'LiveMint'],
    ['www\.mumbaimirror\.com', 'Mumbai Mirror'],
    ['www\.ndtv\.com', 'NDTV(?:\.com)?', 'NDTV'],
    ['www\.news18\.com', 'News18'],
    ['entertainment\.oneindia\.in', 'oneindia(?:\.in)?', 'OneIndia'],
    ['www\.rediff\.com', 'Rediff'],
    ['in\.reuters\.com', 'Reuters'],
    ['economictimes\.indiatimes\.com', '(?:The )?Economic Times', 'The Economic Times'],
    ['www\.thehindu\.com', 'The ?Hindu', 'The Hindu'],
    ['(?:www\.)?indianexpress\.com', 'The Indian Express'],
    ['(?:www\.)?newindianexpress\.com', 'The New Indian Express'],
    ['www\.thenewsminute.\com', 'The News Minute'],
    ['www\.thequint\.com', 'The Quint'],
    ['www\.siasat\.com', 'The Siasat Daily'],
    ['thestar\.com\.my', 'The Star', 'The Star (Malaysia)|The Star'],
    ['www\.telegraphindia\.com', 'The Telegraph', 'The Telegraph (India)|The Telegraph'],
    ['www\.telegraphindia\.com', 'www\.telegraphindia\.com', 'The Telegraph (India)|The Telegraph'],
    ['timesofindia\.indiatimes\.com', 'The Times of India'],
    ['timesofindia\.indiatimes\.com', 'Timesofindia\. ?indiatimes\.com', 'The Times of India'],
    ['www\.tribuneindia\.com', 'The Tribune', 'The Tribune (Chandigarh)|The Tribune'],
    ['www\.uiowa\.edu', 'University of Iowa'],
    ['www\.washingtonpost\.com', '(?:The )?Washington Post', 'The Washington Post'],
    ['movies\.yahoo\.com', 'Yahoo! Movies'],
    ['zeenews\.india\.com', 'Zee News'],
    ...(window.ds_citewikilinker_regexes || [])
  ];

  const refPartStart = '(<ref(?: name=":?[\\w\\.\\s]+")?>{{cite (?:news|web)'
  const refPartEnd = '}}<\\/ref>)'
  const citePart = '[|\\w\\s=?-–-&’\'#.:;+,%!₹\\/[\\]()]*'
  const urlPart = 'url ?= ?https?:\/\/'
  const params = '(?:website|work|newspaper|publisher) ?= ?'

  // Activate portlet when VE source editor is enabled
  mw.hook( 've.activationComplete' ).add(function () {
    // Remove portlet when VE visual editor is enabled
    if (0 === $('.ve-ui-surface-source').length) {
      $('#ds-cite-wikilinker').remove()

      return
    }

    $.when(
      mw.loader.using( [ 'mediawiki.util' ] )
    ).then( function () {
      main()
    })
  })

  // Remove portlet when VE is deactivated
  mw.hook( 've.deactivationComplete' ).add(function () {
    $('#ds-cite-wikilinker').remove()
  })

  function main() {
    const node = mw.util.addPortletLink('p-tb', '#', 'Cite Wikilinker dev', 'ds-cite-wikilinker', 'Wikilink publishers in citations')

    $( node ).click(function (e) {
      let textBox = $('#wpTextbox1')
      let content = textBox.textSelection('getContents')
      let re1, re2, changes = false;

      for (const i of regexes) {
        re1 = new RegExp(`${refPartStart}${citePart}${urlPart}${i[0]}${citePart}${params})${i[1]}(${citePart}${refPartEnd}`, 'gim')
        re2 = new RegExp(`${refPartStart}${citePart}${params})${i[1]}(${citePart}${urlPart}${i[0]}${citePart}${refPartEnd}`, 'gim')

        console.log(i[2] ?? i[1])
        console.log(re1)
        console.log(re2)

        if (re1.test(content)) {
          changes = true
          content = content.replaceAll(re1, `$1[[${i[2] ?? i[1]}]]$2`)
        }

        if (re2.test(content)) {
          changes = true
          content = content.replaceAll(re2, `$1[[${i[2] ?? i[1]}]]$2`)
        }
      }

      if (!changes) {
        mw.notify('No changes made', {
          title: 'Cite Wikilinker',
        })

        return
      }

      textBox.textSelection('setContents', content)

      mw.notify('Citations wiki-linked', {
        title: 'Cite Wikilinker',
        type: 'success',
      })

      // Hook to add edit summary
      mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)

      e.preventDefault()
    })
  }

  function prefillEditSummary() {
    if (ve.init.target.saveDialog) {
      ve.init.target.saveDialog.editSummaryInput.$input.val('Wikilink citation publisher ([[User:DaxServer/CiteWikiLinker|CiteWikiLinker.js]])')
    }

    // Remove hook upon prefilling
    mw.hook( 've.saveDialog.stateChanged' ).remove(prefillEditSummary)
  }
});

//</nowiki>
