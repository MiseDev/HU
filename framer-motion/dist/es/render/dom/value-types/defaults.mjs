import { color, filter } from 'style-value-types';
import { numberValueTypes } from './number.mjs';

/**
 * A map of default value types for common values
 */
const defaultValueTypes = Object.assign(Object.assign({}, numberValueTypes), { 
    // Color props
    color, backgroundColor: color, outlineColor: color, fill: color, stroke: color, 
    // Border props
    borderColor: color, borderTopColor: color, borderRightColor: color, borderBottomColor: color, borderLeftColor: color, filter, WebkitFilter: filter });
/**
 * Gets the default ValueType for the provided value key
 */
const getDefaultValueType = (key) => defaultValueTypes[key];

export { defaultValueTypes, getDefaultValueType };
