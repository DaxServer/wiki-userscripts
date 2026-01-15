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

  // Helper function to create a category
  const createCategory = (span, text, spanToRemove) => {
    span.off('click').css('cursor', 'wait');

    const category = $(span).parent().find('a').text().trim();
    const title = `Category:${category}`;
    span.text('Creating...');

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
        console.log(res);
        span.text(res.error.info).css('cursor', 'auto').css('color', 'tomato');
        return;
      }

      span.text('Created').css('cursor', 'auto').css('color', 'inherit');

      const link = $('<a>').attr('href', `/wiki/${res.edit.title}`).text(res.edit.title).attr('target', '_blank').css('margin-left', '0.5rem');
      span.append(link);

      if (spanToRemove) {
        spanToRemove.remove();
      }
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

      // Create span elements
      const span = $('<span>').text('Create').css('cursor', 'pointer').css('color', 'fuchsia').css('margin-left', '0.5rem');

      if (isDeleted) {
        span.text('Deleted').css('cursor', 'help').css('color', 'maroon');
      }

      // Only create WI span if category was not deleted
      if (!isDeleted) {
        const spanWI = $('<span>').text('Create WI').css('cursor', 'pointer').css('color', 'darkorange').css('margin-left', '0.5rem');

        spanWI.on('click', function() {
          createCategory(spanWI, '{{WI}}', span);
        });

        // Add hover effect to underline the entire line
        span.add(spanWI).on('mouseenter', function() {
          $(this).parent().css('text-decoration', 'underline');
        }).on('mouseleave', function() {
          $(this).parent().css('text-decoration', 'none');
        });

        $(this).append(span, spanWI);
      } else {
        // Add hover effect for Deleted span too
        span.on('mouseenter', function() {
          $(this).parent().css('text-decoration', 'underline');
        }).on('mouseleave', function() {
          $(this).parent().css('text-decoration', 'none');
        });

        $(this).append(span);
      }

      // Click handler for main span
      span.on('click', function() {
        const category = $(this).parent().find('a').text().trim();
        createCategory(span, getCategoryText(category));
      });
    });
  });
});

// </nowiki>
