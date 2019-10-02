
/**
 * External dependencies
 */
import { compact, map } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useCallback, useRef, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Button from '../button';
import ColorPicker from '../color-picker';
import Dropdown from '../dropdown';
import { serializeGradient, serializeGradientColor } from './serializer';
import { getGradientAbsolutePosition, getGradientRelativePosition, tinyColorRgbToGradientColorStop } from './utils';
import {
	MINIMUM_ABSOLUTE_LEFT_POSITION,
	GRADIENT_MARKERS_WIDTH,
	MINIMUM_SIGNIFICANT_MOVE,
} from './constants';

export function useMarkerPoints( parsedGradient, maximumAbsolutePositionValue ) {
	return useMemo(
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
						absolutePosition: getGradientAbsolutePosition( colorStop.length.value, maximumAbsolutePositionValue, MINIMUM_ABSOLUTE_LEFT_POSITION ),
						position: colorStop.length.value,
					};
				} )
			);
		},
		[ parsedGradient, maximumAbsolutePositionValue ]
	);
}

export function ControlPoints( {
	gradientPickerDimensions,
	ignoreMarkerPosition,
	markerPoints,
	onChange,
	parsedGradient,
	setIsInserterMoveEnabled,
} ) {
	const controlPointMoveState = useRef();
	const controlPointMove = useCallback(
		( event ) => {
			const relativePosition = getGradientRelativePosition(
				event.clientX - gradientPickerDimensions.x - ( GRADIENT_MARKERS_WIDTH / 2 ),
				gradientPickerDimensions.maxPosition,
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
		[ controlPointMoveState, onChange, gradientPickerDimensions ]
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
				( colorStop, index ) => () => {
					if ( window && window.addEventListener ) {
						controlPointMoveState.current = {
							parsedGradient,
							position: index,
							significantMoveHappened: false,
						};
						window.addEventListener( 'mousemove', controlPointMove );
						window.addEventListener( 'mouseup', unbindEventListeners );
					}
				}
			);
		},
		[ parsedGradient, controlPointMove, unbindEventListeners, controlPointMoveState ]
	);
	return markerPoints.map(
		( point, index ) => (
			ignoreMarkerPosition !== point.position && (
				<Dropdown
					key={ index }
					onClose={ () => {
						setIsInserterMoveEnabled( true );
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							onClick={ () => {
								if ( controlPointMoveState.current.significantMoveHappened ) {
									return;
								}
								onToggle();
								setIsInserterMoveEnabled( false );
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
									setIsInserterMoveEnabled( true );
									//setIsEditingColorAtPosition( null );
									//setInsertPointPosition( null );
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
	);
}
