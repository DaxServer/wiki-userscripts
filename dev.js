// <nowiki>
//
// DiscussionCloser
//
// Credits to DannyS712, Equazcion, Evad37, and Abelmoschus Esculentus
//            User:DannyS712/DiscussionCloser.js and further upstreams
//
// Maintained by DaxServer
//
// A Codex implementation
//         https://doc.wikimedia.org/codex/latest/
//
mw.loader.using(
	[ 'mediawiki.util', 'mediawiki.api', 'mediawiki.Title', '@wikimedia/codex', 'vue', ],
).then( function( require ) {
	// Allowed on these pages
	const specialAllowedPages = [
		'Wikipedia:In the news/Candidates',
	].map(page => page.replace(/ /g, '_'));

	// Allowed on these pages whose title starts with
	const specialAllowedPagesStartWith = [
		'Wikipedia:Requests for adminship/'
	].map(page => page.replace(/ /g, '_'));

	// Execute only if the page is valid for discussions
	if (mw.config.get('wgAction') !== 'view') {
		return;
	}

	const currentPage = mw.config.get('wgPageName');

	// Reject if the page is not eligible for discussions.
	// DiscussionTools config is available on all talk pages and its archives. ToDo: Investigate if this is a reliable check.
	if (!mw.config.exists('wgDiscussionToolsFeaturesEnabled') // DiscussionTools is not enabled, not likely a talk page
		&& !specialAllowedPages.includes(currentPage) // Not in the special allowed pages
		&& !specialAllowedPagesStartWith.some(page => currentPage.startsWith(page)) // Not in the special allowed pages whose title starts with
	) {
		return;
	}

	const Vue = require( 'vue' );
	const Codex = require( '@wikimedia/codex' );
	const mountPoint = document.body.appendChild( document.createElement( 'div' ) );
	const api = new mw.Api();

	const config = {
		name: '[[User:DaxServer/DiscussionCloser-new.js|DiscussionCloser]]',
		version: '0.6.0',
	};
	const attribution = `(${config.name} ${config.version})`;
	const defaultEditSummary = 'Closing discussion';

	const app = Vue.createMwApp( {
			data: function() {
				return {
					section: 0,
					showDialog: false,
					radios: [
						{ label: 'Generic (blue)', value: 'atop' },
						{ label: 'Generic (green)', value: 'atopg' },
						{ label: 'Generic (yellow)', value: 'atopy' },
						{ label: 'Generic (red)', value: 'atopr' },
						{ label: 'RfC', value: 'closed rfc top' },
						{ label: 'Hidden archive', value: 'hat' },
						{ label: 'Discussion', value: 'dtop' },
					],
					radioValue: Vue.ref( 'atop' ),
					status: '',
					statusEnabled: true,
					nac: true,
					comment: '',
					editSummary: '',
					preview: {
						message: {
							type: 'notice',
							text: 'This is a preview of the section after closure',
						},
						html: null,
					},
					inProgress: false,
					alreadyClosed: false,
					error: {
						text: null,
					},
				};
			},

			template: `
        <template>
          <cdx-dialog
              v-model:open="showDialog"
              title="Discussion Closer"
              class="disc-closer-dialog"
              close-button-label="Close"
              :show-dividers="true"
              :primary-action="primaryAction"
              :default-action="defaultAction"
              @update:open="resetApp"
              @default="onDefaultActionClicked"
              @primary="closeDiscussion"
              :primary-action-disabled="inProgress"
              :default-action-disabled="inProgress"
          >
            <cdx-progress-bar v-if="inProgress" aria-label="Indeterminate progress bar" />
            <div class="disc-closer-div" v-if="preview.html">
              <cdx-message :type="preview.message.type">{{ preview.message.text }}</cdx-message>
              <div class="disc-closer-div" v-if="error.text">
                <cdx-message type="error">{{ error.text }}</cdx-message>
              </div>
              <div v-html="preview.html"></div>
            </div>
            <div class="disc-closer-div" v-else>
              <cdx-field :is-fieldset="true" :hide-label="true">
                <cdx-radio
                    v-for="radio in radios"
                    :key="'radio-' + radio.value"
                    v-model="radioValue"
                    name="inline-radios"
                    :input-value="radio.value"
                    :inline="true"
                    @update:model-value="onRadioValueUpdate"
                >
                  {{ radio.label }}
                </cdx-radio>
                <template #help-text>
                  The discussion will be closed using the <a :href="templateLink"><span v-pre>{{</span>{{ radioValue }}<span v-pre>}}</span></a> template.
                </template>
              </cdx-field>
              <cdx-field optionalFlag="(optional)">
                <template #label>Status</template>
                <cdx-text-input v-model="status" :disabled="!statusEnabled"></cdx-text-input>
              </cdx-field>
              <cdx-field>
                <template #label>Closing comment</template>
                <cdx-text-area v-model="comment" :rows="5"></cdx-text-area>
                <template #help-text>Signature is automatically added.</template>
              </cdx-field>
              <cdx-field v-if="shouldAddNac">
                <template #label>Non-administrator closure</template>
                <cdx-checkbox v-model="nac">Add <span v-pre>{{subst:nac}}</span> before signature</cdx-checkbox>
                <template #help-text>Since you are not an administrator, <a title="Template:Non-admin closure" href="https://en.wikipedia.org/wiki/Template:Non-admin_closure"><span v-pre>{{subst:nac}}</span></a> will be added before signature, if a closing comment is added.</template>
              </cdx-field>
              <cdx-field optionalFlag="(optional)">
                <template #label>Edit summary</template>
                <cdx-text-input v-model="editSummary"></cdx-text-input>
                <template #help-text>"${defaultEditSummary}", if left blank.</template>
              </cdx-field>
              <div class="disc-closer-div" v-if="error.text">
                <cdx-message type="error">{{ error.text }}</cdx-message>
              </div>
            </div>
          </cdx-dialog>
        </template>`,

			computed: {
				primaryAction() {
					return {
						label: this.alreadyClosed ? 'Close discussion again' : 'Close discussion',
						actionType: this.alreadyClosed ? 'destructive' : 'progressive',
						disabled: this.inProgress,
					};
				},

				defaultAction() {
					return {
						label: this.preview.html === null ? 'Preview' : 'Modify inputs',
						actionType: 'progressive',
						disabled: this.inProgress,
					};
				},

				shouldAddNac() {
					return !mw.config.get('wgUserGroups').includes('sysop');
				},

				templateLink() {
					return `https://en.wikipedia.org/wiki/Template:${this.radioValue}`;
				},
			},

			methods: {
				resetApp(...args) {
					Object.assign(this.$data, this.$options.data.apply(this));
				},

				openDialog(section) {
					this.showDialog = true;
					this.section = section;
				},

				onRadioValueUpdate(value) {
					// RfC, hat, RM, and dtop do not have status
					this.statusEnabled = !(value === 'closed rfc top' || value === 'hat' || value === 'subst:RMT' || value === 'dtop');
				},

				_closeDiscussionAgain() {
					this.alreadyClosed = true;
					this.error.text = 'The discussion seem to have already been closed. Would you like to close again?';
					this.inProgress = false;
				},

				async onDefaultActionClicked() {
					if (this.preview.html === null) {
						await this.renderPreview();
					} else {
						this.preview.html = null;
					}
				},

				async closeDiscussion() {
					this.inProgress = true;

					let editSummary = this.editSummary.trim().length > 0 ? this.editSummary.trim() : defaultEditSummary;
					editSummary = `${editSummary} ${attribution}`;
					const { content, sectiontitle, wikitext } = await this._getWikiText();

					if (!this.alreadyClosed && this._alreadyClosed(content)) {
						// Toggle close discussion to destructive as the discussion is already closed
						this._closeDiscussionAgain();
						return;
					}

					api.post({
						action: 'edit',
						section: this.section,
						title: mw.config.get('wgPageName'),
						text: wikitext,
						summary: `/* ${sectiontitle} */ ${editSummary}`,
						token: mw.user.tokens.get('csrfToken'),
					}).done(function() {
						this.showDialog = false;
						window.location.hash = sectiontitle.replace(/\s/g, '_');
						window.location.reload();
					});
				},

				async renderPreview() {
					this.inProgress = true;
					this.preview.html = null;

					const { content, wikitext } = await this._getWikiText();

					const preview = await api.post({
						format: 'json',
						action: 'parse',
						pst: 1,
						text: wikitext,
						title: mw.config.get('wgPageName'),
						prop: 'text',
					});

					this.preview.html = preview.parse.text['*'];
					this.inProgress = false;

					if (this._alreadyClosed(content)) {
						this._closeDiscussionAgain();
					}
				},

				async _getWikiText() {
					const response = await api.get({
						action: 'query',
						titles: mw.config.get('wgPageName'),
						rvsection: this.section,
						prop: 'revisions|info',
						rvslots: 'main',
						rvprop: 'content',
						formatversion: 2,
					});

					const top = this._make_top();
					const bottom = this._make_bottom();
					const content = response.query.pages[0].revisions[0].slots.main.content;
					const discussiontext = content.substring(content.indexOf('\n'));
					const title = content.substring(0, content.indexOf('\n'));
					const sectiontitle = title.replace(/=/g, '').trim();

					const wikitext = title + '\n' + top + discussiontext + '\n' + bottom;

					return {
						content,
						sectiontitle,
						wikitext,
					};
				},

				_alreadyClosed(content) {
					content = content.toLowerCase();
					return content.includes('{{atop') ||
						content.includes('{{archive') ||
						content.includes('{{dtop') ||
						content.includes('{{discussion top') ||
						content.includes('{{hat') ||
						content.includes('{{hidden archive top') ||
						content.includes('{{crt') ||
						content.includes('{{rfctop') ||
						content.includes('{{closed rfc') ||
						content.includes('{{ptop') ||
						content.includes('{{polltop') ||
						content.includes('{{poll top') ||
						content.includes('<!-- template:rm top -->')
						;
				},

				_make_top() {
					const comment = this.comment.trim().replace(/\s*{{(\s*subst\s*:\s*)?(Non-admin closure|nac)\s*}}\s*(~~~~)?$/i, '');
					const nac = this.shouldAddNac && this.nac ? ' {{subst:nac}}' : '';
					const status = this.statusEnabled && this.status.trim().length > 0 ? this.status.trim() : '';
					const signedNacComment = `${comment}${nac} ~~~~`;

					let args = {};
					switch (this.radioValue) {
						case 'atop':
						case 'atopg':
						case 'atopr':
						case 'atopy':
							if (status.length > 0) {
								args.status = status;
							}
							if (comment.length > 0) {
								args.result = signedNacComment;
							}
							break;
						case 'dtop':
							if (comment.length > 0) {
								args.result = signedNacComment;
							}
							break;
						case 'hat':
							if (comment.length > 0) {
								args.result = this.comment;
							}
							args.closer = mw.config.get('wgUserName');
							break;
						case 'closed rfc top':
							if (comment.length > 0) {
								args.result = signedNacComment;
							}
							break;
						default:
							if (status.length > 0) {
								args.status = status;
							}
							if (comment.length > 0) {
								args.result = signedNacComment;
							}
					}

					let arg = Object.keys(args).map((key) => `| ${key} = ${args[key]}`).join(`\n`);
					arg = arg.length > 0 ? `\n${arg}\n` : '';

					return `{{${this.radioValue}${arg}}}`.replace(/\n+/g, `\n`);
				},

				_make_bottom() {
					let bottom;
					switch (this.radioValue) {
						case 'atop':
						case 'atopr':
						case 'atopy':
						case 'atopg':
							bottom = 'abot';
							break;
						case 'dtop':
							bottom = 'dbot';
							break;
						case 'hat':
							bottom = 'hab';
							break;
						case 'closed rfc top':
							bottom = 'closed rfc bottom';
							break;
						default:
							bottom = 'abot';
					}
					return `{{${bottom}}}`;
				},
			},
		})
			.component( 'cdx-button', Codex.CdxButton )
			.component( 'cdx-checkbox', Codex.CdxCheckbox )
			.component( 'cdx-dialog', Codex.CdxDialog )
			.component( 'cdx-field', Codex.CdxField )
			.component( 'cdx-message', Codex.CdxMessage )
			.component( 'cdx-progress-bar', Codex.CdxProgressBar )
			.component( 'cdx-radio', Codex.CdxRadio )
			.component( 'cdx-text-input', Codex.CdxTextInput )
			.component( 'cdx-text-area', Codex.CdxTextArea )
			.mount( mountPoint )
	;

	const styles = `
.DC-close-widget {
	display: inline-block;
	float: right;
	font-weight: normal;
	font-size: 0.8rem;

	.mw-editsection-divider {
		margin: 0 0.2rem;
		display: inline;
	}
}

.disc-closer-dialog {
	max-width: min(75%, 64rem);
}

.vector-feature-limited-width-clientpref-1 {
	.disc-closer-dialog {
		max-width: 32rem; /* https://gerrit.wikimedia.org/r/plugins/gitiles/design/codex/+/refs/heads/main/packages/codex/src/components/dialog/Dialog.vue#561 */
	}
}

.disc-closer-div {
	margin-top: 1rem;
}
`;
	mw.loader.addStyleTag(styles);

	$('h2[data-mw-thread-id], h3[data-mw-thread-id], h4[data-mw-thread-id]').each(function(index) {
		const parent = $(this).parent();

		parent.append('<div class="DC-close-widget"><span class="mw-editsection-divider">|</span><a class="DC-closeLink">Close</a></div>');
		parent.find('a.DC-closeLink').click(function() {
			app.openDialog(index + 1); // Sections are 1-indexed
		});
	});
} );
// </nowiki>
