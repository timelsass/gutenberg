
/**
 * External dependencies
 */
import gradientParser from 'gradient-parser';
import { some } from 'lodash';

/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useState, useRef, useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import IconButton from '../icon-button';
import ColorPicker from '../color-picker';
import Dropdown from '../dropdown';
import { useMarkerPoints, ControlPoints } from './control-points';
import {
	DEFAULT_GRADIENT,
	INSERT_POINT_WIDTH,
	MINIMUM_DISTANCE_BETWEEN_INSERTER_AND_MARKER,
	MINIMUM_ABSOLUTE_LEFT_POSITION,
} from './constants';
import { serializeGradient } from './serializer';
import { getGradientRelativePosition, tinyColorRgbToGradientColorStop } from './utils';

export default function CustomGradientPicker( { value = DEFAULT_GRADIENT, onChange } ) {
	const parsedGradient = useMemo(
		() => {
			try {
				return gradientParser.parse( value )[ 0 ];
			} catch ( error ) {
				return gradientParser.parse( DEFAULT_GRADIENT )[ 0 ];
			}
		},
		[ value ]
	);
	const [ gradientPickerDimensions, setGradientPickerDimensions ] = useState( {
		x: undefined,
		maxPosition: undefined,
	} );
	const [ insertPointPosition, setInsertPointPosition ] = useState( null );
	const insertPointMoveEnabled = useRef( true );
	const setIsInserterMoveEnabled = useCallback(
		( isEnabled ) => {
			insertPointMoveEnabled.current = isEnabled;
		},
		[ insertPointMoveEnabled ]
	);
	const [ isInsertingColorAtPosition, setIsInsertingColorAtPosition ] = useState( null );
	const gradientPickerDomRef = useRef();
	const markerPoints = useMarkerPoints( parsedGradient, gradientPickerDimensions.maxPosition );
	const updateInsertPointPosition = useCallback(
		( event ) => {
			if ( ! gradientPickerDimensions.x || ! insertPointMoveEnabled.current ) {
				return;
			}
			const insertPosition = Math.min(
				Math.max( event.clientX - gradientPickerDimensions.x - ( INSERT_POINT_WIDTH / 2 ), 0 ),
				gradientPickerDimensions.maxPosition,
			);

			// If the insert point is close to an existing control point don't show it.
			if ( some(
				markerPoints,
				( { absolutePosition } ) => {
					return Math.abs( insertPosition - absolutePosition ) < MINIMUM_DISTANCE_BETWEEN_INSERTER_AND_MARKER;
				}
			) ) {
				setInsertPointPosition( null );
				return;
			}

			setInsertPointPosition( insertPosition );
		},
		[ markerPoints, gradientPickerDimensions, setInsertPointPosition ]
	);

	const onMouseLeave = useCallback(
		() => {
			if ( ! insertPointMoveEnabled.current ) {
				return;
			}
			setInsertPointPosition( null );
		},
		[ insertPointMoveEnabled, setInsertPointPosition ]
	);

	useEffect( () => {
		if ( ! gradientPickerDomRef || ! gradientPickerDomRef.current ) {
			return;
		}
		const rect = gradientPickerDomRef.current.getBoundingClientRect();
		setGradientPickerDimensions( {
			x: rect.left,
			maxPosition: rect.width - INSERT_POINT_WIDTH,
		} );
	}, [] );

	return (
		<div
			ref={ gradientPickerDomRef }
			className="components-custom-gradient-picker"
			onMouseEnter={ updateInsertPointPosition }
			onMouseMove={ updateInsertPointPosition }
			style={ {
				background: value,
			} }
			onMouseLeave={ onMouseLeave }
		>
			<div className="components-custom-gradient-picker__markers-container">
				{ insertPointPosition !== null && (
					<Dropdown
						onClose={ () => {
							insertPointMoveEnabled.current = true;
							setIsInsertingColorAtPosition( null );
							setInsertPointPosition( null );
						} }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<IconButton
								aria-expanded={ isOpen }
								onClick={ () => {
									insertPointMoveEnabled.current = false;
									onToggle();
								} }
								className="components-custom-gradient-picker__insert-point"
								icon="insert"
								style={ {
									left: insertPointPosition !== null ? insertPointPosition : undefined,
								} }
							/>
						) }
						renderContent={ () => (
							<ColorPicker
								onChangeComplete={ ( { rgb } ) => {
									const relativePosition = getGradientRelativePosition( insertPointPosition, gradientPickerDimensions.maxPosition, MINIMUM_ABSOLUTE_LEFT_POSITION );
									const colorStop = tinyColorRgbToGradientColorStop( rgb );
									colorStop.length = {
										type: '%',
										value: relativePosition,
									};
									let newGradient;
									if ( isInsertingColorAtPosition === null ) {
										newGradient = {
											...parsedGradient,
											colorStops: [
												...parsedGradient.colorStops,
												colorStop,
											],
										};
										setIsInsertingColorAtPosition( relativePosition.toString() );
									} else {
										newGradient = {
											...parsedGradient,
											colorStops: parsedGradient.colorStops.map(
												( currentColorStop ) => {
													if ( currentColorStop.length.value !== isInsertingColorAtPosition ) {
														return currentColorStop;
													}
													return colorStop;
												}
											),
										};
									}
									onChange( serializeGradient( newGradient ) );
								} }
							/>
						) }
						popoverProps={ {
							className: 'components-custom-gradient-picker__color-picker-popover',
							position: 'top',
						} }
					/>

				) }
				<ControlPoints
					gradientPickerDimensions={ gradientPickerDimensions }
					ignoreMarkerPosition={ isInsertingColorAtPosition }
					markerPoints={ markerPoints }
					onChange={ onChange }
					parsedGradient={ parsedGradient }
					setIsInserterMoveEnabled={ setIsInserterMoveEnabled }
				/>
			</div>
		</div>
	);
}
