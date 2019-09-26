
/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { BaseControl, CustomGradientPicker } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import GradientPicker from './';

export default function( { className, value, onChange, ...props } ) {
	return (
		<BaseControl
			className={ classnames(
				'block-editor-gradient-picker-control',
				className
			) }
		>
			<BaseControl.VisualLabel>
				{ __( 'Gradient Presets' ) }
			</BaseControl.VisualLabel>
			<GradientPicker
				value={ value }
				onChange={ onChange }
				className="block-editor-gradient-picker-control__gradient-picker-presets"
				{ ...props }
			/>
			<CustomGradientPicker
				value={ value }
				onChange={ onChange }
			/>
		</BaseControl>
	);
}
