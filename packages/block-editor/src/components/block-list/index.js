/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import {
	withSelect,
	withDispatch,
	__experimentalAsyncModeProvider as AsyncModeProvider,
} from '@wordpress/data';
import { compose } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import BlockAsyncModeProvider from './block-async-mode-provider';
import BlockListBlock from './block';
import BlockListAppender from '../block-list-appender';

/**
 * If the block count exceeds the threshold, we disable the reordering animation
 * to avoid laginess.
 */
const BLOCK_ANIMATION_THRESHOLD = 200;

const forceSyncUpdates = ( WrappedComponent ) => ( props ) => {
	return (
		<AsyncModeProvider value={ false }>
			<WrappedComponent { ...props } />
		</AsyncModeProvider>
	);
};

class BlockList extends Component {
	constructor( props ) {
		super( props );

		this.onSelectionStart = this.onSelectionStart.bind( this );
		this.onSelectionEnd = this.onSelectionEnd.bind( this );
	}

	componentDidUpdate() {
		const {
			hasMultiSelection,
			blockClientIds,
			multiSelectedBlockClientIds,
		} = this.props;

		if ( ! hasMultiSelection ) {
			return;
		}

		const { length } = multiSelectedBlockClientIds;
		const start = multiSelectedBlockClientIds[ 0 ];
		const end = multiSelectedBlockClientIds[ length - 1 ];
		const startIndex = blockClientIds.indexOf( start );

		// The selected block is not in this block list.
		if ( startIndex === -1 ) {
			return;
		}

		let startNode = document.querySelector( `[data-block="${ start }"]` );
		let endNode = document.querySelector( `[data-block="${ end }"]` );
		const selection = window.getSelection();
		const range = document.createRange();

		while ( startNode.firstChild ) {
			startNode = startNode.firstChild;
		}

		while ( endNode.lastChild ) {
			endNode = endNode.lastChild;
		}

		range.setStartBefore( startNode );
		range.setEndAfter( endNode );

		selection.removeAllRanges();
		selection.addRange( range );
	}

	/**
	 * Binds event handlers to the document for tracking a pending multi-select
	 * in response to a mousedown event occurring in a rendered block.
	 *
	 * @param {string} clientId Client ID of block where mousedown occurred.
	 */
	onSelectionStart( clientId ) {
		if ( ! this.props.isSelectionEnabled ) {
			return;
		}

		this.onSelectionStart.clientId = clientId;
		this.props.onStartMultiSelect();
	}

	/**
	 * Handles a mouseup event to end the current cursor multi-selection.
	 *
	 * @param {string} clientId Client ID of block where mouseup occurred.
	 */
	onSelectionEnd( clientId ) {
		if ( ! this.props.isMultiSelecting ) {
			return;
		}

		this.props.onMultiSelect( this.onSelectionStart.clientId, clientId );
		this.props.onStopMultiSelect();
	}

	render() {
		const {
			className,
			blockClientIds,
			rootClientId,
			isDraggable,
			selectedBlockClientId,
			multiSelectedBlockClientIds,
			hasMultiSelection,
			renderAppender,
			enableAnimation,
		} = this.props;

		return (
			<div className={
				classnames(
					'editor-block-list__layout block-editor-block-list__layout',
					className
				)
			}>
				{ blockClientIds.map( ( clientId, index ) => {
					const isBlockInSelection = hasMultiSelection ?
						multiSelectedBlockClientIds.includes( clientId ) :
						selectedBlockClientId === clientId;

					return (
						<BlockAsyncModeProvider
							key={ 'block-' + clientId }
							clientId={ clientId }
							isBlockInSelection={ isBlockInSelection }
						>
							<BlockListBlock
								rootClientId={ rootClientId }
								clientId={ clientId }
								onSelectionStart={ this.onSelectionStart }
								onSelectionEnd={ this.onSelectionEnd }
								isDraggable={ isDraggable }

								// This prop is explicitely computed and passed down
								// to avoid being impacted by the async mode
								// otherwise there might be a small delay to trigger the animation.
								animateOnChange={ index }
								enableAnimation={ enableAnimation }
							/>
						</BlockAsyncModeProvider>
					);
				} ) }

				<BlockListAppender
					rootClientId={ rootClientId }
					renderAppender={ renderAppender }
				/>
			</div>
		);
	}
}

export default compose( [
	// This component needs to always be synchronous
	// as it's the one changing the async mode
	// depending on the block selection.
	forceSyncUpdates,
	withSelect( ( select, ownProps ) => {
		const {
			getBlockOrder,
			isSelectionEnabled,
			isMultiSelecting,
			getMultiSelectedBlocksStartClientId,
			getMultiSelectedBlocksEndClientId,
			getSelectedBlockClientId,
			getMultiSelectedBlockClientIds,
			hasMultiSelection,
			getGlobalBlockCount,
			isTyping,
		} = select( 'core/block-editor' );

		const { rootClientId } = ownProps;

		return {
			blockClientIds: getBlockOrder( rootClientId ),
			selectionStart: getMultiSelectedBlocksStartClientId(),
			selectionEnd: getMultiSelectedBlocksEndClientId(),
			isSelectionEnabled: isSelectionEnabled(),
			isMultiSelecting: isMultiSelecting(),
			selectedBlockClientId: getSelectedBlockClientId(),
			multiSelectedBlockClientIds: getMultiSelectedBlockClientIds(),
			hasMultiSelection: hasMultiSelection(),
			enableAnimation: (
				! isTyping() &&
				getGlobalBlockCount() <= BLOCK_ANIMATION_THRESHOLD
			),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const {
			startMultiSelect,
			stopMultiSelect,
			multiSelect,
		} = dispatch( 'core/block-editor' );

		return {
			onStartMultiSelect: startMultiSelect,
			onStopMultiSelect: stopMultiSelect,
			onMultiSelect: multiSelect,
		};
	} ),
] )( BlockList );
