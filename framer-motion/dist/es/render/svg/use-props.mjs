import { useMemo } from 'react';
import { copyRawValuesOnly } from '../html/use-props.mjs';
import { buildSVGAttrs } from './utils/build-attrs.mjs';
import { createSvgRenderState } from './utils/create-render-state.mjs';

function useSVGProps(props, visualState) {
    const visualProps = useMemo(() => {
        const state = createSvgRenderState();
        buildSVGAttrs(state, visualState, { enableHardwareAcceleration: false }, props.transformTemplate);
        return Object.assign(Object.assign({}, state.attrs), { style: Object.assign({}, state.style) });
    }, [visualState]);
    if (props.style) {
        const rawStyles = {};
        copyRawValuesOnly(rawStyles, props.style, props);
        visualProps.style = Object.assign(Object.assign({}, rawStyles), visualProps.style);
    }
    return visualProps;
}

export { useSVGProps };
