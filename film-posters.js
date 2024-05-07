// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util', 'mediawiki.api' ] )
).then(() => {
  if (mw.config.get('wgNamespaceNumber') !== 6) {
    return
  }

  const api = new mw.Api()
  const langRe = /(\w+)-language/i
  const countryRe = /\d{4}s (\w+)/i

  mw.hook( 've.activationComplete' ).add( function () {
    // Remove portlet when VE visual editor is enabled
    if ('visual' === ve.init.target.getSurface().mode) {
      $('#ds-film-poster').remove()

      return
    }

    const node = mw.util.addPortletLink('p-tb', '#', 'Film poster', 'ds-film-poster')

    $(node).on('click', async e => {
      const textBox = $('#wpTextbox1')

      textBox.textSelection('setContents', await checkFileUsageCount(textBox.textSelection('getContents')))

      // Hook to add edit summary
      mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)
    })
  } );

  // Remove portlet when VE is deactivated
  mw.hook( 've.deactivationComplete' ).add(function () {
    $('#ds-film-poster').remove()
  })

  // Prefilled edit summary for VisualEditor
  const prefillEditSummary = () => {
    if (ve.init.target.saveDialog) {
      ve.init.target.saveDialog.editSummaryInput.$input.val('[[WP:DIFFUSE]] categories')
    }

    // Remove hook upon prefilling
    mw.hook( 've.saveDialog.stateChanged' ).remove(prefillEditSummary)
  }

  /**
   * TemplateScript adds configurable templates and scripts to the sidebar, and adds an example regex editor.
   * @see https://meta.wikimedia.org/wiki/TemplateScript
   * @update-token [[File:Pathoschild/templatescript.js]]
   */
  $.ajax('//tools-static.wmflabs.org/meta/scripts/pathoschild.templatescript.js', { dataType:'script', cache:true }).then(function() {
    pathoschild.TemplateScript.add({
      name: 'Film poster',
      script: async editor => {
        editor.set(await checkFileUsageCount(editor.get()))
        editor.appendEditSummary('[[WP:DIFFUSE]]').clickDiff()
      }
    })
  })

  const checkFileUsageCount = async (content) => {
    const response = await api.get({
      format: 'json',
      formatversion: 2,
      action: 'query',
      prop: 'fileusage',
      titles: mw.config.get('wgPageName'),
    })

    if (null === content.match(/{{\s*non-free use rationale poster/i)) {
      mw.notify('Rationale poster template is not set', {
        title: 'Film poster',
        type: 'error',
      })

      // return
    }

    if (response.query.pages[0].fileusage.length !== 1) {
      mw.notify('Used in multiple pages', {
        title: 'Film poster',
        type: 'error',
      })

      return content
    }

    return await parseCategories(content, response.query.pages[0].fileusage[0].title)
  }

  const parseCategories = async (content, titles) => {
    const response = await api.get({
      format: 'json',
      formatversion: 2,
      action: 'query',
      prop: 'categories',
      titles,
      cllimit: 500,
    })

    const categoryContent = response.query.pages[0]['categories'].map((cat => `[[${cat['title']}]]`)).join("\n")
    const matches = [...categoryContent.matchAll(/\[\[Category:(.+) films]]/igm)]

    console.log('Content before', content)
    console.log('Categories in article', categoryContent)
    console.log('Matches', matches)

    let categories = new Set()
    matches.forEach(match => {
      if (countries.includes(match[1])) {
        categories.add(`${match[1]} film posters`)
      }

      if (langRe.test(match[1])) {
        const langMatch = match[1].match(langRe)
        categories.add(`Film posters for ${langMatch[1]}-language films`)
      } else if (countryRe.test(match[1])) {
        // Set in else-if to avoid conflict with langRe
        const countryMatch = match[1].match(countryRe)
        categories.add(`${countryMatch[1]} film posters`)
      }
    })

    console.log('Categories determined', ...categories)

    if (matches.length > 0) {
      content = content.replace(/\[\[Category:Fair use images of film posters(?:\|.*)?]]/i, '')
      content = content.replace(/{{Non-free (?:film|movie)? ?poster(?:\|Fair use images of (?:film|movie) posters)?(?:\|image[_\s]has[_\s]rationale=yes)?(?:\|Fair use images of (?:film|movie) posters)?}}/i, `{{Non-free film poster|image has rationale=yes|nocat=true}}\n\n`)
    }

    content = content.concat(
      [...categories]
        .filter(category => content.indexOf(`[[Category:${category}]]`) === -1)
        .map(category => `[[Category:${category}]]`)
        .join("\n")
    )

    content = content
      .replace(/\n{2,}/g, "\n\n")
      .trim()
      .replace(/==(Summary|Licensing):?==/ig, '== $1 ==')
      .replace(/(?<!== Licensing ==\n)({{Non-free film poster\|)/, "== Licensing ==\n$1")

    if (!content.startsWith('== Summary ==')) {
      content = "== Summary ==\n" + content
    }

    console.log('Content after', content)

    mw.notify('Categories diffused', {
      title: 'Film poster',
      type: 'success',
    })

    return content
  }

  let countries = [
    'Latin',

    'Afghan',
    'Albanian',
    'Algerian',
    'American',
    'Andorran',
    'Angolan',
    'Antigua and Barbuda',
    'Argentine',
    'Armenian',
    'Australian',
    'Austrian',
    'Austro-Hungarian',
    'Azerbaijani',
    'Bahamian',
    'Bahraini',
    'Bangladeshi',
    'Belarusian',
    'Belgian',
    'Beninese',
    'Bhutanese',
    'Bolivian',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazilian',
    'British',
    'Bruneian',
    'Bulgarian',
    'Burkinabé',
    'Burmese',
    'Burundian',
    'Cambodian',
    'Cameroonian',
    'Canadian',
    'Cape Verdean',
    'Chadian',
    'Chilean',
    'Chinese',
    'Colombian',
    'Comorian',
    'Democratic Republic of the Congo',
    'Republic of the Congo',
    'Costa Rican',
    'Croatian',
    'Cuban',
    'Curaçaoan',
    'Cypriot',
    'Czech',
    'Czechoslovak',
    'Danish',
    'Djiboutian',
    'Dominican Republic',
    // 'Films of the Dutch East Indies',
    'Dutch',
    'East Timorese',
    'Ecuadorian',
    'Egyptian',
    'Emirati',
    'Equatoguinean',
    'Estonian',
    'Ethiopian',
    'Faroese',
    'Fijian',
    'Finnish',
    'French',
    'Gabonese',
    'Gambian',
    // 'Films from Georgia (country)',
    'German',
    'Ghanaian',
    'Greek',
    'Greenlandic',
    'Guatemalan',
    'Bissau-Guinean',
    'Guinean',
    'Haitian',
    'Honduran',
    'Hong Kong',
    'Hungarian',
    'Icelandic',
    // 'Indian',
    'Indonesian',
    'Iranian',
    'Iraqi',
    'Irish',
    'Israeli',
    'Italian',
    'Ivorian',
    'Jamaican',
    'Japanese',
    'Jordanian',
    'Kazakhstani',
    'Kenyan',
    'Korean',
    'Kosovan',
    'Kuwaiti',
    'Kyrgyzstani',
    'Laotian',
    'Latvian',
    'Lebanese',
    'Lesotho',
    'Liberian',
    'Libyan',
    'Lithuanian',
    'Luxembourgian',
    'Macedonian',
    'Malagasy',
    'Malawian',
    'Malaysian',
    'Maldivian',
    'Malian',
    'Maltese',
    'Mauritanian',
    'Mauritian',
    'Mexican',
    'Moldovan',
    'Mongolian',
    'Montenegrin',
    'Moroccan',
    'Mozambican',
    'Namibian',
    'Nepalese',
    'New Zealand',
    'Nicaraguan',
    'Nigerian',
    'Nigerien',
    'Norwegian',
    'Pakistani',
    'Palestinian',
    'Panamanian',
    'Paraguayan',
    'Peruvian',
    'Philippine',
    'Polish',
    'Portuguese',
    'Qatari',
    'Romanian',
    'Russian',
    'Rwandan',
    'Sahrawi',
    'Samoan',
    'Saudi Arabian',
    'Senegalese',
    'Serbian',
    'Sierra Leonean',
    'Singaporean',
    'Slovak',
    'Slovenian',
    'Somalian',
    'South African',
    'South Korean',
    'South Sudanese',
    'Soviet',
    'Spanish',
    'Sri Lankan',
    'Sudanese',
    'Surinamese',
    'Swazi',
    'Swedish',
    'Swiss',
    'Syrian',
    'Taiwanese',
    'Tajikistani',
    'Tanzanian',
    'Thai',
    'Togolese',
    'Tongan',
    'Trinidad and Tobago',
    'Tunisian',
    'Turkish',
    'Turkmenistan',
    'Ugandan',
    'Ukrainian',
    'Uruguayan',
    'Uzbekistani',
  ]
})

// </nowiki>
