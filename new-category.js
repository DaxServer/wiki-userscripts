// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util', 'mediawiki.api' ] )
).then(() => {
  if (mw.config.get('wgPageName') !== "Special:WantedCategories") {
    return;
  }

  const api = new mw.Api();

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
});

// </nowiki>
