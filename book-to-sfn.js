//<nowiki>

/**
 * –––––
 *       YOU ARE FULLY RESPONSIBLE FOR PUBLISHING EDITS USING THIS SCRIPT
 * –––––
 *
 * This script is not ready for use, unless of course, if you know what you are doing.
 * You must verify if the conversion is successful and modify if not.
 * Recommended to also use the [[User:Trappist the monk/HarvErrors]] script in conjunction.
 */

$.when(
    $.ready
).then(function () {
    // Only on main namespace or sandbox
    if ( ! [0, 2].includes(mw.config.get('wgNamespaceNumber'))) {
        return
    }

    let articleName = mw.config.get('wgPageName')
	articleName = encodeURIComponent(articleName); // fix bug involving & not getting converted to &amp;
	let pageIsSandbox = articleName.match(/sandbox$/)

    // Only in sandbox in user namespace
    if (2 === mw.config.get('wgNamespaceNumber') && ! pageIsSandbox) {
        return
    }

    let notifyTitle = 'Books-to-Sfn'

    // Activate portlet when VE source editor is enabled
    mw.hook( 've.activationComplete' ).add(function () {
        // Remove portlet when VE visual editor is enabled
        if (0 === $('.ve-ui-surface-source').length) {
            $('#ds-books-to-sfn').remove()

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
        $('#ds-books-to-sfn').remove()
    })

    function main() {
        const node = mw.util.addPortletLink('p-tb', '#', 'Books to Sfn dev', 'ds-books-to-sfn', 'Convert {{cite book}} to {{Sfn}}')

        $( node ).click(function (e) {
            let books = []
            let textBox = $('#wpTextbox1')
            let match, page, cite
            let errors = 0
            let index = 0
            let errorMatches = []

            if ( ! checkIfRefSectionExists(textBox)) {
                return
            }

            // ToDo Add support for quotes?
            loops = 2

            while (true) {
                loops--
                match = getNextMatch(index)

                if (null === match) {
                    break
                }

                // Determine author names
                let authorNames = determineAuthorNames(match[2], 'last')
                console.log('Last name(s)', authorNames)

                if (0 === authorNames.length) {
                    authorNames = determineAuthorNames(match[2], 'author')
                    console.log('Author(s)', authorNames)
                }

                if (0 === authorNames.length) {
                    authorNames = determineAuthorNames(match[2], 'editor')
                    console.log('Editor(s)', authorNames)
                }

                if (authorNames.length > 4) {
                    console.error('More than four authors found. Please fix it manually.', authorNames, match)
                    // mw.notify('More than four authors found. Please fix it manually.', {
                    //     type: 'error',
                    //     title: notifyTitle,
                    // })
                    errors++
                    errorMatches.push({
                        error: 'More than four authors found',
                        match,
                    })

                    // Increment index as we need the next match
                    index = match.index + 1

                    break
                }

                if (0 === authorNames.length) {
                    console.error('Last name(s) / author(s) / editor(s) could not be determined. Please fix it manually.', authorNames, match)
                    // mw.notify('Last name(s) and author(s) could not be determined. Please fix it manually.', {
                    //     type: 'error',
                    //     title: notifyTitle,
                    // })
                    errors++
                    errorMatches.push({
                        error: 'Last name(s) / author(s) / editor(s) could not be determined',
                        match,
                    })

                    // Increment index as we need the next match
                    index = match.index + 1

                    if (0 === loops) {
                        break
                    } else {
                        continue
                    }
                }
                // End author names

                // Determine year
                let year = determineYear(match[2])
                console.log('Year', year)

                if (null === year) {
                    console.error('Year could not be determined. Please fix it manually.', match)
                    // mw.notify('Year could not be determined. Please fix it manually.', {
                    //     type: 'error',
                    //     title: notifyTitle,
                    // })
                    errors++
                    errorMatches.push({
                        error: 'Year could not be determined',
                        match,
                    })

                    // Increment index as we need the next match
                    index = match.index + 1

                    break
                }

                // Determine page
                ({page, cite} = determinePage(match[2]))
                console.log('Page(s)', page)
                console.log(cite)

                // Duplicate Refs to replace with Sfn
                duplicateRefs(textBox, match[1], match[0])

                // Replace with Sfn
                replaceWithSfn(textBox, authorNames, year, page, match[0])

                books.push(cite)

                // One conversion per click
                break
            }

            if (0 === books.length) {
                if (errors > 0) {
                    mw.notify(`First error: ${errorMatches[0]['error']}. Please fix it manually.`, {
                        type: 'error',
                        title: `${notifyTitle}: ${errors} error(s)`,
                        autoHideSeconds: 'long',
                    })

                    // Highlight the first error
                    let content = textBox.textSelection('getContents')

                    textBox.textSelection('setSelection', {
                        start: content.indexOf(errorMatches[0]['match'][0]),
                        end: content.indexOf(errorMatches[0]['match'][0]) + errorMatches[0]['match'][0].length,
                    })

                    console.log(errorMatches)
                } else {
                    mw.notify('No books to convert', {
                        title: notifyTitle,
                    })
                }

                return
            }

            // Create Bibliography sub-section under References
            createBiblioSectionIfNotExists(textBox)

            // Add Sfns to Bibliography section
            addBooksToBibliography(textBox, books)

            // Hook to add edit summary
            mw.hook( 've.saveDialog.stateChanged' ).add(prefillEditSummary)

            e.preventDefault()
        })
    }

    const matchRe = /<ref(?: name=["']?([\w\s]+)["']?)?>(\{\{cite book\s?\|[|\w\s=?-–-&'#.:+,%\/[\]()]+\}\})<\/ref>/imu
    const yearRe = /(?<=year\s*=)([\w\s]*)(?=\||}})/im
    const dateRe = /(?<!access-?)date\s*=([\w\s-]*)(?=\||}})/im
    const pageRe = /\|\s*page\s*=([\w\s]*)(?=\||}})/im
    const pagesRe = /\|\s*pages\s*=([\w\s–]*)(?=\||}})/im
    const reflistRe = /==\s?References\s?==\s*{{Reflist(\|.*)?}}/im
    const biblioRe = /(===? ?Bibliography ?===?\s?\{\{Refbegin(\|.*)?\}\}\s(?:\*\s\{\{cite book[|\w\s=?-–-&'#.:+,%\/[\]()]+\}\}\s){0,})\{\{Refend\}\}/imu

    function getNextMatch(index) {
        console.log('Index for match to start from', index)
        const content = $('#wpTextbox1').textSelection('getContents')

        if ( ! matchRe.test(content.substring(index))) {
            console.log('No matches')

            return null
        }

        return matchRe.exec(content.substring(index))
    }

    function determineAuthorNames(cite, type) {
        let match
        let names = []
        let nameReStr = `\\|\\s*${type}\\s*=([\\w\\s\\.]*)(?=\\|\|\\}\\})`
        let re = new RegExp(nameReStr, 'imu')

        console.log(cite)

        // Determine author name without index
        if (re.test(cite)) {
            match = re.exec(cite)
            names.push(match[1].trim())
        }

        let nameIndex = 1

        // Determine n author names with indexing
        while (true) {
            nameReStr = `\\|\\s*${type}${nameIndex}\\s*=([\\w\\s\\.]*)(?=\\|\|\\}\\})`
            re = new RegExp(nameReStr, 'imu')

            console.log(re)

            // n author name not found. No further searches for names
            if ( ! re.test(cite)) {
                break
            }

            match = re.exec(cite)
            names.push(match[1].trim())

            nameIndex++
        }

        return names
    }

    function determineYear(cite) {
        if (yearRe.test(cite)) {
            return yearRe.exec(cite)[1].trim()
        }

        // Determine year from date
        if ( ! dateRe.test(cite)) {
            return null
        }

        return (new Date(dateRe.exec(cite)[1])).getFullYear()
    }

    function determinePage(cite) {
        let result = {
            page: '',
            cite,
        }

        if (pageRe.test(cite)) {
            result.page = `|p=${pageRe.exec(cite)[1].trim()}`
            result.cite = cite.replace(pageRe, '')
        } else {
            if (pagesRe.test(cite)) {
                result.page = `|pp=${pagesRe.exec(cite)[1].trim()}`
                result.cite = cite.replace(pagesRe, '')
            }
        }

        return result
    }

    // Duplicate Refs to replace with Sfn
    function duplicateRefs(textBox, refName, fullRef) {
        console.log('RefName', refName)

        // Ref not duplicated
        if (undefined === refName) {
            return
        }

        const reStr = `<ref name=\["']?${refName}\["']? ?\\/>`
        const content = textBox.textSelection('getContents')

        textBox.textSelection('setContents', content.replaceAll(new RegExp(reStr, 'imgu'), fullRef))
    }

    function replaceWithSfn(textBox, authorNames, year, page, fullRef) {
        // page will have pipe set
        let sfn = `{{Sfn|${authorNames.join('|')}|${year}${page}}}`

        console.log('Sfn', sfn);

        const content = textBox.textSelection('getContents')

        textBox.textSelection('setContents', content.replaceAll(fullRef, sfn))

        mw.notify( `Replaced ${sfn}`, {
            type: 'success',
            title: notifyTitle,
        })
    }

    function checkIfRefSectionExists(textBox) {
        const content = textBox.textSelection('getContents')

        // Bibliography section exists
        if (biblioRe.test(content)) {
            return true
        }

        // References section exists, but not Bibliography which can be created
        if (reflistRe.test(content)) {
            return true;
        }

        // References section regex failure
        mw.notify('References section not found. Possible regex failure.', {
            type: 'error',
            title: notifyTitle,
        })

        return false
    }

    function createBiblioSectionIfNotExists(textBox) {
        const content = textBox.textSelection('getContents')

        // Section exists
        if (biblioRe.test(content)) {
            return;
        }

        const reflistMatch = reflistRe.exec(content)

        // Add Bibliography section
        textBox.textSelection('encapsulateSelection', {
            post: `\n\n=== Bibliography ===\n{{Refbegin}}\n{{Refend}}`,
            selectionStart: content.indexOf(reflistMatch[0]),
            selectionEnd: content.indexOf(reflistMatch[0]) + reflistMatch[0].length,
        })
    }

    function addBooksToBibliography(textBox, books) {
        const content = textBox.textSelection('getContents')

        let bookRefStr = ''
        for (let book of books) {
            bookRefStr += `* ${book}\n`
        }

        const biblioMatch = biblioRe.exec(content)

        textBox.textSelection('encapsulateSelection', {
            post: bookRefStr,
            selectionStart: content.indexOf(biblioMatch[1]),
            selectionEnd: content.indexOf(biblioMatch[1]) + biblioMatch[1].length,
        })
    }

    function prefillEditSummary() {
        if (ve.init.target.saveDialog) {
            ve.init.target.saveDialog.editSummaryInput.$input.val('Convert [[Template:Cite book|{{cite book}}]] references to [[Template:Sfn|Sfn]]s ([[User:DaxServer/BooksToSfn|BooksToSfn.js]])')
        }

        // Remove hook upon prefilling
        mw.hook( 've.saveDialog.stateChanged' ).remove(prefillEditSummary)
    }
})

//</nowiki>
