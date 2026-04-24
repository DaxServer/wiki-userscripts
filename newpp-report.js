// <nowiki>

$.when(
	$.ready,
	mw.loader.using( 'mediawiki.util' )
).then(function () {
	const report = mw.config.get( 'wgPageParseReport' );
	if ( !report ) {
		return;
	}

	const { limitreport, scribunto, cachereport } = report;

	function formatBytes( n ) {
		if ( n >= 1048576 ) return ( n / 1048576 ).toFixed( 2 ) + ' MB';
		if ( n >= 1024 ) return ( n / 1024 ).toFixed( 1 ) + ' KB';
		return n + ' B';
	}

	function overLimit( value, limit ) {
		return limit !== undefined && value > limit;
	}

	function metricRow( label, value, limit, format ) {
		const fmt = format || String;
		const fVal = fmt( value );
		const fLim = limit !== undefined ? fmt( limit ) : null;
		const over = overLimit( value, limit );
		const style = over ? 'color:var(--color-destructive);font-weight:var(--font-weight-bold);' : '';
		const limitCell = fLim !== null ? `<td style="padding:1px 8px;${style}">${fVal} / ${fLim}</td>` : `<td style="padding:1px 8px;">${fVal}</td>`;
		return `<tr><td style="padding:1px 8px;color:var(--color-subtle);">${label}</td>${limitCell}${over ? '<td style="color:var(--color-destructive);">⚠ over limit</td>' : '<td></td>'}</tr>`;
	}

	const rows = [
		metricRow( 'CPU time', limitreport.cputime + ' s' ),
		metricRow( 'Wall time', limitreport.walltime + ' s' ),
		metricRow( 'Expensive function count', limitreport.expensivefunctioncount.value, limitreport.expensivefunctioncount.limit ),
		metricRow( 'PP visited nodes', limitreport.ppvisitednodes.value, limitreport.ppvisitednodes.limit ),
		metricRow( 'Expansion depth', limitreport.expansiondepth.value, limitreport.expansiondepth.limit ),
		metricRow( 'Post-expand include size', limitreport.postexpandincludesize.value, limitreport.postexpandincludesize.limit, formatBytes ),
		metricRow( 'Template argument size', limitreport.templateargumentsize.value, limitreport.templateargumentsize.limit, formatBytes ),
		metricRow( 'Revision size', limitreport.revisionsize.value, limitreport.revisionsize.limit, formatBytes ),
		metricRow( 'Unstrip depth', limitreport[ 'unstrip-depth' ].value, limitreport[ 'unstrip-depth' ].limit ),
		metricRow( 'Unstrip size', limitreport[ 'unstrip-size' ].value, limitreport[ 'unstrip-size' ].limit, formatBytes ),
		metricRow( 'Entity access count', limitreport.entityaccesscount.value, limitreport.entityaccesscount.limit ),
	];

	if ( scribunto ) {
		rows.push( metricRow( 'Lua time', scribunto[ 'limitreport-timeusage' ].value + ' s', parseFloat( scribunto[ 'limitreport-timeusage' ].limit ) > 0 ? scribunto[ 'limitreport-timeusage' ].limit + ' s' : undefined ) );
		rows.push( metricRow( 'Lua memory', scribunto[ 'limitreport-memusage' ].value, scribunto[ 'limitreport-memusage' ].limit, formatBytes ) );
	}

	const timingRows = ( limitreport.timingprofile || [] )
		.map( ( line ) => `<tr><td colspan="3" style="padding:1px 8px;font-family:var(--font-family-monospace);white-space:pre;">${mw.html.escape( line )}</td></tr>` )
		.join( '' );

	const cacheTime = cachereport && cachereport.timestamp
		? cachereport.timestamp.replace( /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6' )
		: '';

	const $box = $( `<details id="newpp-report" style="margin-top:2em;border:var(--border-width-base) var(--border-style-base) var(--border-color-base);padding:0.5em 1em;font-size:var(--font-size-medium);">
		<summary style="cursor:pointer;font-weight:var(--font-weight-bold);">NewPP limit report${cacheTime ? ' — cached ' + cacheTime : ''}</summary>
		<table style="border-collapse:collapse;margin-top:0.6em;">
			${rows.join( '' )}
			${timingRows ? '<tr><td colspan="3" style="padding-top:0.6em;font-weight:var(--font-weight-bold);">Timing profile</td></tr>' + timingRows : ''}
		</table>
	</details>` );

	$( '#mw-content-text' ).append( $box );
} );

// </nowiki>
