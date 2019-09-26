
/**
 * External dependencies
 */
import gradientParser from 'gradient-parser';
import { compact, map, get, some } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useState, useRef, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import IconButton from '../icon-button';
import Button from '../button';
import ColorPicker from '../color-picker';
import Dropdown from '../dropdown';

const INSERT_POINT_WIDTH = 23;
const GRADIENT_MARKERS_WIDTH = 18;
const MINIMUM_DISTANCE_BETWEEN_MARKERS = ( INSERT_POINT_WIDTH + GRADIENT_MARKERS_WIDTH ) / 2;
const MINIMUM_ABSOLUTE_LEFT_POSITION = 5;
const MINIMUM_SIGNIFICANT_MOVE = 5;
const DEFAULT_GRADIENT = 'linear-gradient(135deg, rgba(6, 147, 227, 1) 0%, rgb(155, 81, 224) 100%)';

const serializeGradientColor = ( { type, value } ) => {
	return `${ type }( ${ value.join( ',' ) })`;
};

const serializeGradientPosition = ( { type, value } ) => {
	return `${ value }${ type }`;
};

const serializeGradientColorStop = ( { type, value, length } ) => {
	return `${ serializeGradientColor( { type, value } ) } ${ serializeGradientPosition( length ) }`;
};

const serializeGradientOrientation = ( orientation ) => {
	if ( ! orientation || orientation.type !== 'angular' ) {
		return;
	}
	return `${ orientation.value }deg`;
};

const tinyColorRgbToGradientColorStop = ( { r, g, b, a } ) => {
	if ( a === 1 ) {
		return {
			type: 'rgb',
			value: [ r, g, b ],
		};
	}
	return {
		type: 'rgba',
		value: [ r, g, b, a ],
	};
};

const serializeGradient = ( { type, orientation, colorStops } ) => {
	const serializedOrientation = serializeGradientOrientation( orientation );
	const serializedColorStops = colorStops.sort( ( colorStop1, colorStop2 ) => {
		return get( colorStop1, [ 'length', 'value' ], 0 ) - get( colorStop2, [ 'length', 'value' ], 0 );
	} ).map( serializeGradientColorStop );
	return `${ type }( ${ compact( [ serializedOrientation, ...serializedColorStops ] ).join( ', ' ) } )`;
};

const getGradientAbsolutePosition = ( relativeValue, maximumAbsoluteValue, minimumAbsoluteValue ) => {
	return Math.round(
		( relativeValue * ( maximumAbsoluteValue - minimumAbsoluteValue ) / 100 ) + minimumAbsoluteValue
	);
};

const getGradientRelativePosition = ( absoluteValue, maximumAbsoluteValue, minimumAbsoluteValue ) => {
	const relativePosition = Math.round(
		( ( absoluteValue - minimumAbsoluteValue ) * 100 ) / ( maximumAbsoluteValue - minimumAbsoluteValue )
	);
	return Math.min( Math.max( relativePosition, 0 ), 100 );
};

export default function CustomGradientPicker( { value = DEFAULT_GRADIENT, onChange } ) {
	//return null;
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
	const [ maximumInsertPointPosition, setMaximumInsertPointPosition ] = useState();
	const [ gradientPickerXPosition, setGradientPickerXPosition ] = useState();
	const [ insertPointPosition, setInsertPointPosition ] = useState( null );
	const [ insertPointMoveEnabled, setInsertPointMoveEnabled ] = useState( true );
	const [ isEditingColorAtPosition, setIsEditingColorAtPosition ] = useState( null );
	const controlPointMoveState = useRef();
	const gradientPickerRef = useRef();
	const markerPoints = useMemo(
		() => {
			if ( ! parsedGradient ) {
				return [];
			}
			return compact(
				map( parsedGradient.colorStops, ( colorStop ) => {
					if ( ! colorStop || ! colorStop.length || colorStop.length.type !== '%' ) {
						return null;
					}
					return {
						color: serializeGradientColor( colorStop ),
						absolutePosition: getGradientAbsolutePosition( colorStop.length.value, maximumInsertPointPosition, MINIMUM_ABSOLUTE_LEFT_POSITION ),
						position: colorStop.length.value,
					};
				} )
			);
		},
		[ parsedGradient, maximumInsertPointPosition ]
	);
	const updateInsertPointPosition = useCallback(
		( event ) => {
			if ( ! gradientPickerXPosition || ! insertPointMoveEnabled ) {
				return;
			}
			let insertPosition = event.clientX - gradientPickerXPosition - ( INSERT_POINT_WIDTH / 2 );
			if ( insertPosition < 0 ) {
				insertPosition = 0;
			}
			if ( insertPosition > maximumInsertPointPosition ) {
				insertPosition = maximumInsertPointPosition;
			}
			if ( some(
				markerPoints,
				( { absolutePosition } ) => {
					return Math.abs( insertPosition - absolutePosition ) < MINIMUM_DISTANCE_BETWEEN_MARKERS;
				}
			) ) {
				setInsertPointPosition( null );
				return;
			}

			setInsertPointPosition( insertPosition );
		}
	);

	const onMouseLeave = useCallback(
		() => {
			if ( ! insertPointMoveEnabled ) {
				return;
			}
			setInsertPointPosition( null );
		}
	);

	useEffect( () => {
		if ( ! gradientPickerRef || ! gradientPickerRef.current ) {
			return;
		}
		const rect = gradientPickerRef.current.getBoundingClientRect();
		setGradientPickerXPosition( rect.left );
		setMaximumInsertPointPosition( rect.width - INSERT_POINT_WIDTH );
	}, [] );

	const controlPointMove = useCallback(
		( event ) => {
			const relativePosition = getGradientRelativePosition(
				event.clientX - gradientPickerXPosition - ( GRADIENT_MARKERS_WIDTH / 2 ),
				maximumInsertPointPosition,
				MINIMUM_ABSOLUTE_LEFT_POSITION
			);
			const { parsedGradient: referenceParsedGradient, position, significantMoveHappened } = controlPointMoveState.current;
			if ( ! significantMoveHappened ) {
				const initialPosition = referenceParsedGradient.colorStops[ position ].length.value;
				if ( Math.abs( initialPosition - relativePosition ) >= MINIMUM_SIGNIFICANT_MOVE ) {
					controlPointMoveState.current.significantMoveHappened = true;
				}
			}
			onChange(
				serializeGradient(
					{
						...referenceParsedGradient,
						colorStops: referenceParsedGradient.colorStops.map(
							( colorStop, colorStopIndex ) => {
								if ( colorStopIndex !== position ) {
									return colorStop;
								}
								return {
									...colorStop,
									length: {
										...colorStop.length,
										value: relativePosition.toString(),
									},
								};
							}
						),
					}
				)
			);
		},
		[ controlPointMoveState, onChange, maximumInsertPointPosition ]
	);

	const unbindEventListeners = useCallback(
		() => {
			if ( window && window.removeEventListener ) {
				window.removeEventListener( 'mousemove', controlPointMove );
				window.removeEventListener( 'mouseup', unbindEventListeners );
			}
		},
		[ controlPointMove ]
	);

	const controlPointMouseDown = useMemo(
		() => {
			return parsedGradient.colorStops.map(
				( colorStop, index ) => ( event ) => {
					if ( window && window.addEventListener ) {
						controlPointMoveState.current = {
							parsedGradient,
							position: index,
							significantMoveHappened: false,
						};
						controlPointMove( event );
						window.addEventListener( 'mousemove', controlPointMove );
						window.addEventListener( 'mouseup', unbindEventListeners );
					}
				}
			);
		},
		[ parsedGradient, controlPointMove ]
	);

	return (
		<div
			ref={ gradientPickerRef }
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
							setInsertPointMoveEnabled( true );
							setIsEditingColorAtPosition( null );
							setInsertPointPosition( null );
						} }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<IconButton
								aria-expanded={ isOpen }
								onClick={ () => {
									setInsertPointMoveEnabled( false );
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
									const relativePosition = getGradientRelativePosition( insertPointPosition, maximumInsertPointPosition, MINIMUM_ABSOLUTE_LEFT_POSITION );
									const colorStop = tinyColorRgbToGradientColorStop( rgb );
									colorStop.length = {
										type: '%',
										value: relativePosition,
									};
									let newGradient;
									if ( isEditingColorAtPosition === null ) {
										newGradient = {
											...parsedGradient,
											colorStops: [
												...parsedGradient.colorStops,
												colorStop,
											],
										};
										setIsEditingColorAtPosition( relativePosition.toString() );
									} else {
										newGradient = {
											...parsedGradient,
											colorStops: parsedGradient.colorStops.map(
												( currentColorStop ) => {
													if ( currentColorStop.length.value !== isEditingColorAtPosition ) {
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
				{ markerPoints.length > 0 && (
					markerPoints.map(
						( point, index ) => (
							isEditingColorAtPosition !== point.position && (
								<Dropdown
									key={ index }
									onClose={ () => {
										setInsertPointMoveEnabled( true );
										setIsEditingColorAtPosition( null );
										setInsertPointPosition( null );
									} }
									renderToggle={ ( { isOpen, onToggle } ) => (
										<Button
											onClick={ () => {
												if ( controlPointMoveState.current.significantMoveHappened ) {
													return;
												}
												onToggle();
												setInsertPointMoveEnabled( false );
											} }
											onMouseDown={ controlPointMouseDown[ index ] }
											aria-expanded={ isOpen }
											className={
												classnames(
													'components-custom-gradient-picker__marker-point',
													{ 'is-active': isOpen }
												)
											}
											style={ {
												left: !! point.absolutePosition ? point.absolutePosition : undefined,
											} }
										/>
									) }
									renderContent={ () => (
										<>
											<ColorPicker
												color={ point.color }
												onChangeComplete={ ( { rgb } ) => {
													onChange(
														serializeGradient(
															{
																...parsedGradient,
																colorStops: parsedGradient.colorStops.map(
																	( colorStop, colorStopIndex ) => {
																		if ( colorStopIndex !== index ) {
																			return colorStop;
																		}
																		return {
																			...colorStop,
																			...tinyColorRgbToGradientColorStop( rgb ),
																		};
																	}
																),
															}
														)
													);
												} }
											/>
											<Button
												className="components-custom-gradient-picker__remove-control-point"
												onClick={ () => {
													onChange(
														serializeGradient(
															{
																...parsedGradient,
																colorStops: parsedGradient.colorStops.filter( ( elem, elemIndex ) => {
																	return elemIndex !== index;
																} ),
															}
														)
													);
													setInsertPointMoveEnabled( true );
													setIsEditingColorAtPosition( null );
													setInsertPointPosition( null );
												} }
												isLink
											>
												{ __( 'Remove Control Point' ) }
											</Button>
										</>
									) }
									popoverProps={ {
										className: 'components-custom-gradient-picker__color-picker-popover',
										position: 'top',
									} }
								/>

							)
						)
					)
				) }
			</div>
		</div>
	);
}
