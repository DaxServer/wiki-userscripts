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
    'myhdhub4u\.com',
    'myfilmyzilla\.com',
    'www\.sachdaily\.com', 'sachdaily\.com',
    'www\.tamilyogi\.wiki', 'tamilyogi\.wiki',
    ...(window.ds_spamnuker_regexes || [])
  ];

  const refPartStart = '<ref(?: name=":?[\\w\\.\\s]+")?>{{cite (?:news|web)'
  const refPartEnd = '}}<\\/ref>'
  const citePart = '[|\\w\\s=?-–-&’\'#.:;+,%!₹\\/[\\]()]*'
  const urlPart = 'url ?= ?https?:\/\/'

  // Activate portlet when VE source editor is enabled
  mw.hook( 've.activationComplete' ).add(function () {
    // Remove portlet when VE visual editor is enabled
    if (0 === $('.ve-ui-surface-source').length) {
      $('#ds-nuke-spam').remove()

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
    $('#ds-nuke-spam').remove()
  })

  function main() {
    const node = mw.util.addPortletLink('p-tb', '#', 'Nuke spam', 'ds-nuke-spam', 'Remove spam references')

    $( node ).click(function (e) {
      let textBox = $('#wpTextbox1')
      let content = textBox.textSelection('getContents')
      let changes = false;

      for (const i of regexes) {
        const baseRe = new RegExp(`(?:https?:\/\/)?${i}\/?`, 'gim')

        if (!baseRe.test(content)) {
          continue
        }

        const res = [
          new RegExp(`${refPartStart}${citePart}${urlPart}${i}${citePart}${refPartEnd}`, 'gim'),
          new RegExp(`\{\{url\\\|(?:https?:\/\/)?${i}}}`, 'gim'),
          baseRe,
        ]

        for (const re of res) {
          if (re.test(content)) {
            changes = true
            content = content.replaceAll(re, '')
          }
        }
      }

      if (!changes) {
        mw.notify('No changes made', {
          title: 'Nuke spam',
        })

        return
      }

      textBox.textSelection('setContents', content)

      mw.notify('Spam removed', {
        title: 'Nuke spam',
        type: 'success',
      })

      // Hook to add edit summary
      mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)

      e.preventDefault()
    })
  }

  function prefillEditSummary() {
    if (ve.init.target.saveDialog) {
      ve.init.target.saveDialog.editSummaryInput.$input.val('rm spam (private [[WP:USERSCRIPT|user script]])')
    }

    // Remove hook upon prefilling
    mw.hook( 've.saveDialog.stateChanged' ).remove(prefillEditSummary)
  }
});

//</nowiki>
