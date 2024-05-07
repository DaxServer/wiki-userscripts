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
).then(() => {
  // Activate portlet when VE source editor is enabled
  mw.hook( 've.activationComplete' ).add(function () {
    // Remove portlet when VE visual editor is enabled
    if (0 === $('.ve-ui-surface-source').length) {
      $('#ds-karna-disruption').remove()

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
    $('#ds-karna-disruption').remove()
  })

  let today = new Date()
  let textBox

  function main() {
    const node = mw.util.addPortletLink('p-tb', '#', 'Karna Disruption', 'ds-karna-disruption')

    $( node ).click(function (e) {
      textBox = $('#wpTextbox1')
      let content = textBox.textSelection('getContents')

      switch (mw.config.get('wgPageName')) {
        case 'User:DaxServer/Karna_disruption/All_pages':
          markDisruptedPages()
          break

        case 'User:DaxServer/Karna_disruption/Users':
          usersConfirmed(content)
          break

        case 'User:DaxServer/Karna_disruption/Users_blocked':
          usersBlocked(content)
          break

        case 'User:DaxServer/Karna_disruption':
          pagesDisrupted(content)
          break
      }

      e.preventDefault()
    })
  }

  function temp1(content) {
    let users = new Set()

    let allTitles = content.matchAll(/{{checkuser\|(?:1=)?(.*)}}/ig)
    for (let title of allTitles) {
      users.add(title[1])
    }

    allTitles = content.matchAll(/{{checkIP\|(?:1=)?(.*)}}/ig)
    for (let title of allTitles) {
      users.add(title[1])
    }

    allTitles = content.matchAll(/{{Noping2\|(.*)}}/ig)
    for (let title of allTitles) {
      users.add(title[1])
    }

    temp2(Array.from(users), new Set(), content)
  }

  function temp2(users, set, content) {
    if (users.length === 0) {
      for (const entry of Array.from(set).sort()) {
        content += `* {{paglinks|${entry}}}\n`
      }

      textBox.textSelection('setContents', content)

      mw.notify('Updated users', {
        title: 'Karna Disruption',
        type: 'success',
      })

      return
    }

    let user = users.pop()
    temp3(users, user, set, '', content)
  }

  function temp3(users, user, set, uccontinue, content) {
    let url = `/w/api.php?format=json&action=query&list=usercontribs&ucuser=${encodeURIComponent(user)}&uclimit=500${uccontinue}`

    $.ajax(url).then(result => {
      for (let contrib of result['query']['usercontribs']) {
        if (0 !== contrib['ns']) {
          continue;
        }

        set.add(contrib['title'])
      }

      if ('continue' in result) {
        temp3(users, user, set, `&uccontinue=${result['continue']['uccontinue']}`, content)
      } else {
        temp2(users, set, content)
      }
    })
  }

  async function markDisruptedPages() {
    let result = $.get(
      mw.util.wikiScript( 'api' ),
      {
        action: 'query',
        prop: 'revisions',
        titles: 'User:DaxServer/Karna disruption',
        rvslots: '*',
        rvprop: 'content',
        format: 'json',
        formatversion: 2
      }
    )

    let content = textBox.textSelection('getContents')
    let allTitles = content.matchAll(/{{pagelinks\|(.*)}}/ig)

    console.log(result)

    for (const title of allTitles) {
      let re = `{{[Pp]agelinks\\|${escapeRegex(title[1])}}}`

      if ((new RegExp(re)).test(result['query']['pages'][0]['revisions'][0]['slots']['main']['content'])) {
        let reStr = `({{pagelinks\\|${escapeRegex(title[1])}}}\\n\\|).*(?=\\n\\|)`

        content = content.replace(
          new RegExp(reStr, 'i'),
          '$1 {{yes}}'
        )
      }
    }

    textBox.textSelection('setContents', content)

    mw.notify('Updated pages', {
      title: 'Karna Disruption',
      type: 'success',
    })

    // Hook to add edit summary
    mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)
  }

  function pagesDisrupted(content) {
    let allTitles = content.matchAll(/{{pagelinks\|(.*)}}/ig)
    let titles = [], temp = []

    for (let title of allTitles) {
      if (temp.length >= 50) {
        titles.push(temp.join('|'))
        temp = []
      }

      temp.push(encodeURIComponent(title[1]))
    }

    if (temp.length > 0) {
      titles.push(temp.join('|'))
    }

    parsePages(titles, content)
  }

  async function parsePages(titles, content) {
    if (titles.length === 0) {
      content = content.replace(
        /Last updated: .*/i,
        'Last updated: ~~~~'
      )

      textBox.textSelection('setContents', content)

      mw.notify('Updated pages', {
        title: 'Karna Disruption',
        type: 'success',
      })

      // Hook to add edit summary
      mw.hook('ve.saveDialog.stateChanged').add(prefillEditSummary)

      return
    }

    let url = `/w/api.php?format=json&action=query&prop=revisions&titles=${titles.pop()}&rvprop=timestamp%7Cuser%7Ccomment`

    let result = await $.ajax(url)

    for (let page of Object.entries(result['query']['pages'])) {
      let lastEdited = new Date(page[1]['revisions'][0]['timestamp'])
      let lastEditedText = lastEdited.toLocaleString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})
      let type = determineType(lastEdited)

      let reTitle = escapeRegex(page[1]['title'])
      let reStr = `({{pagelinks\\|${reTitle}}}\\n\\|.*\\n\\|.*\\n\\|.*\\n\\|.*\\n\\|.*\\n).*(?=\\n\\|[-}])`

      content = content.replace(
        new RegExp(reStr, 'i'),
        `$1| {{ColorCell|${lastEditedText}|type=${type}}}`
      )
    }

    parsePages(titles, content)
  }

  function usersConfirmed(content) {
    let allUsers = content.matchAll(/\|\s*{{User:DaxServer\/Template\/User\|(.*)}}/ig)
    let users = []

    for (let user of allUsers) {
      users.push(encodeURIComponent(user[1]))
    }

    parseUsersConfirmed(users, content)
  }

  async function parseUsersConfirmed(users, content) {
    if (users.length === 0) {
      content = content.replace(
        /Last updated: .*/i,
        'Last updated: ~~~~'
      )

      textBox.textSelection('setContents', content)

      mw.notify('Updated users', {
        title: 'Karna Disruption',
        type: 'success',
      })

      return
    }

    let url = `/w/api.php?format=json&action=query&list=usercontribs&ucuser=${users.pop()}&uclimit=1`

    let result = await $.ajax(url);

    // User has no contributions
    if (result['query']['usercontribs'].length === 0) {
      parseUsersConfirmed(users, content)
      return
    }

    let lastEdited = new Date(result['query']['usercontribs'][0]['timestamp'])
    let lastEditedText = lastEdited.toLocaleString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})
    let revid = result['query']['usercontribs'][0]['revid']
    let type = determineType(lastEdited)

    let reUser = escapeRegex(result['query']['usercontribs'][0]['user'])
    let reStr = `({{User:DaxServer/Template/User\\|${reUser}}}(?:\\n\\|.*){4}\\n)\\|.*\\n\\|.*(?=\\n\\|[-}])`
    let re = new RegExp(reStr, 'i')

    if (!re.test(content)) {
      reStr = `({{User:DaxServer/Template/User\\|${reUser}}}(?:\\n\\|.*){2}\\n)\\|.*\\n\\|.*(?=\\n\\|[-}])`
      re = new RegExp(reStr, 'i')
    }

    content = content.replace(
      re,
      `$1| {{ColorCell|${lastEditedText}|type=${type}}}\n| [https://en.wikipedia.org/w/index.php?diff=${revid}&diffmode=source]`
    )

    parseUsersConfirmed(users, content)
  }

  function usersBlocked(content) {
    let allUsers = content.matchAll(/\|\s*{{User:DaxServer\/Template\/User\|(.*)}}/ig)
    let users = []

    for (let user of allUsers) {
      users.push(encodeURIComponent(user[1]))
    }

    parseUsersBlocked(users, content)
  }

  async function parseUsersBlocked(users, content) {
    if (users.length === 0) {
      content = content.replace(
        /Last updated: .*/i,
        'Last updated: ~~~~'
      )

      textBox.textSelection('setContents', content)

      mw.notify('Updated users', {
        title: 'Karna Disruption',
        type: 'success',
      })

      return
    }

    let url = `/w/api.php?format=json&formatversion=2&action=query&meta=globaluserinfo&guiuser=${users.pop()}`

    let result = await $.ajax(url);

    if ('locked' in result['query']['globaluserinfo']) {
      let reStr = `({{User:DaxServer/Template/User\\|${result['query']['globaluserinfo']['name']}}}\\n)\\|.*(?=\\n\\|)`

      content = content.replace(
        new RegExp(reStr, 'i'),
        '$1| {{yes}}'
      )
    }

    parseUsersBlocked(users, content)
  }

  function escapeRegex(text) {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  function prefillEditSummary() {
    if (ve.init.target.saveDialog) {
      ve.init.target.saveDialog.editSummaryInput.$input.val('userscript assisted')
    }

    // Remove hook upon prefilling
    mw.hook( 've.saveDialog.stateChanged' ).remove(prefillEditSummary)
  }

  function determineType(lastEdited) {
    let type = 'none'
    let agoDiff = Math.round((today - lastEdited) / (1000*60*60*24))

    if (agoDiff < 4) {
      type = 'lred'
    } else if (agoDiff < 11) {
      type = 'yellow2'
    } else if (agoDiff < 31) {
      type = 'lyellow'
    }

    return type;
  }
});

//</nowiki>
