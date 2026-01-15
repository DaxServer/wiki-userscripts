// <nowiki>

$.when(
  $.ready,
  mw.loader.using( [ 'mediawiki.util', 'mediawiki.api' ] )
).then(() => {
  if (mw.config.get('wgPageName') !== "Special:WantedCategories") {
    return;
  }

  const api = new mw.Api();

  $('#mw-content-text .mw-spcontent li').each(function () {
    const link = $(this).find('bdi a');
    link.attr('href', link.attr('href').replace('&action=edit&redlink=1', '')).attr('target', '_blank');

    if ($(this).find('del').length !== 0) {
      return;
    }

    // create a span element with text "Create"
    const span = $('<span>').text('Create').css('cursor', 'pointer').css('color', 'fuchsia').css('margin-left', '0.5rem');

    // append the span element to the li element
    $(this).append(span);

    const title = `Category:${link.text().trim()}`;

    // Check if the category has been deleted
    api.get({
      action: 'query',
      list: 'logevents',
      letype: 'delete',
      letitle: title,
    }).then((res) => {
      if ((res?.query?.logevents || []).length === 0) {
        return;
      }

      span.text('Deleted').css('cursor', 'help').css('color', 'maroon');
    });

    // add a click event listener to the span element
    span.on('click', function() {
      span.off('click').css('cursor', 'wait');

      // get the category name from the li element
      const category = $(this).parent().find('a').text().trim();

      // Change text to "Creating..."
      span.text('Creating...');

      let text = '{{subst:unc}}';

      const matches = category.match(/^Uploaded via Campaign:(.*)$/);
      if (matches) {
        text = `{{Hidden cat}}
[[Category:Uploaded via Campaign|${matches[1]}]]`;
      }

      const photographerMatches = category.match(/^Photos by (.+) for (Mehr|Tasnim|Moj|Fars) News Agency$/);
      if (photographerMatches) {
        text = `{{${photographerMatches[2]} photographer category|${photographerMatches[1]}}}`;
      }

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

        // Change text to "Created"
        // Remove the onclick event listener from the span element
        span.text('Created').css('cursor', 'auto').css('color', 'inherit');

        // Create a new link element
        const link = $('<a>').attr('href', `/wiki/${res.edit.title}`).text(res.edit.title).attr('target', '_blank').css('margin-left', '0.5rem');

        // Append the link element to the span element
        span.append(link);
      });
    });
  });
});

// </nowiki>
