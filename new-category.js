// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util', 'mediawiki.api' ] )
).then(() => {
  const pageName = mw.config.get('wgPageName');
  const api = new mw.Api();

  if (pageName === 'Special:WantedCategories') {
    // Helper function to get category text based on pattern matching
    const getCategoryText = (category) => {
      const matches = category.match(/^Uploaded via Campaign:(.*)$/);
      if (matches) {
        return `{{Hidden cat}}
[[Category:Uploaded via Campaign|${matches[1]}]]`;
      }

      const photographerMatches = category.match(/^Photos by (.+) for (Mehr|Tasnim|Moj|Fars) News Agency$/);
      if (photographerMatches) {
        return `{{${photographerMatches[2]} photographer category|${photographerMatches[1]}}}`;
      }

      const bostonMatches = category.match(/^(\w+) (\d{4}) in Boston$/);
      if (bostonMatches) {
        const month = String(new Date(`${bostonMatches[1]} 1`).getMonth() + 1).padStart(2, '0');
        const year = bostonMatches[2];
        return `{{MonthbyyearBoston|${year.slice(0, 3)}|${year.slice(3)}|${month}}}`;
      }

      const lensMatches = category.match(/^Lens focal length (\d+) mm$/);
      if (lensMatches) {
        const focalLength = parseInt(lensMatches[1], 10);
        const padded = String(focalLength).padStart(5, '0');
        return `{{ImageTOC}}
{{Hiddencat}}

[[Category:Photographs by lens focal length| ${padded}]]`;
      }

      return '{{subst:unc}}';
    };

    // Helper function to update both spans during creation
    const setCreatingState = (spans) => {
      spans.forEach(span => {
        span.off('click mouseenter mouseleave').css({
          'cursor': 'wait',
          'text-decoration': 'none'
        }).text('Creating...');
      });
    };

    // Helper function to set error state
    const setErrorState = (spans, message) => {
      spans.forEach(span => {
        span.off('mouseenter mouseleave').css({
          'cursor': 'auto',
          'color': 'tomato'
        }).text(message);
      });
      // Reset underline on bdi a
      spans[0].parent().find('bdi a').css('text-decoration', 'none');
    };

    // Helper function to set created state
    const setCreatedState = (spans, title) => {
      spans[0].off('mouseenter mouseleave').text('Created').css({
        'cursor': 'auto',
        'color': 'inherit'
      });

      const link = $('<a>').attr('href', `/wiki/${title}`).text(title).attr('target', '_blank').css('margin-left', '0.5rem');
      spans[0].append(link);

      // Remove the second span if exists
      if (spans[1]) {
        spans[1].remove();
      }

      // Reset underline on bdi a
      spans[0].parent().find('bdi a').css('text-decoration', 'none');
    };

    // Helper function to create a category
    const createCategory = (spans, text) => {
      setCreatingState(spans);

      const category = spans[0].parent().find('a').text().trim();
      const title = `Category:${category}`;

      api.post({
        action: 'edit',
        format: 'json',
        title,
        text,
        createonly: 1,
        token: mw.user.tokens.get('csrfToken'),
        formatversion: 2,
      }).then((res) => {
        if ('error' in res) {
          setErrorState(spans, res.error.info);
          return;
        }

        setCreatedState(spans, res.edit.title);
      });
    };

    // Helper function to add hover effect
    const addHoverEffect = (spans) => {
      spans.forEach(span => {
        span.on('mouseenter', function() {
          $(this).css('text-decoration', 'underline').parent().find('bdi a').css('text-decoration', 'underline');
        }).on('mouseleave', function() {
          $(this).css('text-decoration', 'none').parent().find('bdi a').css('text-decoration', 'none');
        });
      });
    };

    $('#mw-content-text .mw-spcontent li').each(function () {
      const link = $(this).find('bdi a');
      link.attr('href', link.attr('href').replace('&action=edit&redlink=1', '')).attr('target', '_blank');

      if ($(this).find('del').length !== 0) {
        return;
      }

      const title = `Category:${link.text().trim()}`;

      // Check if the category has been deleted before creating UI
      api.get({
        action: 'query',
        list: 'logevents',
        letype: 'delete',
        letitle: title,
      }).then((res) => {
        const isDeleted = (res?.query?.logevents || []).length > 0;
        const spans = [];

        if (isDeleted) {
          const deletedSpan = $('<span>').text('Deleted').css({
            'cursor': 'help',
            'color': 'maroon',
            'margin-left': '0.5rem'
          });
          spans.push(deletedSpan);
          $(this).append(deletedSpan);
        } else {
          // Create main span
          const span = $('<span>').text('Create').css({
            'cursor': 'pointer',
            'color': 'fuchsia',
            'margin-left': '0.5rem'
          });

          // Create WI span
          const spanWI = $('<span>').text('Create WI').css({
            'cursor': 'pointer',
            'color': 'darkorange',
            'margin-left': '0.5rem'
          });

          spans.push(span, spanWI);

          // Click handlers
          span.on('click', function() {
            const category = $(this).parent().find('a').text().trim();
            createCategory(spans, getCategoryText(category));
          });

          spanWI.on('click', function() {
            createCategory(spans, '{{WI}}');
          });

          $(this).append(span, spanWI);
        }

        // Add hover effect to all spans
        addHoverEffect(spans);
      });
    });
  } else if (pageName === 'Special:WhatLinksHere') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('target') !== 'Template:Country photographs taken on') {
      return;
    }

    const OLD_CONTENT_REGEX = /<includeonly>\{\{country photographs taken on\|[^|]+\|\{\{\{1\|\}\}\}\|\{\{\{2\|\}\}\}\|\{\{\{3\|\}\}\}\}\}<\/includeonly><noinclude>\{\{tlx\|country photographs taken on\|[^|]+\|<nowiki>\{\{\{1\|\}\}\}<\/nowiki>\|<nowiki>\{\{\{2\|\}\}\}<\/nowiki>\|<nowiki>\{\{\{3\|\}\}\}<\/nowiki>\}\}/;
    const NEW_CONTENT = '<includeonly>{{#invoke:Photographs taken on navbox|categorize_country}}</includeonly><noinclude>';
    const DOC_CONTENT = '{{Photographs taken on navbox module usage doc}}';

    const migrateTemplate = (title, span) => {
      span.off('click').css({ 'cursor': 'wait' }).text('Migrating...');

      api.get({
        action: 'query',
        prop: 'revisions',
        titles: title,
        rvprop: 'content',
        rvslots: 'main',
        formatversion: 2,
      }).then((res) => {
        const page = res.query.pages[0];
        const content = page.revisions[0].slots.main.content;

        if (!OLD_CONTENT_REGEX.test(content)) {
          span.css({ 'cursor': 'auto', 'color': 'tomato' }).text('Pattern not found');
          return;
        }

        const newContent = content.replace(OLD_CONTENT_REGEX, NEW_CONTENT);
        const docTitle = `${title}/doc`;
        const token = mw.user.tokens.get('csrfToken');

        return Promise.all([
          api.post({
            action: 'edit',
            title,
            text: newContent,
            summary: 'Migrate to [[Module:Photographs taken on navbox]]',
            token,
            formatversion: 2,
          }),
          api.post({
            action: 'edit',
            title: docTitle,
            text: DOC_CONTENT,
            summary: 'Add module usage doc',
            token,
            formatversion: 2,
          }),
        ]);
      }).then((results) => {
        if (!results) return;

        const errorResult = results.find(r => 'error' in r);
        if (errorResult) {
          span.css({ 'cursor': 'auto', 'color': 'tomato' }).text(errorResult.error.info);
          return;
        }

        span.css({ 'cursor': 'auto', 'color': 'green' }).text('Migrated');
      }).catch((err) => {
        span.css({ 'cursor': 'auto', 'color': 'tomato' }).text(`Error: ${err}`);
      });
    };

    $('#mw-whatlinkshere-list li').each(function () {
      const link = $(this).find('a').first();
      const title = link.attr('title');
      if (!title) return;

      const span = $('<span>').text('Migrate').css({
        'cursor': 'pointer',
        'color': 'fuchsia',
        'margin-left': '0.5rem'
      });

      span.on('click', function () {
        migrateTemplate(title, span);
      }).on('mouseenter', function () {
        span.css('text-decoration', 'underline');
        link.css('text-decoration', 'underline');
      }).on('mouseleave', function () {
        span.css('text-decoration', 'none');
        link.css('text-decoration', 'none');
      });

      link.on('mouseenter', function () {
        span.css('text-decoration', 'underline');
      }).on('mouseleave', function () {
        span.css('text-decoration', 'none');
      });

      $(this).append(span);
    });
  }
});

// </nowiki>
