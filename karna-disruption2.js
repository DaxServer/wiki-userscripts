//<nowiki>

$.when(
  $.ready
).then(function () {
  let today = new Date()

  pathoschild.TemplateScript.add({
    name: 'Karna disruption',
    script: async function (editor) {
      switch (mw.config.get('wgPageName')) {
        case 'Karna_disruption/All_pages':
          // markDisruptedPages()
          break

        case 'Karna_disruption/Users':
          editor.set(await usersConfirmed(editor.get()))
            .clickDiff()
          break

        case 'Karna_disruption/Users_blocked':
          // usersBlocked(content)
          break

        case 'Karna_disruption':
          editor.set(await pagesDisrupted(editor.get()))
            .clickDiff()
          break
      }
    }
  });

  async function pagesDisrupted(content) {
    let titles = []

    for (let title of content.matchAll(/{{pagelinks\|(.*)}}/ig)) {
      titles.push(title[1])
    }

    let promises = []

    while (titles.length > 0) {
      promises.push($.get('https://en.wikipedia.org/w/api.php', {
        format: 'json',
        formatversion: 2,
        action: 'query',
        origin: '*',
        prop: 'revisions',
        titles: titles.splice(0, 50).join('|'),
        rvprop: 'timestamp|user|comment',
      }))
    }

    await Promise.allSettled(promises).then(responses => {
      for (const response of responses) {
        for (let page of Object.entries(response['value']['query']['pages'])) {
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
      }
    })

    return content
  }

  async function usersConfirmed(content) {
    let allUsers = content.matchAll(/\|\s*{{User\|(.*)}}/ig)
    let users = []

    for (let user of allUsers) {
      users.push(user[1])
    }

    let promises = []

    for (const user of users) {
      promises.push($.get('https://en.wikipedia.org/w/api.php', {
        format: 'json',
        formatversion: 2,
        action: 'query',
        origin: '*',
        list: 'usercontribs',
        ucuser: user,
        uclimit: 1,
      }))
    }

    await Promise.allSettled(promises).then(responses => {
      console.log(responses)

      for (const response of responses) {
        // User has no contributions
        if (response['value']['query']['usercontribs'].length === 0) {
          continue
        }

        let usercontribs = response['value']['query']['usercontribs'][0]

        let lastEdited = new Date(usercontribs['timestamp'])
        let lastEditedText = lastEdited.toLocaleString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'})
        let revid = usercontribs['revid']
        let type = determineType(lastEdited)

        let reUser = escapeRegex(usercontribs['user'])
        let reStr = `({{User\\|${reUser}}}(?:\\n\\|.*){4}\\n)\\|.*\\n\\|.*(?=\\n\\|[-}])`
        let re = new RegExp(reStr, 'i')

        if (!re.test(content)) {
          reStr = `({{User\\|${reUser}}}(?:\\n\\|.*){2}\\n)\\|.*\\n\\|.*(?=\\n\\|[-}])`
          re = new RegExp(reStr, 'i')
        }

        content = content.replace(
          re,
          `$1| {{ColorCell|${lastEditedText}|type=${type}}}\n| [https://en.wikipedia.org/w/index.php?diff=${revid}&diffmode=source]`
        )
      }
    })

    return content;
  }

  function escapeRegex(text) {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
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
})

//</nowiki>
