export function tinyColorRgbToGradientColorStop( { r, g, b, a } ) {
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
}

export function getGradientAbsolutePosition( relativeValue, maximumAbsoluteValue, minimumAbsoluteValue ) {
	return Math.round(
		( relativeValue * ( maximumAbsoluteValue - minimumAbsoluteValue ) / 100 ) + minimumAbsoluteValue
	);
}

export function getGradientRelativePosition( absoluteValue, maximumAbsoluteValue, minimumAbsoluteValue ) {
	const relativePosition = Math.round(
		( ( absoluteValue - minimumAbsoluteValue ) * 100 ) / ( maximumAbsoluteValue - minimumAbsoluteValue )
	);
	return Math.min( Math.max( relativePosition, 0 ), 100 );
}
