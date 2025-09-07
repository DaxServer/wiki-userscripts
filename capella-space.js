// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util' ] )
).then(() => {
  if (mw.config.get('wgNamespaceNumber') !== 6) {
    return
  }

  const stacApiRe = /Further data via \[(.*) STAC API]/i
  const bboxRe = /{{Map\/bbox\|longitude=-?\d+\.\d+\/-?\d+\.\d+\|latitude=-?\d+\.\d+\/-?\d+\.\d+}}/i
  const licenseRe = /}\n\n=={{int:license-header}}==/i
  const descriptionRe = /(\s*\|\s*description\s*=\s*{{en\|1=Capella Space Open Data: [A-Za-z0-9\s\-]*)(}}\s*\|\s*date)/i
  const permissionRe = /(\s*\|\s*permission\s*=\s*{{en\|[A-Za-z0-9\s\-:\/.\[\]]*)(}})/i

  mw.hook( 've.activationComplete' ).add( function () {
    // Remove portlet when VE visual editor is enabled
    if ('visual' === ve.init.target.getSurface().mode) {
      $('#ds-film-poster').remove()

      return
    }

    const node = mw.util.addPortletLink('p-cactions', '#', 'Capella Space', 'ds-capella-space')

    $(node).on('click', async e => {
      const textBox = $('#wpTextbox1')

      textBox.textSelection('setContents', await makeCorrection(textBox.textSelection('getContents')))

      // Hook to add edit summary
      mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)
    })
  } );

  // Remove portlet when VE is deactivated
  mw.hook( 've.deactivationComplete' ).add(function () {
    $('#ds-capella-space').remove()
  })

  // Prefilled edit summary for VisualEditor
  const prefillEditSummary = () => {
    if (ve.init.target.saveDialog) {
      ve.init.target.saveDialog.editSummaryInput.$input.val('fix bbox, +object location template')
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
      name: 'Capella Space',
      script: async editor => {
        editor.set(await checkFileUsageCount(editor.get()))
        editor.appendEditSummary('fix bbox, +object location template').clickDiff()
      }
    })
  })

  const makeCorrection = async (content) => {
    const stacResponse = await fetch(content.match(stacApiRe)[1])
    const stacJson = await stacResponse.json()

    const lon = stacJson.properties['proj:centroid']['lon']
    const lat = stacJson.properties['proj:centroid']['lat']

    const newBbox = `{{Map/bbox|longitude=${stacJson.bbox[0]}/${stacJson.bbox[2]}|latitude=${stacJson.bbox[1]}/${stacJson.bbox[3]}}}`
    content = content.replace(bboxRe, newBbox)

    if (content.indexOf('Object location') === -1) {
      const objectLocation = `}\n{{Object location|lon=${lon}|lat=${lat}}}\n\n=={{int:license-header}}==`
      content = content.replace(licenseRe, objectLocation)
    }

    if (content.indexOf('osm.org') === -1) {
      content = geocode(content, lon, lat)
    }

    return content
  }

  const geocode = async (content, lon, lat) => {
    const geocodingResponse = await fetch(`https://nominatim.geocoding.ai/reverse?lat=${lat}&lon=${lon}&zoom=10&format=json`)
    const geocodingJson = await geocodingResponse.json()

    if ('error' in geocodingJson) {
      return content
    }

    content = content.replace(descriptionRe, `$1. Location: ${geocodingJson.display_name}$2`)
    content = content.replace(permissionRe, `$1. Reverse geocoding in description and category: Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright$2`)

    let country = geocodingJson.address.country

    switch (geocodingJson.address.country_code) {
      case 'gb':
      case 'cd':
      case 'nl':
      case 'ph':
      case 'ae':
        country = `the ${geocodingJson.address.country}`
        break
      case 'cg':
        country = 'the Republic of the Congo'
        break
      case 'us':
        country = 'state' in geocodingJson.address ? `${geocodingJson.address.state}` : 'the United States'
        break
    }

    if (content.indexOf(`[[Category:Images of ${country} by Capella]]`) === -1) {
      content = content.trimEnd() + `\n[[Category:Images of ${country} by Capella]]`
    }

    return content
  }
} )

// </nowiki>
